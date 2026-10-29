// Agent action types & parsing helpers
export type AgentAction =
  | { type: 'swap'; fromSymbol: string; toSymbol: string; amount: string; slippage?: number }
  | { type: 'add_liquidity'; tokenA: string; tokenB: string; amountA: string; amountB: string }
  | { type: 'remove_liquidity'; tokenA: string; tokenB: string; lpAmount: string }
  | { type: 'farm_stake'; pid: number; amount: string }
  | { type: 'farm_unstake'; pid: number; amount: string }
  | { type: 'farm_harvest'; pid: number }
  | { type: 'farm_emergency'; pid: number }
  | { type: 'wrap'; amount: string }
  | { type: 'unwrap'; amount: string };

export type ActionStatus = 'pending' | 'confirming' | 'success' | 'error' | 'rejected';

export interface ActionState {
  status: ActionStatus;
  txHash?: string;
  error?: string;
}

const VALID_TYPES = new Set<AgentAction['type']>([
  'swap', 'add_liquidity', 'remove_liquidity',
  'farm_stake', 'farm_unstake', 'farm_harvest', 'farm_emergency',
  'wrap', 'unwrap',
]);

export function extractAgentActions(content: string): { cleaned: string; actions: AgentAction[] } {
  const re = /\[AGENT_ACTION\]\s*([\s\S]*?)\s*\[\/AGENT_ACTION\]/g;
  const actions: AgentAction[] = [];
  const cleaned = content.replace(re, (_, body) => {
    try {
      const parsed = JSON.parse(body);
      if (parsed && VALID_TYPES.has(parsed.type)) {
        actions.push(parsed);
      }
    } catch { /* ignore malformed */ }
    return '';
  }).trim();
  return { cleaned, actions };
}

export function actionLabel(a: AgentAction): string {
  switch (a.type) {
    case 'swap': return `Swap ${a.amount} ${a.fromSymbol} → ${a.toSymbol}`;
    case 'add_liquidity': return `Add LP: ${a.amountA} ${a.tokenA} + ${a.amountB} ${a.tokenB}`;
    case 'remove_liquidity': return `Remove ${a.lpAmount} LP from ${a.tokenA}/${a.tokenB}`;
    case 'farm_stake': return `Stake ${a.amount} in Farm #${a.pid}`;
    case 'farm_unstake': return `Unstake ${a.amount} from Farm #${a.pid}`;
    case 'farm_harvest': return `Harvest rewards from Farm #${a.pid}`;
    case 'farm_emergency': return `Emergency withdraw from Farm #${a.pid}`;
    case 'wrap': return `Wrap ${a.amount} QMS → WQMS`;
    case 'unwrap': return `Unwrap ${a.amount} WQMS → QMS`;
  }
}
