"use client"

import Link from "next/link"
import { Play, Zap } from "lucide-react"

export default function Hero() {
  return (
    <section className="px-8 py-24 md:py-32 max-w-7xl mx-auto relative overflow-hidden">
      <div className="text-center space-y-6 relative z-20">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
          <div className="w-8 h-px bg-gradient-to-r from-transparent via-accent-blue to-transparent"></div>
          <span className="text-white/70">Web3 Strategy Game</span>
          <div className="w-8 h-px bg-gradient-to-r from-transparent via-accent-blue to-transparent"></div>
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight">
          Master the Grid.
          <br />
          <span className="text-accent-blue">Claim Your Prize.</span>
        </h1>

        <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
          Experience the ultimate competitive Dots and Boxes game with real-time multiplayer, blockchain rewards, and a
          thriving community of strategic players.
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/game">
            <button className="button-primary px-8 py-3 rounded-lg font-bold text-lg flex items-center gap-2">
              <Play className="w-5 h-5" />
              Start Playing
            </button>
          </Link>
          <button className="px-8 py-3 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg font-bold text-lg hover:bg-bg-elevated hover:text-white transition-all flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Watch Demo
          </button>
        </div>
      </div>
    </section>
  )
}
