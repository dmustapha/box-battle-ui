"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Copy, Check, AlertCircle, Loader2, Grid3x3, Users } from "lucide-react"
import { useAccount, useSwitchChain } from "wagmi"
import { mantleSepolia } from "@/lib/wagmi-config"

interface MultiplayerLobbyProps {
  onJoinGame: (gameId: bigint) => void
  onCreateGame: () => void
  onBack?: () => void
  playerAddress: string
  createdGameId?: bigint
  isWaitingForOpponent?: boolean
  gridSize: number
  onGridSizeChange: (size: number) => void
  isJoining?: boolean
  isJoinPending?: boolean
}

export default function MultiplayerLobby({
  onJoinGame,
  onCreateGame,
  onBack,
  playerAddress,
  createdGameId,
  isWaitingForOpponent,
  gridSize,
  onGridSizeChange,
  isJoining,
  isJoinPending,
}: MultiplayerLobbyProps) {
  const [activeTab, setActiveTab] = useState<"create" | "join">("create")
  const [gameIdInput, setGameIdInput] = useState("")
  const [copied, setCopied] = useState(false)
  const { chain } = useAccount()
  const { switchChain } = useSwitchChain()

  const isOnMantleSepolia = chain?.id === mantleSepolia.id

  const handleSwitchNetwork = () => {
    switchChain({ chainId: mantleSepolia.id })
  }

  const handleCopyGameId = () => {
    if (createdGameId) {
      navigator.clipboard.writeText(createdGameId.toString())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleJoinGame = () => {
    if (!gameIdInput) return
    try {
      const gameId = BigInt(gameIdInput)
      onJoinGame(gameId)
    } catch (error) {
      console.error("Invalid game ID:", error)
    }
  }

  // Show waiting screen for Player 2 (joining)
  if (isJoining && createdGameId !== undefined) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full">
          <Loader2 className="w-16 h-16 mx-auto mb-6 text-accent-blue animate-spin" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Joined Game #{createdGameId.toString()}!
          </h2>
          <p className="text-[var(--color-text-secondary)] text-lg mb-4">
            Waiting for game to start...
          </p>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            The game will begin shortly
          </p>
        </div>
      </div>
    )
  }

  // Show waiting screen for Player 1 (created game)
  if (isWaitingForOpponent && createdGameId !== undefined && !isJoining) {
    return (
      <div className="min-h-screen bg-transparent relative z-10 flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full">
          <Loader2 className="w-16 h-16 mx-auto mb-6 text-accent-blue animate-spin" />
          <h2 className="text-3xl font-bold text-white mb-6">
            Waiting for Player 2...
          </h2>

          <div className="card border mb-6">
            <p className="text-sm text-[var(--color-text-tertiary)] mb-3">
              Share this Game ID:
            </p>
            <div className="bg-bg-primary border border-accent-blue/50 rounded-lg p-6 mb-4">
              <p className="text-5xl font-mono font-black text-accent-blue">
                {createdGameId.toString()}
              </p>
            </div>
            <button
              onClick={handleCopyGameId}
              className="button-primary w-full flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Game ID
                </>
              )}
            </button>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
              Player 2 should enter this ID in the "Join Game" tab
            </p>
          </div>

          <div className="card border">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">
              Your wallet:
            </p>
            <p className="text-sm font-mono text-white">{playerAddress}</p>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="mt-6 text-[var(--color-text-tertiary)] hover:text-white transition-colors text-sm"
            >
              Cancel and go back
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent relative z-10 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Network Warning */}
        {!isOnMantleSepolia && (
          <div className="mb-6 card border-2 border-state-error">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-state-error flex-shrink-0" />
              <h3 className="text-xl font-bold text-state-error">Wrong Network!</h3>
            </div>
            <p className="text-[var(--color-text-secondary)] mb-4">
              You're currently on <strong>{chain?.name || "Unknown Network"}</strong>. You must switch to <strong>Mantle Sepolia</strong> to play multiplayer.
            </p>
            <button
              onClick={handleSwitchNetwork}
              className="button-primary w-full bg-state-error"
              style={{ backgroundColor: 'var(--color-error)' }}
            >
              Switch to Mantle Sepolia
            </button>
          </div>
        )}

        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[var(--color-text-tertiary)] hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back to Mode Selection</span>
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            On-Chain Matches
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Play with real players and earn rewards
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-[var(--color-border)]">
          {[{ id: "create", label: "Create Game" }, { id: "join", label: "Join Game" }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as "create" | "join")}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === id
                  ? "text-accent-blue border-b-2 border-accent-blue"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Create Game Tab */}
        {activeTab === "create" && (
          <div className="space-y-6">
            <div className="card border">
              <h3 className="text-lg font-bold text-white mb-6">Create New Game</h3>

              {/* Grid Size Selector */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Grid3x3 className="w-5 h-5 text-accent-blue" />
                  <h4 className="text-sm font-semibold text-white">Select Grid Size</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { size: 3, color: 'from-green-500 to-emerald-600', boxes: 4 },
                    { size: 4, color: 'from-blue-500 to-cyan-600', boxes: 9 },
                    { size: 5, color: 'from-yellow-500 to-orange-500', boxes: 16 },
                    { size: 6, color: 'from-red-500 to-pink-600', boxes: 25 }
                  ].map((item) => (
                    <button
                      key={item.size}
                      onClick={() => onGridSizeChange(item.size)}
                      className={`p-4 rounded-xl font-semibold transition-all ${
                        gridSize === item.size
                          ? `bg-gradient-to-r ${item.color} text-white shadow-lg border-2 border-white/30`
                          : "bg-bg-elevated border-2 border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-accent-blue/50"
                      }`}
                    >
                      <div className="text-2xl font-bold">{item.size}×{item.size}</div>
                      <div className="text-sm mt-1 opacity-90">{item.boxes} boxes</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  if (!isOnMantleSepolia) {
                    alert('⚠️ Please switch to Mantle Sepolia first!')
                    return
                  }
                  // Creating game
                  onCreateGame()
                }}
                disabled={!isOnMantleSepolia}
                className="button-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Game & Wait for Opponent
              </button>

              <p className="text-xs text-[var(--color-text-tertiary)] mt-3 text-center">
                After creating, you'll get a Game ID to share with Player 2
              </p>
            </div>
          </div>
        )}

        {/* Join Game Tab */}
        {activeTab === "join" && (
          <div className="space-y-6">
            <div className="card border">
              <h3 className="text-lg font-bold text-white mb-6">Join Existing Game</h3>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
                  Enter Game ID
                </label>
                <div className="flex gap-2">
                  <Input
                    value={gameIdInput}
                    onChange={(e) => setGameIdInput(e.target.value)}
                    placeholder="Enter Game ID from Player 1"
                    className="input flex-1 font-mono"
                    disabled={isJoinPending}
                  />
                  <Button
                    onClick={() => {
                      if (!isOnMantleSepolia) {
                        alert('⚠️ Please switch to Mantle Sepolia first!')
                        return
                      }
                      handleJoinGame()
                    }}
                    disabled={!gameIdInput || !isOnMantleSepolia || isJoinPending}
                    className="button-primary min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isJoinPending ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Joining...
                      </div>
                    ) : (
                      "Join Game"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-2">
                  {isJoinPending
                    ? "⏳ Please confirm the transaction in your wallet..."
                    : "Player 1 will share their Game ID with you"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Info */}
        <div className="mt-8 card border text-center">
          <div className="flex items-center justify-center gap-2">
            <Users className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            <p className="text-xs text-[var(--color-text-tertiary)]">Connected Wallet</p>
          </div>
          <p className="text-lg font-mono font-bold text-white mt-1">{playerAddress}</p>
        </div>
      </div>
    </div>
  )
}
