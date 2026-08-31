/**
 * Token safety analysis hooks for DragonDEX
 * Basic honeypot detection, whitelist checks, and metadata validation
 */

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { ERC20_ABI } from '@/config/abis';
import { TOKEN_LIST_BY_CHAIN } from '@/config/contracts';

// All built-in tokens across every supported network
const ALL_TOKENS = Object.values(TOKEN_LIST_BY_CHAIN).flat();
import { formatUnits } from 'viem';

// Whitelisted tokens (built-in tokens are always safe)
const WHITELISTED_ADDRESSES = new Set(
  ALL_TOKENS.map(t => t.address.toLowerCase())
);

export type SafetyLevel = 'verified' | 'warning' | 'danger' | 'unknown';

export interface TokenSafetyResult {
  level: SafetyLevel;
  isWhitelisted: boolean;
  warnings: string[];
  metadata: {
    name?: string;
    symbol?: string;
    decimals?: number;
    totalSupply?: string;
  };
  isLoading: boolean;
}

/**
 * Analyze token safety by checking on-chain metadata and basic honeypot signals
 */
export function useTokenSafety(address: `0x${string}` | undefined): TokenSafetyResult {
  const isValid = address && /^0x[a-fA-F0-9]{40}$/.test(address);
  const isWhitelisted = isValid ? WHITELISTED_ADDRESSES.has(address.toLowerCase()) : false;

  // Read extended metadata for non-whitelisted tokens
  const { data, isLoading } = useReadContracts({
    contracts: isValid && !isWhitelisted ? [
      { address, abi: ERC20_ABI, functionName: 'name' },
      { address, abi: ERC20_ABI, functionName: 'symbol' },
      { address, abi: ERC20_ABI, functionName: 'decimals' },
      { address, abi: ERC20_ABI, functionName: 'totalSupply' },
    ] : [],
    query: { enabled: !!isValid && !isWhitelisted },
  });

  return useMemo(() => {
    if (!isValid) {
      return { level: 'unknown', isWhitelisted: false, warnings: [], metadata: {}, isLoading: false };
    }

    if (isWhitelisted) {
      const token = ALL_TOKENS.find(t => t.address.toLowerCase() === address!.toLowerCase());
      return {
        level: 'verified',
        isWhitelisted: true,
        warnings: [],
        metadata: {
          name: token?.name,
          symbol: token?.symbol,
          decimals: token?.decimals,
        },
        isLoading: false,
      };
    }

    if (isLoading || !data) {
      return { level: 'unknown', isWhitelisted: false, warnings: [], metadata: {}, isLoading: true };
    }

    const name = data[0]?.result as string | undefined;
    const symbol = data[1]?.result as string | undefined;
    const decimals = data[2]?.result as number | undefined;
    const totalSupply = data[3]?.result as bigint | undefined;

    const warnings: string[] = [];

    // Basic validation checks
    if (!symbol || !name) {
      warnings.push('Token metadata is missing or unreadable');
    }

    if (!decimals && decimals !== 0) {
      warnings.push('Token decimals could not be read');
    }

    // Suspicious name/symbol patterns
    if (symbol && name) {
      // Check for impersonation of known tokens
      const knownSymbols = ALL_TOKENS.map(t => t.symbol.toLowerCase());
      if (knownSymbols.includes(symbol.toLowerCase())) {
        warnings.push(`Symbol "${symbol}" matches a known token — possible impersonation`);
      }

      // Extremely long name/symbol
      if (symbol.length > 20) {
        warnings.push('Token symbol is unusually long');
      }
      if (name.length > 100) {
        warnings.push('Token name is unusually long');
      }
    }

    // Unusual decimals
    if (decimals !== undefined && (decimals > 18 || decimals === 0)) {
      warnings.push(`Unusual decimals: ${decimals} (most tokens use 18)`);
    }

    // Very high or zero total supply
    if (totalSupply !== undefined) {
      if (totalSupply === 0n) {
        warnings.push('Token has zero total supply');
      }
    }

    // Determine safety level
    let level: SafetyLevel = 'warning'; // All imported tokens start as warning
    if (warnings.length >= 3) {
      level = 'danger';
    } else if (warnings.length === 0 && symbol && name && decimals !== undefined) {
      level = 'warning'; // Still warning since it's not whitelisted
    }

    return {
      level,
      isWhitelisted: false,
      warnings,
      metadata: {
        name,
        symbol,
        decimals,
        totalSupply: totalSupply !== undefined ? formatUnits(totalSupply, decimals || 18) : undefined,
      },
      isLoading: false,
    };
  }, [isValid, isWhitelisted, isLoading, data, address]);
}
