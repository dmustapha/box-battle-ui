/**
 * Type Definitions for Player Statistics and Game History System
 *
 * This file defines all TypeScript interfaces used throughout
 * the stats tracking system.
 *
 * @module types/stats
 */

// =============================================================================
// GAME RECORD (Individual Game Data)
// =============================================================================

/**
 * Record of a single completed game
 *
 * Stores all relevant information about a game for history tracking
 * and statistical analysis.
 */
export interface GameRecord {
  // Identifiers
  gameId: string | bigint            // Unique game ID (blockchain or local UUID)
  timestamp: number                  // Unix timestamp (milliseconds)

  // Game Configuration
  mode: 'ai' | 'multiplayer'
  gridSize: 3 | 4 | 5 | 6
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert'  // AI only

  // Players
  player1: {
    address?: string                 // Wallet address (multiplayer only)
    username: string
    score: number
    isLocalPlayer: boolean           // Is this the current user?
  }
  player2: {
    address?: string
    username: string
    score: number
    isLocalPlayer: boolean
  }

  // Game Results
  result: 'win' | 'loss' | 'draw'    // From local player perspective
  duration: number                   // Seconds
  totalMoves: number

  // Blockchain Data (if multiplayer)
  txHash?: string                    // Transaction hash
  blockNumber?: number
  chainId?: number

  // Optional: Move History (for replay feature - Phase 3)
  moves?: Array<{
    lineId: string
    player: 'player1' | 'player2'
    timestamp: number
    boxesCompleted: number
  }>
}

// =============================================================================
// STATISTICS (Aggregate Data)
// =============================================================================

/**
 * Statistics for a subset of games (overall, by mode, by grid size, etc.)
 */
export interface GameStats {
  gamesPlayed: number
  wins: number
  losses: number
  draws: number
  winRate: number                    // Calculated: wins / gamesPlayed * 100
}

/**
 * Statistics broken down by AI difficulty
 */
export interface DifficultyStats {
  easy: GameStats
  medium: GameStats
  hard: GameStats
  expert: GameStats
}

/**
 * Statistics broken down by game mode
 */
export interface ModeStats {
  ai: GameStats & {
    byDifficulty: DifficultyStats
  }
  multiplayer: GameStats
}

/**
 * Statistics broken down by grid size
 */
export interface GridSizeStats {
  '3': GameStats
  '4': GameStats
  '5': GameStats
  '6': GameStats
}

/**
 * Scoring statistics (averages, records)
 */
export interface ScoringStats {
  avgPlayerScore: number             // Average score per game (local player)
  avgOpponentScore: number           // Average opponent score per game
  highestScore: number               // Best score ever achieved
  largestMargin: number              // Biggest win margin (score difference)
  totalBoxesCaptured: number         // Career total boxes
}

/**
 * Time-related statistics
 */
export interface TimeStats {
  totalPlaytimeSeconds: number       // Total time spent playing
  avgGameDurationSeconds: number     // Average game length
  fastestWinSeconds: number          // Shortest winning game
  longestGameSeconds: number         // Longest game ever
}

/**
 * Current streak information
 */
export interface CurrentStreak {
  type: 'win' | 'loss'
  count: number
  startDate: number                  // Unix timestamp when streak started
}

/**
 * Best streak record (all-time)
 */
export interface BestStreak {
  count: number
  startDate: number                  // Unix timestamp
  endDate: number                    // Unix timestamp
}

/**
 * Daily play streak (consecutive days)
 */
export interface DailyPlayStreak {
  count: number                      // Consecutive days played
  lastPlayDate: number               // Unix timestamp of last play
}

/**
 * All streak-related statistics
 */
export interface StreakStats {
  current: CurrentStreak
  bestWin: BestStreak
  bestLoss: BestStreak
  dailyPlay: DailyPlayStreak
}

// =============================================================================
// PLAYER PREFERENCES
// =============================================================================

/**
 * User preferences derived from play patterns
 */
export interface PlayerPreferences {
  favoriteGridSize: number           // Most played grid size
  bestGridSize: number               // Highest win rate grid size
  favoriteMode: 'ai' | 'multiplayer' // Most played mode
}

// =============================================================================
// MAIN PLAYER STATS OBJECT
// =============================================================================

/**
 * Complete player statistics object
 *
 * This is the top-level object stored in localStorage
 */
export interface PlayerStats {
  version: string                    // Schema version (e.g., "1.0")
  walletAddress: string              // Owner of this data
  lastUpdated: number                // Unix timestamp

  stats: {
    overall: GameStats               // All games combined
    byMode: ModeStats                // Split by AI vs Multiplayer
    byGridSize: GridSizeStats        // Split by grid size
    scoring: ScoringStats            // Scoring records
    time: TimeStats                  // Time statistics
    streaks: StreakStats             // Streak information
  }

  gameHistory: GameRecord[]          // Last N games (rolling window)
  preferences: PlayerPreferences     // Derived preferences
}

// =============================================================================
// HISTORY FILTERS
// =============================================================================

/**
 * Filter options for game history view
 */
export interface HistoryFilters {
  mode: 'all' | 'ai' | 'multiplayer'
  result: 'all' | 'win' | 'loss' | 'draw'
  gridSize: 'all' | 3 | 4 | 5 | 6
  dateRange: 'all' | 'today' | 'week' | 'month'
  difficulty?: 'all' | 'easy' | 'medium' | 'hard' | 'expert'  // AI games only
}

/**
 * Sort options for game history
 */
export type HistorySortBy = 'date' | 'duration' | 'score' | 'gridSize'
export type HistorySortOrder = 'asc' | 'desc'

// =============================================================================
// EXPORT FORMATS
// =============================================================================

/**
 * Format options for data export
 */
export type ExportFormat = 'json' | 'csv' | 'image'

/**
 * Exported data structure (JSON format)
 */
export interface ExportedStats {
  player: string                     // Wallet address
  username: string
  exportDate: number                 // Unix timestamp
  stats: PlayerStats['stats']
  gameHistory: GameRecord[]
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Result from stats calculation functions
 */
export interface StatsUpdateResult {
  success: boolean
  error?: string
  updatedStats?: PlayerStats
}

/**
 * Schema version for migrations
 */
export const STATS_SCHEMA_VERSION = '1.0'

/**
 * Default empty stats object (initial state)
 */
export function getEmptyStatsObject(walletAddress: string): PlayerStats {
  return {
    version: STATS_SCHEMA_VERSION,
    walletAddress,
    lastUpdated: Date.now(),

    stats: {
      overall: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
      },

      byMode: {
        ai: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winRate: 0,
          byDifficulty: {
            easy: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
            medium: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
            hard: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
            expert: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
          },
        },
        multiplayer: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winRate: 0,
        },
      },

      byGridSize: {
        '3': { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
        '4': { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
        '5': { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
        '6': { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
      },

      scoring: {
        avgPlayerScore: 0,
        avgOpponentScore: 0,
        highestScore: 0,
        largestMargin: 0,
        totalBoxesCaptured: 0,
      },

      time: {
        totalPlaytimeSeconds: 0,
        avgGameDurationSeconds: 0,
        fastestWinSeconds: Infinity,
        longestGameSeconds: 0,
      },

      streaks: {
        current: {
          type: 'win',
          count: 0,
          startDate: Date.now(),
        },
        bestWin: {
          count: 0,
          startDate: 0,
          endDate: 0,
        },
        bestLoss: {
          count: 0,
          startDate: 0,
          endDate: 0,
        },
        dailyPlay: {
          count: 0,
          lastPlayDate: 0,
        },
      },
    },

    gameHistory: [],

    preferences: {
      favoriteGridSize: 5,             // Default to 5x5
      bestGridSize: 5,
      favoriteMode: 'ai',
    },
  }
}
