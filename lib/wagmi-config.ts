import { http, createConfig } from 'wagmi'
import { defineChain } from 'viem'
import { injected, walletConnect, coinbaseWallet, metaMask } from 'wagmi/connectors'

// Define Mantle Sepolia Testnet chain
export const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MNT',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
    public: {
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Sepolia Explorer',
      url: 'https://explorer.sepolia.mantle.xyz',
    },
  },
  testnet: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}

// Create connectors array
const connectors = [
  injected({
    target: 'metaMask',
  }),
  injected({
    target() {
      return {
        id: 'zerion',
        name: 'Zerion',
        provider: typeof window !== 'undefined' && (window as any).ethereum?.isZerion
          ? (window as any).ethereum
          : undefined,
      }
    },
  }),
  injected({
    target() {
      return {
        id: 'rabby',
        name: 'Rabby Wallet',
        provider: typeof window !== 'undefined' && (window as any).ethereum?.isRabby
          ? (window as any).ethereum
          : undefined,
      }
    },
  }),
  injected({
    target() {
      return {
        id: 'trust',
        name: 'Trust Wallet',
        provider: typeof window !== 'undefined' && (window as any).ethereum?.isTrust
          ? (window as any).ethereum
          : undefined,
      }
    },
  }),
  injected({
    target() {
      return {
        id: 'rainbow',
        name: 'Rainbow',
        provider: typeof window !== 'undefined' && (window as any).ethereum?.isRainbow
          ? (window as any).ethereum
          : undefined,
      }
    },
  }),
  coinbaseWallet({
    appName: 'BoxBattle',
  }),
  injected({
    target() {
      return {
        id: 'injected',
        name: 'Browser Wallet',
        provider: typeof window !== 'undefined' ? (window as any).ethereum : undefined,
      }
    },
  }),
]

// Add WalletConnect if we have a project ID
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
if (wcProjectId && wcProjectId !== 'YOUR_PROJECT_ID') {
  connectors.splice(1, 0, walletConnect({
    projectId: wcProjectId,
    showQrModal: true,
    metadata: {
      name: 'BoxBattle',
      description: 'The Ultimate Web3 Strategy Game',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://boxbattle.app',
      icons: ['https://boxbattle.app/icon.png']
    }
  }))
}

export const config = createConfig({
  chains: [mantleSepolia],
  connectors,
  transports: {
    [mantleSepolia.id]: http('https://rpc.sepolia.mantle.xyz', {
      timeout: 60000,
      retryCount: 5,
      retryDelay: 2000,
    }),
  },
})

export const GAME_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GAME_CONTRACT || '0xf2943580DABc1dd5eD417a5DC58D35110640BB2f') as `0x${string}`
