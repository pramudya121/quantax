// QuantaX Smart Contract Configuration — QMS Testnet
import { QMS_CHAIN_ID, qmsTestnet } from './chains';

export const QMS_TESTNET = qmsTestnet;

export interface ChainContracts {
  FACTORY: `0x${string}`;
  ROUTER: `0x${string}`;
  WETH: `0x${string}`; // wrapped native (WQMS)
  LIBRARY: `0x${string}`;
  MULTICALL: `0x${string}`;
  FAUCET?: `0x${string}`;
}

export const CONTRACTS_BY_CHAIN: Record<number, ChainContracts> = {
  [QMS_CHAIN_ID]: {
    FACTORY: '0x97C305119f5D98aFd11bCD19a1ba8c27d68F3546',
    ROUTER: '0x3A153e8BcDe02F4Cf6C5eeECD9c83bC0296FFbD3',
    WETH: '0x9AA510295aC664A3d5A3182a3eFe959DE2B12c34', // WQMS
    LIBRARY: '0x03D2D542100fa926de135a08B609c8538E45F6ee',
    MULTICALL: '0x8705875084c72C0cDC01c1Ac36A807808c8E5850',
  },
};

export const CONTRACTS = {
  ...CONTRACTS_BY_CHAIN[QMS_CHAIN_ID],
  // Token address hints (used by a few pages)
  QTX: '0x66E5cbb0325Ab93B42c16592Be91456cc195E427' as `0x${string}`,
  BNB: '0x7b277d0387ccDFC395Eae0EFe2321765afAb37c8' as `0x${string}`,
  ETH: '0x0177E73214265D1d6f29a273155803Af5Bf47cFa' as `0x${string}`,
  MON: '0x05466944d61662225ad19916725975230bb5b2B7' as `0x${string}`,
  HYPE: '0x1C9FAFD0A5803d51EB2BEb9D54304cAe574734CF' as `0x${string}`,
} as const;

export function getContracts(chainId?: number): ChainContracts {
  return CONTRACTS_BY_CHAIN[chainId ?? QMS_CHAIN_ID] ?? CONTRACTS_BY_CHAIN[QMS_CHAIN_ID];
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

const QMS_TOKENS: TokenInfo[] = [
  { address: 'native', symbol: 'QMS', name: 'QMS', decimals: 18, logoURI: '/tokens/qms.svg', isNative: true },
  { address: '0x9AA510295aC664A3d5A3182a3eFe959DE2B12c34', symbol: 'WQMS', name: 'Wrapped QMS', decimals: 18, logoURI: '/tokens/qms.svg' },
  { address: '0x66E5cbb0325Ab93B42c16592Be91456cc195E427', symbol: 'QTX', name: 'QuantaX Token', decimals: 18, logoURI: '/tokens/qtx.svg' },
  { address: '0x7b277d0387ccDFC395Eae0EFe2321765afAb37c8', symbol: 'BNB', name: 'Binance Coin', decimals: 18, logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png' },
  { address: '0x0177E73214265D1d6f29a273155803Af5Bf47cFa', symbol: 'ETH', name: 'Ethereum', decimals: 18, logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png' },
  { address: '0x05466944d61662225ad19916725975230bb5b2B7', symbol: 'MON', name: 'Monad', decimals: 18, logoURI: '/tokens/mon.jpg' },
  { address: '0x1C9FAFD0A5803d51EB2BEb9D54304cAe574734CF', symbol: 'HYPE', name: 'Hyperliquid', decimals: 18, logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32196.png' },
];

export const TOKEN_LIST_BY_CHAIN: Record<number, TokenInfo[]> = {
  [QMS_CHAIN_ID]: QMS_TOKENS,
};

export const TOKEN_LIST: TokenInfo[] = QMS_TOKENS;

export const TOKENS = {
  WQMS: '0x9AA510295aC664A3d5A3182a3eFe959DE2B12c34',
  QTX: '0x66E5cbb0325Ab93B42c16592Be91456cc195E427',
  BNB: '0x7b277d0387ccDFC395Eae0EFe2321765afAb37c8',
  ETH: '0x0177E73214265D1d6f29a273155803Af5Bf47cFa',
  MON: '0x05466944d61662225ad19916725975230bb5b2B7',
  HYPE: '0x1C9FAFD0A5803d51EB2BEb9D54304cAe574734CF',
} as const;

export function getTokenList(chainId?: number): TokenInfo[] {
  return TOKEN_LIST_BY_CHAIN[chainId ?? QMS_CHAIN_ID] ?? TOKEN_LIST_BY_CHAIN[QMS_CHAIN_ID];
}

export const getTokenByAddress = (address: string, chainId?: number): TokenInfo | undefined => {
  return getTokenList(chainId).find((token) => token.address.toLowerCase() === address.toLowerCase());
};

export const getTokenBySymbol = (symbol: string, chainId?: number): TokenInfo | undefined => {
  return getTokenList(chainId).find((token) => token.symbol.toLowerCase() === symbol.toLowerCase());
};

export { QMS_CHAIN_ID, qmsTestnet };
