"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type GamePhaseContextType = {
  isPlayingGame: boolean
  setIsPlayingGame: (isPlaying: boolean) => void
}

const GamePhaseContext = createContext<GamePhaseContextType | undefined>(undefined)

export function GamePhaseProvider({ children }: { children: ReactNode }) {
  const [isPlayingGame, setIsPlayingGame] = useState(false)

  return (
    <GamePhaseContext.Provider value={{ isPlayingGame, setIsPlayingGame }}>
      {children}
    </GamePhaseContext.Provider>
  )
}

export function useGamePhase() {
  const context = useContext(GamePhaseContext)
  if (context === undefined) {
    // Return default values if used outside provider
    return { isPlayingGame: false, setIsPlayingGame: () => {} }
  }
  return context
}
