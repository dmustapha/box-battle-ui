"use client"

import { useState } from "react"
import { User, Wallet, AlertCircle, CheckCircle2 } from "lucide-react"

interface UsernameSetupProps {
  onSubmit: (username: string) => void
  address: string
}

export default function UsernameSetup({ onSubmit, address }: UsernameSetupProps) {
  const [username, setUsername] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters")
      return
    }

    if (username.trim().length > 20) {
      setError("Username must be less than 20 characters")
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores")
      return
    }

    localStorage.setItem(`username_${address}`, username.trim())
    onSubmit(username.trim())
  }

  const isValid = username.trim().length >= 3 && username.trim().length <= 20 && /^[a-zA-Z0-9_]+$/.test(username)

  return (
    <div className="min-h-screen bg-transparent relative z-10 p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-accent-blue/10 border-2 border-accent-blue/30 rounded-lg flex items-center justify-center">
              <User className="w-8 h-8 text-accent-blue" strokeWidth={2} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to BoxBattle
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Create your player name to get started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Input */}
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Player Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError("")
                }}
                placeholder="Enter your name"
                className="input w-full pl-4 pr-10"
                maxLength={20}
                autoFocus
              />
              {username && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValid ? (
                    <CheckCircle2 className="w-5 h-5 text-state-success" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-state-error" />
                  )}
                </div>
              )}
            </div>

            {error && (
              <p className="text-state-error text-sm mt-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}

            <p className="text-xs text-[var(--color-text-tertiary)] mt-2">
              3-20 characters • Letters, numbers, and underscores only
            </p>
          </div>

          {/* Connected Wallet */}
          <div className="card border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-state-success/10 border border-state-success/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-state-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--color-text-tertiary)] mb-1">
                  Connected Wallet
                </p>
                <p className="text-sm text-white font-mono truncate">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="button-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isValid}
          >
            Continue
          </button>
        </form>

        {/* Footer Note */}
        <p className="text-center mt-6 text-sm text-[var(--color-text-tertiary)]">
          Your name will be visible to other players
        </p>
      </div>
    </div>
  )
}
