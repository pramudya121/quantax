/**
 * Input validation utilities for QuantaX
 * Centralizes all user input validation with strict bounds
 */
import { z } from 'zod';

// Swap amount schema
export const swapAmountSchema = z.string()
  .refine(val => val === '' || /^\d*\.?\d*$/.test(val), 'Invalid number format')
  .refine(val => {
    if (val === '') return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Amount must be non-negative')
  .refine(val => {
    if (val === '') return true;
    const num = parseFloat(val);
    return num <= 1e18; // Reasonable upper bound
  }, 'Amount exceeds maximum')
  .refine(val => {
    if (val === '' || !val.includes('.')) return true;
    return val.split('.')[1].length <= 18; // Max 18 decimals
  }, 'Too many decimal places');

// Slippage schema
export const slippageSchema = z.number()
  .min(0.01, 'Slippage too low (min 0.01%)')
  .max(50, 'Slippage too high (max 50%)');

// Address schema
export const addressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

/**
 * Sanitize numeric input - only allow digits and single decimal point
 */
export function sanitizeAmountInput(value: string): string {
  // Remove anything that's not a digit or decimal point
  let sanitized = value.replace(/[^0-9.]/g, '');
  
  // Only allow one decimal point
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Prevent leading zeros (except "0." pattern)
  if (sanitized.length > 1 && sanitized[0] === '0' && sanitized[1] !== '.') {
    sanitized = sanitized.slice(1);
  }
  
  // Limit to 18 decimal places
  if (parts.length === 2 && parts[1].length > 18) {
    sanitized = parts[0] + '.' + parts[1].slice(0, 18);
  }
  
  return sanitized;
}

/**
 * Validate and clamp slippage value
 */
export function sanitizeSlippage(value: number): number {
  if (isNaN(value) || value < 0.01) return 0.5; // Default
  if (value > 50) return 50; // Cap at 50%
  return Math.round(value * 100) / 100; // Round to 2 decimals
}

/**
 * Generate a safe transaction deadline (capped at 30 minutes)
 */
export function getSafeDeadline(minutes: number = 30): bigint {
  const clampedMinutes = Math.min(Math.max(minutes, 1), 60);
  return BigInt(Math.floor(Date.now() / 1000) + clampedMinutes * 60);
}

/**
 * Calculate safe minimum output with slippage protection
 */
export function calculateMinOutput(amount: bigint, slippagePercent: number): bigint {
  const clampedSlippage = sanitizeSlippage(slippagePercent);
  // Use integer math to avoid precision loss: minOutput = amount * (10000 - slippage*100) / 10000
  const slippageBps = BigInt(Math.floor(clampedSlippage * 100));
  return (amount * (10000n - slippageBps)) / 10000n;
}

/**
 * Safe approval amount - approve exact amount + 10% buffer instead of MAX_UINT256
 */
export function getSafeApprovalAmount(requiredAmount: bigint): bigint {
  // Add 10% buffer to avoid re-approval on minor price changes
  return (requiredAmount * 110n) / 100n;
}

/**
 * Validate that amount doesn't exceed balance
 */
export function isAmountWithinBalance(amount: string, balance: string): boolean {
  if (!amount || !balance) return true;
  const amountNum = parseFloat(amount);
  const balanceNum = parseFloat(balance);
  if (isNaN(amountNum) || isNaN(balanceNum)) return true;
  return amountNum <= balanceNum;
}

/**
 * Deadline schema — minutes, 1..60
 */
export const deadlineSchema = z.number().int().min(1, 'Deadline too short').max(60, 'Deadline too long');

export function sanitizeDeadline(value: number): number {
  if (isNaN(value) || value < 1) return 30;
  return Math.min(Math.max(Math.floor(value), 1), 60);
}

export interface PreTxValidation {
  ok: boolean;
  title?: string;
  error?: string;
}

/**
 * Strict pre-transaction validation for amount, balance, allowance, and native gas reserve.
 */
export function validatePreTx(params: {
  amount: string;
  decimals?: number;
  balance?: string;
  isNative?: boolean;
  gasReserve?: number;
  needsApproval?: boolean;
  requiredAllowance?: bigint;
  currentAllowance?: bigint;
  symbol?: string;
}): PreTxValidation {
  const {
    amount, decimals = 18, balance, isNative, gasReserve = 0.01,
    needsApproval, requiredAllowance, currentAllowance, symbol = 'token',
  } = params;

  if (!amount || amount.trim() === '') {
    return { ok: false, title: 'Enter Amount', error: 'Please enter an amount to continue.' };
  }
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    return { ok: false, title: 'Invalid Amount', error: 'Amount must be a positive number.' };
  }
  const parseCheck = swapAmountSchema.safeParse(amount);
  if (!parseCheck.success) {
    return { ok: false, title: 'Invalid Amount', error: parseCheck.error.issues[0]?.message ?? 'Invalid amount format.' };
  }
  if (amount.includes('.') && amount.split('.')[1].length > decimals) {
    return { ok: false, title: 'Too Many Decimals', error: `${symbol} supports at most ${decimals} decimals.` };
  }
  if (balance !== undefined) {
    const bal = parseFloat(balance);
    if (!isNaN(bal)) {
      if (isNative) {
        if (num + gasReserve > bal) {
          return {
            ok: false,
            title: 'Insufficient Balance',
            error: `Keep at least ${gasReserve} QMS for gas. Available: ${(Math.max(bal - gasReserve, 0)).toFixed(4)}.`,
          };
        }
      } else if (num > bal) {
        return {
          ok: false,
          title: 'Insufficient Balance',
          error: `You only have ${bal.toFixed(6)} ${symbol}.`,
        };
      }
    }
  }
  if (needsApproval && requiredAllowance !== undefined && currentAllowance !== undefined && currentAllowance < requiredAllowance) {
    return {
      ok: false,
      title: 'Approval Required',
      error: `Approve ${symbol} spending before continuing.`,
    };
  }
  return { ok: true };
}
