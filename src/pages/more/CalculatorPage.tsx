import { useReducer } from 'react';
import { ChevronLeft, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

type CalcState = {
  display: string;
  previousValue: string | null;
  operation: string | null;
  waitingForOperand: boolean;
  history: string[];
};

type CalcAction =
  | { type: 'digit'; payload: string }
  | { type: 'operation'; payload: string }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'clearEntry' }
  | { type: 'decimal' }
  | { type: 'percent' }
  | { type: 'toggleSign' };

const initialState: CalcState = {
  display: '0',
  previousValue: null,
  operation: null,
  waitingForOperand: false,
  history: [],
};

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case 'digit': {
      const digit = action.payload;
      if (state.waitingForOperand) {
        return { ...state, display: digit, waitingForOperand: false };
      }
      if (state.display === '0' && digit !== '0') {
        return { ...state, display: digit };
      }
      if (state.display.replace(/[^0-9]/g, '').length >= 12) {
        return state;
      }
      return { ...state, display: state.display === '0' ? digit : state.display + digit };
    }
    case 'decimal': {
      if (state.waitingForOperand) {
        return { ...state, display: '0.', waitingForOperand: false };
      }
      if (state.display.includes('.')) {
        return state;
      }
      return { ...state, display: state.display + '.' };
    }
    case 'operation': {
      const op = action.payload;
      const current = parseFloat(state.display);
      if (state.previousValue !== null && state.operation !== null && !state.waitingForOperand) {
        const prev = parseFloat(state.previousValue);
        let result: number;
        switch (state.operation) {
          case '+': result = prev + current; break;
          case '-': result = prev - current; break;
          case '×': result = prev * current; break;
          case '÷': result = current !== 0 ? prev / current : 0; break;
          default: result = current;
        }
        const newDisplay = String(result);
        return {
          ...state,
          display: newDisplay,
          previousValue: newDisplay,
          operation: op,
          waitingForOperand: true,
        };
      }
      return {
        ...state,
        previousValue: state.display,
        operation: op,
        waitingForOperand: true,
      };
    }
    case 'equals': {
      if (state.previousValue === null || state.operation === null) {
        return state;
      }
      const prev = parseFloat(state.previousValue);
      const current = parseFloat(state.display);
      let result: number;
      switch (state.operation) {
        case '+': result = prev + current; break;
        case '-': result = prev - current; break;
        case '×': result = prev * current; break;
        case '÷': result = current !== 0 ? prev / current : 0; break;
        default: return state;
      }
      const historyEntry = `${state.previousValue} ${state.operation} ${state.display} = ${result}`;
      return {
        ...state,
        display: String(result),
        previousValue: null,
        operation: null,
        waitingForOperand: true,
        history: [historyEntry, ...state.history].slice(0, 5),
      };
    }
    case 'clear':
      return initialState;
    case 'clearEntry': {
      const current = state.display;
      if (current.length === 1 || (current.length === 2 && current.startsWith('-'))) {
        return { ...state, display: '0' };
      }
      return { ...state, display: current.slice(0, -1) };
    }
    case 'percent': {
      const val = parseFloat(state.display) / 100;
      return { ...state, display: String(val), waitingForOperand: true };
    }
    case 'toggleSign': {
      const val = parseFloat(state.display) * -1;
      return { ...state, display: String(val) };
    }
    default:
      return state;
  }
}

export function CalculatorPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(calcReducer, initialState);

  const formatDisplay = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    if (val.includes('.') && !val.endsWith('.')) {
      return val.length > 12 ? num.toExponential(4) : val;
    }
    return val;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/more')} className="p-2 -ml-2 hover:bg-accent/10 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5" /> {t('morePage.calculator')}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Display */}
        <div className="bg-card rounded-2xl p-6 mb-6 border border-border/30">
          <div className="text-right text-4xl font-medium tracking-tight overflow-hidden">
            {formatDisplay(state.display)}
          </div>
          {state.previousValue && state.operation && (
            <div className="text-right text-sm text-muted-foreground mt-1">
              {state.previousValue} {state.operation}
            </div>
          )}
        </div>

        {/* History */}
        {state.history.length > 0 && (
          <div className="mb-6 space-y-1">
            {state.history.map((entry, i) => (
              <div key={i} className="text-sm text-muted-foreground text-right font-mono">
                {entry}
              </div>
            ))}
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-2">
          {/* Row 1: AC CE +/- % */}
          <Button variant="outline" className="h-12 text-sm font-medium" onClick={() => dispatch({ type: 'clear' })}>
            {t('calTool.ac')}
          </Button>
          <Button variant="outline" className="h-12 text-sm font-medium" onClick={() => dispatch({ type: 'clearEntry' })}>
            {t('calTool.ce')}
          </Button>
          <Button variant="outline" className="h-12 text-sm font-medium" onClick={() => dispatch({ type: 'toggleSign' })}>
            {t('calTool.toggleSign')}
          </Button>
          <Button variant="outline" className="h-12 text-sm font-medium" onClick={() => dispatch({ type: 'percent' })}>
            {t('calTool.percent')}
          </Button>

          {/* Row 2: 7 8 9 ÷ */}
          <Button variant="secondary" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'digit', payload: '7' })}>
            7
          </Button>
          <Button variant="secondary" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'digit', payload: '8' })}>
            8
          </Button>
          <Button variant="secondary" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'digit', payload: '9' })}>
            9
          </Button>
          <Button variant="default" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'operation', payload: '÷' })}>
            {t('calTool.divide')}
          </Button>

          {/* Row 3: 4 5 6 × */}
          <Button variant="secondary" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'digit', payload: '4' })}>
            4
          </Button>
          <Button variant="secondary" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'digit', payload: '5' })}>
            5
          </Button>
          <Button variant="secondary" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'digit', payload: '6' })}>
            6
          </Button>
          <Button variant="default" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'operation', payload: '×' })}>
            {t('calTool.multiply')}
          </Button>

          {/* Row 4: 1 2 3 - */}
          <Button variant="secondary" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'digit', payload: '1' })}>
            1
          </Button>
          <Button variant="secondary" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'digit', payload: '2' })}>
            2
          </Button>
          <Button variant="secondary" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'digit', payload: '3' })}>
            3
          </Button>
          <Button variant="default" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'operation', payload: '-' })}>
            {t('calTool.subtract')}
          </Button>

          {/* Row 5: 0 + = (0 spans 2, others 1 each) */}
          <Button variant="secondary" className="h-14 text-lg font-medium col-span-2" onClick={() => dispatch({ type: 'digit', payload: '0' })}>
            0
          </Button>
          <Button variant="secondary" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'decimal' })}>
            {t('calTool.decimal')}
          </Button>
          <Button variant="default" className="h-14 text-lg font-medium" onClick={() => dispatch({ type: 'operation', payload: '+' })}>
            {t('calTool.add')}
          </Button>

          {/* Row 6: = (full width) */}
          <Button variant="default" className="h-14 text-xl font-bold col-span-4" onClick={() => dispatch({ type: 'equals' })}>
            {t('calTool.equals')}
          </Button>
        </div>
      </main>
    </div>
  );
}
