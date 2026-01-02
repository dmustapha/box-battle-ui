/**
 * Stats Manager - Core Logic for Statistics Calculation
 *
 * This module handles all stats calculations, updates, and transformations.
 * It's the business logic layer for the stats system.
 *
 * @module lib/stats-manager
 */

import type {
  PlayerStats,
  GameRecord,
  GameStats,
  StatsUpdateResult,
} from '@/types/stats'
import { getEmptyStatsObject } from '@/types/stats'

// =============================================================================
// STATS UPDATE FUNCTIONS
// =============================================================================

/**
 * Calculate updated stats after a game completes
 *
 * Takes current stats and a new game record, returns updated stats.
 * Pure function - does not mutate input.
 *
 * @param currentStats - Current player stats
 * @param game - New game record to incorporate
 * @returns Updated stats object
 */
export function calculateUpdatedStats(
  currentStats: PlayerStats,
  game: GameRecord
): PlayerStats {
  // Deep clone to avoid mutations
  const updated = JSON.parse(JSON.stringify(currentStats)) as PlayerStats

  // Update timestamp
  updated.lastUpdated = Date.now()

  // Update overall stats
  updated.stats.overall = updateGameStats(updated.stats.overall, game)

  // Update mode-specific stats
  if (game.mode === 'ai') {
    const aiStats = updateGameStats(updated.stats.byMode.ai, game)
    updated.stats.byMode.ai = {
      ...aiStats,
      byDifficulty: updated.stats.byMode.ai.byDifficulty
    }

    // Update difficulty-specific stats for AI games
    if (game.difficulty) {
      const diffKey = game.difficulty
      updated.stats.byMode.ai.byDifficulty[diffKey] = updateGameStats(
        updated.stats.byMode.ai.byDifficulty[diffKey],
        game
      )
    }
  } else {
    updated.stats.byMode.multiplayer = updateGameStats(
      updated.stats.byMode.multiplayer,
      game
    )
  }

  // Update grid size stats
  const gridKey = String(game.gridSize) as '3' | '4' | '5' | '6'
  updated.stats.byGridSize[gridKey] = updateGameStats(
    updated.stats.byGridSize[gridKey],
    game
  )

  // Update scoring stats
  updated.stats.scoring = updateScoringStats(updated.stats.scoring, game)

  // Update time stats
  updated.stats.time = updateTimeStats(updated.stats.time, game)

  // Update streaks
  updated.stats.streaks = updateStreaks(updated.stats.streaks, game)

  // Update game history (keep last 100 games)
  updated.gameHistory = [game, ...updated.gameHistory].slice(0, 100)

  // Update preferences based on play patterns
  updated.preferences = calculatePreferences(updated)

  return updated
}

/**
 * Update a GameStats object with a new game result
 *
 * Helper function that increments counts and recalculates win rate.
 *
 * @param stats - Current stats for this category
 * @param game - New game to add
 * @returns Updated GameStats
 */
function updateGameStats(stats: GameStats, game: GameRecord): GameStats {
  const updated = { ...stats }

  updated.gamesPlayed += 1

  if (game.result === 'win') {
    updated.wins += 1
  } else if (game.result === 'loss') {
    updated.losses += 1
  } else {
    updated.draws += 1
  }

  // Calculate win rate percentage
  updated.winRate = updated.gamesPlayed > 0
    ? (updated.wins / updated.gamesPlayed) * 100
    : 0

  return updated
}

/**
 * Update scoring statistics
 */
function updateScoringStats(
  stats: PlayerStats['stats']['scoring'],
  game: GameRecord
): PlayerStats['stats']['scoring'] {
  const updated = { ...stats }

  const localPlayer = game.player1.isLocalPlayer ? game.player1 : game.player2
  const opponent = game.player1.isLocalPlayer ? game.player2 : game.player1

  // Update averages (running average formula)
  const totalGames = stats.totalBoxesCaptured === 0 ? 1 : (stats.totalBoxesCaptured / stats.avgPlayerScore) || 1
  updated.avgPlayerScore = ((stats.avgPlayerScore * (totalGames - 1)) + localPlayer.score) / totalGames
  updated.avgOpponentScore = ((stats.avgOpponentScore * (totalGames - 1)) + opponent.score) / totalGames

  // Update records
  if (localPlayer.score > stats.highestScore) {
    updated.highestScore = localPlayer.score
  }

  const margin = Math.abs(localPlayer.score - opponent.score)
  if (game.result === 'win' && margin > stats.largestMargin) {
    updated.largestMargin = margin
  }

  // Update total boxes captured
  updated.totalBoxesCaptured += localPlayer.score

  return updated
}

/**
 * Update time statistics
 */
function updateTimeStats(
  stats: PlayerStats['stats']['time'],
  game: GameRecord
): PlayerStats['stats']['time'] {
  const updated = { ...stats }

  // Update total playtime
  updated.totalPlaytimeSeconds += game.duration

  // Calculate average duration
  // We need to know total games to calculate average
  // We'll estimate from total playtime / avg duration
  const totalGames = stats.avgGameDurationSeconds > 0
    ? Math.round(stats.totalPlaytimeSeconds / stats.avgGameDurationSeconds)
    : 1

  updated.avgGameDurationSeconds =
    ((stats.avgGameDurationSeconds * (totalGames - 1)) + game.duration) / totalGames

  // Update fastest win
  if (game.result === 'win' && game.duration < stats.fastestWinSeconds) {
    updated.fastestWinSeconds = game.duration
  }

  // Update longest game
  if (game.duration > stats.longestGameSeconds) {
    updated.longestGameSeconds = game.duration
  }

  return updated
}

/**
 * Update streak information
 */
function updateStreaks(
  stats: PlayerStats['stats']['streaks'],
  game: GameRecord
): PlayerStats['stats']['streaks'] {
  const updated = JSON.parse(JSON.stringify(stats))
  const now = Date.now()

  // Update current streak
  if (game.result === 'draw') {
    // Draws don't affect streaks
  } else if (game.result === stats.current.type) {
    // Continue current streak
    updated.current.count += 1
  } else {
    // Streak broken - start new streak
    // But first, check if we need to update best streak
    if (stats.current.type === 'win' && stats.current.count > stats.bestWin.count) {
      updated.bestWin = {
        count: stats.current.count,
        startDate: stats.current.startDate,
        endDate: now,
      }
    } else if (stats.current.type === 'loss' && stats.current.count > stats.bestLoss.count) {
      updated.bestLoss = {
        count: stats.current.count,
        startDate: stats.current.startDate,
        endDate: now,
      }
    }

    // Start new streak
    updated.current = {
      type: game.result as 'win' | 'loss',
      count: 1,
      startDate: now,
    }
  }

  // Update daily play streak
  const today = new Date(now).setHours(0, 0, 0, 0)
  const lastPlayDay = new Date(stats.dailyPlay.lastPlayDate).setHours(0, 0, 0, 0)
  const daysDiff = Math.floor((today - lastPlayDay) / (1000 * 60 * 60 * 24))

  if (daysDiff === 0) {
    // Same day - no change to streak
  } else if (daysDiff === 1) {
    // Consecutive day - increment streak
    updated.dailyPlay.count += 1
    updated.dailyPlay.lastPlayDate = now
  } else {
    // Gap - reset streak
    updated.dailyPlay.count = 1
    updated.dailyPlay.lastPlayDate = now
  }

  return updated
}

/**
 * Calculate user preferences based on play patterns
 */
function calculatePreferences(
  stats: PlayerStats
): PlayerStats['preferences'] {
  const prefs = { ...stats.preferences }

  // Find favorite grid size (most played)
  let maxPlayed = 0
  let favGridSize: number = 5

  Object.entries(stats.stats.byGridSize).forEach(([size, gridStats]) => {
    if (gridStats.gamesPlayed > maxPlayed) {
      maxPlayed = gridStats.gamesPlayed
      favGridSize = Number(size)
    }
  })
  prefs.favoriteGridSize = favGridSize

  // Find best grid size (highest win rate with at least 5 games)
  let maxWinRate = 0
  let bestGridSize: number = 5

  Object.entries(stats.stats.byGridSize).forEach(([size, gridStats]) => {
    if (gridStats.gamesPlayed >= 5 && gridStats.winRate > maxWinRate) {
      maxWinRate = gridStats.winRate
      bestGridSize = Number(size)
    }
  })
  prefs.bestGridSize = bestGridSize

  // Find favorite mode (most played)
  prefs.favoriteMode =
    stats.stats.byMode.ai.gamesPlayed >= stats.stats.byMode.multiplayer.gamesPlayed
      ? 'ai'
      : 'multiplayer'

  return prefs
}

// =============================================================================
// STORAGE FUNCTIONS
// =============================================================================

/**
 * Get localStorage key for a wallet address
 */
export function getStorageKey(walletAddress: string): string {
  return `boxbattle_stats_${walletAddress.toLowerCase()}`
}

/**
 * Load stats from localStorage
 *
 * @param walletAddress - Wallet address to load stats for
 * @returns PlayerStats object or null if not found
 */
export function loadStatsFromStorage(walletAddress: string): PlayerStats | null {
  if (typeof window === 'undefined') {
    console.log('[Stats Manager] loadStatsFromStorage: Server-side, returning null')
    return null
  }

  try {
    const key = getStorageKey(walletAddress)
    console.log('[Stats Manager] Loading stats from localStorage:', {
      walletAddress: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      key
    })

    const stored = localStorage.getItem(key)

    if (!stored) {
      console.log('[Stats Manager] No stats found in localStorage for this wallet')
      return null
    }

    const parsed = JSON.parse(stored) as PlayerStats
    console.log('[Stats Manager] ✅ Stats loaded successfully:', {
      totalGames: parsed.stats.overall.gamesPlayed,
      winRate: parsed.stats.overall.winRate.toFixed(2) + '%',
      lastUpdated: new Date(parsed.lastUpdated).toLocaleString(),
      dataSize: `${(stored.length / 1024).toFixed(2)} KB`
    })

    // Validate version (future: run migrations if needed)
    if (parsed.version !== '1.0') {
      console.warn('[Stats Manager] ⚠️ Outdated schema version, consider migration')
      // For now, just return it - add migration logic in Phase 2
    }

    return parsed
  } catch (error) {
    console.error('[Stats Manager] ❌ Error loading stats from localStorage:', error)
    return null
  }
}

/**
 * Save stats to localStorage
 *
 * @param stats - PlayerStats object to save
 * @returns Success boolean
 */
export function saveStatsToStorage(stats: PlayerStats): boolean {
  if (typeof window === 'undefined') {
    console.log('[Stats Manager] saveStatsToStorage: Server-side, returning false')
    return false
  }

  try {
    const key = getStorageKey(stats.walletAddress)
    const serialized = JSON.stringify(stats)

    console.log('[Stats Manager] Saving stats to localStorage:', {
      walletAddress: `${stats.walletAddress.slice(0, 6)}...${stats.walletAddress.slice(-4)}`,
      key,
      totalGames: stats.stats.overall.gamesPlayed,
      winRate: stats.stats.overall.winRate.toFixed(2) + '%',
      dataSize: `${(serialized.length / 1024).toFixed(2)} KB`,
      historySize: stats.gameHistory.length
    })

    localStorage.setItem(key, serialized)

    // Verify it was saved
    const verification = localStorage.getItem(key)
    if (!verification) {
      console.error('[Stats Manager] ❌ Verification failed: Stats not found after save')
      return false
    }

    console.log('[Stats Manager] ✅ Stats saved and verified successfully')
    return true
  } catch (error) {
    console.error('[Stats Manager] ❌ Error saving stats to localStorage:', error)
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('[Stats Manager] localStorage quota exceeded! Data size:', {
        attempted: `${(JSON.stringify(stats).length / 1024).toFixed(2)} KB`
      })
    }
    return false
  }
}

/**
 * Clear stats for a wallet address
 *
 * @param walletAddress - Wallet address to clear stats for
 * @returns Success boolean
 */
export function clearStats(walletAddress: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    const key = getStorageKey(walletAddress)
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error('[Stats] Error clearing stats:', error)
    return false
  }
}

// =============================================================================
// RECORD GAME FUNCTION (Main Entry Point)
// =============================================================================

/**
 * Record a completed game and update stats
 *
 * This is the main function to call after a game ends.
 * Loads current stats, updates them, and saves back to storage.
 *
 * @param walletAddress - Player's wallet address
 * @param game - Completed game record
 * @returns Result with success status and updated stats
 */
export function recordGame(
  walletAddress: string,
  game: GameRecord
): StatsUpdateResult {
  console.log('[Stats Manager] ═══ recordGame START ═══')
  console.log('[Stats Manager] Input:', {
    walletAddress: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
    gameId: game.gameId,
    mode: game.mode,
    result: game.result,
    gridSize: game.gridSize,
    difficulty: game.difficulty || 'N/A',
    player1Score: game.player1.score,
    player2Score: game.player2.score,
    duration: `${game.duration}s`,
    totalMoves: game.totalMoves
  })

  try {
    // Load current stats (or create new if doesn't exist)
    console.log('[Stats Manager] Step 1: Loading current stats...')
    let currentStats = loadStatsFromStorage(walletAddress)

    if (!currentStats) {
      console.log('[Stats Manager] No existing stats found, creating new stats object')
      currentStats = getEmptyStatsObject(walletAddress)
    } else {
      console.log('[Stats Manager] Loaded existing stats:', {
        currentTotalGames: currentStats.stats.overall.gamesPlayed,
        currentWinRate: currentStats.stats.overall.winRate.toFixed(2) + '%'
      })
    }

    // Calculate updated stats
    console.log('[Stats Manager] Step 2: Calculating updated stats...')
    const updatedStats = calculateUpdatedStats(currentStats, game)
    console.log('[Stats Manager] Stats calculated:', {
      newTotalGames: updatedStats.stats.overall.gamesPlayed,
      newWinRate: updatedStats.stats.overall.winRate.toFixed(2) + '%',
      wins: updatedStats.stats.overall.wins,
      losses: updatedStats.stats.overall.losses,
      draws: updatedStats.stats.overall.draws
    })

    // Save to storage
    console.log('[Stats Manager] Step 3: Saving to localStorage...')
    const saved = saveStatsToStorage(updatedStats)

    if (!saved) {
      console.error('[Stats Manager] ❌ Failed to save stats to localStorage')
      return {
        success: false,
        error: 'Failed to save stats to localStorage',
      }
    }

    console.log('[Stats Manager] ✅ ═══ recordGame SUCCESS ═══')
    return {
      success: true,
      updatedStats,
    }
  } catch (error) {
    console.error('[Stats Manager] ❌ ═══ recordGame FAILED ═══')
    console.error('[Stats Manager] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =============================================================================
// DEVELOPMENT TOOLS (localStorage Inspector)
// =============================================================================

/**
 * Development-only localStorage inspector
 * Access via browser console: window.DEBUG_STATS
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).DEBUG_STATS = {
    /**
     * View stats for a wallet address
     * Usage: DEBUG_STATS.view('0x1234...')
     */
    view: (address: string) => {
      const stats = loadStatsFromStorage(address)
      if (!stats) {
        console.log('No stats found for address:', address)
        return null
      }
      console.log('=== PLAYER STATS ===')
      console.log('Address:', stats.walletAddress)
      console.log('Total Games:', stats.stats.overall.gamesPlayed)
      console.log('Win Rate:', stats.stats.overall.winRate.toFixed(2) + '%')
      console.log('Wins/Losses/Draws:', stats.stats.overall.wins, stats.stats.overall.losses, stats.stats.overall.draws)
      console.log('Current Streak:', stats.stats.streaks.current)
      console.log('Last Updated:', new Date(stats.lastUpdated).toLocaleString())
      console.log('Full Stats Object:', stats)
      return stats
    },

    /**
     * Clear stats for a wallet address
     * Usage: DEBUG_STATS.clear('0x1234...')
     */
    clear: (address: string) => {
      const success = clearStats(address)
      if (success) {
        console.log('✅ Stats cleared for address:', address)
      } else {
        console.error('❌ Failed to clear stats for address:', address)
      }
      return success
    },

    /**
     * List all stored stats keys
     * Usage: DEBUG_STATS.list()
     */
    list: () => {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('boxbattle_stats_'))
      console.log('=== ALL STATS KEYS ===')
      console.log('Found', keys.length, 'stats entries')
      keys.forEach((key, index) => {
        const address = key.replace('boxbattle_stats_', '')
        try {
          const stats = loadStatsFromStorage(address)
          if (stats) {
            console.log(`${index + 1}. ${address} - ${stats.stats.overall.gamesPlayed} games`)
          }
        } catch (error) {
          console.log(`${index + 1}. ${address} - Error loading`)
        }
      })
      return keys
    },

    /**
     * Export stats as JSON for a wallet
     * Usage: DEBUG_STATS.export('0x1234...')
     */
    export: (address: string) => {
      const stats = loadStatsFromStorage(address)
      if (!stats) {
        console.log('No stats found for address:', address)
        return null
      }
      const json = JSON.stringify(stats, null, 2)
      console.log('=== EXPORTED JSON ===')
      console.log(json)
      return json
    },

    /**
     * Check localStorage usage
     * Usage: DEBUG_STATS.storage()
     */
    storage: () => {
      let totalSize = 0
      const sizes: Record<string, number> = {}

      Object.keys(localStorage).forEach(key => {
        const size = localStorage.getItem(key)?.length || 0
        totalSize += size
        if (key.startsWith('stats_')) {
          sizes[key] = size
        }
      })

      console.log('=== LOCALSTORAGE USAGE ===')
      console.log('Total Size:', (totalSize / 1024).toFixed(2), 'KB')
      console.log('Stats Entries:', Object.keys(sizes).length)
      console.log('Stats Total Size:', (Object.values(sizes).reduce((a, b) => a + b, 0) / 1024).toFixed(2), 'KB')
      console.log('Individual Sizes:', sizes)

      return {
        totalSize: (totalSize / 1024).toFixed(2) + ' KB',
        statsCount: Object.keys(sizes).length,
        statsSize: (Object.values(sizes).reduce((a, b) => a + b, 0) / 1024).toFixed(2) + ' KB',
        details: sizes
      }
    },

    /**
     * Clear ALL player stats from localStorage
     * Usage: DEBUG_STATS.clearAll()
     */
    clearAll: () => {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('boxbattle_stats_'))
      console.log('=== CLEARING ALL STATS ===')
      console.log('Found', keys.length, 'stats entries to clear')

      keys.forEach(key => {
        localStorage.removeItem(key)
        console.log('Removed:', key)
      })

      console.log('✅ All player stats cleared!')
      return keys.length
    },

    /**
     * Help - show available commands
     * Usage: DEBUG_STATS.help()
     */
    help: () => {
      console.log('=== DEBUG_STATS COMMANDS ===')
      console.log('DEBUG_STATS.view(address) - View stats for an address')
      console.log('DEBUG_STATS.clear(address) - Clear stats for an address')
      console.log('DEBUG_STATS.clearAll() - Clear ALL player stats')
      console.log('DEBUG_STATS.list() - List all stored stats')
      console.log('DEBUG_STATS.export(address) - Export stats as JSON')
      console.log('DEBUG_STATS.storage() - Check localStorage usage')
      console.log('DEBUG_STATS.help() - Show this help message')
    }
  }

  console.log('[Stats Manager] 🛠️ Development tools loaded. Type DEBUG_STATS.help() for commands.')
}

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

/**
 * Export stats as JSON string
 *
 * @param walletAddress - Wallet address to export
 * @returns JSON string or null if not found
 */
export function exportStatsAsJSON(walletAddress: string): string | null {
  const stats = loadStatsFromStorage(walletAddress)
  if (!stats) return null

  return JSON.stringify(stats, null, 2)
}

/**
 * Export stats as CSV string
 *
 * @param walletAddress - Wallet address to export
 * @returns CSV string or null if not found
 */
export function exportStatsAsCSV(walletAddress: string): string | null {
  const stats = loadStatsFromStorage(walletAddress)
  if (!stats) return null

  const rows: string[] = []

  // Header
  rows.push('Date,Mode,Opponent,Grid,Your Score,Opponent Score,Result,Duration (s)')

  // Data rows (game history)
  stats.gameHistory.forEach((game) => {
    const localPlayer = game.player1.isLocalPlayer ? game.player1 : game.player2
    const opponent = game.player1.isLocalPlayer ? game.player2 : game.player1

    const date = new Date(game.timestamp).toISOString().split('T')[0]
    const mode = game.mode === 'ai' ? `AI (${game.difficulty || 'unknown'})` : 'Multiplayer'

    rows.push([
      date,
      mode,
      opponent.username,
      `${game.gridSize}x${game.gridSize}`,
      localPlayer.score,
      opponent.score,
      game.result.toUpperCase(),
      game.duration,
    ].join(','))
  })

  return rows.join('\n')
}

/**
 * Import stats from JSON string
 *
 * @param jsonData - JSON string containing exported stats
 * @returns Success boolean
 */
export function importStatsFromJSON(jsonData: string): StatsUpdateResult {
  try {
    const stats = JSON.parse(jsonData) as PlayerStats

    // Validate required fields
    if (!stats.walletAddress || !stats.version) {
      return {
        success: false,
        error: 'Invalid stats data: missing required fields',
      }
    }

    // Save to storage
    const saved = saveStatsToStorage(stats)

    if (!saved) {
      return {
        success: false,
        error: 'Failed to save imported stats',
      }
    }

    return {
      success: true,
      updatedStats: stats,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse JSON',
    }
  }
}
