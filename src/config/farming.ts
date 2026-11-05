// QuantaX Farming / Staking Contract Configuration (per chain)
import { QMS_CHAIN_ID } from './chains';

export const FARMING_BY_CHAIN: Record<number, `0x${string}`> = {
  [QMS_CHAIN_ID]: '0xA5A90E43Df65AD62E45Edc526A1FD147cdDea6c8',
};

// Legacy singleton — kept for backwards compatibility.
export const FARMING_CONTRACT = FARMING_BY_CHAIN[QMS_CHAIN_ID];

export function getFarmingContract(chainId?: number): `0x${string}` {
  return FARMING_BY_CHAIN[chainId ?? QMS_CHAIN_ID] ?? FARMING_BY_CHAIN[QMS_CHAIN_ID];
}

// Owner address allowed to manage farming pools (admin panel access).
// This should match the contract owner returned by owner().
// Add or change addresses here to grant admin UI access.
export const FARMING_ADMINS: string[] = [
  // Filled dynamically from on-chain owner() in useFarmingAdmin hook.
];

export const FARMING_ABI = [
  {
    inputs: [
      { internalType: 'contract IERC20', name: '_stakingToken', type: 'address' },
      { internalType: 'contract IERC20', name: '_rewardToken', type: 'address' },
      { internalType: 'uint256', name: '_rewardPerBlock', type: 'uint256' },
    ],
    name: 'addPool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_pid', type: 'uint256' }],
    name: 'emergencyWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { inputs: [], name: 'massUpdatePools', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_pid', type: 'uint256' }],
    name: 'updatePool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'uint256', name: '_rewardPerBlock', type: 'uint256' },
    ],
    name: 'updateRewardPerBlock',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'stakingToken', type: 'address' },
      { internalType: 'contract IERC20', name: 'rewardToken', type: 'address' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accRewardPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardPerBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'totalStaked', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Events (helpful for discovering pools)
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'pid', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'stakingToken', type: 'address' },
      { indexed: false, internalType: 'address', name: 'rewardToken', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'rewardPerBlock', type: 'uint256' },
    ],
    name: 'PoolAdded',
    type: 'event',
  },
] as const;
