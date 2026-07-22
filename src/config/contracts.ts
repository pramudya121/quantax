// DRAGONDEX Multi-Chain Smart Contract Configuration
import { OPN_CHAIN_ID, AER_CHAIN_ID, opnTestnet, aerediumTestnet } from './chains';
import aerLogoAsset from '@/assets/aer.jpg.asset.json';

// Legacy re-export (some pages still reference this)
export const OPN_TESTNET = opnTestnet;

export interface ChainContracts {
  FACTORY: `0x${string}`;
  ROUTER: `0x${string}`;
  WETH: `0x${string}`; // wrapped native (WOPN / WAER)
  LIBRARY: `0x${string}`;
  MULTICALL: `0x${string}`;
  FAUCET?: `0x${string}`;
}

export const CONTRACTS_BY_CHAIN: Record<number, ChainContracts> = {
  [OPN_CHAIN_ID]: {
    FACTORY: '0x887AE7FfCB54f5811d957f3EA8095b15Bd99e538',
    ROUTER: '0x048A65f2f52F1c1A0a1fC59E67Ac95daA361AA89',
    WETH: '0xd38b2Cd5D8d68E6EA75f9aD9bC01F9e168d4b5E1', // WOPN
    LIBRARY: '0x2C9bd07a8885Fdd93f5426DB6C250a9adfcEe2C7',
    MULTICALL: '0xb27c21B35d6fF3Fc55e826ef6714AF76a82c5E71',
  },
  [AER_CHAIN_ID]: {
    FACTORY: '0x5687FDA3BdE14d38057699c402606ab470EcA873',
    ROUTER: '0xd28967D75750f477E450Df81C73f34E2713B86B4',
    WETH: '0x4Fd3765cde8D1d2BE4EdbaA03940AfC56794c304', // WAER
    LIBRARY: '0x084724341e07F50782E1c3923D9a6Fb7ce993816',
    MULTICALL: '0xEc94943b75359f1ede3d639AD548e56239d754c2',
    FAUCET: '0xa12C18847c41ECE267155ffAe112b8951AbbcA1C',
  },
};

// Legacy singleton pointing at OPN (kept so existing hooks continue working).
export const CONTRACTS = {
  ...CONTRACTS_BY_CHAIN[OPN_CHAIN_ID],
  // Legacy token address hints (used by a few pages)
  DRAGON: '0x76c8BF103D0548dC171EC9675bCc327f20f35A42' as `0x${string}`,
  BNB: '0x542ed1D0572428f6aCC16852bFd9a4AD8e90A7b6' as `0x${string}`,
  ETH: '0x769511B4237AE00Af2bbF77a339eC71CACe0e08B' as `0x${string}`,
  MON: '0xbC7aa080ECe100522E5d2b396d0C31b39cEEa87b' as `0x${string}`,
  HYPE: '0x45B14877a0A640f94a09C1Ab4445DEb000f7Aff7' as `0x${string}`,
} as const;

export function getContracts(chainId?: number): ChainContracts {
  return CONTRACTS_BY_CHAIN[chainId ?? OPN_CHAIN_ID] ?? CONTRACTS_BY_CHAIN[OPN_CHAIN_ID];
}

export function getWrappedNative(chainId?: number): `0x${string}` {
  return getContracts(chainId).WETH;
}

// -------------------- Tokens --------------------

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  isNative?: boolean;
}

const OPN_TOKENS: TokenInfo[] = [
  { address: 'native', symbol: 'OPN', name: 'OPN', decimals: 18, logoURI: '/tokens/opn.jpg', isNative: true },
  { address: '0xd38b2Cd5D8d68E6EA75f9aD9bC01F9e168d4b5E1', symbol: 'WOPN', name: 'Wrapped OPN', decimals: 18, logoURI: '/tokens/opn.jpg' },
  { address: '0x76c8BF103D0548dC171EC9675bCc327f20f35A42', symbol: 'DRAGON', name: 'Dragon Token', decimals: 18, logoURI: '/tokens/dragon.png' },
  { address: '0x542ed1D0572428f6aCC16852bFd9a4AD8e90A7b6', symbol: 'BNB', name: 'Binance Coin', decimals: 18, logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png' },
  { address: '0x769511B4237AE00Af2bbF77a339eC71CACe0e08B', symbol: 'ETH', name: 'Ethereum', decimals: 18, logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png' },
  { address: '0xbC7aa080ECe100522E5d2b396d0C31b39cEEa87b', symbol: 'MON', name: 'Monad', decimals: 18, logoURI: '/tokens/mon.jpg' },
  { address: '0x45B14877a0A640f94a09C1Ab4445DEb000f7Aff7', symbol: 'HYPE', name: 'Hyperliquid', decimals: 18, logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32196.png' },
];

const AER_TOKENS: TokenInfo[] = [
  { address: 'native', symbol: 'AER', name: 'AER', decimals: 18, logoURI: aerLogoAsset.url, isNative: true },
  { address: '0x4Fd3765cde8D1d2BE4EdbaA03940AfC56794c304', symbol: 'WAER', name: 'Wrapped AER', decimals: 18, logoURI: aerLogoAsset.url },
  { address: '0x70af1341F5D5c60F913F6a21C669586C38592510', symbol: 'DRAGON', name: 'Dragon Token', decimals: 18, logoURI: '/tokens/dragon.png' },
  { address: '0xBB3B44EB672650Fb4a1Cf6D9dc5d3b7494F333AB', symbol: 'BNB', name: 'Binance Coin', decimals: 18, logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png' },
  { address: '0xEa71393074fFCB6d132B8a2b6028CAF952af03A5', symbol: 'ETH', name: 'Ethereum', decimals: 18, logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png' },
  { address: '0x5b0AE944A4Ee6241a5A638C440A0dCD42411bD3C', symbol: 'HYPE', name: 'Hyperliquid', decimals: 18, logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32196.png' },
  { address: '0xF143eCFE3DFEEB4ae188cA4f1c7c7ab0b5F592eb', symbol: 'UNI', name: 'Uniswap', decimals: 18, logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7083.png' },
  { address: '0x98cA063a7066Ae68B395ad49B9f05F2Df510d6B5', symbol: 'XRP', name: 'XRP', decimals: 18, logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png' },
];

export const TOKEN_LIST_BY_CHAIN: Record<number, TokenInfo[]> = {
  [OPN_CHAIN_ID]: OPN_TOKENS,
  [AER_CHAIN_ID]: AER_TOKENS,
};

// Legacy singleton (OPN default)
export const TOKEN_LIST: TokenInfo[] = OPN_TOKENS;

export const TOKENS = {
  WOPN: '0xd38b2Cd5D8d68E6EA75f9aD9bC01F9e168d4b5E1',
  BNB: '0x542ed1D0572428f6aCC16852bFd9a4AD8e90A7b6',
  MON: '0xbC7aa080ECe100522E5d2b396d0C31b39cEEa87b',
  HYPE: '0x45B14877a0A640f94a09C1Ab4445DEb000f7Aff7',
  ETH: '0x769511B4237AE00Af2bbF77a339eC71CACe0e08B',
  DRAGON: '0x76c8BF103D0548dC171EC9675bCc327f20f35A42',
} as const;

export function getTokenList(chainId?: number): TokenInfo[] {
  return TOKEN_LIST_BY_CHAIN[chainId ?? OPN_CHAIN_ID] ?? TOKEN_LIST_BY_CHAIN[OPN_CHAIN_ID];
}

export const getTokenByAddress = (address: string, chainId?: number): TokenInfo | undefined => {
  return getTokenList(chainId).find((token) => token.address.toLowerCase() === address.toLowerCase());
};

export const getTokenBySymbol = (symbol: string, chainId?: number): TokenInfo | undefined => {
  return getTokenList(chainId).find((token) => token.symbol.toLowerCase() === symbol.toLowerCase());
};

export { OPN_CHAIN_ID, AER_CHAIN_ID, aerediumTestnet };
