import { SEO } from '@/components/seo/SEO';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, ExternalLink, Copy, FileCode } from 'lucide-react';
import {
  CONTRACTS_BY_CHAIN,
  TOKEN_LIST_BY_CHAIN,
} from '@/config/contracts';
import { SUPPORTED_CHAINS, OPN_CHAIN_ID, AER_CHAIN_ID, getChainMeta } from '@/config/chains';
import { FARMING_BY_CHAIN } from '@/config/farming';
import { toast } from 'sonner';

interface Row {
  name: string;
  address: string;
  status: 'done' | 'pending';
  notes?: string;
  hooks?: string[];
}

function buildCore(chainId: number): Row[] {
  const c = CONTRACTS_BY_CHAIN[chainId];
  const farm = FARMING_BY_CHAIN[chainId];
  const wrappedLabel = chainId === AER_CHAIN_ID ? 'WAER' : 'WOPN';
  const rows: Row[] = [
    { name: 'UniswapV2Factory', address: c.FACTORY, status: 'done', hooks: ['useLiquidityPools', 'CreatePool'] },
    { name: 'UniswapV2Router02', address: c.ROUTER, status: 'done', hooks: ['useSwapRouter', 'Liquidity', 'Swap'] },
    { name: `${wrappedLabel} (WETH9)`, address: c.WETH, status: 'done', hooks: ['Wrap/Unwrap', 'Native swap'] },
    { name: 'UniswapV2Library', address: c.LIBRARY, status: 'done', notes: 'Helper (no public functions)' },
    { name: 'Multicall', address: c.MULTICALL, status: 'done', hooks: ['Batched reads'] },
    { name: 'MultiPoolFarm', address: farm, status: 'done', hooks: ['/farming', '/admin/farming'] },
  ];
  if (c.FAUCET) rows.push({ name: 'Faucet', address: c.FAUCET, status: 'done', notes: 'Testnet token faucet' });
  return rows;
}

function shorten(a: string) {
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}

function RowItem({ row, explorer }: { row: Row; explorer: string }) {
  const copy = () => {
    navigator.clipboard.writeText(row.address);
    toast.success('Address disalin');
  };
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-card/40 border border-border/40 hover:border-primary/40 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{row.name}</span>
          {row.status === 'done' ? (
            <Badge className="bg-success/20 text-success border-success/40 gap-1">
              <CheckCircle2 className="w-3 h-3" /> Live
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-warning border-warning/40">
              <Clock className="w-3 h-3" /> Pending
            </Badge>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground font-mono mt-1 break-all">{row.address}</div>
        {row.notes && <p className="text-[11px] text-muted-foreground mt-1">{row.notes}</p>}
        {row.hooks && (
          <div className="flex flex-wrap gap-1 mt-2">
            {row.hooks.map((h) => (
              <span key={h} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {h}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={copy}>
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <a href={`${explorer}/address/${row.address}`} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline">
            <ExternalLink className="w-3.5 h-3.5 mr-1" /> {shorten(row.address)}
          </Button>
        </a>
      </div>
    </div>
  );
}

function ChainSection({ chainId }: { chainId: number }) {
  const meta = getChainMeta(chainId);
  const explorer = meta.blockExplorers.default.url;
  const core = buildCore(chainId);
  const tokens = TOKEN_LIST_BY_CHAIN[chainId].filter((t) => !t.isNative);

  return (
    <Card className="p-5 mb-6 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-primary/20">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold">{meta.name}</h2>
          <p className="text-xs text-muted-foreground">
            Chain ID {meta.id} · Native {meta.nativeCurrency.symbol}
          </p>
        </div>
        <a href={explorer} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          Explorer <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Core Contracts</h3>
      <div className="space-y-2 mb-5">
        {core.map((r) => <RowItem key={r.address} row={r} explorer={explorer} />)}
      </div>

      <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Tokens</h3>
      <div className="space-y-2">
        {tokens.map((t) => (
          <RowItem
            key={t.address}
            explorer={explorer}
            row={{ name: `${t.symbol} — ${t.name}`, address: t.address, status: 'done' }}
          />
        ))}
      </div>
    </Card>
  );
}

export default function ContractStatus() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <SEO
        title="Contract Status — DRAGONDEX"
        description="Status implementasi smart contract DragonDEX di OPN Testnet & AEREDIUM Testnet"
        path="/status"
      />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40">
            <FileCode className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">Contract Status</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          DragonDEX kini multi-chain — aktif di{' '}
          {SUPPORTED_CHAINS.map((c, i) => (
            <span key={c.id}>
              <span className="text-primary font-semibold">{c.name}</span>
              {i < SUPPORTED_CHAINS.length - 1 ? ' & ' : ''}
            </span>
          ))}
          .
        </p>
      </div>

      <ChainSection chainId={OPN_CHAIN_ID} />
      <ChainSection chainId={AER_CHAIN_ID} />
    </div>
  );
}
