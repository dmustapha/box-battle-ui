import { useReadContract, useWriteContract, useWatchContractEvent, useWaitForTransactionReceipt } from 'wagmi'
import { GAME_CONTRACT_ABI } from '@/lib/contract-abi'
import { GAME_CONTRACT_ADDRESS } from '@/lib/wagmi-config'
import { parseEther, decodeEventLog } from 'viem'

export { useWaitForTransactionReceipt }

// Read game state
export function useGameState(gameId: bigint | undefined) {
  const result = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getGame',
    args: gameId !== undefined ? [gameId] : undefined,
    query: {
      enabled: gameId !== undefined,
    },
  })

  // Convert array response to object
  const gameStateArray = result.data as any

  if (gameStateArray && Array.isArray(gameStateArray)) {
    return {
      ...result,
      data: {
        player1: gameStateArray[0],
        player2: gameStateArray[1],
        currentTurn: gameStateArray[2],
        state: gameStateArray[3],
        player1Score: Number(gameStateArray[4]),
        player2Score: Number(gameStateArray[5]),
        winner: gameStateArray[6],
      },
    }
  }

  return { ...result, data: undefined }
}

// Check if a line is drawn
export function useIsLineDrawn(
  gameId: bigint | undefined,
  row: number,
  col: number,
  direction: number
) {
  return useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'isLineDrawn',
    args:
      gameId !== undefined
        ? [gameId, row as any, col as any, direction as any]
        : undefined,
    query: {
      enabled: gameId !== undefined,
    },
  })
}

// Get entry fee
export function useEntryFee() {
  return useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'ENTRY_FEE',
  })
}

export function useContractGridSize() {
  return useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'GRID_SIZE',
  })
}

// Get game counter
export function useGameCounter() {
  return useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getGameCounter',
  })
}

// Error callback type
type ErrorCallback = (message: string) => void

// Write functions
export function useCreateGame(onErrorCallback?: ErrorCallback) {
  const { data: entryFee, isLoading: isLoadingFee, error: feeError } = useEntryFee()
  const { writeContract, data: hash, ...rest } = useWriteContract()

  const showError = (msg: string) => {
    if (onErrorCallback) onErrorCallback(msg)
    else console.error(msg)
  }

  const createGame = () => {
    console.log('[CreateGame] Button clicked')
    console.log('[CreateGame] Entry fee:', entryFee)
    console.log('[CreateGame] Loading fee:', isLoadingFee)
    console.log('[CreateGame] Fee error:', feeError)
    console.log('[CreateGame] Contract address:', GAME_CONTRACT_ADDRESS)

    if (!entryFee) {
      console.error('[CreateGame] Entry fee not loaded yet. Cannot create game.')
      showError('Entry fee not loaded. Please refresh the page.')
      return
    }

    console.log('[CreateGame] Calling writeContract...')
    try {
      writeContract(
        {
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'createGame',
          value: entryFee,
        },
        {
          onSuccess: (txHash) => {
            console.log('[CreateGame] Transaction sent! Hash:', txHash)
          },
          onError: (error) => {
            console.error('[CreateGame] Transaction error:', error)
            showError(`Transaction failed: ${error.message}`)
          },
        }
      )
    } catch (error) {
      console.error('[CreateGame] writeContract threw error:', error)
      showError(`Error: ${error}`)
    }
  }

  return {
    createGame,
    isLoadingFee,
    feeError,
    hash,
    ...rest,
  }
}

export function useJoinGame(onErrorCallback?: ErrorCallback) {
  const { data: entryFee, isLoading: isLoadingFee, error: feeError } = useEntryFee()
  const { writeContract, data: hash, ...rest } = useWriteContract()

  const showError = (msg: string) => {
    if (onErrorCallback) onErrorCallback(msg)
    else console.error(msg)
  }

  const joinGame = (gameId: bigint) => {
    console.log('[JoinGame Hook] Called with gameId:', gameId)
    console.log('[JoinGame Hook] Entry fee:', entryFee)
    console.log('[JoinGame Hook] Loading fee:', isLoadingFee)
    console.log('[JoinGame Hook] Fee error:', feeError)

    if (!entryFee) {
      console.error('[JoinGame Hook] Entry fee not loaded!')
      showError('Entry fee not loaded. Please wait and try again.')
      return
    }

    console.log('[JoinGame Hook] Sending transaction with value:', entryFee.toString(), 'wei')
    try {
      writeContract(
        {
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'joinGame',
          args: [gameId],
          value: entryFee,
          // Let wallet estimate gas - removed hardcoded limit that caused confusing errors
        },
        {
          onSuccess: (txHash) => {
            console.log('[JoinGame Hook] ✅ Transaction sent! Hash:', txHash)
          },
          onError: (error: any) => {
            console.error('[JoinGame Hook] ❌ Transaction error:', error)
            // Parse common contract errors
            const errorMsg = error.message || String(error)
            if (errorMsg.includes('GameNotWaiting')) {
              showError('This game is not available to join. It may have already started or ended.')
            } else if (errorMsg.includes('CannotJoinOwnGame')) {
              showError('You cannot join your own game!')
            } else if (errorMsg.includes('WrongEntryFee')) {
              showError('Wrong entry fee amount.')
            } else if (errorMsg.includes('intrinsic gas too low') || errorMsg.includes('gas required exceeds')) {
              showError('Transaction would fail. The game may not exist, already started, or is your own game.')
            } else {
              showError(`Failed to join game: ${errorMsg.slice(0, 100)}`)
            }
          },
        }
      )
    } catch (error) {
      console.error('[JoinGame Hook] ❌ writeContract threw error:', error)
      showError(`Error: ${error}`)
    }
  }

  return {
    joinGame,
    isLoadingFee,
    feeError,
    hash,
    ...rest,
  }
}

export function usePlaceLine(onErrorCallback?: ErrorCallback) {
  const { writeContract, ...rest } = useWriteContract()

  const showError = (msg: string) => {
    if (onErrorCallback) onErrorCallback(msg)
    else console.error(msg)
  }

  const placeLine = (gameId: bigint, lineId: string) => {
    console.log('[PlaceLine] Called with gameId:', gameId, 'lineId:', lineId)

    // Convert lineId (e.g., "h-0-0-0-1" or "v-0-0-1-0") to contract parameters
    const parts = lineId.split("-")
    const direction = parts[0] // "h" or "v"
    const row = parseInt(parts[1])
    const col = parseInt(parts[2])

    // direction: 0 = horizontal, 1 = vertical
    const directionNum = direction === "h" ? 0 : 1

    console.log('[PlaceLine] Converted params:', { row, col, direction: directionNum })
    console.log('[PlaceLine] Contract address:', GAME_CONTRACT_ADDRESS)
    console.log('[PlaceLine] Calling writeContract...')

    try {
      writeContract(
        {
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'placeLine',
          args: [gameId, row as any, col as any, directionNum as any],
          // Let wallet estimate gas
        },
        {
          onSuccess: (txHash) => {
            console.log('[PlaceLine] ✅ Transaction sent! Hash:', txHash)
          },
          onError: (error: any) => {
            console.error('[PlaceLine] ❌ Transaction error:', error)
            const errorMsg = error.message || String(error)
            if (errorMsg.includes('NotYourTurn')) {
              showError('Not your turn!')
            } else if (errorMsg.includes('LineAlreadyDrawn')) {
              showError('This line is already drawn!')
            } else if (errorMsg.includes('GameNotActive')) {
              showError('Game is not active.')
            } else if (errorMsg.includes('InvalidLine')) {
              showError('Invalid line position.')
            } else {
              showError(`Failed to place line: ${errorMsg.slice(0, 100)}`)
            }
          },
        }
      )
    } catch (error) {
      console.error('[PlaceLine] ❌ writeContract threw error:', error)
      showError(`Error placing line: ${error}`)
    }
  }

  return {
    placeLine,
    ...rest,
  }
}

// Event watchers
export function useWatchLinePlaced(
  onLinePlaced: (log: any) => void,
  gameId?: bigint
) {
  useWatchContractEvent({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    eventName: 'LinePlaced',
    onLogs: (logs) => {
      logs.forEach((log) => {
        if (!gameId || log.args.gameId === gameId) {
          onLinePlaced(log.args)
        }
      })
    },
  })
}

export function useWatchGameCreated(onGameCreated: (log: any) => void) {
  console.log('[useWatchGameCreated] Setting up event watcher')
  console.log('[useWatchGameCreated] Contract address:', GAME_CONTRACT_ADDRESS)
  console.log('[useWatchGameCreated] Event name: GameCreated')

  useWatchContractEvent({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    eventName: 'GameCreated',
    onLogs: (logs) => {
      console.log('[useWatchGameCreated] Received logs:', logs.length)
      logs.forEach((log) => {
        console.log('[useWatchGameCreated] Log args:', log.args)
        onGameCreated(log.args)
      })
    },
  })
}

export function useWatchGameStarted(onGameStarted: (log: any) => void) {
  useWatchContractEvent({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    eventName: 'GameStarted',
    onLogs: (logs) => {
      logs.forEach((log) => {
        onGameStarted(log.args)
      })
    },
  })
}

export function useWatchGameEnded(onGameEnded: (log: any) => void, gameId?: bigint) {
  useWatchContractEvent({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    eventName: 'GameEnded',
    onLogs: (logs) => {
      logs.forEach((log) => {
        if (!gameId || log.args.gameId === gameId) {
          onGameEnded(log.args)
        }
      })
    },
  })
}
