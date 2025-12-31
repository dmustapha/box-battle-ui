"use client"

import { X, Trophy, TrendingUp, Clock, ExternalLink } from "lucide-react"
import { useGameHistory } from "@/hooks/useGameHistory"
import { useEffect, useRef } from "react"
import { animateModalEnter, animateModalExit } from "@/lib/animations"

interface GameHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  playerAddress: string
}

export default function GameHistoryModal({
  isOpen,
  onClose,
  playerAddress,
}: GameHistoryModalProps) {
  const { history, isLoading, error, refetch } = useGameHistory()
  const modalBackdropRef = useRef<HTMLDivElement>(null)
  const modalContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && modalBackdropRef.current && modalContentRef.current) {
      animateModalEnter(modalBackdropRef.current, modalContentRef.current)
    }
  }, [isOpen])

  const handleClose = () => {
    if (modalBackdropRef.current && modalContentRef.current) {
      animateModalExit(modalBackdropRef.current, modalContentRef.current).then(() => {
        onClose()
      })
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  const wins = history.filter(g => g.result === 'won').length
  const losses = history.filter(g => g.result === 'lost').length
  const draws = history.filter(g => g.result === 'draw').length
  const totalPrizes = history
    .filter(g => g.result === 'won')
    .reduce((sum, g) => sum + Number(g.prizeFormatted), 0)

  return (
    <div
      ref={modalBackdropRef}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={handleClose}
      style={{ opacity: 0 }}
    >
      <div
        ref={modalContentRef}
        className="bg-bg-panel border border-[var(--color-border)] rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ opacity: 0, transform: 'translateY(40px) scale(0.95)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Game History</h2>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
              Your past matches and statistics
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-bg-elevated rounded-lg transition-colors text-[var(--color-text-tertiary)] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card border">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Games Played</p>
            <p className="text-2xl font-bold text-white">{history.length}</p>
          </div>
          <div className="card border border-state-success">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Wins</p>
            <p className="text-2xl font-bold text-state-success">{wins}</p>
          </div>
          <div className="card border border-state-error">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Losses</p>
            <p className="text-2xl font-bold text-state-error">{losses}</p>
          </div>
          <div className="card border border-accent-amber">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Total Prizes</p>
            <p className="text-xl font-bold text-accent-amber">{totalPrizes.toFixed(4)} MNT</p>
          </div>
        </div>

        {/* Game List */}
        <div className="space-y-3">
          {isLoading && (
            <p className="text-center text-[var(--color-text-tertiary)] py-8">
              Loading game history...
            </p>
          )}

          {error && (
            <div className="card border-state-error">
              <p className="text-state-error">Failed to load history: {error.message}</p>
              <button onClick={refetch} className="button-primary mt-3">
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && history.length === 0 && (
            <p className="text-center text-[var(--color-text-tertiary)] py-8">
              No games played yet. Start your first match!
            </p>
          )}

          {history.map((game) => (
            <div
              key={game.gameId}
              className={`card border hover:border-accent-blue transition-all cursor-pointer ${
                game.result === 'won' ? 'border-state-success/30' :
                game.result === 'lost' ? 'border-state-error/30' :
                'border-[var(--color-border)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Result Icon */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    game.result === 'won' ? 'bg-state-success/20 text-state-success' :
                    game.result === 'lost' ? 'bg-state-error/20 text-state-error' :
                    'bg-bg-elevated text-[var(--color-text-secondary)]'
                  }`}>
                    {game.result === 'won' ? <Trophy className="w-6 h-6" /> :
                     game.result === 'lost' ? <TrendingUp className="w-6 h-6 rotate-180" /> :
                     <Clock className="w-6 h-6" />}
                  </div>

                  {/* Game Info */}
                  <div>
                    <p className="text-white font-semibold">
                      Game #{game.gameId}
                    </p>
                    <p className="text-sm text-[var(--color-text-tertiary)]">
                      vs {game.opponent.slice(0, 6)}...{game.opponent.slice(-4)}
                    </p>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className="text-xl font-bold text-white">
                    {game.myScore} - {game.opponentScore}
                  </p>
                  {game.result === 'won' && (
                    <p className="text-sm text-accent-amber">
                      +{game.prizeFormatted} MNT
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    {new Date(game.timestamp).toLocaleDateString()}
                  </p>
                </div>

                {/* Blockchain Link */}
                <a
                  href={`https://sepolia.mantlescan.xyz/tx/${game.gameId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
