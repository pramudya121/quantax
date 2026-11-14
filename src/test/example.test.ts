import { describe, expect, it } from 'vitest';
import { isAmountWithinBalance, validatePreTx } from '@/lib/inputValidation';
import { isValidAmount } from '@/lib/security';

describe('transaction amount validation', () => {
  it('checks balances using exact token units and fails closed for malformed values', () => {
    expect(isAmountWithinBalance('0.3', '0.300000000000000000', 18)).toBe(true);
    expect(isAmountWithinBalance('0.300000000000000001', '0.3', 18)).toBe(false);
    expect(isAmountWithinBalance('not-a-number', '100', 18)).toBe(false);
  });

  it('accepts leading-decimal input only within token precision', () => {
    expect(isValidAmount('.5', 2)).toBe(true);
    expect(isValidAmount('1.001', 2)).toBe(false);
  });

  it('reserves native QMS for gas before allowing a transaction', () => {
    expect(validatePreTx({ amount: '0.5', decimals: 18, balance: '0.5', isNative: true, gasReserve: 0.01 }).ok).toBe(false);
    expect(validatePreTx({ amount: '0.49', decimals: 18, balance: '0.5', isNative: true, gasReserve: 0.01 }).ok).toBe(true);
  });
});
