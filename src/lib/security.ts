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

// Validate amount input (prevent overflow/underflow)
export function isValidAmount(amount: string, decimals: number = 18): boolean {
  if (!amount || amount === '') return false;
  
  const num = parseFloat(amount);
  if (isNaN(num) || num < 0) return false;
  
  // Check for reasonable bounds
  const MAX_SAFE_VALUE = 1e30; // Reasonable upper bound
  if (num > MAX_SAFE_VALUE) return false;
  
  // Check decimal precision
  const parts = amount.split('.');
  if (parts[1] && parts[1].length > decimals) return false;
  
  return true;
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

// Secure storage wrapper
export const secureStorage = {
  set(key: string, value: unknown): void {
    try {
      const serialized = JSON.stringify(value);
      // Add timestamp for expiry checking
      const wrapped = {
        data: serialized,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(wrapped));
    } catch (e) {
      console.error('SecureStorage set error:', e);
    }
  },
  
  get<T>(key: string, maxAge?: number): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const wrapped = JSON.parse(item);
      
      // Check expiry
      if (maxAge && Date.now() - wrapped.timestamp > maxAge) {
        localStorage.removeItem(key);
        return null;
      }
      
      return JSON.parse(wrapped.data) as T;
    } catch (e) {
      console.error('SecureStorage get error:', e);
      return null;
    }
  },
  
  remove(key: string): void {
    localStorage.removeItem(key);
  },
  
  clear(): void {
    localStorage.clear();
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
  try {
    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    if (!cleaned || cleaned === '-') return null;
    return BigInt(Math.floor(parseFloat(cleaned)));
  } catch {
    return null;
  }
}
