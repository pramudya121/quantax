import { describe, expect, it } from 'vitest';
import { isAmountWithinBalance, needsTokenApproval, sanitizeAmountInput, validatePreTx } from '@/lib/inputValidation';
import { isValidAmount } from '@/lib/security';
import { getTokenPrice } from '@/lib/pricing';

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

  it('sanitizes input to the selected token precision, including zero and over-18 decimals', () => {
    expect(sanitizeAmountInput('12.3456', 2)).toBe('12.34');
    expect(sanitizeAmountInput('12.3456', 0)).toBe('12');
    expect(sanitizeAmountInput('0.000000000000000000000001', 24)).toBe('0.000000000000000000000001');
  });

  it('validates transaction amounts against actual token precision', () => {
    const amount = '0.000000000000000000000001';
    expect(validatePreTx({ amount, decimals: 24, balance: amount }).ok).toBe(true);
    expect(validatePreTx({ amount: '1.001', decimals: 2, balance: '10' }).ok).toBe(false);
  });

  it('fails closed when a transaction requires approval but allowance is unread', () => {
    expect(validatePreTx({
      amount: '1', decimals: 18, balance: '2', needsApproval: true,
      requiredAllowance: 1n, currentAllowance: undefined,
    }).ok).toBe(false);
    expect(validatePreTx({
      amount: '1', decimals: 18, balance: '2', needsApproval: true,
      requiredAllowance: 1n, currentAllowance: 1n,
    }).ok).toBe(true);
  });

  it('reserves native QMS for gas before allowing a transaction', () => {
    expect(validatePreTx({ amount: '0.5', decimals: 18, balance: '0.5', isNative: true, gasReserve: 0.01 }).ok).toBe(false);
    expect(validatePreTx({ amount: '0.49', decimals: 18, balance: '0.5', isNative: true, gasReserve: 0.01 }).ok).toBe(true);
  });
});

describe('token approval checks', () => {
  it('requires approval when allowance is unknown and blocks zero-amount approvals', () => {
    expect(needsTokenApproval(1n, undefined)).toBe(true);
    expect(needsTokenApproval(1n, 0n)).toBe(true);
    expect(needsTokenApproval(1n, 1n)).toBe(false);
    expect(needsTokenApproval(0n, undefined)).toBe(false);
  });
});

describe('token quote identity', () => {
  const wqmsAddress = '0x0000000000000000000000000000000000000001';
  const tokenAddress = '0x0000000000000000000000000000000000000002';
  const spoofAddress = '0x0000000000000000000000000000000000000003';
  const prices = {
    [wqmsAddress]: 1,
    [tokenAddress]: 2.5,
    [spoofAddress]: 0.04,
  };

  it('looks up quotes by contract address, never by a token symbol', () => {
    expect(getTokenPrice(prices, tokenAddress.toUpperCase().replace('0X', '0x'))).toBe(2.5);
    expect(getTokenPrice(prices, spoofAddress)).toBe(0.04);
    expect(getTokenPrice(prices, '0x0000000000000000000000000000000000000004')).toBe(0);
  });

  it('maps native QMS only to the configured wrapped-native contract', () => {
    expect(getTokenPrice(prices, 'native', wqmsAddress)).toBe(1);
    expect(getTokenPrice(prices, 'native')).toBe(0);
  });
});
