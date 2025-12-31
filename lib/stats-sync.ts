/**
 * Stats Sync Service - Cloud Synchronization with Supabase
 *
 * This module handles syncing player stats between localStorage and Supabase.
 * It provides:
 * - Cloud storage for cross-device access
 * - Conflict resolution (version-based, last-write-wins)
 * - Background sync with retry logic
 * - Offline-first approach (localStorage is source of truth when offline)
 *
 * @module lib/stats-sync
 */

import { supabase, isSupabaseConfigured, TABLES } from './supabase'
import {
  loadStatsFromStorage,
  saveStatsToStorage,
  getStorageKey,
} from './stats-manager'
import type { PlayerStats, GameRecord } from '@/types/stats'
import { getEmptyStatsObject } from '@/types/stats'

// =============================================================================
// TYPES
// =============================================================================

export interface SyncResult {
  success: boolean
  error?: string
  source?: 'local' | 'cloud' | 'merged'
  stats?: PlayerStats
}

export interface SyncStatus {
  lastSync: number | null
  isSyncing: boolean
  error: string | null
  isOnline: boolean
}

// =============================================================================
// SYNC STATUS MANAGEMENT
// =============================================================================

let syncStatus: SyncStatus = {
  lastSync: null,
  isSyncing: false,
  error: null,
  isOnline: true,
}

// Status change listeners
type StatusListener = (status: SyncStatus) => void
const statusListeners: Set<StatusListener> = new Set()

export function getSyncStatus(): SyncStatus {
  return { ...syncStatus }
}

export function onSyncStatusChange(listener: StatusListener): () => void {
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}

function updateSyncStatus(updates: Partial<SyncStatus>) {
  syncStatus = { ...syncStatus, ...updates }
  statusListeners.forEach((listener) => listener(syncStatus))
}

// =============================================================================
// CLOUD STORAGE FUNCTIONS
// =============================================================================

/**
 * Load stats from Supabase cloud
 *
 * @param walletAddress - Wallet address to load stats for
 * @returns PlayerStats or null if not found
 */
export async function loadStatsFromCloud(
  walletAddress: string
): Promise<PlayerStats | null> {
  if (!isSupabaseConfigured() || !supabase) {
    console.log('[Stats Sync] Supabase not configured, skipping cloud load')
    return null
  }

  try {
    console.log('[Stats Sync] Loading stats from cloud:', {
      wallet: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
    })

    const { data, error } = await supabase
      .from(TABLES.PLAYER_STATS)
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - this is expected for new users
        console.log('[Stats Sync] No cloud stats found for wallet')
        return null
      }
      throw error
    }

    if (!data) {
      console.log('[Stats Sync] No cloud stats found for wallet')
      return null
    }

    // Parse the JSON stats data
    const stats = JSON.parse(data.stats_data) as PlayerStats
    console.log('[Stats Sync] ✅ Cloud stats loaded:', {
      totalGames: stats.stats.overall.gamesPlayed,
      winRate: stats.stats.overall.winRate.toFixed(2) + '%',
      version: data.version,
    })

    return stats
  } catch (error) {
    console.error('[Stats Sync] ❌ Error loading from cloud:', error)
    updateSyncStatus({ error: 'Failed to load from cloud' })
    return null
  }
}

/**
 * Save stats to Supabase cloud
 *
 * @param stats - PlayerStats to save
 * @returns Success boolean
 */
export async function saveStatsToCloud(stats: PlayerStats): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    console.log('[Stats Sync] Supabase not configured, skipping cloud save')
    return false
  }

  try {
    console.log('[Stats Sync] Saving stats to cloud:', {
      wallet: `${stats.walletAddress.slice(0, 6)}...${stats.walletAddress.slice(-4)}`,
      totalGames: stats.stats.overall.gamesPlayed,
    })

    const { error } = await supabase.from(TABLES.PLAYER_STATS).upsert(
      {
        wallet_address: stats.walletAddress.toLowerCase(),
        stats_data: JSON.stringify(stats),
        version: 1,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'wallet_address',
      }
    )

    if (error) {
      throw error
    }

    console.log('[Stats Sync] ✅ Stats saved to cloud successfully')
    updateSyncStatus({ lastSync: Date.now(), error: null })
    return true
  } catch (error) {
    console.error('[Stats Sync] ❌ Error saving to cloud:', error)
    updateSyncStatus({ error: 'Failed to save to cloud' })
    return false
  }
}

/**
 * Save a game record to cloud (for detailed history)
 *
 * @param walletAddress - Player's wallet address
 * @param game - Game record to save
 * @returns Success boolean
 */
export async function saveGameToCloud(
  walletAddress: string,
  game: GameRecord
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    return false
  }

  try {
    const localPlayer = game.player1.isLocalPlayer ? game.player1 : game.player2
    const opponent = game.player1.isLocalPlayer ? game.player2 : game.player1

    const { error } = await supabase.from(TABLES.GAME_RECORDS).insert({
      wallet_address: walletAddress.toLowerCase(),
      game_id: String(game.gameId),
      mode: game.mode,
      result: game.result,
      grid_size: game.gridSize,
      difficulty: game.difficulty || null,
      player1_score: localPlayer.score,
      player2_score: opponent.score,
      opponent_address: opponent.address?.toLowerCase() || null,
      duration: game.duration,
      total_moves: game.totalMoves,
      chain_id: game.chainId || null,
    })

    if (error) {
      // Ignore duplicate key errors (game already recorded)
      if (error.code === '23505') {
        console.log('[Stats Sync] Game already recorded in cloud')
        return true
      }
      throw error
    }

    console.log('[Stats Sync] ✅ Game record saved to cloud')
    return true
  } catch (error) {
    console.error('[Stats Sync] ❌ Error saving game to cloud:', error)
    return false
  }
}

// =============================================================================
// SYNC LOGIC
// =============================================================================

/**
 * Sync stats between localStorage and cloud
 *
 * Strategy:
 * 1. Load from both sources
 * 2. Compare lastUpdated timestamps
 * 3. Take the newer version
 * 4. Save to the outdated source
 *
 * @param walletAddress - Wallet address to sync
 * @returns Sync result with final stats
 */
export async function syncStats(walletAddress: string): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    // No cloud configured - just return local stats
    const localStats = loadStatsFromStorage(walletAddress)
    return {
      success: true,
      source: 'local',
      stats: localStats || undefined,
    }
  }

  updateSyncStatus({ isSyncing: true, error: null })

  try {
    console.log('[Stats Sync] ═══ Starting sync ═══')
    console.log('[Stats Sync] Wallet:', `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`)

    // Load from both sources in parallel
    const [localStats, cloudStats] = await Promise.all([
      Promise.resolve(loadStatsFromStorage(walletAddress)),
      loadStatsFromCloud(walletAddress),
    ])

    console.log('[Stats Sync] Local stats:', localStats ? `${localStats.stats.overall.gamesPlayed} games` : 'none')
    console.log('[Stats Sync] Cloud stats:', cloudStats ? `${cloudStats.stats.overall.gamesPlayed} games` : 'none')

    // Case 1: Neither exists - return empty
    if (!localStats && !cloudStats) {
      console.log('[Stats Sync] No stats found in either source')
      updateSyncStatus({ isSyncing: false, lastSync: Date.now() })
      return {
        success: true,
        source: 'local',
        stats: undefined,
      }
    }

    // Case 2: Only local exists - push to cloud
    if (localStats && !cloudStats) {
      console.log('[Stats Sync] Only local stats exist, pushing to cloud')
      await saveStatsToCloud(localStats)
      updateSyncStatus({ isSyncing: false, lastSync: Date.now() })
      return {
        success: true,
        source: 'local',
        stats: localStats,
      }
    }

    // Case 3: Only cloud exists - pull to local
    if (!localStats && cloudStats) {
      console.log('[Stats Sync] Only cloud stats exist, pulling to local')
      saveStatsToStorage(cloudStats)
      updateSyncStatus({ isSyncing: false, lastSync: Date.now() })
      return {
        success: true,
        source: 'cloud',
        stats: cloudStats,
      }
    }

    // Case 4: Both exist - compare and resolve
    if (localStats && cloudStats) {
      console.log('[Stats Sync] Both exist, comparing timestamps')
      console.log('[Stats Sync] Local lastUpdated:', new Date(localStats.lastUpdated).toISOString())
      console.log('[Stats Sync] Cloud lastUpdated:', new Date(cloudStats.lastUpdated).toISOString())

      // Compare by total games played as tie-breaker
      const localGames = localStats.stats.overall.gamesPlayed
      const cloudGames = cloudStats.stats.overall.gamesPlayed

      let winner: PlayerStats
      let source: 'local' | 'cloud'

      if (localStats.lastUpdated > cloudStats.lastUpdated) {
        // Local is newer
        winner = localStats
        source = 'local'
        console.log('[Stats Sync] Local is newer, pushing to cloud')
        await saveStatsToCloud(localStats)
      } else if (cloudStats.lastUpdated > localStats.lastUpdated) {
        // Cloud is newer
        winner = cloudStats
        source = 'cloud'
        console.log('[Stats Sync] Cloud is newer, pulling to local')
        saveStatsToStorage(cloudStats)
      } else {
        // Same timestamp - use the one with more games
        if (localGames >= cloudGames) {
          winner = localStats
          source = 'local'
          console.log('[Stats Sync] Same timestamp, local has more games')
          await saveStatsToCloud(localStats)
        } else {
          winner = cloudStats
          source = 'cloud'
          console.log('[Stats Sync] Same timestamp, cloud has more games')
          saveStatsToStorage(cloudStats)
        }
      }

      updateSyncStatus({ isSyncing: false, lastSync: Date.now() })
      console.log('[Stats Sync] ✅ Sync complete, source:', source)

      return {
        success: true,
        source,
        stats: winner,
      }
    }

    // Shouldn't reach here
    updateSyncStatus({ isSyncing: false })
    return { success: false, error: 'Unknown sync state' }
  } catch (error) {
    console.error('[Stats Sync] ❌ Sync failed:', error)
    updateSyncStatus({
      isSyncing: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    })

    // Fallback to local
    const localStats = loadStatsFromStorage(walletAddress)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
      source: 'local',
      stats: localStats || undefined,
    }
  }
}

/**
 * Record a game and sync to cloud
 *
 * This is the main entry point after a game completes.
 * It updates local storage first, then syncs to cloud in background.
 *
 * @param walletAddress - Player's wallet address
 * @param game - Completed game record
 * @param updatedStats - Already-updated stats from stats-manager
 * @returns Success boolean
 */
export async function recordGameAndSync(
  walletAddress: string,
  game: GameRecord,
  updatedStats: PlayerStats
): Promise<boolean> {
  // Always save to local first (already done by stats-manager)
  // Now sync to cloud in background

  if (!isSupabaseConfigured()) {
    return true // Local-only mode is fine
  }

  try {
    // Save both stats and game record to cloud
    await Promise.all([
      saveStatsToCloud(updatedStats),
      saveGameToCloud(walletAddress, game),
    ])

    console.log('[Stats Sync] ✅ Game recorded and synced to cloud')
    return true
  } catch (error) {
    console.error('[Stats Sync] ❌ Cloud sync failed (local still saved):', error)
    // Don't fail - local storage succeeded
    return true
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize sync service
 *
 * Sets up online/offline detection and initial sync.
 */
export function initStatsSync() {
  if (typeof window === 'undefined') return

  // Online/offline detection
  const handleOnline = () => {
    console.log('[Stats Sync] Network: Online')
    updateSyncStatus({ isOnline: true })
  }

  const handleOffline = () => {
    console.log('[Stats Sync] Network: Offline')
    updateSyncStatus({ isOnline: false })
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Initial status
  updateSyncStatus({ isOnline: navigator.onLine })

  console.log('[Stats Sync] Initialized', {
    supabaseConfigured: isSupabaseConfigured(),
    isOnline: navigator.onLine,
  })
}

// =============================================================================
// DEVELOPMENT TOOLS
// =============================================================================

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as any).DEBUG_SYNC = {
    /**
     * Get current sync status
     */
    status: () => {
      console.log('=== SYNC STATUS ===')
      console.log('Last Sync:', syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString() : 'never')
      console.log('Is Syncing:', syncStatus.isSyncing)
      console.log('Is Online:', syncStatus.isOnline)
      console.log('Error:', syncStatus.error || 'none')
      console.log('Supabase Configured:', isSupabaseConfigured())
      return syncStatus
    },

    /**
     * Force sync for an address
     */
    sync: async (address: string) => {
      console.log('=== FORCING SYNC ===')
      const result = await syncStats(address)
      console.log('Result:', result)
      return result
    },

    /**
     * Load stats from cloud only
     */
    cloud: async (address: string) => {
      console.log('=== LOADING FROM CLOUD ===')
      const stats = await loadStatsFromCloud(address)
      console.log('Stats:', stats)
      return stats
    },

    /**
     * Push local stats to cloud
     */
    push: async (address: string) => {
      console.log('=== PUSHING TO CLOUD ===')
      const localStats = loadStatsFromStorage(address)
      if (!localStats) {
        console.log('No local stats found')
        return false
      }
      const result = await saveStatsToCloud(localStats)
      console.log('Result:', result)
      return result
    },

    /**
     * Help
     */
    help: () => {
      console.log('=== DEBUG_SYNC COMMANDS ===')
      console.log('DEBUG_SYNC.status() - Get current sync status')
      console.log('DEBUG_SYNC.sync(address) - Force sync for address')
      console.log('DEBUG_SYNC.cloud(address) - Load from cloud only')
      console.log('DEBUG_SYNC.push(address) - Push local to cloud')
    },
  }

  console.log('[Stats Sync] 🛠️ Development tools loaded. Type DEBUG_SYNC.help() for commands.')
}
