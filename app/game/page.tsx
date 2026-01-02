"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAccount } from "wagmi"
import { Trophy, Clock, Zap } from "lucide-react"
import Header from "@/components/header"
import GameBoard from "@/components/game-board"
import WinnerOverlay from "@/components/winner-overlay"
import GameModeSelector from "@/components/game-mode-selector"
import MultiplayerLobby from "@/components/multiplayer-lobby"
import DifficultySelector from "@/components/difficulty-selector"
import GridSizeSelector from "@/components/grid-size-selector"
import UsernameSetup from "@/components/username-setup"
import { AIPlayer, type Difficulty } from "@/utils/ai-player"
import { useAutoplayMusic } from "@/hooks/useSound"
import { playLineClick, playBoxComplete, playWin, playLose } from "@/lib/sounds"
import {
  useGameState,
  useCreateGame,
  useJoinGame,
  useWatchGameCreated,
  useWatchGameStarted,
  useWatchGameEnded,
  useWaitForTransactionReceipt,
  useGameCounter,
} from "@/hooks/useGameContract"
import { useWebSocketGame } from "@/hooks/useWebSocketGame"
import { useToast } from "@/contexts/toast-context"
import { decodeEventLog } from "viem"
import { GAME_CONTRACT_ABI } from "@/lib/contract-abi"
import { GAME_CONTRACT_ADDRESS } from "@/lib/wagmi-config"

type GameMode = "ai" | "multiplayer" | null
type GamePhase = "username-setup" | "mode-select" | "difficulty-select" | "lobby" | "playing"

export default function GamePage() {
  const account = useAccount()
  const { address, isConnected } = account || { address: undefined, isConnected: false }
  const { showToast } = useToast()

  // Username state
  const [playerUsername, setPlayerUsername] = useState<string>("")
  const [opponentUsername, setOpponentUsername] = useState<string>("")

  // Game configuration
  const [gameMode, setGameMode] = useState<GameMode>(null)
  const [gamePhase, setGamePhase] = useState<GamePhase>("username-setup")
  const [gridSize, setGridSize] = useState<3 | 4 | 5 | 6>(5)

  // Dynamic timer based on grid size
  const getTimerForGridSize = (size: number) => {
    const timerMap: Record<number, number> = {
      6: 300, // 5 minutes
      5: 240, // 4 minutes
      4: 180, // 3 minutes
      3: 120, // 2 minutes
    }
    return timerMap[size] || 180
  }

  // Game state
  const [currentPlayer, setCurrentPlayer] = useState<"player1" | "player2">("player1")
  const [scores, setScores] = useState({ player1: 0, player2: 0 })
  const [winner, setWinner] = useState<"player1" | "player2" | "draw" | null>(null)
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [timer, setTimer] = useState(getTimerForGridSize(gridSize))
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [aiPlayer, setAiPlayer] = useState<AIPlayer | null>(null)
  const [drawnLines, setDrawnLines] = useState<Map<string, "player1" | "player2">>(new Map())
  // Ref for synchronous guard checks (state updates are async, ref updates are sync)
  const drawnLinesRef = useRef<Map<string, "player1" | "player2">>(new Map())
  const [completedBoxes, setCompletedBoxes] = useState<Map<string, "player1" | "player2">>(new Map())
  const [isProcessingMove, setIsProcessingMove] = useState(false)
  const [totalBoxes, setTotalBoxes] = useState((gridSize - 1) * (gridSize - 1))
  const [aiNeedsAnotherTurn, setAiNeedsAnotherTurn] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showPlayAgainPrompt, setShowPlayAgainPrompt] = useState(false)
  const [playAgainRequesterNum, setPlayAgainRequesterNum] = useState<number | null>(null)
  const [waitingForPlayAgainResponse, setWaitingForPlayAgainResponse] = useState(false)
  const [lobbyTimeRemaining, setLobbyTimeRemaining] = useState(120) // 2 minute lobby timeout

  // Multiplayer blockchain state
  const [gameId, setGameId] = useState<bigint | undefined>()
  const [isJoiningGame, setIsJoiningGame] = useState(false)
  const [player1Address, setPlayer1Address] = useState<string>("")
  const [player2Address, setPlayer2Address] = useState<string>("")
  const { data: gameState, refetch: refetchGame } = useGameState(gameId)
  const { createGame, hash: createTxHash, isPending: isCreatePending } = useCreateGame((msg) => {
    showToast(msg, 'error')
    // Reset loading state if there's an error
    setIsCreatingGame(false)
    isCreatingGameRef.current = false
  })
  const [isCreatingGame, setIsCreatingGame] = useState(false)
  const { joinGame, isSuccess: gameJoined, isPending: isJoinPending, isError: isJoinError, hash: joinTxHash } = useJoinGame((msg) => {
    showToast(msg, 'error')
    // Reset joining state if there's an error
    setIsJoiningGame(false)
  })

  // Ref to track when actively creating a game (prevents event re-processing after cancel)
  const isCreatingGameRef = useRef(false)

  // Ref to track current gamePhase for WebSocket callbacks
  const gamePhaseRef = useRef<GamePhase>(gamePhase)

  // Keep gamePhaseRef in sync with gamePhase state
  useEffect(() => {
    gamePhaseRef.current = gamePhase
  }, [gamePhase])

  // Determine player number (1 for creator, 2 for joiner)
  const playerNum = isJoiningGame ? 2 : (gameId ? 1 : undefined)

  // Autoplay background music on mount
  useAutoplayMusic()

  // WebSocket for real-time moves (NO BLOCKCHAIN SIGNATURES!)
  const { isConnected: wsConnected, sendMove, sendQuit, sendPlayAgainRequest, sendPlayAgainResponse } = useWebSocketGame({
    gameId,
    playerAddress: address,
    playerNum,
    playerUsername,
    gridSize,
    // Player 1: connect when in lobby (has gameId, not joining)
    // Player 2: connect ONLY after transaction confirms (gameJoined = true)
    enabled: gameMode === "multiplayer" && (
      gamePhase === "playing" ||
      (gamePhase === "lobby" && (!isJoiningGame || gameJoined))
    ),
    onGridSizeReceived: (receivedGridSize) => {
      // Player 2 receives grid size from Player 1
      console.log(`[Player 2] Received grid size from Player 1: ${receivedGridSize}`)
      setGridSize(receivedGridSize as 3 | 4 | 5 | 6)
    },
    onOpponentMove: (lineId, opponentPlayerNum) => {
      // Opponent move received

      // Determine opponent's player key
      const opponentPlayer: "player1" | "player2" = opponentPlayerNum === 1 ? 'player1' : 'player2'

      // Update ref IMMEDIATELY (sync) to prevent race conditions
      drawnLinesRef.current.set(lineId, opponentPlayer)

      // Create new lines map for state
      const updated = new Map(drawnLinesRef.current)

      // Update state
      setDrawnLines(updated)

      // Check if opponent completed a box with this move (pass player explicitly to avoid stale closure)
      const { newBoxes, count: boxesCompleted } = checkBoxCompletion(lineId, updated, opponentPlayer)

      if (boxesCompleted > 0) {
        // Opponent completed box(es) - update boxes first, then score
        setCompletedBoxes(newBoxes)
        // Opponent keeps turn, don't switch
        setScores((prevScores) => ({
          ...prevScores,
          [opponentPlayer]: prevScores[opponentPlayer] + boxesCompleted,
        }))
      } else {
        // Opponent didn't complete a box, switch to my turn
        setCurrentPlayer(opponentPlayerNum === 1 ? "player2" : "player1")
      }
    },
    onPlayerJoined: (joinedPlayerNum, joinedAddress, joinedUsername) => {
      // Player joined game

      // Store player addresses and username
      if (joinedPlayerNum === 1) {
        setPlayer1Address(joinedAddress)
      } else if (joinedPlayerNum === 2) {
        setPlayer2Address(joinedAddress)
      }

      // Store opponent's username from WebSocket message
      if (joinedUsername) {
        console.log(`[Game] Received opponent username: ${joinedUsername}`)
        setOpponentUsername(joinedUsername)
      }

      // If I'm Player 1 and Player 2 just joined, prepare the game (but DON'T start yet!)
      // Use ref for gamePhase check to avoid stale closure
      if (playerNum === 1 && joinedPlayerNum === 2 && gamePhaseRef.current === "lobby") {
        // Player 2 joined, preparing game state
        // Set my own address as Player 1
        if (address) {
          setPlayer1Address(address)
        }
        setPlayer2Address(joinedAddress)
        drawnLinesRef.current = new Map()
        setDrawnLines(new Map())
        setCompletedBoxes(new Map())
        setScores({ player1: 0, player2: 0 })
        // Don't set currentPlayer or gamePhase here - wait for WebSocket first-turn message
        refetchGame()
      }
    },
    onPlayerLeft: (leftPlayerNum, leftAddress) => {
      // Check if we're still in lobby phase
      if (gamePhaseRef.current === "lobby") {
        // In lobby - just notify and return to mode select (no winner)
        showToast(`Player ${leftPlayerNum} left the lobby. Returning to menu.`, "info")
        handleReset()
        return
      }

      // In game - Player left, I win!
      const myPlayerKey = leftPlayerNum === 1 ? "player2" : "player1"
      setWinner(myPlayerKey)

      // Show win message and return to mode selection
      showToast(`Player ${leftPlayerNum} left the game. You win!`, "success")
      handleReset()
    },
    onPlayerQuit: (quitPlayerNum) => {
      // Check if we're still in lobby phase
      if (gamePhaseRef.current === "lobby") {
        // In lobby - just notify and return to mode select (no winner)
        showToast(`Player ${quitPlayerNum} cancelled. Returning to menu.`, "info")
        handleReset()
        return
      }

      // In game - Opponent quit, I win!
      const myPlayerKey = quitPlayerNum === 1 ? "player2" : "player1"
      setWinner(myPlayerKey)

      // Show win message
      showToast(`Player ${quitPlayerNum} quit the game. You win!`, "success")
      handleReset()
    },
    onPlayAgainRequest: (requesterNum) => {
      // Opponent wants to play again
      setPlayAgainRequesterNum(requesterNum)
      setShowPlayAgainPrompt(true)
    },
    onPlayAgainResponse: (accepted) => {
      setWaitingForPlayAgainResponse(false)
      if (accepted) {
        // Opponent accepted! Restart the game
        handleRestartMultiplayer()
      } else {
        // Opponent declined, go back to menu
        showToast("Your opponent declined. Returning to menu.", "info")
        handleReset()
      }
    },
    onFirstTurnReceived: (firstPlayer) => {
      // Server determined first turn via coin toss - THIS is when we start playing!
      console.log(`[Game] First turn received from server: ${firstPlayer}`)
      setCurrentPlayer(firstPlayer)
      // Only transition to playing when we receive first-turn (confirms both players connected)
      setGamePhase("playing")
    }
  })

  // Wait for create game transaction and extract game ID from logs
  const { data: txReceipt, isSuccess: isTxConfirmed, isLoading: isTxPending, isError: isTxError } = useWaitForTransactionReceipt({
    hash: createTxHash,
  })

  // Transaction receipt watcher logs removed for production

  // Fallback: Use game counter when receipt fails
  const { data: gameCounter } = useGameCounter()

  // Extract gameId from transaction receipt OR use counter fallback
  useEffect(() => {
    // Skip if we're not actively creating a game (user may have cancelled)
    if (!isCreatingGameRef.current) return

    // If receipt parsing succeeds, use it
    if (isTxConfirmed && txReceipt && !gameId) {
      // GameCreated event signature hash
      const gameCreatedTopic = '0xc3e0f84839dc888c892a013d10c8f9d6dc05a21a879d0ce468ca558013e9121c'

      // Find the GameCreated event in the logs
      const gameCreatedLog = txReceipt.logs.find((log) => {
        // Check if log is from our contract and is GameCreated event
        return log.address.toLowerCase() === GAME_CONTRACT_ADDRESS.toLowerCase() &&
               log.topics[0] === gameCreatedTopic
      })

      if (gameCreatedLog) {
        // Manually extract gameId from topics[1] (it's indexed so it's in topics, not data)
        // Topics: [signature, gameId, player1Address]
        const gameIdHex = gameCreatedLog.topics[1]
        const extractedGameId = BigInt(gameIdHex)

        console.log('[Game] Extracted gameId from receipt:', extractedGameId.toString())
        setGameId(extractedGameId)
        setIsCreatingGame(false)
        setGamePhase("lobby")
      } else {
        console.error('[Game] NO GameCreated event found - transaction may have reverted')
      }
    }

    // Fallback: If receipt times out but we have a hash and game counter, use counter
    if (createTxHash && !gameId && !isTxPending && !isTxConfirmed && gameCounter) {
      // Wait a bit to ensure transaction is mined
      setTimeout(() => {
        // Also check ref inside timer to prevent late execution after cancel
        if (!gameId && isCreatingGameRef.current) {
          console.log('[Game] Using gameCounter fallback:', gameCounter.toString())
          setGameId(gameCounter)
          setIsCreatingGame(false)
          setGamePhase("lobby")
        }
      }, 3000)
    }
  }, [isTxConfirmed, isTxError, isTxPending, txReceipt, gameId, createTxHash, gameCounter])

  // Timeout fallback: If stuck creating for too long, use game counter
  useEffect(() => {
    if (!isCreatingGame || !createTxHash || gameId) return

    const timeoutId = setTimeout(() => {
      // If still creating after 15 seconds, try to use game counter
      if (isCreatingGameRef.current && !gameId && gameCounter) {
        console.log('[Game] Timeout fallback - using gameCounter:', gameCounter.toString())
        setGameId(gameCounter)
        setIsCreatingGame(false)
        setGamePhase("lobby")
      }
    }, 15000) // 15 second timeout

    return () => clearTimeout(timeoutId)
  }, [isCreatingGame, createTxHash, gameId, gameCounter])

  // Check for existing username on mount
  useEffect(() => {
    if (address) {
      const savedUsername = localStorage.getItem(`username_${address}`)
      if (savedUsername) {
        setPlayerUsername(savedUsername)
        setGamePhase("mode-select")
      }
    }
  }, [address])

  // Update total boxes when grid size changes
  useEffect(() => {
    setTotalBoxes((gridSize - 1) * (gridSize - 1))
  }, [gridSize])

  // Update timer when grid size changes
  useEffect(() => {
    if (gamePhase === "mode-select" || gamePhase === "difficulty-select") {
      setTimer(getTimerForGridSize(gridSize))
    }
  }, [gridSize, gamePhase])

  // Watch blockchain events
  useWatchGameCreated((event) => {
    // Ignore events if we're not actively creating a game (prevents re-processing after cancel)
    if (!isCreatingGameRef.current) {
      console.log('[GameCreated] Ignoring event - not actively creating a game')
      return
    }

    console.log('[GameCreated Event]', event)
    console.log('[GameCreated] Player1:', event.player1)
    console.log('[GameCreated] Current address:', address)
    console.log('[GameCreated] Game ID:', event.gameId)

    if (event.player1?.toLowerCase() === address?.toLowerCase()) {
      console.log('[GameCreated] This is my game! Setting gameId and transitioning to lobby')
      setGameId(event.gameId)
      setIsCreatingGame(false)
      setGamePhase("lobby")
    } else {
      console.log('[GameCreated] Not my game, ignoring')
    }
  })

  useWatchGameStarted((event) => {
    console.log('[GameStarted Event]', event)
    console.log('[GameStarted] Event gameId:', event.gameId, 'Type:', typeof event.gameId)
    console.log('[GameStarted] My gameId:', gameId, 'Type:', typeof gameId)
    console.log('[GameStarted] Player 1:', event.player1)
    console.log('[GameStarted] Player 2:', event.player2)
    console.log('[GameStarted] First turn:', event.firstTurn)
    console.log('[GameStarted] Comparison:', event.gameId === gameId, event.gameId == gameId)
    console.log('[GameStarted] String comparison:', event.gameId.toString() === gameId?.toString())

    // Use string comparison for BigInt to be safe
    if (gameId && event.gameId.toString() === gameId.toString()) {
      // IMPORTANT: Only reset state if game hasn't started yet!
      // The blockchain event can arrive AFTER WebSocket first-turn and moves have been made.
      // WebSocket is faster than blockchain, so we should NOT reset if already playing.
      if (gamePhaseRef.current === "playing") {
        console.log('[GameStarted] Game already playing, NOT resetting state (blockchain event arrived late)')
        return
      }

      console.log('[GameStarted] THIS IS MY GAME! Preparing state...')
      // Reset game state for new multiplayer game
      drawnLinesRef.current = new Map()
      setDrawnLines(new Map())
      setCompletedBoxes(new Map())
      setScores({ player1: 0, player2: 0 })
      // Don't set currentPlayer or gamePhase here - wait for WebSocket first-turn message
      refetchGame()
    } else {
      console.log('[GameStarted] Not my game, ignoring. Event:', event.gameId.toString(), 'Mine:', gameId?.toString())
    }
  })

  useWatchGameEnded((event) => {
    if (event.gameId === gameId) {
      refetchGame()
      setWinner(event.winner.toLowerCase() === gameState?.player1.toLowerCase() ? "player1" : "player2")
      setGamePhase("playing")
    }
  })

  // NOTE: Scoring is handled directly in move handlers (handleLineClick, makeAIMove, onOpponentMove)
  // DO NOT add a useEffect here to recalculate scores - it causes duplicate counting!

  // Box completion check
  const isBoxComplete = useCallback((boxRow: number, boxCol: number, testLines: Map<string, "player1" | "player2">): boolean => {
    const top = `h-${boxRow}-${boxCol}-${boxRow}-${boxCol + 1}`
    const bottom = `h-${boxRow + 1}-${boxCol}-${boxRow + 1}-${boxCol + 1}`
    const left = `v-${boxRow}-${boxCol}-${boxRow + 1}-${boxCol}`
    const right = `v-${boxRow}-${boxCol + 1}-${boxRow + 1}-${boxCol + 1}`

    return testLines.has(top) && testLines.has(bottom) && testLines.has(left) && testLines.has(right)
  }, [])

  const checkBoxCompletion = useCallback(
    (lineId: string, testLines: Map<string, "player1" | "player2">, player: "player1" | "player2"): { newBoxes: Map<string, "player1" | "player2">; count: number } => {
      const newBoxes = new Map(completedBoxes)
      let completedCount = 0

      // Check all boxes that could be affected by this line
      for (let row = 0; row < gridSize - 1; row++) {
        for (let col = 0; col < gridSize - 1; col++) {
          const boxId = `box-${row}-${col}`

          // Skip if already completed
          if (newBoxes.has(boxId)) continue

          if (isBoxComplete(row, col, testLines)) {
            newBoxes.set(boxId, player)
            completedCount++
          }
        }
      }

      return { newBoxes, count: completedCount }
    },
    [completedBoxes, isBoxComplete, gridSize],
  )

  // AI Move logic
  const makeAIMove = useCallback(() => {
    console.log("[AI] makeAIMove called")
    setIsProcessingMove(true)

    if (!aiPlayer) {
      console.log("[AI] AI player not initialized")
      setIsProcessingMove(false)
      return
    }

    const aiMove = aiPlayer.makeMove(drawnLinesRef.current, gridSize - 1)
    console.log("[AI] AI move selected:", aiMove.lineId)

    if (!aiMove.lineId) {
      console.log("[AI] No valid AI move found")
      setIsProcessingMove(false)
      return
    }

    // Update ref IMMEDIATELY (sync) to prevent race conditions
    drawnLinesRef.current.set(aiMove.lineId, "player2")

    // Create new lines map for state
    const newDrawnLines = new Map(drawnLinesRef.current)

    // Update drawn lines state
    setDrawnLines(newDrawnLines)

    // Check for completed boxes (AI is always player2)
    const { newBoxes, count: boxesCompleted } = checkBoxCompletion(aiMove.lineId, newDrawnLines, "player2")
    setCompletedBoxes(newBoxes)

    console.log("[AI] Boxes completed by AI:", boxesCompleted)

    if (boxesCompleted > 0) {
      setScores((prev) => ({
        ...prev,
        player2: prev.player2 + boxesCompleted,
      }))
      setMoveHistory((prev) => [...prev.slice(-2), `AI completed ${boxesCompleted} box(es) - another turn!`])
      console.log("[AI] AI completed boxes - gets another turn")
      setAiNeedsAnotherTurn(true)
    } else {
      console.log("[AI] AI passed turn - switching to player1")
      setCurrentPlayer("player1")
      setMoveHistory((prev) => [...prev.slice(-2), "AI passed to you"])
    }

    setIsProcessingMove(false)
  }, [aiPlayer, checkBoxCompletion, gridSize])

  // Check for game end (works for BOTH AI and Multiplayer)
  useEffect(() => {
    if (completedBoxes.size === totalBoxes && gamePhase === "playing") {
      const p1Score = scores.player1
      const p2Score = scores.player2

      let winningPlayer: "player1" | "player2" | "draw"

      if (p1Score > p2Score) {
        winningPlayer = "player1"
      } else if (p2Score > p1Score) {
        winningPlayer = "player2"
      } else {
        // Tie: it's a draw
        winningPlayer = "draw"
      }

      // Play correct sound for each player
      if (winningPlayer === "draw") {
        // No sound for draw
      } else if (gameMode === "ai") {
        // AI mode: player is always player1
        if (winningPlayer === "player1") {
          playWin()
        } else {
          playLose()
        }
      } else if (gameMode === "multiplayer") {
        // Multiplayer: check which player I am
        const iAmPlayer1 = playerNum === 1
        const iAmPlayer2 = playerNum === 2

        if ((iAmPlayer1 && winningPlayer === "player1") || (iAmPlayer2 && winningPlayer === "player2")) {
          playWin()
        } else {
          playLose()
        }
      }

      console.log("[Game] Game over!", {
        mode: gameMode,
        p1Score,
        p2Score,
        winner: winningPlayer,
        myPlayerNum: playerNum
      })

      setWinner(winningPlayer)
    }
  }, [completedBoxes, totalBoxes, gamePhase, scores, gameMode, playerNum])

  // Initialize AI player
  useEffect(() => {
    if (gameMode === "ai" && gamePhase === "playing") {
      const player = new AIPlayer(difficulty)
      setAiPlayer(player)
    }
  }, [gameMode, gamePhase, difficulty])

  // AI turn trigger
  useEffect(() => {
    if (gamePhase !== "playing" || isProcessingMove || !aiPlayer) return
    if (currentPlayer !== "player2") return
    if (gameMode !== "ai") return

    const timer = setTimeout(() => {
      console.log("[AI] AI turn triggered")
      makeAIMove()
    }, 1200)

    return () => clearTimeout(timer)
  }, [currentPlayer, gamePhase, isProcessingMove, aiPlayer, gameMode, makeAIMove])

  // AI bonus turn
  useEffect(() => {
    if (!aiNeedsAnotherTurn || isProcessingMove || gamePhase !== "playing") return

    const timer = setTimeout(() => {
      console.log("[AI] AI taking another turn after box completion")
      setAiNeedsAnotherTurn(false)
      makeAIMove()
    }, 1000)

    return () => clearTimeout(timer)
  }, [aiNeedsAnotherTurn, isProcessingMove, gamePhase, makeAIMove])

  // Timer countdown
  useEffect(() => {
    if (gamePhase !== "playing" || timer <= 0) return

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          // Determine winner or draw when timer runs out
          if (scores.player1 > scores.player2) {
            setWinner("player1")
          } else if (scores.player2 > scores.player1) {
            setWinner("player2")
          } else {
            setWinner("draw")
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [gamePhase, timer, scores])

  // Lobby timeout countdown (120 seconds)
  useEffect(() => {
    // Only run in lobby phase for multiplayer with a gameId
    if (gamePhase !== "lobby" || gameMode !== "multiplayer" || !gameId) {
      return
    }

    // Reset timer when entering lobby
    setLobbyTimeRemaining(120)

    const interval = setInterval(() => {
      setLobbyTimeRemaining((prev) => {
        if (prev <= 1) {
          // Timeout expired - cancel and return to menu
          console.log('[Lobby] Timeout expired, returning to menu')
          isCreatingGameRef.current = false
          showToast('Lobby timeout. No opponent joined in time.', 'info')
          handleReset()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [gamePhase, gameMode, gameId])

  // Handle line click
  const handleLineClick = useCallback(
    (lineId: string) => {
      // Use ref for guard check (synchronous) - state updates are async and can cause duplicate clicks
      if (isProcessingMove || drawnLinesRef.current.has(lineId) || gamePhase !== "playing") return

      // AI mode: only allow player 1 to click
      if (gameMode === "ai" && currentPlayer !== "player1") return

      // Multiplayer mode: WebSocket (NO SIGNATURES!)
      if (gameMode === "multiplayer") {
        if (!playerNum) {
          console.log('[Multiplayer] Player number not set')
          return
        }

        // Check if it's my turn
        const isMyTurn = (currentPlayer === "player1" && playerNum === 1) ||
                        (currentPlayer === "player2" && playerNum === 2)

        if (!isMyTurn) {
          console.log('[Multiplayer] Not my turn, ignoring click')
          return
        }

        console.log('[Multiplayer] 📤 Sending move via WebSocket:', lineId)

        // Play line click sound
        playLineClick()

        // Update ref IMMEDIATELY (sync) to prevent duplicate clicks
        drawnLinesRef.current.set(lineId, currentPlayer)

        // Create new lines map with this line added for state
        const newDrawnLines = new Map(drawnLinesRef.current)

        // Update drawn lines state (async)
        setDrawnLines(newDrawnLines)

        // Check for completed boxes with the updated lines (pass currentPlayer explicitly)
        const { newBoxes, count: boxesCompleted } = checkBoxCompletion(lineId, newDrawnLines, currentPlayer)
        setCompletedBoxes(newBoxes)

        if (boxesCompleted > 0) {
          // Play box complete sound
          playBoxComplete()
          // Update my score
          setScores((prevScores) => ({
            ...prevScores,
            [currentPlayer]: prevScores[currentPlayer] + boxesCompleted,
          }))
          setMoveHistory((prevHistory) => [...prevHistory.slice(-2), `You completed ${boxesCompleted} box(es) - your turn again!`])
          // Keep current turn, don't switch
        } else {
          // Switch turns
          setCurrentPlayer(currentPlayer === "player1" ? "player2" : "player1")
          setMoveHistory((prevHistory) => [...prevHistory.slice(-2), "Turn passed to opponent"])
        }

        // Send move to opponent via WebSocket
        sendMove(lineId)
        return
      }

      // AI mode: process move locally
      setIsProcessingMove(true)

      // Play line click sound
      playLineClick()

      // Update ref IMMEDIATELY (sync) to prevent duplicate clicks
      drawnLinesRef.current.set(lineId, "player1")

      // Create new lines map for state
      const newDrawnLines = new Map(drawnLinesRef.current)

      // Update drawn lines state (async)
      setDrawnLines(newDrawnLines)

      // Check for completed boxes (human is always player1 in AI mode)
      const { newBoxes, count: boxesCompleted } = checkBoxCompletion(lineId, newDrawnLines, "player1")
      setCompletedBoxes(newBoxes)

      if (boxesCompleted > 0) {
        // Play box complete sound
        playBoxComplete()
        setScores((prevScores) => ({
          ...prevScores,
          player1: prevScores.player1 + boxesCompleted,
        }))
        setMoveHistory((prevHistory) => [...prevHistory.slice(-2), `You completed ${boxesCompleted} box(es) - your turn again!`])
      } else {
        setCurrentPlayer("player2")
        setMoveHistory((prevHistory) => [...prevHistory.slice(-2), "Turn passed"])
      }

      setIsProcessingMove(false)
    },
    [isProcessingMove, gameMode, currentPlayer, gamePhase, checkBoxCompletion, playerNum, sendMove],
  )

  const handleUsernameSubmit = (username: string) => {
    setPlayerUsername(username)
    setGamePhase("mode-select")
  }

  const handleSelectMode = (mode: "ai" | "multiplayer") => {
    setGameMode(mode)
    if (mode === "ai") {
      setGamePhase("difficulty-select")
    } else {
      setGamePhase("lobby")
    }
  }

  const handleSelectGridSize = (size: 3 | 4 | 5 | 6) => {
    setGridSize(size)
    if (gameMode === "ai") {
      setGamePhase("difficulty-select")
    } else {
      setGamePhase("lobby")
    }
  }

  const handleSelectDifficulty = (diff: Difficulty) => {
    setDifficulty(diff)
    setGamePhase("playing")
  }

  const handleCreateGame = () => {
    // Creating game
    isCreatingGameRef.current = true
    setIsCreatingGame(true)
    // Set my address as Player 1
    if (address) {
      setPlayer1Address(address)
    }
    createGame()
  }

  // Cancel creating game (before transaction confirms)
  const handleCancelCreateGame = () => {
    console.log('[Game] Cancelling game creation')
    isCreatingGameRef.current = false
    setIsCreatingGame(false)
    // Note: The blockchain transaction may still go through,
    // but we won't track it or enter the lobby
  }

  const handleJoinGame = (gameIdToJoin: bigint) => {
    // Joining game
    setGameId(gameIdToJoin)
    setIsJoiningGame(true)
    // Set my address as Player 2
    if (address) {
      setPlayer2Address(address)
    }
    // Calling join game transaction
    joinGame(gameIdToJoin)
  }

  // Cancel from lobby - notify opponent and reset state
  const handleCancelLobby = () => {
    console.log('[Lobby] Cancel - notifying opponent and resetting')

    // Send quit notification via WebSocket (if connected)
    if (sendQuit) {
      sendQuit()
    }

    // Reset the creating game flag to prevent event re-processing
    isCreatingGameRef.current = false

    // Reset all game state
    handleReset()
  }

  // Watch for successful game join - prepare Player 2's state
  useEffect(() => {
    if (gameJoined && gameId && gameMode === "multiplayer") {
      // Set my address as Player 2
      if (address) {
        setPlayer2Address(address)
      }
      refetchGame()
      // Don't set gamePhase here - wait for WebSocket first-turn message
    }
  }, [gameJoined, gameId, gameMode, address])

  // Watch for join errors - reset state if transaction fails/rejected
  useEffect(() => {
    if (isJoinError && isJoiningGame) {
      console.log('[Game] Join transaction failed, resetting state')
      setIsJoiningGame(false)
      setGameId(undefined)
      setPlayer2Address("")
      // Stay in lobby phase so user can try again
    }
  }, [isJoinError, isJoiningGame])

  const handleBack = () => {
    // Show confirmation for multiplayer or in-progress games
    if (gameMode === "multiplayer" || (gamePhase === "playing" && drawnLines.size > 0)) {
      setShowQuitConfirm(true)
    } else {
      handleReset()
    }
  }

  const handleConfirmQuit = () => {
    setShowQuitConfirm(false)

    // Send quit notification to opponent if in multiplayer
    if (gameMode === "multiplayer" && sendQuit) {
      sendQuit()
    }

    handleReset()
  }

  const handleReset = () => {
    // Reset the creating game flag to prevent event re-processing
    isCreatingGameRef.current = false
    setIsCreatingGame(false)
    setScores({ player1: 0, player2: 0 })
    setWinner(null)
    setMoveHistory([])
    setCurrentPlayer("player1")
    setTimer(getTimerForGridSize(gridSize))
    drawnLinesRef.current = new Map()
    setDrawnLines(new Map())
    setCompletedBoxes(new Map())
    setGamePhase("mode-select")
    setGameMode(null)
    setAiPlayer(null)
    setAiNeedsAnotherTurn(false)
    setGameId(undefined)
    setIsJoiningGame(false) // Reset player number determination
    setPlayer1Address("")
    setPlayer2Address("")
  }

  const handleRestartAI = () => {
    // Restart AI game with same difficulty and grid size
    setScores({ player1: 0, player2: 0 })
    setWinner(null)
    setMoveHistory([])
    setCurrentPlayer("player1")
    setTimer(getTimerForGridSize(gridSize))
    drawnLinesRef.current = new Map()
    setDrawnLines(new Map())
    setCompletedBoxes(new Map())
    // Keep gameMode, difficulty, aiPlayer, and gridSize
  }

  const handleRestartMultiplayer = () => {
    // Restart multiplayer game (keep addresses and gameId)
    setScores({ player1: 0, player2: 0 })
    setWinner(null)
    setMoveHistory([])
    // Don't set currentPlayer here - server will send new first-turn via WebSocket
    setTimer(getTimerForGridSize(gridSize))
    drawnLinesRef.current = new Map()
    setDrawnLines(new Map())
    setCompletedBoxes(new Map())
    setShowPlayAgainPrompt(false)
    setPlayAgainRequesterNum(null)
    // Keep gameMode, player addresses, gameId, and gridSize
  }

  const handleMultiplayerPlayAgain = () => {
    // Send play again request to opponent
    if (sendPlayAgainRequest) {
      sendPlayAgainRequest()
      setWaitingForPlayAgainResponse(true)
    }
  }

  const handleAcceptPlayAgain = () => {
    // Accept opponent's play again request
    if (sendPlayAgainResponse) {
      sendPlayAgainResponse(true)
      setShowPlayAgainPrompt(false)
      handleRestartMultiplayer()
    }
  }

  const handleDeclinePlayAgain = () => {
    // Decline opponent's play again request
    if (sendPlayAgainResponse) {
      sendPlayAgainResponse(false)
      setShowPlayAgainPrompt(false)
      handleReset()
    }
  }

  const handleUsernameChange = (newUsername: string) => {
    // Update username in localStorage and state
    if (address) {
      localStorage.setItem(`username_${address}`, newUsername)
      setPlayerUsername(newUsername)
    }
  }

  // Username setup phase
  if (!playerUsername && gamePhase === "username-setup" && isConnected) {
    return <UsernameSetup onSubmit={handleUsernameSubmit} address={address || ""} />
  }

  // Show wallet connection prompt
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-transparent relative z-10">
        <Header timer={timer} />
        <div className="flex h-[calc(100vh-120px)] items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-black mb-4 text-white">
                Welcome to <span className="text-accent-blue">BoxBattle</span>!
              </h1>
              <p className="text-xl text-[var(--color-text-secondary)] mb-2">The Ultimate Web3 Strategy Game</p>
              <p className="text-accent-blue">Connect your wallet to start playing</p>
            </div>
          </div>
        </div>
      </div>
    )
  }


  // Difficulty selection screen
  if (gamePhase === "difficulty-select" && gameMode === "ai") {
    return (
      <DifficultySelector
        onSelectDifficulty={handleSelectDifficulty}
        onBack={() => setGamePhase("mode-select")}
        gridSize={gridSize}
        onGridSizeChange={(size) => setGridSize(size as 3 | 4 | 5 | 6)}
      />
    )
  }

  // Mode selection screen
  if (gamePhase === "mode-select") {
    return (
      <GameModeSelector
        onSelectMode={handleSelectMode}
        gridSize={gridSize}
        onGridSizeChange={(size) => setGridSize(size as 3 | 4 | 5 | 6)}
      />
    )
  }

  // Multiplayer lobby
  if (gamePhase === "lobby" && gameMode === "multiplayer") {
    return (
      <MultiplayerLobby
        onJoinGame={handleJoinGame}
        onCreateGame={handleCreateGame}
        onBack={gameId ? handleCancelLobby : () => setGamePhase("mode-select")}
        onCancelCreate={handleCancelCreateGame}
        playerAddress={address || ""}
        createdGameId={gameId}
        isWaitingForOpponent={gameId !== undefined}
        isCreatingGame={isCreatingGame && !gameId}
        gridSize={gridSize}
        onGridSizeChange={(size) => setGridSize(size as 3 | 4 | 5 | 6)}
        isJoining={isJoiningGame}
        isJoinPending={isJoinPending}
        lobbyTimeRemaining={lobbyTimeRemaining}
      />
    )
  }

  // Get player names - use WebSocket-tracked addresses instead of blockchain
  const player1Name = gameMode === "ai"
    ? playerUsername
    : address && player1Address && player1Address.toLowerCase() === address.toLowerCase()
      ? playerUsername // If I'm player 1, use my username
      : opponentUsername || localStorage.getItem(`username_${player1Address}`) || (player1Address ? `${player1Address.slice(0, 6)}...${player1Address.slice(-4)}` : "Player 1")

  const player2Name = gameMode === "ai"
    ? `AI (${difficulty})`
    : address && player2Address && player2Address.toLowerCase() === address.toLowerCase()
      ? playerUsername // If I'm player 2, use my username
      : opponentUsername || localStorage.getItem(`username_${player2Address}`) || (player2Address ? `${player2Address.slice(0, 6)}...${player2Address.slice(-4)}` : "Waiting...")

  // Get scores - use local state for both AI and multiplayer
  const player1Score = scores.player1
  const player2Score = scores.player2

  // Determine if current user is player1
  const isPlayerOne = gameMode === "ai" ? true : (address && gameState ? address.toLowerCase() === gameState.player1.toLowerCase() : true)

  return (
    <div
      className="min-h-screen relative z-10"
      style={{
        background: 'radial-gradient(circle at 50% 30%, #1e2541 0%, #151929 40%, #0f141f 100%)',
        backgroundImage: `
          radial-gradient(circle at 50% 30%, #1e2541 0%, #151929 40%, #0f141f 100%),
          repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(59, 130, 246, 0.03) 2px, rgba(59, 130, 246, 0.03) 3px),
          repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(59, 130, 246, 0.03) 2px, rgba(59, 130, 246, 0.03) 3px)
        `,
        backgroundSize: '100% 100%, 40px 40px, 40px 40px',
      }}
    >
      <Header
        timer={timer}
        gameMode={gameMode}
        showBackButton={gamePhase === "playing" || gamePhase === "lobby"}
        onBack={handleBack}
        onUsernameChange={handleUsernameChange}
        currentUsername={playerUsername}
      />

      {/* Player Stats Bar - Completely Redesigned */}
      <div className="px-8 py-4">
        <div className="flex items-center gap-6">
          {/* Player 1 Section - Score First! */}
          <div
            className="flex items-center gap-4 px-6 py-4 rounded-2xl flex-1"
            style={{
              background: currentPlayer === "player1"
                ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.08) 100%)'
                : 'linear-gradient(90deg, rgba(59, 130, 246, 0.08) 0%, transparent 100%)',
              border: `2px solid ${currentPlayer === "player1" ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.2)'}`,
              boxShadow: currentPlayer === "player1" ? '0 4px 24px rgba(59, 130, 246, 0.3)' : 'none',
            }}
          >
            {/* Score - Most Important, Goes First */}
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '2px solid rgba(59, 130, 246, 0.4)',
                }}
              >
                <Trophy className="w-7 h-7 text-[#3B82F6]" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-4xl font-black text-[#3B82F6] tabular-nums leading-none mb-1">{player1Score}</p>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Boxes</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-12 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent mx-2" />

            {/* Player Info - Secondary */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-lg font-bold text-white">{player1Name}</p>
                {currentPlayer === "player1" && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'rgba(59, 130, 246, 0.25)' }}>
                    <Zap className="w-3.5 h-3.5 text-[#3B82F6]" fill="#3B82F6" />
                  </div>
                )}
              </div>
              <p className="text-xs text-[#3B82F6] font-medium uppercase tracking-wide">Player 1</p>
            </div>
          </div>

          {/* VS Section - Two-Sided Progress Bar */}
          <div className="flex flex-col items-center gap-3 px-6">
            <div className="text-xl font-black text-gray-400 tracking-wider">VS</div>
            {/* Two-Sided Progress Bar */}
            <div className="relative w-40 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0, 0, 0, 0.4)' }}>
              {/* Player 1 Progress (from left) */}
              <div
                className="absolute left-0 top-0 h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${player1Score + player2Score === 0 ? 50 : (player1Score / (player1Score + player2Score)) * 100}%`,
                  background: 'linear-gradient(90deg, #3B82F6 0%, #3B82F6 100%)',
                  boxShadow: '0 0 12px rgba(59, 130, 246, 0.6)',
                }}
              />
              {/* Player 2 Progress (from right) */}
              <div
                className="absolute right-0 top-0 h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${player1Score + player2Score === 0 ? 50 : (player2Score / (player1Score + player2Score)) * 100}%`,
                  background: 'linear-gradient(270deg, #EF4444 0%, #EF4444 100%)',
                  boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)',
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-base font-black text-[#3B82F6] tabular-nums">{player1Score}</p>
              <span className="text-gray-500 font-bold">—</span>
              <p className="text-base font-black text-[#EF4444] tabular-nums">{player2Score}</p>
            </div>
          </div>

          {/* Player 2 Section - Mirrored Layout */}
          <div
            className="flex items-center gap-4 px-6 py-4 rounded-2xl flex-1"
            style={{
              background: currentPlayer === "player2"
                ? 'linear-gradient(270deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.08) 100%)'
                : 'linear-gradient(270deg, rgba(239, 68, 68, 0.08) 0%, transparent 100%)',
              border: `2px solid ${currentPlayer === "player2" ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.2)'}`,
              boxShadow: currentPlayer === "player2" ? '0 4px 24px rgba(239, 68, 68, 0.3)' : 'none',
            }}
          >
            {/* Player Info - Secondary */}
            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                {currentPlayer === "player2" && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'rgba(239, 68, 68, 0.25)' }}>
                    <Zap className="w-3.5 h-3.5 text-[#EF4444]" fill="#EF4444" />
                  </div>
                )}
                <p className="text-lg font-bold text-white">{player2Name}</p>
              </div>
              <p className="text-xs text-[#EF4444] font-medium uppercase tracking-wide">Player 2</p>
            </div>

            {/* Divider */}
            <div className="h-12 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent mx-2" />

            {/* Score - Most Important, Goes Last for Symmetry */}
            <div className="flex items-center gap-3">
              <div>
                <p className="text-4xl font-black text-[#EF4444] tabular-nums leading-none mb-1 text-right">{player2Score}</p>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider text-right">Boxes</p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '2px solid rgba(239, 68, 68, 0.4)',
                }}
              >
                <Trophy className="w-7 h-7 text-[#EF4444]" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area - Centered Layout */}
      <div className="flex flex-col items-center gap-6 px-8 pb-8">
        {/* Turn Indicator */}
        <div
          className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full text-sm font-semibold"
          style={{
            background: currentPlayer === "player1" ? 'rgba(59, 130, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${currentPlayer === "player1" ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: currentPlayer === "player1" ? '#3B82F6' : '#EF4444',
          }}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>
            {gameMode === "ai"
              ? currentPlayer === "player1"
                ? "Your Turn"
                : "AI Thinking..."
              : // Multiplayer - check if it's my turn
                (currentPlayer === "player1" && playerNum === 1) || (currentPlayer === "player2" && playerNum === 2)
                ? "Your Turn"
                : "Opponent's Turn"}
          </span>
        </div>

        {/* Game Board - Absolutely Centered */}
        <GameBoard
          currentPlayer={currentPlayer}
          onLineClick={handleLineClick}
          drawnLines={drawnLines}
          completedBoxes={completedBoxes}
          gridSize={gridSize}
        />

        {/* Last Move Indicator (Minimal) */}
        {moveHistory.length > 0 && (
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium"
            style={{
              background: 'rgba(148, 163, 184, 0.08)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              color: '#94A3B8',
            }}
          >
            <span className="text-gray-500">Last move:</span>
            <span className="text-white">{moveHistory[moveHistory.length - 1]}</span>
          </div>
        )}
      </div>

      {/* Winner Overlay */}
      {winner && (
        <WinnerOverlay
          winner={winner}
          scores={{ player1: player1Score, player2: player2Score }}
          onPlayAgain={gameMode === "ai" ? handleRestartAI : handleMultiplayerPlayAgain}
          onBackToMenu={handleReset}
          isPlayerOne={isPlayerOne}
          player1Name={player1Name}
          player2Name={player2Name}
          gameMode={gameMode || "ai"}
        />
      )}

      {/* Waiting for Play Again Response */}
      {waitingForPlayAgainResponse && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-panel border-2 border-accent-blue rounded-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Waiting for Opponent</h2>
            <p className="text-[var(--color-text-secondary)]">
              Waiting for your opponent to accept...
            </p>
          </div>
        </div>
      )}

      {/* Play Again Prompt Modal */}
      {showPlayAgainPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-panel border-2 border-accent-blue rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Play Again?</h2>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Player {playAgainRequesterNum} wants to play another round. Do you want to join them?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeclinePlayAgain}
                className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:bg-bg-elevated transition-all duration-200"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptPlayAgain}
                className="flex-1 button-primary"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quit Confirmation Modal */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-panel border border-[var(--color-border)] rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Quit Game?</h2>
            <p className="text-[var(--color-text-secondary)] mb-6">
              {gameMode === "multiplayer"
                ? "Are you sure you want to quit? Your opponent will be notified and the game will end."
                : "Are you sure you want to quit? Your progress will be lost."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:bg-bg-elevated transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmQuit}
                className="flex-1 px-6 py-3 bg-state-error text-white rounded-lg hover:brightness-110 transition-all duration-200 font-semibold"
              >
                Quit Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
