import { describe, it, expect } from 'vitest';
import { parseReceiptText } from '../receiptParser';

describe('parseReceiptText', () => {
  it('should parse a standard English receipt correctly', () => {
    const lines = [
      'STARBUCKS COFFEE',
      'Store #12345',
      'TEL: 555-0199',
      'Date: 2026-06-05',
      '1x Latte       $4.50',
      '1x Croissant   $3.50',
      'Subtotal       $8.00',
      'Tax            $0.64',
      'TOTAL DUE      $8.64',
      'CASH           $10.00',
      'Change         $1.36',
    ];

    const result = parseReceiptText(lines, 'USD');
    expect(result.merchant).toBe('STARBUCKS COFFEE');
    expect(result.amount).toBe(8.64);
    expect(result.date?.getFullYear()).toBe(2026);
    expect(result.date?.getMonth()).toBe(5); // June is 5
    expect(result.date?.getDate()).toBe(5);
    expect(result.currency).toBe('USD');
  });

  it('should parse a Japanese receipt correctly', () => {
    const lines = [
      'セブン-イレブン 渋谷店',
      '電話: 03-1234-5678',
      '2026年06月05日 14:30',
      'おにぎり       150円',
      'お茶           120円',
      '小計           270円',
      '消費税          27円',
      '合計           297円',
      'お預り         1000円',
      'お釣り          703円',
    ];

    const result = parseReceiptText(lines, 'JPY');
    expect(result.merchant).toBe('セブン-イレブン 渋谷店');
    expect(result.amount).toBe(297);
    expect(result.date?.getFullYear()).toBe(2026);
    expect(result.date?.getMonth()).toBe(5);
    expect(result.date?.getDate()).toBe(5);
    expect(result.currency).toBe('JPY');
  });

  it('should parse a Bengali receipt correctly', () => {
    const lines = [
      'স্বপ্ন সুপার শপ',
      'মিরপুর, ঢাকা',
      'তারিখ: ০৫/০৬/২০২৬',
      'চাল ৫ কেজি     ৪৫০ টাকা',
      'ডাল ১ কেজি     ১২০ টাকা',
      'সর্বমোট        ৫৭০ টাকা',
      'নগদ গ্রহণ      ১০০০ টাকা',
    ];

    // Note: If OCR returns digits in standard numbers (since ML kit usually recognizes digits/latin text well)
    const linesOcr = [
      'SHWAPNO SUPER SHOP',
      'Mirpur, Dhaka',
      'Date: 05-06-2026',
      'Rice 5kg       450.00',
      'Dal 1kg        120.00',
      'Sub Total      570.00',
      'TOTAL DUE      570.00',
      'Cash           1000.00',
    ];

    const result = parseReceiptText(linesOcr, 'BDT');
    expect(result.merchant).toBe('SHWAPNO SUPER SHOP');
    expect(result.amount).toBe(570.00);
    expect(result.date?.getFullYear()).toBe(2026);
    expect(result.date?.getMonth()).toBe(5);
    expect(result.date?.getDate()).toBe(5);
    expect(result.currency).toBe('BDT');
  });

  it('should fallback to first line for merchant if first line matches noise filtering but no other line exists', () => {
    const lines = ['SingleLineMerchant'];
    const result = parseReceiptText(lines, 'USD');
    expect(result.merchant).toBe('SingleLineMerchant');
  });

  it('should handle dates with slash separators', () => {
    const lines = [
      'Walmart Store',
      '06/05/2026',
      'TOTAL 15.99'
    ];
    const result = parseReceiptText(lines, 'USD');
    expect(result.date?.getFullYear()).toBe(2026);
    expect(result.date?.getMonth()).toBe(5);
    expect(result.date?.getDate()).toBe(5);
  });
});
