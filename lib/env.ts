/**
 * Environment configuration with validation
 * This file centralizes all environment variables and provides safe defaults
 */

export const ENV = {
  // Smart Contract Address (Mantle Sepolia)
  GAME_CONTRACT_ADDRESS: (process.env.NEXT_PUBLIC_GAME_CONTRACT || '0xf2943580DABc1dd5eD417a5DC58D35110640BB2f') as `0x${string}`,

  // WebSocket URL - auto-detect based on environment
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || (
    typeof window !== 'undefined'
      ? window.location.hostname === 'localhost'
        ? 'ws://localhost:8080'
        : 'wss://box-battle-ui-production.up.railway.app'
      : 'ws://localhost:8080'
  ),

  // Network Configuration
  CHAIN_ID: 5003, // Mantle Sepolia Testnet
  RPC_URL: 'https://rpc.sepolia.mantle.xyz',

  // Feature Flags
  ENABLE_SOUND: true,
  ENABLE_ANALYTICS: false,
} as const

// Log configuration on startup (client-side only)
if (typeof window !== 'undefined') {
  console.log('[ENV] Configuration loaded:', {
    contractAddress: ENV.GAME_CONTRACT_ADDRESS,
    wsUrl: ENV.WS_URL,
    chainId: ENV.CHAIN_ID,
  })
}
