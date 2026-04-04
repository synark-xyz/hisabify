import { useState, useEffect } from 'react';
import { ChevronLeft, ArrowRightLeft, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { currencyData } from '@/hooks/useCurrency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'KRW'];

export function CurrencyConverterPage() {
  const navigate = useNavigate();
  const { currency: defaultCurrency, formatAmount } = useCurrency();
  const { getExchangeRate, convertAmount, getCachedRate } = useExchangeRate();

  const [amount, setAmount] = useState<string>('1');
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('JPY');
  const [rate, setRate] = useState<number | null>(null);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const convert = async () => {
    setLoading(true);
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setLoading(false);
      return;
    }

    // Check cache first
    const cachedRate = getCachedRate(fromCurrency, toCurrency);
    if (cachedRate !== null) {
      setRate(cachedRate);
      setConvertedAmount(numAmount * cachedRate);
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }

    // Fetch from API
    const result = await convertAmount(numAmount, fromCurrency, toCurrency);
    if (result) {
      setRate(result.rate);
      setConvertedAmount(result.convertedAmount);
      setLastUpdated(new Date(result.timestamp));
    }
    setLoading(false);
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  useEffect(() => {
    convert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCurrency, toCurrency]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/more')} className="p-2 -ml-2 hover:bg-accent/10 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" /> Currency Converter
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={convert}
          />
        </div>

        {/* Currency Selectors */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger id="from" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POPULAR_CURRENCIES.map((curr) => (
                  <SelectItem key={curr} value={curr}>
                    {curr} - {currencyData[curr]?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={swapCurrencies}
              className="rounded-full w-10 h-10"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger id="to" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POPULAR_CURRENCIES.map((curr) => (
                  <SelectItem key={curr} value={curr}>
                    {curr} - {currencyData[curr]?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Convert Button */}
        <Button className="w-full" onClick={convert} disabled={loading}>
          {loading ? 'Converting...' : 'Convert'}
        </Button>

        {/* Result Card */}
        {convertedAmount !== null && rate && (
          <Card className="bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-violet-500/20">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Converted Amount</p>
                <p className="text-3xl font-bold text-primary">
                  {formatAmount(convertedAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {amount} {fromCurrency} = {convertedAmount.toFixed(2)} {toCurrency}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>1 {fromCurrency} = {rate.toFixed(6)} {toCurrency}</span>
              </div>

              {lastUpdated && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Reference */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Popular Conversions</h3>
          <div className="grid grid-cols-2 gap-2">
            {POPULAR_CURRENCIES.slice(0, 6).map((curr) => (
              <Button
                key={curr}
                variant="outline"
                className="justify-start text-sm"
                onClick={() => {
                  setFromCurrency(curr);
                  setAmount('1');
                }}
              >
                {curr} → {toCurrency}
              </Button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
