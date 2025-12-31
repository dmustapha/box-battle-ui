"use client"

import { useState } from "react"
import { Trophy, Target, Flame, TrendingUp, Download, X, Grid3x3, Gamepad2, Clock } from "lucide-react"
import { usePlayerStats } from "@/hooks/usePlayerStats"
import type { PlayerStats } from "@/types/stats"

interface StatsDashboardProps {
  isOpen: boolean
  onClose: () => void
  walletAddress?: string
}

export default function StatsDashboard({ isOpen, onClose, walletAddress }: StatsDashboardProps) {
  const { stats, isLoading, exportJSON, exportCSV } = usePlayerStats(walletAddress)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  if (!isOpen) return null

  const handleExport = (format: 'json' | 'csv') => {
    if (!stats) return

    let data: string | null = null
    let filename: string = ''

    if (format === 'json') {
      data = exportJSON()
      filename = `boxbattle-stats-${stats.walletAddress.slice(0, 6)}.json`
    } else {
      data = exportCSV()
      filename = `boxbattle-stats-${stats.walletAddress.slice(0, 6)}.csv`
    }

    if (!data) return

    // Download file
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setExportMenuOpen(false)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-bg-panel border-2 border-accent-blue rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Stats</h2>
          <p className="text-[var(--color-text-secondary)]">Loading your game statistics...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-bg-panel border-2 border-accent-blue rounded-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">No Stats Yet</h2>
            <button onClick={onClose} className="p-2 hover:bg-bg-elevated rounded-lg transition-colors text-[var(--color-text-tertiary)] hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Play your first game to start tracking statistics!
          </p>
          <button onClick={onClose} className="w-full button-primary">
            Start Playing
          </button>
        </div>
      </div>
    )
  }

  const streakIcon = stats.stats.streaks.current.type === 'win' ? '🔥' : '💔'

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-bg-panel border-2 border-accent-blue rounded-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-3xl font-bold text-white">Player Statistics</h2>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1 font-mono">
              {stats.walletAddress.slice(0, 6)}...{stats.walletAddress.slice(-4)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Export Button */}
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-[var(--color-border)] rounded-lg text-sm font-semibold hover:bg-bg-panel transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-2 bg-bg-elevated border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden z-10">
                  <button
                    onClick={() => handleExport('json')}
                    className="block w-full px-6 py-3 text-left text-sm text-white hover:bg-bg-panel transition-colors"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="block w-full px-6 py-3 text-left text-sm text-white hover:bg-panel transition-colors border-t border-[var(--color-border)]"
                  >
                    Export as CSV
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-bg-elevated rounded-lg transition-colors text-[var(--color-text-tertiary)] hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
          {/* Hero Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Total Games */}
            <div className="card border-2 border-[var(--color-border)] bg-bg-elevated p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-accent-blue/10 border border-accent-blue/20 rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-accent-blue" />
                </div>
                <div>
                  <p className="text-4xl font-black text-white font-mono">{stats.stats.overall.gamesPlayed}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Total Games</p>
            </div>

            {/* Win Rate */}
            <div className="card border-2 border-[var(--color-border)] bg-bg-elevated p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-accent-green/10 border border-accent-green/20 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-accent-green" />
                </div>
                <div>
                  <p className="text-4xl font-black text-accent-green font-mono">
                    {stats.stats.overall.winRate.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Win Rate</p>
              <div className="mt-3 flex gap-2 text-xs font-mono">
                <span className="text-accent-green">{stats.stats.overall.wins}W</span>
                <span className="text-state-error">{stats.stats.overall.losses}L</span>
                <span className="text-[var(--color-text-tertiary)]">{stats.stats.overall.draws}D</span>
              </div>
            </div>

            {/* Current Streak */}
            <div className="card border-2 border-[var(--color-border)] bg-bg-elevated p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-center">
                  <Flame className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-4xl font-black text-white font-mono">
                    {streakIcon} {stats.stats.streaks.current.count}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                Current Streak
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {stats.stats.streaks.current.type === 'win' ? 'Win Streak' : 'Loss Streak'}
              </p>
            </div>
          </div>

          {/* Performance by Mode */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent-blue" />
              Performance by Mode
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* AI Games */}
              <div className="card bg-bg-elevated p-6 border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-[var(--color-player-1)]/10 border border-[var(--color-player-1)]/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🤖</span>
                  </div>
                  <h4 className="text-lg font-bold text-white">AI Games</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-[var(--color-text-tertiary)]">Played</p>
                    <p className="text-2xl font-bold text-white font-mono">{stats.stats.byMode.ai.gamesPlayed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-tertiary)]">Win Rate</p>
                    <p className="text-2xl font-bold text-accent-green font-mono">
                      {stats.stats.byMode.ai.winRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 text-sm font-mono">
                  <span className="text-accent-green">{stats.stats.byMode.ai.wins} Wins</span>
                  <span className="text-state-error">{stats.stats.byMode.ai.losses} Losses</span>
                  <span className="text-[var(--color-text-tertiary)]">{stats.stats.byMode.ai.draws} Draws</span>
                </div>
              </div>

              {/* Multiplayer Games */}
              <div className="card bg-bg-elevated p-6 border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-[var(--color-player-2)]/10 border border-[var(--color-player-2)]/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">⛓️</span>
                  </div>
                  <h4 className="text-lg font-bold text-white">Multiplayer</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-[var(--color-text-tertiary)]">Played</p>
                    <p className="text-2xl font-bold text-white font-mono">{stats.stats.byMode.multiplayer.gamesPlayed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-tertiary)]">Win Rate</p>
                    <p className="text-2xl font-bold text-accent-green font-mono">
                      {stats.stats.byMode.multiplayer.winRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 text-sm font-mono">
                  <span className="text-accent-green">{stats.stats.byMode.multiplayer.wins} Wins</span>
                  <span className="text-state-error">{stats.stats.byMode.multiplayer.losses} Losses</span>
                  <span className="text-[var(--color-text-tertiary)]">{stats.stats.byMode.multiplayer.draws} Draws</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance by Grid Size */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Grid3x3 className="w-5 h-5 text-accent-blue" />
              Performance by Grid Size
            </h3>
            <div className="space-y-3">
              {(['3', '4', '5', '6'] as const).map((size) => {
                const gridStats = stats.stats.byGridSize[size]
                const isFavorite = stats.preferences.favoriteGridSize === Number(size)
                const isBest = stats.preferences.bestGridSize === Number(size)

                if (gridStats.gamesPlayed === 0) return null

                return (
                  <div key={size} className="card bg-bg-elevated p-4 border border-[var(--color-border)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-accent-blue/10 border border-accent-blue/20 rounded-lg flex items-center justify-center">
                          <span className="text-lg font-bold text-accent-blue">{size}×{size}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-bold text-white">{gridStats.gamesPlayed} games</p>
                            {isFavorite && (
                              <span className="px-2 py-0.5 bg-accent-blue/20 text-accent-blue text-xs font-semibold rounded">
                                Favorite
                              </span>
                            )}
                            {isBest && (
                              <span className="px-2 py-0.5 bg-accent-green/20 text-accent-green text-xs font-semibold rounded">
                                Best
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--color-text-tertiary)]">
                            {gridStats.winRate.toFixed(1)}% win rate • {gridStats.wins}W {gridStats.losses}L {gridStats.draws}D
                          </p>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="hidden md:block w-32">
                        <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-green transition-all duration-300"
                            style={{ width: `${gridStats.winRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Additional Stats */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent-blue" />
              More Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card bg-bg-elevated p-4 border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Highest Score</p>
                <p className="text-2xl font-bold text-white font-mono">{stats.stats.scoring.highestScore}</p>
              </div>
              <div className="card bg-bg-elevated p-4 border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Best Margin</p>
                <p className="text-2xl font-bold text-white font-mono">{stats.stats.scoring.largestMargin}</p>
              </div>
              <div className="card bg-bg-elevated p-4 border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Total Boxes</p>
                <p className="text-2xl font-bold text-white font-mono">{stats.stats.scoring.totalBoxesCaptured}</p>
              </div>
              <div className="card bg-bg-elevated p-4 border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Best Win Streak</p>
                <p className="text-2xl font-bold text-white font-mono">{stats.stats.streaks.bestWin.count}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
