// AI Player logic for BoxBattle
// Implements difficulty levels: Easy, Medium, Hard

export type Difficulty = "easy" | "medium" | "hard"

interface LinePosition {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  isHorizontal: boolean
}

interface AIMove {
  lineId: string
}

export class AIPlayer {
  private difficulty: Difficulty

  constructor(difficulty: Difficulty = "medium") {
    this.difficulty = difficulty
  }

  /**
   * Get all available lines on the game board
   */
  private getAvailableLines(drawnLines: Map<string, "player1" | "player2">, gridSize = 5): string[] {
    const lines: string[] = []

    // Horizontal lines: row 0 to gridSize (inclusive), col 0 to gridSize-1
    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const hLineId = `h-${i}-${j}-${i}-${j + 1}`
        if (!drawnLines.has(hLineId)) {
          lines.push(hLineId)
        }
      }
    }

    // Vertical lines: row 0 to gridSize-1, col 0 to gridSize (inclusive)
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const vLineId = `v-${i}-${j}-${i + 1}-${j}`
        if (!drawnLines.has(vLineId)) {
          lines.push(vLineId)
        }
      }
    }

    return lines
  }

  /**
   * Count how many sides of a box are already drawn
   */
  private countBoxSides(row: number, col: number, testLines: Map<string, "player1" | "player2">): number {
    const top = `h-${row}-${col}-${row}-${col + 1}`
    const bottom = `h-${row + 1}-${col}-${row + 1}-${col + 1}`
    const left = `v-${row}-${col}-${row + 1}-${col}`
    const right = `v-${row}-${col + 1}-${row + 1}-${col + 1}`

    let count = 0
    if (testLines.has(top)) count++
    if (testLines.has(bottom)) count++
    if (testLines.has(left)) count++
    if (testLines.has(right)) count++

    return count
  }

  /**
   * Evaluate a move and return score
   * Higher score = better move
   */
  private evaluateMove(lineId: string, drawnLines: Map<string, "player1" | "player2">, gridSize = 4): number {
    const testLines = new Map(drawnLines)
    testLines.set(lineId, "player2") // AI is always player2

    let score = 0

    // Check all boxes for completion or near-completion
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const top = `h-${row}-${col}-${row}-${col + 1}`
        const bottom = `h-${row + 1}-${col}-${row + 1}-${col + 1}`
        const left = `v-${row}-${col}-${row + 1}-${col}`
        const right = `v-${row}-${col + 1}-${row + 1}-${col + 1}`

        const sides = this.countBoxSides(row, col, testLines)

        // - Completing a box (4 sides) = +1000 points (win the box!)
        // - Creating 3 sides (dangerous, could give opponent easy win) = -500 points (avoid!)
        // - Creating 2 sides (buildup) = +10 points
        // - Creating 1 side = +1 point
        if (testLines.has(top) && testLines.has(bottom) && testLines.has(left) && testLines.has(right)) {
          score += 1000 // Completing a box is the goal
        } else if (sides === 3) {
          score -= 500 // Avoid giving opponent easy completion
        } else if (sides === 2) {
          score += 10 // Building toward boxes
        } else if (sides === 1) {
          score += 1
        }
      }
    }

    return score
  }

  /**
   * Make a move based on difficulty level
   */
  makeMove(drawnLines: Map<string, "player1" | "player2">, gridSize = 4): AIMove {
    const availableLines = this.getAvailableLines(drawnLines, gridSize)

    if (availableLines.length === 0) {
      return { lineId: "" }
    }

    const moveScores = availableLines.map((line) => ({
      line,
      score: this.evaluateMove(line, drawnLines, gridSize),
    }))

    let bestMove = availableLines[0]

    // Strategy based on difficulty
    switch (this.difficulty) {
      case "easy":
        // 40% chance to play optimally, 60% random
        const completionMoves = moveScores.filter((m) => m.score >= 1000)
        if (completionMoves.length > 0 && Math.random() > 0.6) {
          bestMove = completionMoves[0].line
        } else {
          // Random move
          bestMove = availableLines[Math.floor(Math.random() * availableLines.length)]
        }
        break

      case "medium":
        // Sort by score and pick from top moves
        moveScores.sort((a, b) => b.score - a.score)

        // 80% chance to pick best move, 20% random from decent moves
        if (Math.random() > 0.2) {
          bestMove = moveScores[0].line
        } else {
          const decentMoves = moveScores.filter((m) => m.score >= -490)
          bestMove = decentMoves[Math.floor(Math.random() * Math.min(5, decentMoves.length))].line
        }
        break

      case "hard":
        moveScores.sort((a, b) => b.score - a.score)

        // First priority: complete boxes (score >= 1000)
        const winningMoves = moveScores.filter((m) => m.score >= 1000)
        if (winningMoves.length > 0) {
          bestMove = winningMoves[0].line
        } else {
          // Second priority: avoid 3-sided boxes (never pick moves with score < -490)
          const safeMoves = moveScores.filter((m) => m.score >= -490)
          if (safeMoves.length > 0) {
            bestMove = safeMoves[0].line
          } else {
            // Last resort: pick least damaging move
            bestMove = moveScores[moveScores.length - 1].line
          }
        }
        break
    }

    return { lineId: bestMove }
  }

  /**
   * Set difficulty level
   */
  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty
  }
}
