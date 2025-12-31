import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing environment variables. Cloud sync disabled.')
  console.warn('[Supabase] Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
}

// Create Supabase client (or null if not configured)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // We use wallet-based auth, not Supabase auth
      },
    })
  : null

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return supabase !== null
}

// Database types
export interface DbPlayerStats {
  id: string
  wallet_address: string
  stats_data: string // JSON stringified PlayerStats
  version: number
  created_at: string
  updated_at: string
}

export interface DbGameRecord {
  id: string
  wallet_address: string
  game_id: string
  mode: 'ai' | 'multiplayer'
  result: 'win' | 'loss' | 'draw'
  grid_size: number
  difficulty?: string
  player1_score: number
  player2_score: number
  opponent_address?: string
  duration: number
  total_moves: number
  chain_id?: number
  created_at: string
}

// Table names
export const TABLES = {
  PLAYER_STATS: 'player_stats',
  GAME_RECORDS: 'game_records',
} as const
