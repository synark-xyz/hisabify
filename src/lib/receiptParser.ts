export interface ParsedReceipt {
  merchant?: string;
  amount?: number;
  date?: Date;
  currency?: string;
}

/**
 * Heuristically parses raw lines from OCR text to extract receipt details.
 * Supports English, Japanese, and Bengali receipt patterns.
 */
export function parseReceiptText(lines: string[], userCurrency: string = 'USD'): ParsedReceipt {
  let merchant = '';
  let amount: number | undefined = undefined;
  let date: Date | undefined = undefined;

  // Clean lines: trim, remove empty lines
  const cleanLines = lines
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (cleanLines.length === 0) {
    return {};
  }

  // 1. Extract Merchant Name
  // Heuristic: The merchant name is usually in the first few lines.
  // We filter out common noise, numbers, phone numbers, websites, dates, and static header keywords.
  const noiseRegex = /^(?:tax\s*invoice|invoice|receipt|welcome|tel|phone|phone:|website|www\.|http|\d{2,}[/-]\d{2,}[/-]\d{2,})|^\d+$/i;
  
  for (let i = 0; i < Math.min(cleanLines.length, 5); i++) {
    const line = cleanLines[i];
    if (line.length > 2 && !noiseRegex.test(line) && !line.includes('@')) {
      merchant = line;
      break;
    }
  }

  // Fallback to the first line if nothing matches the clean heuristic
  if (!merchant) {
    merchant = cleanLines[0];
  }

  // Limit merchant name length for display purposes
  if (merchant && merchant.length > 50) {
    merchant = merchant.substring(0, 50) + '...';
  }

  // 2. Extract Date
  for (const line of cleanLines) {
    // A. Japanese/Chinese format: 2026年06月05日
    const jpMatch = line.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
    if (jpMatch) {
      const year = parseInt(jpMatch[1], 10);
      const month = parseInt(jpMatch[2], 10) - 1;
      const day = parseInt(jpMatch[3], 10);
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
        break;
      }
    }

    // B. Standard numeric date pattern: 3 blocks of numbers separated by / or -
    // Match: DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD, DD-MM-YY, etc.
    const dateMatch = line.match(/\b(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})\b/);
    if (dateMatch) {
      const part1 = parseInt(dateMatch[1], 10);
      const part2 = parseInt(dateMatch[2], 10);
      const part3 = parseInt(dateMatch[3], 10);

      let year = 0;
      let month = 0;
      let day = 0;

      if (part1 > 1000) {
        // YYYY-MM-DD format
        year = part1;
        month = part2 - 1;
        day = part3;
      } else if (part3 > 1000) {
        // DD-MM-YYYY or MM-DD-YYYY format
        year = part3;
        if (part2 > 12) {
          month = part1 - 1;
          day = part2;
        } else if (part1 > 12) {
          month = part2 - 1;
          day = part1;
        } else {
          // Use currency hint: USD -> MM/DD/YYYY, others -> DD/MM/YYYY
          if (userCurrency === 'USD') {
            month = part1 - 1;
            day = part2;
          } else {
            month = part2 - 1;
            day = part1;
          }
        }
      } else if (dateMatch[1].length <= 2 && dateMatch[3].length <= 2) {
        // 2-digit year format: e.g. DD/MM/YY
        year = part3 + (part3 < 50 ? 2000 : 1900);
        if (part2 > 12) {
          month = part1 - 1;
          day = part2;
        } else if (part1 > 12) {
          month = part2 - 1;
          day = part1;
        } else {
          if (userCurrency === 'USD') {
            month = part1 - 1;
            day = part2;
          } else {
            month = part2 - 1;
            day = part1;
          }
        }
      }

      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime()) && month >= 0 && month < 12 && day > 0 && day <= 31) {
        date = parsedDate;
        break;
      }
    }
  }

  // 3. Extract Total Amount
  // We scan for total keywords and look for numbers.
  // We prioritize strong keywords (Total, Grand Total, 合計, সর্বমোট)
  // over weaker keywords (Subtotal, Cash, Change, Bal) to avoid mismatches.
  const strongTotalKeywords = /(?:grand\s*total|total|合計|sum|amount\s*due|সর্বমোট|মোট)/i;
  const weakTotalKeywords = /(?:subtotal|sub\s*total|cash|change|due|bal|balance|pay|charge|小計|お預り)/i;

  const candidates: { value: number; priority: number }[] = [];

  for (const line of cleanLines) {
    // Look for monetary numbers: e.g., $12.34, ¥1,200, 50.00, etc.
    // Matches standard decimal numbers with optional currency symbols.
    const moneyMatch = line.match(/(?:[$¥£€৳\s]|^)([\d,]+\.\d{2})|([\d,]+\.\d{1,2})|(\b\d{2,}\b)/);
    if (!moneyMatch) continue;

    const matchedStr = moneyMatch[1] || moneyMatch[2] || moneyMatch[3];
    if (!matchedStr) continue;

    // Clean up commas for parsing
    const numericValue = parseFloat(matchedStr.replace(/,/g, ''));
    if (isNaN(numericValue) || numericValue <= 0) continue;

    // Determine priority based on keyword presence
    let priority = 0;
    if (strongTotalKeywords.test(line)) {
      priority = 3; // High priority for total
    } else if (weakTotalKeywords.test(line)) {
      priority = 2; // Medium priority for subtotal/balance
    } else if (line.toLowerCase().includes('tax') || line.toLowerCase().includes('vat')) {
      priority = 1; // Low priority for tax values
    } else {
      priority = 0; // No keywords
    }

    candidates.push({ value: numericValue, priority });
  }

  // Sort candidates: highest priority first, then larger value first
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.value - a.value;
  });

  // Pick the highest priority/value candidate if available
  if (candidates.length > 0) {
    amount = candidates[0].value;
  }

  // 4. Determine Currency Hint
  // Check if JPY symbols or keywords exist
  let detectedCurrency = userCurrency;
  const rawTextFull = cleanLines.join(' ').toLowerCase();
  if (rawTextFull.includes('¥') || rawTextFull.includes('円') || rawTextFull.includes('jpy')) {
    detectedCurrency = 'JPY';
  } else if (rawTextFull.includes('৳') || rawTextFull.includes('টাকা') || rawTextFull.includes('bdt') || rawTextFull.includes('bangladesh')) {
    detectedCurrency = 'BDT';
  } else if (rawTextFull.includes('$') || rawTextFull.includes('usd')) {
    detectedCurrency = 'USD';
  } else if (rawTextFull.includes('€') || rawTextFull.includes('eur')) {
    detectedCurrency = 'EUR';
  } else if (rawTextFull.includes('£') || rawTextFull.includes('gbp')) {
    detectedCurrency = 'GBP';
  }

  return {
    merchant: merchant || undefined,
    amount,
    date,
    currency: detectedCurrency
  };
}
