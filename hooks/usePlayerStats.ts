/**
 * usePlayerStats Hook
 *
 * React hook for managing player statistics with cloud sync.
 * Provides access to stats, history, and record functions.
 *
 * Features:
 * - Local storage for offline-first experience
 * - Cloud sync via Supabase (when configured)
 * - Automatic sync on wallet connect
 * - Background sync after game completion
 *
 * @module hooks/usePlayerStats
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { PlayerStats, GameRecord } from '@/types/stats'
import { getEmptyStatsObject } from '@/types/stats'
import {
  loadStatsFromStorage,
  saveStatsToStorage,
  recordGame as recordGameToStats,
  exportStatsAsJSON,
  exportStatsAsCSV,
  clearStats,
} from '@/lib/stats-manager'
import {
  syncStats,
  recordGameAndSync,
  getSyncStatus,
  onSyncStatusChange,
  initStatsSync,
  type SyncStatus,
} from '@/lib/stats-sync'
import { isSupabaseConfigured } from '@/lib/supabase'

export interface UsePlayerStatsResult {
  /** Current player stats (null if loading or no wallet) */
  stats: PlayerStats | null

  /** Loading state */
  isLoading: boolean

  /** Error message if any */
  error: string | null

  /** Cloud sync status */
  syncStatus: SyncStatus

  /** Whether cloud sync is available */
  isCloudEnabled: boolean

  /** Record a completed game */
  recordGame: (game: GameRecord) => void

  /** Force sync with cloud */
  forceSync: () => Promise<void>

  /** Reset all stats (clear localStorage and cloud) */
  resetStats: () => void

  /** Export stats as JSON string */
  exportJSON: () => string | null

  /** Export stats as CSV string */
  exportCSV: () => string | null

  /** Manually refresh stats from localStorage */
  refresh: () => void
}

/**
 * Hook to manage player statistics with cloud sync
 *
 * @param walletAddress - Player's wallet address (optional)
 * @returns Stats management interface
 *
 * @example
 * ```tsx
 * function StatsPage() {
 *   const { stats, recordGame, syncStatus } = usePlayerStats(address)
 *
 *   if (!stats) return <div>Loading...</div>
 *
 *   return (
 *     <div>
 *       <p>Win Rate: {stats.stats.overall.winRate.toFixed(1)}%</p>
 *       {syncStatus.isSyncing && <span>Syncing...</span>}
 *     </div>
 *   )
 * }
 * ```
 */
export function usePlayerStats(walletAddress?: string): UsePlayerStatsResult {
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus())
  const isCloudEnabled = isSupabaseConfigured()

  // Track if we've initialized sync
  const syncInitialized = useRef(false)

  // Initialize sync service once
  useEffect(() => {
    if (!syncInitialized.current) {
      initStatsSync()
      syncInitialized.current = true
    }
  }, [])

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = onSyncStatusChange((status) => {
      setSyncStatus(status)
    })
    return unsubscribe
  }, [])

  // Load and sync stats when wallet address changes
  useEffect(() => {
    if (!walletAddress) {
      setStats(null)
      setIsLoading(false)
      return
    }

    const loadAndSync = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('[usePlayerStats] Loading stats for wallet:', `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`)

        if (isCloudEnabled) {
          // Cloud enabled - sync first
          console.log('[usePlayerStats] Cloud sync enabled, syncing...')
          const syncResult = await syncStats(walletAddress)

          if (syncResult.stats) {
            setStats(syncResult.stats)
            console.log('[usePlayerStats] Stats loaded from sync:', {
              source: syncResult.source,
              totalGames: syncResult.stats.stats.overall.gamesPlayed,
            })
          } else {
            // No stats anywhere - create new
            const newStats = getEmptyStatsObject(walletAddress)
            saveStatsToStorage(newStats)
            setStats(newStats)
            console.log('[usePlayerStats] Created new stats object')
          }
        } else {
          // Local only - load from storage
          console.log('[usePlayerStats] Cloud sync disabled, loading local only')
          let loadedStats = loadStatsFromStorage(walletAddress)

          if (!loadedStats) {
            loadedStats = getEmptyStatsObject(walletAddress)
            saveStatsToStorage(loadedStats)
          }

          setStats(loadedStats)
        }
      } catch (err) {
        console.error('[usePlayerStats] Error loading stats:', err)
        setError(err instanceof Error ? err.message : 'Failed to load stats')

        // Fallback to local
        const localStats = loadStatsFromStorage(walletAddress)
        if (localStats) {
          setStats(localStats)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadAndSync()
  }, [walletAddress, isCloudEnabled])

  /**
   * Record a completed game (with cloud sync)
   */
  const recordGame = useCallback(
    (game: GameRecord) => {
      console.log('[usePlayerStats] recordGame called:', {
        hasWalletAddress: !!walletAddress,
        walletAddress: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'undefined',
        gameId: game.gameId,
        mode: game.mode,
        result: game.result,
      })

      if (!walletAddress) {
        console.warn('[usePlayerStats] Cannot record game: no wallet address')
        return
      }

      try {
        console.log('[usePlayerStats] Calling recordGameToStats...', {
          walletAddress: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
          currentStatsExists: !!stats,
          gameMode: game.mode,
          gameResult: game.result,
        })

        // Record to local storage first
        const result = recordGameToStats(walletAddress, game)

        console.log('[usePlayerStats] recordGameToStats returned:', {
          success: result.success,
          hasUpdatedStats: !!result.updatedStats,
          error: result.error || 'none',
        })

        if (result.success && result.updatedStats) {
          setStats(result.updatedStats)
          console.log('[usePlayerStats] Game recorded successfully:', {
            totalGames: result.updatedStats.stats.overall.gamesPlayed,
            winRate: result.updatedStats.stats.overall.winRate.toFixed(2) + '%',
            lastUpdated: new Date(result.updatedStats.lastUpdated).toLocaleString(),
          })

          // Sync to cloud in background (don't await)
          if (isCloudEnabled) {
            console.log('[usePlayerStats] Syncing to cloud in background...')
            recordGameAndSync(walletAddress, game, result.updatedStats).catch((err) => {
              console.error('[usePlayerStats] Background cloud sync failed:', err)
            })
          }
        } else {
          console.error('[usePlayerStats] Failed to record game:', result.error)
          setError(result.error || 'Failed to record game')
        }
      } catch (err) {
        console.error('[usePlayerStats] Exception in recordGame:', err)
        setError(err instanceof Error ? err.message : 'Error recording game')
      }
    },
    [walletAddress, stats, isCloudEnabled]
  )

  /**
   * Force sync with cloud
   */
  const forceSync = useCallback(async () => {
    if (!walletAddress || !isCloudEnabled) {
      console.log('[usePlayerStats] Cannot force sync: no wallet or cloud disabled')
      return
    }

    try {
      console.log('[usePlayerStats] Force syncing...')
      const syncResult = await syncStats(walletAddress)

      if (syncResult.stats) {
        setStats(syncResult.stats)
        console.log('[usePlayerStats] Force sync complete:', {
          source: syncResult.source,
          totalGames: syncResult.stats.stats.overall.gamesPlayed,
        })
      }
    } catch (err) {
      console.error('[usePlayerStats] Force sync failed:', err)
      setError(err instanceof Error ? err.message : 'Sync failed')
    }
  }, [walletAddress, isCloudEnabled])

  /**
   * Reset all stats (clear localStorage)
   */
  const resetStats = useCallback(() => {
    if (!walletAddress) return

    try {
      const success = clearStats(walletAddress)

      if (success) {
        const freshStats = getEmptyStatsObject(walletAddress)
        saveStatsToStorage(freshStats)
        setStats(freshStats)
        console.log('[usePlayerStats] Stats reset successfully')

        // Note: We don't clear cloud stats here - that would require additional confirmation
        // Cloud stats will be overwritten on next game or can be cleared via Supabase dashboard
      } else {
        setError('Failed to reset stats')
      }
    } catch (err) {
      console.error('[usePlayerStats] Error resetting stats:', err)
      setError(err instanceof Error ? err.message : 'Error resetting stats')
    }
  }, [walletAddress])

  /**
   * Export stats as JSON
   */
  const exportJSON = useCallback((): string | null => {
    if (!walletAddress) return null
    return exportStatsAsJSON(walletAddress)
  }, [walletAddress])

  /**
   * Export stats as CSV
   */
  const exportCSV = useCallback((): string | null => {
    if (!walletAddress) return null
    return exportStatsAsCSV(walletAddress)
  }, [walletAddress])

  /**
   * Manually refresh stats from localStorage
   */
  const refresh = useCallback(() => {
    if (!walletAddress) return

    try {
      const loadedStats = loadStatsFromStorage(walletAddress)
      if (loadedStats) {
        setStats(loadedStats)
      }
    } catch (err) {
      console.error('[usePlayerStats] Error refreshing stats:', err)
      setError(err instanceof Error ? err.message : 'Error refreshing stats')
    }
  }, [walletAddress])

  return {
    stats,
    isLoading,
    error,
    syncStatus,
    isCloudEnabled,
    recordGame,
    forceSync,
    resetStats,
    exportJSON,
    exportCSV,
    refresh,
  }
}
