/**
 * Security utilities for QuantaX
 * Best practices for web3 and general security
 */

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

// Validate Ethereum address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Validate a base-10 token amount without floating-point rounding.
export function isValidAmount(amount: string, decimals: number = 18): boolean {
  if (!amount || !Number.isInteger(decimals) || decimals < 0 || decimals > 255) return false;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(amount)) return false;

  const normalized = amount.startsWith('.') ? `0${amount}` : amount;
  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > decimals) return false;
  try {
    return BigInt(whole) <= 10n ** 30n;
  } catch {
    return false;
  }
}

// Rate limiting for API calls
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

// Namespaced browser storage for non-secret preferences only; localStorage is not secure storage.
const APP_STORAGE_PREFIX = 'quantax:';
const storageKey = (key: string) => `${APP_STORAGE_PREFIX}${key}`;

export const secureStorage = {
  set(key: string, value: unknown): void {
    try {
      const wrapped = { data: JSON.stringify(value), timestamp: Date.now() };
      localStorage.setItem(storageKey(key), JSON.stringify(wrapped));
    } catch (error) {
      console.error('App storage set error:', error);
    }
  },

  get<T>(key: string, maxAge?: number): T | null {
    try {
      const keyWithPrefix = storageKey(key);
      const item = localStorage.getItem(keyWithPrefix);
      if (!item) return null;

      const wrapped = JSON.parse(item) as { data: string; timestamp: number };
      if (maxAge && Date.now() - wrapped.timestamp > maxAge) {
        localStorage.removeItem(keyWithPrefix);
        return null;
      }
      return JSON.parse(wrapped.data) as T;
    } catch (error) {
      console.error('App storage get error:', error);
      return null;
    }
  },

  remove(key: string): void {
    localStorage.removeItem(storageKey(key));
  },

  clear(): void {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(APP_STORAGE_PREFIX)) localStorage.removeItem(key);
    }
  },
};

// Content Security Policy nonce generator
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// XSS prevention for dynamic content
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Slippage validation
export function isValidSlippage(slippage: number): boolean {
  return slippage >= 0.01 && slippage <= 50;
}

// Transaction deadline validation
export function isValidDeadline(minutes: number): boolean {
  return minutes >= 1 && minutes <= 60;
}

// Safe BigInt parsing
export function safeParseBigInt(value: string | number): bigint | null {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return null;
  const text = String(value);
  if (!/^-?\d+$/.test(text)) return null;
  try {
    return BigInt(text);
  } catch {
    return null;
  }
}
