"use client"

import { useAccount } from "wagmi"
import { Trophy, Target, Flame, TrendingUp, Download, Grid3x3, Gamepad2, Clock, ArrowLeft, User, Edit2, Check, X, Cloud, CloudOff, RefreshCw, Wifi, WifiOff } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { usePlayerStats } from "@/hooks/usePlayerStats"
import { WalletMenu } from "@/components/wallet-menu"
import { useUsername } from "@/hooks/useUsername"
import { useToast } from "@/contexts/toast-context"

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const { stats, isLoading, exportJSON, exportCSV, syncStatus, isCloudEnabled, forceSync } = usePlayerStats(address)
  const { username, setUsername } = useUsername(address)
  const { showToast } = useToast()
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)

  // Debug logging for profile page
  console.log('[Profile Page] Render:', {
    isConnected,
    hasAddress: !!address,
    address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'undefined',
    isLoading,
    hasStats: !!stats,
    statsGamesPlayed: stats?.stats.overall.gamesPlayed || 0
  })

  const handleStartEdit = () => {
    setUsernameInput(username)
    setIsEditingUsername(true)
  }

  const handleCancelEdit = () => {
    setIsEditingUsername(false)
    setUsernameInput("")
  }

  const handleSaveUsername = () => {
    const trimmed = usernameInput.trim()

    // Validation
    if (trimmed.length < 3) {
      showToast("Username must be at least 3 characters", "error")
      return
    }

    if (trimmed.length > 20) {
      showToast("Username must be less than 20 characters", "error")
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      showToast("Username can only contain letters, numbers, and underscores", "error")
      return
    }

    // Save username
    setUsername(trimmed)
    setIsEditingUsername(false)
    showToast("Username updated successfully", "success")
  }

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

  const handleForceSync = async () => {
    if (!isCloudEnabled) {
      showToast("Cloud sync is not configured", "info")
      return
    }

    setIsSyncing(true)
    try {
      await forceSync()
      showToast("Stats synced successfully", "success")
    } catch (error) {
      showToast("Failed to sync stats", "error")
    } finally {
      setIsSyncing(false)
    }
  }

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return "Never"
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen relative z-10 bg-transparent">
        {/* Header with navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <Link href="/">
            <button className="flex items-center gap-2 text-[var(--color-text-tertiary)] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Back</span>
            </button>
          </Link>
        </div>
        <div className="flex h-[calc(100vh-73px)] items-center justify-center p-6">
          <div className="max-w-md w-full card border-2 border-accent-blue p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-accent-blue/10 border-2 border-accent-blue rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-accent-blue" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Profile & Stats</h1>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Connect your wallet to view your player profile and game statistics
            </p>
            <Link href="/" className="inline-block button-primary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen relative z-10 bg-transparent">
        {/* Header with WalletMenu */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <Link href="/">
            <button className="flex items-center gap-2 text-[var(--color-text-tertiary)] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Back</span>
            </button>
          </Link>
          <WalletMenu variant="default" />
        </div>
        <div className="flex h-[calc(100vh-73px)] items-center justify-center p-6">
          <div className="max-w-md w-full card border-2 border-accent-blue p-8 text-center">
            <div className="w-16 h-16 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Loading Stats</h2>
            <p className="text-[var(--color-text-secondary)]">Loading your game statistics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen relative z-10 bg-transparent">
        {/* Header with WalletMenu */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <Link href="/">
            <button className="flex items-center gap-2 text-[var(--color-text-tertiary)] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Back</span>
            </button>
          </Link>
          <WalletMenu variant="default" />
        </div>
        <div className="flex h-[calc(100vh-73px)] items-center justify-center p-6">
          <div className="max-w-md w-full card border-2 border-accent-blue p-8">
            <h2 className="text-2xl font-bold text-white mb-4">No Stats Yet</h2>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Play your first game to start tracking statistics!
            </p>
            <Link href="/game" className="inline-block button-primary">
              Start Playing
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const streakIcon = stats.stats.streaks.current.type === 'win' ? '🔥' : '💔'

  return (
    <div className="min-h-screen relative z-10 bg-transparent">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="flex items-center gap-2 text-[var(--color-text-tertiary)] hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="font-semibold">Back</span>
              </button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-white">Player Profile</h1>
              <div className="flex items-center gap-3 mt-1">
                {isEditingUsername ? (
                  // Edit Mode
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveUsername()
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      className="px-3 py-1 bg-bg-elevated border border-accent-blue rounded text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      placeholder="Enter username"
                      maxLength={20}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveUsername}
                      className="p-1.5 bg-state-success hover:bg-state-success/80 rounded transition-colors"
                      title="Save"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1.5 bg-bg-elevated hover:bg-bg-panel rounded transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    </button>
                  </div>
                ) : (
                  // Display Mode
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-accent-blue">
                      {username}
                    </p>
                    <button
                      onClick={handleStartEdit}
                      className="p-1 hover:bg-bg-elevated rounded transition-colors group"
                      title="Edit username"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] group-hover:text-accent-blue" />
                    </button>
                  </div>
                )}
                <span className="text-[var(--color-text-tertiary)]">•</span>
                <p className="text-sm text-[var(--color-text-tertiary)] font-mono">
                  {stats.walletAddress.slice(0, 6)}...{stats.walletAddress.slice(-4)}
                </p>
              </div>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                3-20 characters • Letters, numbers, and underscores only
              </p>
            </div>
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-3">
            {/* Cloud Sync Status */}
            <div className="flex items-center gap-2">
              {isCloudEnabled ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-elevated border border-[var(--color-border)] rounded-lg">
                  {syncStatus.isOnline ? (
                    <Cloud className="w-4 h-4 text-accent-green" />
                  ) : (
                    <CloudOff className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                  )}
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {syncStatus.isSyncing || isSyncing ? (
                      "Syncing..."
                    ) : (
                      <>Synced {formatLastSync(syncStatus.lastSync)}</>
                    )}
                  </span>
                  <button
                    onClick={handleForceSync}
                    disabled={syncStatus.isSyncing || isSyncing || !syncStatus.isOnline}
                    className="p-1 hover:bg-bg-panel rounded transition-colors disabled:opacity-50"
                    title="Force sync"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-text-tertiary)] ${(syncStatus.isSyncing || isSyncing) ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-elevated border border-[var(--color-border)] rounded-lg">
                  <CloudOff className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                  <span className="text-xs text-[var(--color-text-tertiary)]">Local only</span>
                </div>
              )}
            </div>

            {/* Wallet Menu */}
            <WalletMenu variant="default" />

            {/* Export Button */}
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-[var(--color-border)] rounded-lg text-sm font-semibold hover:bg-bg-panel transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export Stats</span>
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
                    className="block w-full px-6 py-3 text-left text-sm text-white hover:bg-bg-panel transition-colors border-t border-[var(--color-border)]"
                  >
                    Export as CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

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
  )
}
