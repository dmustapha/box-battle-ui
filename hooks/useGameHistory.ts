import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { GAME_CONTRACT_ADDRESS } from '@/lib/wagmi-config'
import { GAME_CONTRACT_ABI } from '@/lib/contract-abi'
import { formatEther } from 'viem'

interface GameHistoryEntry {
  gameId: string
  opponent: string
  myScore: number
  opponentScore: number
  result: 'won' | 'lost' | 'draw'
  timestamp: number
  prize: bigint
  prizeFormatted: string
}

interface UseGameHistoryReturn {
  history: GameHistoryEntry[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const CACHE_KEY_PREFIX = 'boxbattle-history-'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useGameHistory(): UseGameHistoryReturn {
  const { address } = useAccount()
  const publicClient = usePublicClient()

  const [history, setHistory] = useState<GameHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const cacheKey = address ? `${CACHE_KEY_PREFIX}${address}` : null

  // Load from cache immediately (fast)
  useEffect(() => {
    if (!cacheKey) return

    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)

        // Use cached data immediately for instant display
        setHistory(data)

        // If cache is stale, trigger background refresh
        if (Date.now() - timestamp > CACHE_DURATION) {
          console.log('[GameHistory] Cache stale, refreshing in background...')
          fetchHistory()
        }
      } else {
        // No cache, fetch
        fetchHistory()
      }
    } catch (error) {
      console.error('[GameHistory] Cache read error:', error)
      fetchHistory()
    }
  }, [cacheKey])

  const fetchHistory = useCallback(async () => {
    if (!address || !publicClient) {
      setHistory([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[GameHistory] Fetching GameEnded events for:', address)

      // Fetch GameEnded events from blockchain
      const logs = await publicClient.getLogs({
        address: GAME_CONTRACT_ADDRESS,
        event: {
          type: 'event',
          name: 'GameEnded',
          inputs: [
            { name: 'gameId', type: 'uint256', indexed: true },
            { name: 'winner', type: 'address', indexed: false },
            { name: 'player1Score', type: 'uint8', indexed: false },
            { name: 'player2Score', type: 'uint8', indexed: false },
            { name: 'prize', type: 'uint256', indexed: false },
          ],
        },
        fromBlock: 0n, // Start from contract deployment
        toBlock: 'latest',
      })

      console.log('[GameHistory] Found', logs.length, 'total game events')

      // Fetch game details for each event to get player addresses
      const historyEntries: GameHistoryEntry[] = []

      for (const log of logs) {
        try {
          const { gameId, winner, player1Score, player2Score, prize } = log.args as any

          // Get game details to find opponent
          const game = await publicClient.readContract({
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'getGame',
            args: [gameId],
          }) as any[]

          const player1 = game[0] as string
          const player2 = game[1] as string

          // Only include games where this user participated
          if (player1.toLowerCase() !== address.toLowerCase() &&
              player2.toLowerCase() !== address.toLowerCase()) {
            continue
          }

          const isPlayer1 = player1.toLowerCase() === address.toLowerCase()
          const opponent = isPlayer1 ? player2 : player1
          const myScore = isPlayer1 ? Number(player1Score) : Number(player2Score)
          const opponentScore = isPlayer1 ? Number(player2Score) : Number(player1Score)

          let result: 'won' | 'lost' | 'draw'
          if (winner === '0x0000000000000000000000000000000000000000') {
            result = 'draw'
          } else if (winner.toLowerCase() === address.toLowerCase()) {
            result = 'won'
          } else {
            result = 'lost'
          }

          // Get block timestamp
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber! })

          historyEntries.push({
            gameId: gameId.toString(),
            opponent,
            myScore,
            opponentScore,
            result,
            timestamp: Number(block.timestamp) * 1000, // Convert to ms
            prize: prize as bigint,
            prizeFormatted: formatEther(prize as bigint),
          })
        } catch (err) {
          console.error('[GameHistory] Error processing game:', err)
          // Continue with other games
        }
      }

      // Sort by timestamp (newest first)
      historyEntries.sort((a, b) => b.timestamp - a.timestamp)

      console.log('[GameHistory] Loaded', historyEntries.length, 'games for this player')

      setHistory(historyEntries)

      // Update cache
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: historyEntries,
          timestamp: Date.now(),
        }))
      }
    } catch (err) {
      console.error('[GameHistory] Fetch error:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [address, publicClient, cacheKey])

  return {
    history,
    isLoading,
    error,
    refetch: fetchHistory,
  }
}
