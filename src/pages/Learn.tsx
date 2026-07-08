import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, ArrowLeftRight, Droplets, Sprout, AlertTriangle, GraduationCap,
  ChevronRight, ArrowRight, ShieldCheck, TrendingDown, Coins,
} from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import { Spotlight } from '@/components/ui/magic/Spotlight';
import { cn } from '@/lib/utils';

type GuideId = 'what-is-a-dex' | 'how-to-swap' | 'providing-liquidity' | 'farming-risks' | 'impermanent-loss';

interface Guide {
  id: GuideId;
  title: string;
  short: string;
  minutes: number;
  icon: React.ComponentType<{ className?: string }>;
  cta: { label: string; href: string };
  sections: { heading: string; body: React.ReactNode }[];
}

const GUIDES: Guide[] = [
  {
    id: 'what-is-a-dex',
    title: 'What is a DEX?',
    short: 'How decentralized exchanges work, and why AMMs replaced order books.',
    minutes: 4,
    icon: BookOpen,
    cta: { label: 'Try a Swap', href: '/swap' },
    sections: [
      {
        heading: 'Centralized vs Decentralized',
        body: (
          <>
            A centralized exchange (CEX) holds your funds in its own wallet and matches trades on an internal
            order book. A decentralized exchange (DEX) never touches your keys — trades settle directly from
            your wallet against smart contracts on-chain. You keep custody at every step.
          </>
        ),
      },
      {
        heading: 'The AMM Model',
        body: (
          <>
            DRAGONDEX uses the constant-product AMM formula <code className="px-1.5 py-0.5 rounded bg-muted text-primary text-xs">x·y = k</code>.
            Every pool holds two tokens; the product of their reserves stays constant, so every trade shifts price
            along a curve. Bigger trades relative to pool size = bigger price impact.
          </>
        ),
      },
      {
        heading: 'Where fees go',
        body: (
          <>Every swap pays a <b>0.30% fee</b> that is added back to the pool reserves. Liquidity providers (LPs)
            earn their share of those fees proportional to their pool ownership.</>
        ),
      },
    ],
  },
  {
    id: 'how-to-swap',
    title: 'How to Swap',
    short: 'From wallet connection to a signed transaction, step by step.',
    minutes: 3,
    icon: ArrowLeftRight,
    cta: { label: 'Open Swap', href: '/swap' },
    sections: [
      {
        heading: '1. Connect your wallet',
        body: <>Click <b>Connect Wallet</b> in the header. DRAGONDEX supports MetaMask, Rabby, OKX, Bitget, WalletConnect and more. Make sure you are on <b>OPN Testnet</b> — the UI will prompt you to switch if not.</>,
      },
      {
        heading: '2. Choose tokens & amount',
        body: <>Select the token you have (top) and the token you want (bottom). Type an amount or hit <b>MAX</b>. The router auto-calculates the output, estimates price impact, and picks the best route (direct or multi-hop).</>,
      },
      {
        heading: '3. Review price impact',
        body: <>If impact exceeds 3% you'll see a warning. Above 5% the confirm modal requires an explicit acknowledgment. This protects you from thin liquidity and sandwich attacks.</>,
      },
      {
        heading: '4. Confirm in wallet',
        body: <>Approve token spending if needed (one-time per token), then sign the swap. The tx appears in your Notification Center and Portfolio history automatically.</>,
      },
    ],
  },
  {
    id: 'providing-liquidity',
    title: 'Providing Liquidity',
    short: 'Deposit two tokens, receive LP tokens, earn a share of every trade.',
    minutes: 4,
    icon: Droplets,
    cta: { label: 'Add Liquidity', href: '/liquidity' },
    sections: [
      {
        heading: 'What LPs actually do',
        body: <>You deposit equal <b>value</b> of two tokens into a pool. In return you receive LP tokens representing your share. Every swap through that pool pays a 0.30% fee, which grows the reserves — so your LP tokens redeem for slightly more over time.</>,
      },
      {
        heading: 'Ratio matters',
        body: <>For existing pools you must match the current reserve ratio. DRAGONDEX auto-calculates the second amount when you type the first. New pools you can seed at any ratio — that ratio becomes the initial price.</>,
      },
      {
        heading: 'Removing liquidity',
        body: <>Burn your LP tokens on the <Link to="/liquidity" className="text-primary underline">Liquidity page</Link> to withdraw your share of both tokens plus accrued fees. There's no lockup and no penalty.</>,
      },
    ],
  },
  {
    id: 'impermanent-loss',
    title: 'Impermanent Loss',
    short: 'The one risk every LP must understand before depositing.',
    minutes: 5,
    icon: TrendingDown,
    cta: { label: 'Check Pools', href: '/pools' },
    sections: [
      {
        heading: 'The core idea',
        body: <>When the price of one token in your pool moves relative to the other, arbitrageurs rebalance the pool by trading against you. You end up with more of the losing token and less of the winning one. Compared to simply <b>holding</b> both tokens, your LP position underperforms — that gap is impermanent loss (IL).</>,
      },
      {
        heading: 'It becomes real when you withdraw',
        body: <>IL is "impermanent" only if prices recover. If you exit while prices are diverged, the loss crystallizes. Fees earned partly offset IL — high-volume pools often net positive despite IL.</>,
      },
      {
        heading: 'Rough numbers',
        body: (
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>1.25x price divergence → ~0.6% IL</li>
            <li>1.5x → ~2.0% IL</li>
            <li>2x → ~5.7% IL</li>
            <li>4x → ~20% IL</li>
          </ul>
        ),
      },
      {
        heading: 'How to reduce risk',
        body: <>Provide liquidity to <b>correlated pairs</b> (e.g. stables, or two wrapped versions of the same asset) where price divergence is naturally small. Or seek pools with fee revenue that outpaces expected IL.</>,
      },
    ],
  },
  {
    id: 'farming-risks',
    title: 'Farming Risks',
    short: 'Yield farming amplifies both rewards and risk. Know both.',
    minutes: 4,
    icon: Sprout,
    cta: { label: 'View Farms', href: '/farming' },
    sections: [
      {
        heading: 'What farming is',
        body: <>You stake your LP tokens into a farm contract. The farm emits a reward token (usually DRAGON) block-by-block, proportional to your share. You earn the LP fees AND the farm rewards simultaneously.</>,
      },
      {
        heading: 'Layered risks',
        body: (
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><b>Smart contract risk</b> — a bug in the farm contract could drain funds.</li>
            <li><b>Impermanent loss</b> — you still hold the LP, so IL still applies.</li>
            <li><b>Reward token volatility</b> — APR is quoted in the reward token; if it dumps, real yield collapses.</li>
            <li><b>Emergency withdraw forfeits pending rewards</b> — use only in an incident.</li>
          </ul>
        ),
      },
      {
        heading: 'APR ≠ APY',
        body: <>Displayed APR assumes reward price and pool size stay constant. Real yield changes every block. Compounding manually (harvest → re-add liquidity → re-stake) is how APR becomes APY.</>,
      },
    ],
  },
];

const jsonLdArticle = (g: Guide) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: g.title,
  description: g.short,
  author: { '@type': 'Organization', name: 'DragonDEX' },
  publisher: {
    '@type': 'Organization',
    name: 'DragonDEX',
    logo: { '@type': 'ImageObject', url: 'https://dragondex.lovable.app/tokens/dragon.png' },
  },
  mainEntityOfPage: `https://dragondex.lovable.app/learn?guide=${g.id}`,
});

const jsonLdBreadcrumb = (g?: Guide) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://dragondex.lovable.app/' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://dragondex.lovable.app/learn' },
    ...(g ? [{ '@type': 'ListItem', position: 3, name: g.title, item: `https://dragondex.lovable.app/learn?guide=${g.id}` }] : []),
  ],
});

export default function Learn() {
  const [params, setParams] = useSearchParams();
  const activeId = (params.get('guide') as GuideId | null);
  const active = useMemo(() => GUIDES.find(g => g.id === activeId) || null, [activeId]);

  const [selected, setSelected] = useState<GuideId | null>(activeId);
  const openGuide = (id: GuideId) => {
    setSelected(id);
    setParams({ guide: id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const backToIndex = () => {
    setSelected(null);
    setParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const current = active;
  const title = current
    ? `${current.title} — DRAGONDEX Learn`
    : 'Learn DeFi & DragonDEX — Guides for Swaps, Liquidity & Farming';
  const description = current
    ? current.short
    : 'Short, plain-English guides on DEXs, swapping, providing liquidity, impermanent loss, and yield farming on DragonDEX.';
  const path = current ? `/learn?guide=${current.id}` : '/learn';

  return (
    <div className="container mx-auto px-4 py-6 md:py-10 pb-24 lg:pb-10 relative min-h-screen">
      <SEO
        title={title}
        description={description}
        path={path}
        jsonLd={current ? [jsonLdArticle(current), jsonLdBreadcrumb(current)] : [jsonLdBreadcrumb()]}
      />
      <Spotlight className="hidden md:block" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-4xl mx-auto"
      >
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          {current ? (
            <>
              <button onClick={backToIndex} className="hover:text-primary transition-colors">Learn</button>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground">{current.title}</span>
            </>
          ) : (
            <span className="text-foreground">Learn</span>
          )}
        </nav>

        {/* Header */}
        <header className="text-center mb-8 md:mb-12">
          <span className="ember-pill inline-flex items-center gap-2 text-xs mb-4">
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="uppercase tracking-[0.18em]">DragonDEX Learn</span>
          </span>
          <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold gradient-text mb-3 tracking-tight">
            {current ? current.title : 'Learn DeFi, the Dragon Way'}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            {current
              ? current.short
              : 'Bite-sized, plain-English guides on how decentralized exchanges, liquidity, and yield farming actually work.'}
          </p>
        </header>

        {!current ? (
          /* Index grid */
          <div className="grid sm:grid-cols-2 gap-4">
            {GUIDES.map((g, i) => {
              const Icon = g.icon;
              return (
                <motion.button
                  key={g.id}
                  onClick={() => openGuide(g.id)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  className={cn(
                    'group text-left rounded-2xl p-5 md:p-6',
                    'bg-card/60 border border-border/60 backdrop-blur-xl',
                    'hover:border-primary/60 hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.4)] transition-all',
                  )}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/25 to-secondary/25 border border-primary/30 flex items-center justify-center text-primary">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-display font-bold text-base md:text-lg tracking-tight">{g.title}</h2>
                      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mt-0.5">
                        {g.minutes} min read
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{g.short}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                    Read guide <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </motion.button>
              );
            })}
          </div>
        ) : (
          /* Guide detail */
          <article className="glass-card p-5 md:p-8">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-6">
              <current.icon className="w-4 h-4 text-primary" />
              {current.minutes} min read
              <span className="opacity-40">•</span>
              <span>DragonDEX Learn</span>
            </div>

            <div className="prose prose-invert max-w-none space-y-6">
              {current.sections.map((s) => (
                <section key={s.heading}>
                  <h2 className="font-display text-lg md:text-xl font-bold mb-2 text-foreground">
                    {s.heading}
                  </h2>
                  <div className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {s.body}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
              <Button variant="outline" onClick={backToIndex} className="min-h-11">
                ← All guides
              </Button>
              <Link to={current.cta.href}>
                <Button className="btn-dragon w-full sm:w-auto min-h-11">
                  {current.cta.label}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Related */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-3">Continue learning</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {GUIDES.filter(g => g.id !== current.id).slice(0, 4).map(g => (
                  <button
                    key={g.id}
                    onClick={() => openGuide(g.id)}
                    className="text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/30 transition-colors"
                  >
                    <g.icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">{g.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </article>
        )}

        {/* Safety footer */}
        {!current && (
          <div className="mt-10 flex items-start gap-3 p-4 rounded-xl border border-warning/30 bg-warning/5">
            <ShieldCheck className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              DragonDEX is deployed on <b>OPN Testnet</b>. All tokens on this network are for testing only and carry no monetary value. Never share your seed phrase; the DragonDEX team will never DM you first.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
