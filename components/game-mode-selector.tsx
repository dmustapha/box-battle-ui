"use client"

import { useState, useEffect } from "react"
import { Bot, Link2, Check, ArrowLeft, Wallet, X, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useAccount, useConnect, useDisconnect, useConnectors } from "wagmi"

interface GameModeSelectorProps {
  onSelectMode: (mode: "ai" | "multiplayer") => void
  gridSize?: number
  onGridSizeChange?: (size: number) => void
}

export default function GameModeSelector({ onSelectMode }: GameModeSelectorProps) {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const connectors = useConnectors()
  const [showConnectModal, setShowConnectModal] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId)
    if (connector) {
      connect({ connector })
      setShowConnectModal(false)
    }
  }

  if (!mounted) return null

  const modes = [
    {
      id: "ai" as const,
      title: "Play vs AI",
      description: "Challenge our intelligent computer opponent",
      icon: Bot,
      features: [
        "Adjustable difficulty",
        "Learn and improve",
        "Play anytime",
      ],
      color: "accent-blue",
    },
    {
      id: "multiplayer" as const,
      title: "Play On-Chain",
      description: "Compete with another player on the blockchain",
      icon: Link2,
      features: [
        "Real player matches",
        "On-chain records",
        "Earn rewards",
      ],
      color: "accent-red",
    },
  ]

  return (
    <>
      <div className="min-h-screen p-6 relative z-10 bg-transparent">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto">
          <Link href="/">
            <button className="flex items-center gap-2 text-[var(--color-text-tertiary)] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Back to Home</span>
            </button>
          </Link>

          {/* Wallet Button */}
          {isConnected ? (
            <button
              onClick={() => disconnect()}
              className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-state-success rounded-lg text-sm font-mono text-state-success hover:bg-bg-panel transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowConnectModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-bg-primary rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-4xl">
            {/* Title */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-white mb-2">
                BOXBATTLE
              </h1>
              <p className="text-lg text-[var(--color-text-secondary)]">
                Choose Your Opponent
              </p>
            </div>

            {/* Mode Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {modes.map((mode) => {
                const Icon = mode.icon
                const isAI = mode.id === "ai"
                const iconColor = isAI ? 'var(--color-player-1)' : 'var(--color-player-2)'

                return (
                  <div
                    key={mode.id}
                    className="card border-2 border-[var(--color-border)] hover:border-[var(--color-accent-blue)] transition-all duration-200 cursor-pointer group"
                    onClick={() => onSelectMode(mode.id)}
                  >
                    {/* Icon */}
                    <div className="flex items-center justify-center mb-6">
                      <div
                        className="w-20 h-20 rounded-lg flex items-center justify-center border-2"
                        style={{
                          backgroundColor: `${iconColor}15`,
                          borderColor: iconColor,
                        }}
                      >
                        <Icon
                          className="w-10 h-10"
                          style={{ color: iconColor }}
                          strokeWidth={2}
                        />
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h2 className="text-2xl font-bold text-white mb-2 text-center">
                      {mode.title}
                    </h2>
                    <p className="text-[var(--color-text-tertiary)] text-center text-sm mb-6">
                      {mode.description}
                    </p>

                    {/* Features */}
                    <div className="space-y-3 mb-8">
                      {mode.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[var(--color-text-secondary)] text-sm">
                          <Check
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: iconColor }}
                          />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Button */}
                    <button
                      className="w-full py-3 rounded-lg font-semibold transition-all"
                      style={{
                        backgroundColor: iconColor,
                        color: 'var(--color-bg-primary)',
                      }}
                    >
                      {isAI ? "Challenge AI" : "Find Player"}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Footer note */}
            <p className="text-center text-[var(--color-text-tertiary)] text-sm">
              Both modes support blockchain verification
            </p>
          </div>
        </div>
      </div>

      {/* Connect Wallet Modal */}
      {showConnectModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-modal-backdrop flex items-center justify-center"
          onClick={() => setShowConnectModal(false)}
        >
          <div
            className="bg-bg-panel border border-[var(--color-border)] rounded-xl p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Connect Wallet</h2>
                <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                  Choose how you want to connect
                </p>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="p-2 hover:bg-bg-elevated rounded-lg transition-colors text-[var(--color-text-tertiary)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wallet Options */}
            <div className="space-y-3 mb-6">
              {connectors.map((connector) => {
                const isInjected = connector.type === 'injected' || connector.id.includes('injected')
                let walletName = connector.name
                let walletDescription = 'Connect to your wallet'

                if (isInjected) {
                  if (walletName.toLowerCase().includes('metamask')) {
                    walletDescription = 'MetaMask browser extension'
                  } else if (walletName.toLowerCase().includes('zerion')) {
                    walletDescription = 'Zerion browser extension'
                  } else if (walletName.toLowerCase().includes('rabby')) {
                    walletDescription = 'Rabby browser extension'
                  } else if (walletName.toLowerCase().includes('rainbow')) {
                    walletDescription = 'Rainbow browser extension'
                  } else if (walletName.toLowerCase().includes('coinbase')) {
                    walletDescription = 'Coinbase Wallet extension'
                  } else {
                    walletDescription = 'Browser extension wallet'
                  }
                }

                return (
                  <button
                    key={connector.id}
                    onClick={() => handleConnect(connector.id)}
                    className="w-full px-6 py-4 bg-bg-elevated border border-[var(--color-border)] rounded-lg text-left hover:border-accent-blue hover:bg-bg-primary transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent-blue/10 border border-accent-blue/20 rounded-lg flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-accent-blue" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold">{walletName}</p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">{walletDescription}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Supported Wallets */}
            <div className="p-4 bg-bg-elevated rounded-lg border border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
                Supported Browser Wallets:
              </p>
              <div className="flex flex-wrap gap-2">
                {["MetaMask", "Rabby", "Zerion", "Rainbow", "Coinbase", "Trust"].map((wallet) => (
                  <span
                    key={wallet}
                    className="px-2 py-1 bg-bg-primary rounded text-xs text-[var(--color-text-secondary)]"
                  >
                    {wallet}
                  </span>
                ))}
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setShowConnectModal(false)}
              className="w-full mt-4 px-6 py-3 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:bg-bg-elevated transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
