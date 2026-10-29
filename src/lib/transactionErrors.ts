/**
 * Transaction error decoder and retry utilities for QuantaX
 * Parses revert reasons from blockchain errors and provides user-friendly messages
 */

// Known revert reason signatures mapped to user-friendly messages
const REVERT_REASONS: Record<string, { title: string; description: string; suggestion: string }> = {
  'INSUFFICIENT_OUTPUT_AMOUNT': {
    title: 'Slippage Too Low',
    description: 'The price moved beyond your slippage tolerance during the transaction.',
    suggestion: 'Increase slippage tolerance or reduce trade size.',
  },
  'INSUFFICIENT_A_AMOUNT': {
    title: 'Insufficient Token Amount',
    description: 'Not enough token A to complete this liquidity operation.',
    suggestion: 'Adjust the amounts or check your balance.',
  },
  'INSUFFICIENT_B_AMOUNT': {
    title: 'Insufficient Token Amount',
    description: 'Not enough token B to complete this liquidity operation.',
    suggestion: 'Adjust the amounts or check your balance.',
  },
  'INSUFFICIENT_LIQUIDITY': {
    title: 'Insufficient Liquidity',
    description: 'The pool does not have enough liquidity for this trade.',
    suggestion: 'Try a smaller amount or wait for more liquidity.',
  },
  'INSUFFICIENT_INPUT_AMOUNT': {
    title: 'Input Amount Too Low',
    description: 'The input amount is too small for this trade.',
    suggestion: 'Increase the input amount.',
  },
  'EXPIRED': {
    title: 'Transaction Expired',
    description: 'The transaction deadline has passed.',
    suggestion: 'Try again — deadlines are set automatically.',
  },
  'TRANSFER_FAILED': {
    title: 'Transfer Failed',
    description: 'The token transfer could not be completed.',
    suggestion: 'Check your token balance and approval.',
  },
  'IDENTICAL_ADDRESSES': {
    title: 'Same Token Selected',
    description: 'Cannot swap a token for itself.',
    suggestion: 'Select a different output token.',
  },
  'INSUFFICIENT_LIQUIDITY_MINTED': {
    title: 'Liquidity Too Small',
    description: 'The amount of liquidity tokens to mint is too small.',
    suggestion: 'Increase both token amounts.',
  },
  'INSUFFICIENT_LIQUIDITY_BURNED': {
    title: 'Liquidity Removal Failed',
    description: 'Cannot remove the requested amount of liquidity.',
    suggestion: 'Reduce the amount you are trying to remove.',
  },
  'K': {
    title: 'Invariant Violation',
    description: 'The constant product invariant check failed.',
    suggestion: 'This may be a token issue. Try again or contact support.',
  },
};

// User-rejected error patterns
const USER_REJECTED_PATTERNS = [
  'user rejected',
  'user denied',
  'rejected the request',
  'user cancelled',
  'action_rejected',
  'UserRejectedRequestError',
];

// Network / RPC error patterns
const NETWORK_ERROR_PATTERNS = [
  'network error',
  'timeout',
  'could not detect network',
  'failed to fetch',
  'NETWORK_ERROR',
  'disconnected',
  'ECONNREFUSED',
];

// Gas estimation error patterns  
const GAS_ERROR_PATTERNS = [
  'gas required exceeds',
  'out of gas',
  'intrinsic gas too low',
  'UNPREDICTABLE_GAS_LIMIT',
  'execution reverted',
];

export interface ParsedTransactionError {
  type: 'user_rejected' | 'slippage' | 'network' | 'gas' | 'revert' | 'unknown';
  title: string;
  description: string;
  suggestion: string;
  canRetry: boolean;
  originalMessage: string;
}

/**
 * Decode a blockchain transaction error into a user-friendly message
 */
export function parseTransactionError(error: Error | unknown): ParsedTransactionError {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // 1. User rejected
  if (USER_REJECTED_PATTERNS.some(p => lowerMessage.includes(p.toLowerCase()))) {
    return {
      type: 'user_rejected',
      title: 'Transaction Cancelled',
      description: 'You cancelled the transaction in your wallet.',
      suggestion: 'Click swap again when you\'re ready.',
      canRetry: true,
      originalMessage: message,
    };
  }

  // 2. Network errors
  if (NETWORK_ERROR_PATTERNS.some(p => lowerMessage.includes(p.toLowerCase()))) {
    return {
      type: 'network',
      title: 'Network Error',
      description: 'Could not connect to the QMS Testnet.',
      suggestion: 'Check your internet connection and try again.',
      canRetry: true,
      originalMessage: message,
    };
  }

  // 3. Gas errors
  if (GAS_ERROR_PATTERNS.some(p => lowerMessage.includes(p.toLowerCase()))) {
    // Check for known revert reasons within gas errors
    const revertMatch = extractRevertReason(message);
    if (revertMatch) {
      const known = REVERT_REASONS[revertMatch];
      if (known) {
        return {
          type: revertMatch === 'INSUFFICIENT_OUTPUT_AMOUNT' ? 'slippage' : 'revert',
          ...known,
          canRetry: true,
          originalMessage: message,
        };
      }
    }

    return {
      type: 'gas',
      title: 'Transaction Would Fail',
      description: 'The transaction is estimated to fail on-chain.',
      suggestion: 'Try increasing slippage, reducing amount, or check token approvals.',
      canRetry: true,
      originalMessage: message,
    };
  }

  // 4. Known revert reasons
  const revertReason = extractRevertReason(message);
  if (revertReason && REVERT_REASONS[revertReason]) {
    const known = REVERT_REASONS[revertReason];
    return {
      type: revertReason === 'INSUFFICIENT_OUTPUT_AMOUNT' ? 'slippage' : 'revert',
      ...known,
      canRetry: true,
      originalMessage: message,
    };
  }

  // 5. Nonce too low
  if (lowerMessage.includes('nonce') && lowerMessage.includes('too low')) {
    return {
      type: 'network',
      title: 'Nonce Conflict',
      description: 'A previous transaction is still pending.',
      suggestion: 'Wait a moment and try again.',
      canRetry: true,
      originalMessage: message,
    };
  }

  // 6. Insufficient funds for gas
  if (lowerMessage.includes('insufficient funds') || lowerMessage.includes('insufficient balance')) {
    return {
      type: 'gas',
      title: 'Insufficient Gas',
      description: 'You don\'t have enough QMS to pay for gas fees.',
      suggestion: 'Get more QMS from a faucet to cover gas.',
      canRetry: false,
      originalMessage: message,
    };
  }

  // 7. Unknown error
  return {
    type: 'unknown',
    title: 'Transaction Failed',
    description: truncateMessage(message, 120),
    suggestion: 'Try again or adjust your swap parameters.',
    canRetry: true,
    originalMessage: message,
  };
}

/**
 * Extract revert reason string from error message
 */
function extractRevertReason(message: string): string | null {
  // Match patterns like: reverted with reason string 'INSUFFICIENT_OUTPUT_AMOUNT'
  const reasonMatch = message.match(/reason\s*(?:string\s*)?['":]?\s*['"]?([A-Z_]+)['"]?/i);
  if (reasonMatch) return reasonMatch[1].toUpperCase();

  // Match: execution reverted: INSUFFICIENT_OUTPUT_AMOUNT
  const revertMatch = message.match(/reverted[:\s]*([A-Z_]+)/i);
  if (revertMatch) return revertMatch[1].toUpperCase();

  // Direct check against known reasons
  for (const reason of Object.keys(REVERT_REASONS)) {
    if (message.toUpperCase().includes(reason)) {
      return reason;
    }
  }

  return null;
}

function truncateMessage(msg: string, maxLen: number): string {
  if (msg.length <= maxLen) return msg;
  return msg.slice(0, maxLen) + '...';
}

/**
 * Get toast config based on error type
 */
export function getErrorToastConfig(parsed: ParsedTransactionError) {
  const icons: Record<string, string> = {
    user_rejected: '✋',
    slippage: '📊',
    network: '🌐',
    gas: '⛽',
    revert: '⚠️',
    unknown: '❌',
  };

  return {
    icon: icons[parsed.type] || '❌',
    duration: parsed.type === 'user_rejected' ? 3000 : 6000,
  };
}
