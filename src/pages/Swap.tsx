import { SEO } from '@/components/seo/SEO';
import { SwapCard } from '@/components/swap/SwapCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getChainMeta, isSupportedChain, SUPPORTED_CHAINS } from '@/config/chains';
import { useChainId } from 'wagmi';
import { ArrowRight, ArrowUpRight, CheckCircle2, CircleHelp, ShieldCheck, Wallet } from 'lucide-react';

const executionSteps = [
  {
    title: 'Review a live quote',
    description: 'Routes and estimated output are read from the connected network.',
    icon: CheckCircle2,
  },
  {
    title: 'Approve and confirm',
    description: 'Your wallet authorizes token access and signs each transaction.',
    icon: Wallet,
  },
  {
    title: 'Settle on-chain',
    description: 'The router executes the swap directly from your connected wallet.',
    icon: ArrowRight,
  },
];

export default function Swap() {
  const chainId = useChainId();
  const supported = isSupportedChain(chainId);
  const activeChain = SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
  const chainMeta = getChainMeta(chainId);

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <SEO
        title="Swap Tokens — QUANTAX on QMS Testnet"
        description="Swap tokens on QMS Testnet with on-chain quotes, route discovery, and transparent transaction controls."
        path="/swap"
      />

      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">QUANTAX Exchange</p>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Swap tokens</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Trade directly through smart contracts. Review your quote, price impact, and slippage before you confirm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm ${supported ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
              <span className={`size-2 rounded-full ${supported ? 'bg-success' : 'bg-destructive'}`} aria-hidden="true" />
              <span className="font-medium">{activeChain?.name ?? 'Unsupported network'}</span>
              {supported && <span className="text-xs text-muted-foreground">Chain {chainMeta.id}</span>}
            </div>
            {supported && (
              <a
                href={chainMeta.blockExplorers.default.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border/60 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                Explorer <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            )}
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
          <section aria-label="Token swap" className="w-full">
            <SwapCard />
          </section>

          <aside className="flex flex-col gap-4">
            <Card className="border-border/60 bg-card/70 shadow-lg shadow-black/10">
              <CardHeader className="pb-4">
                <div className="mb-1 flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                  <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
                </div>
                <CardTitle className="text-base">Built for transparent trading</CardTitle>
                <CardDescription>Every step is visible and controlled by your wallet.</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="flex flex-col gap-5">
                  {executionSteps.map(({ title, description, icon: Icon }, index) => (
                    <li key={title} className="flex gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon aria-hidden="true" className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{index + 1}. {title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card className="border-warning/20 bg-warning/[0.04]">
              <CardContent className="flex gap-3 p-4">
                <CircleHelp aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                <div>
                  <p className="text-sm font-semibold">Testnet environment</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {supported
                      ? `You are connected to ${chainMeta.name}. Test tokens have no real-world value.`
                      : 'Connect to a supported test network to request quotes and submit transactions.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
