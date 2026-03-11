import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVoiceInput } from '../useVoiceInput';

describe('useVoiceInput parseCommand', () => {
  // Pattern 1: "spent/paid X at/for Y"
  it('should parse "spent X at Y"', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('spent 20 at Starbucks');
    expect(parsed).toEqual({
      amount: 20,
      merchant: 'starbucks',
      raw: 'spent 20 at Starbucks'
    });
  });

  it('should parse "paid X for Y"', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('paid 50 for groceries');
    expect(parsed).toEqual({
      amount: 50,
      merchant: 'groceries',
      raw: 'paid 50 for groceries'
    });
  });

  it('should parse decimal amounts with "spent"', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('spent 12.50 at Coffee Shop');
    expect(parsed).toEqual({
      amount: 12.5,
      merchant: 'coffee shop',
      raw: 'spent 12.50 at Coffee Shop'
    });
  });

  // Pattern 2: "X dollars/bucks at/for Y"
  it('should parse "X dollars at Y"', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('15 dollars at McDonald\'s');
    expect(parsed).toEqual({
      amount: 15,
      merchant: 'mcdonald\'s',
      raw: '15 dollars at McDonald\'s'
    });
  });

  it('should parse "X bucks for Y"', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('20 bucks for lunch');
    expect(parsed).toEqual({
      amount: 20,
      merchant: 'lunch',
      raw: '20 bucks for lunch'
    });
  });

  it('should parse decimal amounts with "dollars"', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('7.99 dollars at Subway');
    expect(parsed).toEqual({
      amount: 7.99,
      merchant: 'subway',
      raw: '7.99 dollars at Subway'
    });
  });

  // Pattern 3: "bought Y for X"
  it('should parse "bought Y for X"', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('bought coffee for 5');
    expect(parsed).toEqual({
      amount: 5,
      merchant: 'coffee',
      raw: 'bought coffee for 5'
    });
  });

  it('should parse "bought Y for X" with decimal', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('bought lunch for 12.50');
    expect(parsed).toEqual({
      amount: 12.5,
      merchant: 'lunch',
      raw: 'bought lunch for 12.50'
    });
  });

  it('should parse "bought Y for X" with multi-word merchant', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('bought movie tickets for 25');
    expect(parsed).toEqual({
      amount: 25,
      merchant: 'movie tickets',
      raw: 'bought movie tickets for 25'
    });
  });

  // Pattern 4: "Merchant Amount" (original pattern, fallback)
  it('should parse "Merchant X dollars" (original pattern)', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('Starbucks 5 dollars');
    expect(parsed).toEqual({
      amount: 5,
      merchant: 'starbucks',
      raw: 'Starbucks 5 dollars'
    });
  });

  it('should parse "Merchant X" without currency word', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('Pizza 25');
    expect(parsed).toEqual({
      amount: 25,
      merchant: 'pizza',
      raw: 'Pizza 25'
    });
  });

  it('should parse "Merchant X.XX"', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('Target 47.82');
    expect(parsed).toEqual({
      amount: 47.82,
      merchant: 'target',
      raw: 'Target 47.82'
    });
  });

  // Edge cases
  it('should handle comma as decimal separator', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('spent 12,50 at Shop');
    expect(parsed).toEqual({
      amount: 12.5,
      merchant: 'shop',
      raw: 'spent 12,50 at Shop'
    });
  });

  it('should return only raw text if no pattern matches', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('hello world');
    expect(parsed).toEqual({
      raw: 'hello world'
    });
  });

  it('should return only raw text for incomplete input', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('spent at Starbucks');
    expect(parsed).toEqual({
      raw: 'spent at Starbucks'
    });
  });

  it('should handle case insensitivity', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('SPENT 30 AT WALMART');
    expect(parsed).toEqual({
      amount: 30,
      merchant: 'walmart',
      raw: 'SPENT 30 AT WALMART'
    });
  });

  // Real-world examples
  it('should parse real-world example: grocery shopping', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('spent 87.45 at Whole Foods');
    expect(parsed).toEqual({
      amount: 87.45,
      merchant: 'whole foods',
      raw: 'spent 87.45 at Whole Foods'
    });
  });

  it('should parse real-world example: gas station', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('45 dollars for gas');
    expect(parsed).toEqual({
      amount: 45,
      merchant: 'gas',
      raw: '45 dollars for gas'
    });
  });

  it('should parse real-world example: restaurant', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('bought dinner for 62.30');
    expect(parsed).toEqual({
      amount: 62.3,
      merchant: 'dinner',
      raw: 'bought dinner for 62.30'
    });
  });
});
