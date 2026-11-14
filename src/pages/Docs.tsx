import { SEO } from '@/components/seo/SEO';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Code, Shield, Zap, ExternalLink, FileText,
  Rocket, Database, Layers, Wallet, ArrowRightLeft, TrendingUp, BarChart3, Coins, Lock,
  Globe, Server, Box, ChevronRight, Star, Check, Target, Flame, Vote, Sparkles,
  AlertTriangle, RefreshCw, Banknote, PieChart, Settings, Award, Gift,
  Search, Info, HelpCircle, Cpu, ListChecks, MessageCircle, Clock, Send
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WalletButton } from '@/components/wallet/WalletButton';

// Sidebar navigation structure
const sidebarSections = [
  {
    label: 'GETTING STARTED',
    items: [
      { id: 'introduction', label: 'Introduction', icon: BookOpen },
      { id: 'connect-wallet', label: 'Connect Wallet', icon: Wallet },
    ],
  },
  {
    label: 'USER GUIDES',
    items: [
      { id: 'how-to-swap', label: 'How to Swap', icon: ArrowRightLeft },
      { id: 'provide-liquidity', label: 'Provide Liquidity', icon: Coins },
      { id: 'portfolio-send', label: 'Portfolio & Send', icon: Send },
      { id: 'analytics-pairs', label: 'Analytics & Pairs', icon: BarChart3 },
    ],
  },
  {
    label: 'DEFI CONCEPTS',
    items: [
      { id: 'amm-pricing', label: 'AMM & Pricing', icon: TrendingUp },
      { id: 'impermanent-loss', label: 'Impermanent Loss', icon: AlertTriangle },
      { id: 'slippage-price-impact', label: 'Slippage & Price Impact', icon: Zap },
      { id: 'lp-tokens-fees', label: 'LP Tokens & Fees', icon: Coins },
    ],
  },
  {
    label: 'TECHNICAL',
    items: [
      { id: 'technology-stack', label: 'Technology Stack', icon: Cpu },
      { id: 'smart-contracts', label: 'Smart Contracts', icon: Code },
      { id: 'supported-tokens', label: 'Supported Tokens', icon: ListChecks },
    ],
  },
  {
    label: 'ROADMAP & FAQ',
    items: [
      { id: 'roadmap', label: 'Development Roadmap', icon: Target },
      { id: 'faq', label: 'FAQ', icon: HelpCircle },
    ],
  },
];

const allNavItems = sidebarSections.flatMap(s => s.items);

// Content sections data
const contracts = [
  { name: 'Factory', address: '0x97C305119f5D98aFd11bCD19a1ba8c27d68F3546', description: 'Creates new trading pairs' },
  { name: 'Router', address: '0x3A153e8BcDe02F4Cf6C5eeECD9c83bC0296FFbD3', description: 'Handles swap routing' },
  { name: 'WQMS', address: '0x9AA510295aC664A3d5A3182a3eFe959DE2B12c34', description: 'Wrapped QMS token' },
  { name: 'Library', address: '0x03D2D542100fa926de135a08B609c8538E45F6ee', description: 'Helper functions' },
  { name: 'Multicall', address: '0x8705875084c72C0cDC01c1Ac36A807808c8E5850', description: 'Batch contract calls' },
  { name: 'Farming', address: '0xA5A90E43Df65AD62E45Edc526A1FD147cdDea6c8', description: 'MultiPool farming/staking' },
  { name: 'QTX', address: '0x66E5cbb0325Ab93B42c16592Be91456cc195E427', description: 'Native DEX token' },
];

const tokens = [
  { symbol: 'QMS', name: 'QMS (Native)', type: 'Native Gas Token' },
  { symbol: 'WQMS', name: 'Wrapped QMS', type: 'Wrapped Native' },
  { symbol: 'QTX', name: 'QuantaX Token', type: 'DEX Governance' },
  { symbol: 'BNB', name: 'Binance Coin', type: 'Wrapped' },
  { symbol: 'ETH', name: 'Ethereum', type: 'Wrapped' },
  { symbol: 'MON', name: 'Monad', type: 'Wrapped' },
  { symbol: 'HYPE', name: 'Hyperliquid', type: 'Wrapped' },
];

const roadmapItems = [
  { title: 'Phase 1 - Foundation', status: 'done' as const, features: ['Smart Contracts', 'Token Swap', 'Wallet Integration'] },
  { title: 'Phase 2 - Liquidity', status: 'done' as const, features: ['Add Liquidity', 'Remove Liquidity', 'Pool Creation'] },
  { title: 'Phase 3 - Analytics & Portfolio', status: 'done' as const, features: ['Analytics Dashboard', 'Portfolio Tracker', 'Price Charts'] },
  { title: 'Phase 4 - Premium UI', status: 'done' as const, features: ['3D Animations', 'Particle Effects', 'Glassmorphism'] },
  { title: 'Phase 5 - AI & Optimization', status: 'done' as const, features: ['QuantaBot AI', 'Multi-hop Routing', 'Send/Transfer'] },
  { title: 'Phase 6 - Governance & DAO', status: 'upcoming' as const, features: ['DAO Voting', 'Proposal System', 'Treasury Management'] },
  { title: 'Phase 7 - Advanced Trading', status: 'upcoming' as const, features: ['Limit Orders', 'Stop Loss', 'Advanced Charts'] },
  { title: 'Phase 8 - Cross-Chain', status: 'upcoming' as const, features: ['Bridge Integration', 'Cross-Chain Swap', 'Multi-Network'] },
];

const faqs = [
  { q: 'What is QUANTAX?', a: 'QUANTAX is a decentralized exchange (DEX) built on QMS Testnet using the automated market maker (AMM) model. It allows users to swap tokens and provide liquidity to earn trading fees.' },
  { q: 'How do I get started?', a: 'Connect a Web3 wallet (MetaMask, OKX, Rabby, or Bitget), get some testnet QMS, and you\'re ready to start trading!' },
  { q: 'What are the trading fees?', a: 'The fee rate and distribution are determined by the deployed contracts. QUANTAX does not display an unverified fee estimate; verify the router and pair configuration before trading or providing liquidity.' },
  { q: 'Is QUANTAX safe?', a: 'This interface is not a security audit. Verify the deployed contract source and bytecode, permissions, and independent audit reports before connecting a wallet or depositing assets. Smart-contract interactions carry risk.' },
  { q: 'What wallets are supported?', a: 'MetaMask, OKX Wallet, Rabby Wallet, and Bitget Wallet are all supported. Any EVM-compatible wallet should work.' },
  { q: 'What is impermanent loss?', a: 'Impermanent loss occurs when the price ratio of tokens in a liquidity pool changes compared to when you deposited. The bigger the change, the more impermanent loss you experience.' },
];

// ===== Section content components =====

function SectionIntroduction() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl md:text-4xl font-bold">Welcome to QUANTAX</h1>
      <p className="text-muted-foreground leading-relaxed">
        QUANTAX is a decentralized exchange built on <strong className="text-foreground">QMS Testnet</strong>, powered by the battle-tested <strong className="text-foreground">UniswapV2</strong> protocol. Trade, provide liquidity, and earn — all without intermediaries.
      </p>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Shield, title: 'Non-Custodial', desc: 'You always maintain full control over your assets' },
          { icon: Zap, title: 'Fast & Cheap', desc: 'Low gas fees on QMS Testnet' },
          { icon: Code, title: 'Open Source', desc: 'Verified and transparent smart contracts' },
        ].map((f, i) => (
          <div key={i} className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <f.icon className="w-5 h-5 text-primary mb-2" />
            <h3 className="font-semibold text-sm">{f.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* New to DeFi banner */}
      <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 flex items-start gap-3">
        <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">New to DeFi?</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start by connecting your wallet, then try your first swap. Use QuantaBot AI (bottom-right button) for help anytime!
          </p>
        </div>
      </div>

      {/* Key Features grid */}
      <h2 className="text-xl font-bold pt-4">🔥 Key Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: ArrowRightLeft, title: 'Token Swap', desc: 'Instantly trade tokens with AMM pricing', color: 'text-primary' },
          { icon: Coins, title: 'Liquidity Pools', desc: 'Provide liquidity; fees follow deployed contract terms', color: 'text-accent' },
          { icon: BarChart3, title: 'Analytics', desc: 'Real-time charts, TVL, volume, pair data', color: 'text-secondary' },
          { icon: Wallet, title: 'Portfolio', desc: 'Track holdings, LP positions, send tokens', color: 'text-primary' },
          { icon: MessageCircle, title: 'QuantaBot AI', desc: 'AI assistant with real-time price data', color: 'text-accent' },
          { icon: Clock, title: 'History', desc: 'Complete transaction history with details', color: 'text-secondary' },
        ].map((f, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <f.icon className={cn("w-5 h-5", f.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionConnectWallet() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Connect Wallet</h1>
      <p className="text-muted-foreground">To use QUANTAX, you need a Web3 wallet connected to the QMS Testnet.</p>

      <h2 className="text-xl font-bold">Supported Wallets</h2>
      <div className="grid grid-cols-2 gap-3">
        {['MetaMask', 'OKX Wallet', 'Rabby Wallet', 'Bitget Wallet'].map(w => (
          <div key={w} className="p-3 rounded-lg bg-card border border-border flex items-center gap-2">
            <Check className="w-4 h-4 text-success" />
            <span className="text-sm font-medium">{w}</span>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold">Network Configuration</h2>
      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        {[
          ['Network Name', 'QMS Testnet'],
          ['Chain ID', '19480'],
          ['RPC URL', 'https://rpc.testnet.qms.finance'],
          ['Currency Symbol', 'QMS'],
          ['Block Explorer', 'https://testnet.qmsscan.io'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono text-xs">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <WalletButton />
      </div>
    </div>
  );
}

function SectionHowToSwap() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">How to Swap</h1>
      <p className="text-muted-foreground">Swap tokens instantly using our AMM-powered exchange.</p>

      <h2 className="text-xl font-bold">Step by Step</h2>
      <ol className="space-y-4">
        {[
          { step: 1, title: 'Connect Your Wallet', desc: 'Click "Connect Wallet" and select your preferred wallet provider.' },
          { step: 2, title: 'Select Tokens', desc: 'Choose the token you want to sell (From) and the token you want to buy (To).' },
          { step: 3, title: 'Enter Amount', desc: 'Enter the amount you want to swap. The estimated output will be calculated automatically.' },
          { step: 4, title: 'Review & Confirm', desc: 'Check the price impact, minimum received, and slippage tolerance. Click "Swap" to proceed.' },
          { step: 5, title: 'Approve Transaction', desc: 'Confirm the transaction in your wallet. Wait for on-chain confirmation.' },
        ].map(s => (
          <li key={s.step} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-sm font-bold">{s.step}</div>
            <div>
              <h3 className="font-semibold text-sm">{s.title}</h3>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">💡 Tip:</strong> Set your slippage tolerance before swapping. The default 0.5% works well for most trades. For volatile tokens, you may need higher slippage.
        </p>
      </div>
    </div>
  );
}

function SectionProvideLiquidity() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Provide Liquidity</h1>
      <p className="text-muted-foreground">Provide liquidity to token pairs. Fee rates and distribution depend on deployed contract behavior.</p>

      <h2 className="text-xl font-bold">How It Works</h2>
      <p className="text-sm text-muted-foreground">
        When you add liquidity, you deposit two tokens into a pool and receive LP tokens representing your share. Any swap fees and their distribution are defined by the deployed contracts; verify those terms before depositing.
      </p>

      <h2 className="text-xl font-bold">Steps to Add Liquidity</h2>
      <ol className="space-y-3 text-sm">
        {[
          'Navigate to the Liquidity page',
          'Select a token pair (e.g., QMS / QTX)',
          'Enter the amount for one token — the other auto-calculates',
          'Approve both tokens if needed',
          'Click "Add Liquidity" and confirm in your wallet',
        ].map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-xs font-bold">{i + 1}</span>
            <span className="text-muted-foreground">{s}</span>
          </li>
        ))}
      </ol>

      <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
        <p className="text-xs text-muted-foreground">
          <strong className="text-destructive">⚠️ Warning:</strong> Providing liquidity carries risk of impermanent loss. Make sure you understand the concept before depositing.
        </p>
      </div>
    </div>
  );
}

function SectionPortfolioSend() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Portfolio & Send</h1>
      <p className="text-muted-foreground">Track your holdings and send tokens to any address.</p>

      <h2 className="text-xl font-bold">Portfolio Features</h2>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {['View all token balances in your wallet', 'Track LP positions across all pools', 'See allocation chart of your holdings', 'Monitor portfolio value over time'].map((f, i) => (
          <li key={i} className="flex items-center gap-2"><Check className="w-4 h-4 text-success" />{f}</li>
        ))}
      </ul>

      <h2 className="text-xl font-bold">Send Tokens</h2>
      <p className="text-sm text-muted-foreground">
        Transfer any ERC-20 token to another wallet address directly from the Portfolio page. Enter the recipient address, select token and amount, then confirm the transaction.
      </p>
    </div>
  );
}

function SectionAnalyticsPairs() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics & Pairs</h1>
      <p className="text-muted-foreground">Real-time data on trading activity, liquidity, and token pairs.</p>

      <h2 className="text-xl font-bold">Available Data</h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: BarChart3, label: 'Volume Charts' },
          { icon: TrendingUp, label: 'TVL Tracking' },
          { icon: Coins, label: 'Pair Data' },
          { icon: PieChart, label: 'Token Distribution' },
        ].map((d, i) => (
          <div key={i} className="p-3 rounded-lg bg-card border border-border flex items-center gap-2">
            <d.icon className="w-4 h-4 text-primary" />
            <span className="text-sm">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionAMMPricing() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AMM & Pricing</h1>
      <p className="text-muted-foreground">Understanding the Automated Market Maker model used by QUANTAX.</p>

      <h2 className="text-xl font-bold">Constant Product Formula</h2>
      <div className="p-4 rounded-xl bg-card border border-border text-center">
        <code className="text-lg font-bold text-primary">x × y = k</code>
      </div>
      <p className="text-sm text-muted-foreground">
        QUANTAX uses the constant product formula where <code className="text-foreground">x</code> and <code className="text-foreground">y</code> are the reserves of each token in the pool, and <code className="text-foreground">k</code> is a constant. When someone buys token X, the amount of X in the pool decreases while Y increases, maintaining the constant <code className="text-foreground">k</code>.
      </p>

      <h2 className="text-xl font-bold">How Price is Determined</h2>
      <p className="text-sm text-muted-foreground">
        The price of a token is simply the ratio of the two reserves in a pool. For example, if a pool has 1,000 QMS and 10,000 QTX, the price is 10 QTX per QMS. Larger trades cause more price movement (price impact).
      </p>
    </div>
  );
}

function SectionImpermanentLoss() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Impermanent Loss</h1>
      <p className="text-muted-foreground">Understanding the risk of providing liquidity.</p>

      <p className="text-sm text-muted-foreground">
        Impermanent loss occurs when the price ratio of tokens in a pool diverges from when you deposited. The larger the divergence, the more impermanent loss you face.
      </p>

      <h2 className="text-xl font-bold">Example</h2>
      <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground space-y-2">
        <p>You deposit 1 QMS ($1) + 100 QTX ($0.01 each) = $2 total</p>
        <p>If QTX price 2x to $0.02 → holding would be $3, but LP value ≈ $2.83</p>
        <p className="text-destructive font-medium">Impermanent loss ≈ 5.7%</p>
      </div>
      <p className="text-sm text-muted-foreground">
        The loss is "impermanent" because if prices return to the original ratio, the loss disappears. Trading fees earned can also offset this loss.
      </p>
    </div>
  );
}

function SectionSlippagePriceImpact() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Slippage & Price Impact</h1>

      <h2 className="text-xl font-bold">Slippage Tolerance</h2>
      <p className="text-sm text-muted-foreground">
        Slippage tolerance is the maximum price change you'll accept between submitting a transaction and it being executed. Default is 0.5%. Set higher for volatile tokens or low-liquidity pools.
      </p>

      <h2 className="text-xl font-bold">Price Impact</h2>
      <p className="text-sm text-muted-foreground">
        Price impact is how much your trade moves the market price. Larger trades relative to pool size cause more price impact. QUANTAX shows a warning when price impact exceeds 5%.
      </p>

      <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">{'< 1%'}</span><span className="text-success font-medium">Low impact ✓</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">1% - 5%</span><span className="text-yellow-500 font-medium">Medium impact ⚠️</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{'> 5%'}</span><span className="text-destructive font-medium">High impact ❌</span></div>
      </div>
    </div>
  );
}

function SectionLPTokensFees() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">LP Tokens & Fees</h1>
      <p className="text-muted-foreground">How liquidity provider tokens and fee distribution work.</p>

      <h2 className="text-xl font-bold">LP Tokens</h2>
      <p className="text-sm text-muted-foreground">
        When you provide liquidity, you receive LP tokens proportional to your share of the pool. These tokens represent your claim on the underlying assets plus accumulated fees.
      </p>

      <h2 className="text-xl font-bold">Fee Structure</h2>
      <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-sm">
<div className="flex justify-between"><span className="text-muted-foreground">Swap Fee</span><span className="font-medium">Contract-defined</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Distribution</span><span className="font-medium">Verify on-chain</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Protocol Fee</span><span className="font-medium">0%</span></div>
      </div>
    </div>
  );
}

function SectionTechStack() {
  const techItems = [
    { name: 'React 18', desc: 'Modern UI framework with hooks', icon: Layers },
    { name: 'TypeScript', desc: 'Type-safe development', icon: Code },
    { name: 'Vite', desc: 'Lightning fast build tool', icon: Zap },
    { name: 'Tailwind CSS', desc: 'Utility-first styling', icon: Box },
    { name: 'Framer Motion', desc: 'Premium animations', icon: Star },
    { name: 'wagmi + viem', desc: 'Web3 integration', icon: Globe },
    { name: 'Solidity', desc: 'Smart contract language', icon: FileText },
    { name: 'UniswapV2', desc: 'Battle-tested AMM protocol', icon: ArrowRightLeft },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Technology Stack</h1>
      <p className="text-muted-foreground">Built with modern, battle-tested technologies.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {techItems.map((t, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <t.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{t.name}</h3>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold">Architecture</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Layers, title: 'Frontend', desc: 'React + TypeScript, Vite, Tailwind, Framer Motion' },
          { icon: Globe, title: 'Web3 Layer', desc: 'wagmi + viem for type-safe blockchain interaction' },
          { icon: Server, title: 'Smart Contracts', desc: 'UniswapV2 Factory, Router, Pair contracts' },
        ].map((a, i) => (
          <div key={i} className="text-center p-4 rounded-xl bg-card border border-border">
            <a.icon className="w-8 h-8 text-primary mx-auto mb-2" />
            <h3 className="font-bold text-sm">{a.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionSmartContracts() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Smart Contracts</h1>
      <p className="text-muted-foreground">All contracts deployed on QMS Testnet (Chain ID: 19480).</p>

      <div className="space-y-3">
        {contracts.map((c, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Code className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm">{c.name}</h3>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{c.address.slice(0, 10)}...{c.address.slice(-8)}</code>
              <a href={`https://testnet.qmsscan.io/address/${c.address}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionSupportedTokens() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Supported Tokens</h1>
      <p className="text-muted-foreground">Tokens available for trading on QUANTAX.</p>

      <div className="space-y-2">
        {tokens.map((t, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{t.symbol[0]}</div>
              <div>
                <span className="font-semibold text-sm">{t.symbol}</span>
                <span className="text-xs text-muted-foreground ml-2">{t.name}</span>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{t.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionRoadmap() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Development Roadmap</h1>
      <p className="text-muted-foreground">Our journey to build the ultimate DEX on QMS Network.</p>

      <div className="space-y-4">
        {roadmapItems.map((r, i) => (
          <div key={i} className={cn(
            "rounded-xl border p-4",
            r.status === 'done' ? 'bg-success/5 border-success/20' : 'bg-card border-border'
          )}>
            <div className="flex items-center gap-2 mb-2">
              {r.status === 'done' ? <Check className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
              <h3 className="font-bold text-sm">{r.title}</h3>
              <span className={cn("text-xs px-2 py-0.5 rounded-full ml-auto", r.status === 'done' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground')}>
                {r.status === 'done' ? 'Completed' : 'Upcoming'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 ml-6">
              {r.features.map((f, j) => (
                <span key={j} className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{f}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionFAQ() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <details key={i} className="group bg-card border border-border rounded-xl overflow-hidden">
            <summary className="p-4 cursor-pointer font-semibold text-sm flex items-center justify-between hover:bg-muted/50 transition-colors">
              {faq.q}
              <span className="text-primary group-open:rotate-45 transition-transform text-xl">+</span>
            </summary>
            <div className="px-4 pb-4 text-muted-foreground text-sm">{faq.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}

// Map section IDs to components
const sectionComponents: Record<string, () => JSX.Element> = {
  'introduction': SectionIntroduction,
  'connect-wallet': SectionConnectWallet,
  'how-to-swap': SectionHowToSwap,
  'provide-liquidity': SectionProvideLiquidity,
  'portfolio-send': SectionPortfolioSend,
  'analytics-pairs': SectionAnalyticsPairs,
  'amm-pricing': SectionAMMPricing,
  'impermanent-loss': SectionImpermanentLoss,
  'slippage-price-impact': SectionSlippagePriceImpact,
  'lp-tokens-fees': SectionLPTokensFees,
  'technology-stack': SectionTechStack,
  'smart-contracts': SectionSmartContracts,
  'supported-tokens': SectionSupportedTokens,
  'roadmap': SectionRoadmap,
  'faq': SectionFAQ,
};

export default function Docs() {
  const [activeSection, setActiveSection] = useState('introduction');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sidebarSections;
    const q = searchQuery.toLowerCase();
    return sidebarSections.map(section => ({
      ...section,
      items: section.items.filter(item => item.label.toLowerCase().includes(q)),
    })).filter(section => section.items.length > 0);
  }, [searchQuery]);

  const ActiveComponent = sectionComponents[activeSection] || SectionIntroduction;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="flex min-h-screen relative">
      <SEO
        title="Documentation — QUANTAX"
        description="QUANTAX docs: getting started, swap and liquidity guides, AMM concepts, smart contracts, and FAQ for QMS Testnet."
        path="/docs"
        jsonLd={faqJsonLd}
      />
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle docs sidebar"
        aria-expanded={sidebarOpen}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 rounded-lg bg-card border border-border shadow-lg"
      >
        <BookOpen className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 h-screen w-64 bg-card/95 backdrop-blur-xl border-r border-border z-40 flex flex-col transition-transform duration-300",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/50 border-border"
            />
          </div>
        </div>

        {/* Sidebar nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
          {filteredSections.map((section, si) => (
            <div key={si}>
              <p className="text-[10px] font-bold text-muted-foreground tracking-wider px-2 mb-1.5">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 pb-24 lg:pb-8">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ActiveComponent />
          </motion.div>

          {/* Footer */}
          <div className="mt-16 pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>QUANTAX — Decentralized Trading on QMS Testnet</span>
            <WalletButton />
          </div>
        </div>
      </main>
    </div>
  );
}
