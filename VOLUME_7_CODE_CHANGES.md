# Volume 7 - Exact Code Changes
## Scoring System Fix Implementation

---

## File: `app/game/page.tsx`

### Change 1: Removed Duplicate useEffect (Lines 399-400)

**Before:**
```typescript
// Recalculate completed boxes when drawn lines change
useEffect(() => {
  if (drawnLines.size > 0) {
    const newBoxes = new Map<string, "player1" | "player2">()

    // Check all possible boxes
    for (let row = 0; row < gridSize - 1; row++) {
      for (let col = 0; col < gridSize - 1; col++) {
        const boxId = `box-${row}-${col}`

        // Line format: h-row-col-row-col+1 or v-row-col-row+1-col
        const top = `h-${row}-${col}-${row}-${col + 1}`
        const bottom = `h-${row + 1}-${col}-${row + 1}-${col + 1}`
        const left = `v-${row}-${col}-${row + 1}-${col}`
        const right = `v-${row}-${col + 1}-${row + 1}-${col + 1}`

        if (drawnLines.has(top) && drawnLines.has(bottom) && drawnLines.has(left) && drawnLines.has(right)) {
          // Determine who completed this box based on which player last made a move
          newBoxes.set(boxId, currentPlayer)
        }
      }
    }

    // Update completed boxes and scores
    if (newBoxes.size > completedBoxes.size) {
      const newlyCompleted = newBoxes.size - completedBoxes.size
      console.log('[Game] New boxes completed:', newlyCompleted, 'by', currentPlayer)

      setCompletedBoxes(newBoxes)

      // Update scores
      setScores((prev) => ({
        ...prev,
        [currentPlayer]: prev[currentPlayer] + newlyCompleted
      }))
    }
  }
}, [drawnLines, gridSize, currentPlayer, completedBoxes.size])
```

**After:**
```typescript
// NOTE: Scoring is handled directly in move handlers (handleLineClick, makeAIMove, onOpponentMove)
// DO NOT add a useEffect here to recalculate scores - it causes duplicate counting!
```

---

### Change 2: Updated checkBoxCompletion Signature (Lines 412-435)

**Before:**
```typescript
const checkBoxCompletion = useCallback(
  (lineId: string, testLines: Set<string>): { newBoxes: Map<string, "player1" | "player2">; count: number } => {
    const newBoxes = new Map(completedBoxes)
    let completedCount = 0

    // Check all boxes that could be affected by this line
    for (let row = 0; row < gridSize - 1; row++) {
      for (let col = 0; col < gridSize - 1; col++) {
        const boxId = `box-${row}-${col}`

        // Skip if already completed
        if (newBoxes.has(boxId)) continue

        if (isBoxComplete(row, col, testLines)) {
          newBoxes.set(boxId, currentPlayer)
          completedCount++
        }
      }
    }

    return { newBoxes, count: completedCount }
  },
  [completedBoxes, currentPlayer, isBoxComplete, gridSize],
)
```

**After:**
```typescript
const checkBoxCompletion = useCallback(
  (lineId: string, testLines: Set<string>, player: "player1" | "player2"): { newBoxes: Map<string, "player1" | "player2">; count: number } => {
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
```

---

### Change 3: Updated onOpponentMove (Lines 136-166)

**Before:**
```typescript
onOpponentMove: (lineId, opponentPlayerNum) => {
  // Opponent move received

  // Update ref IMMEDIATELY (sync) to prevent race conditions
  drawnLinesRef.current.add(lineId)

  // Create new lines set for state
  const updated = new Set(drawnLinesRef.current)

  // Update state
  setDrawnLines(updated)

  // Check if opponent completed a box with this move
  const { newBoxes, count: boxesCompleted } = checkBoxCompletion(lineId, updated)

  if (boxesCompleted > 0) {
    // Opponent completed box(es)
    // Opponent keeps turn, don't switch
    setScores((prevScores) => ({
      ...prevScores,
      [opponentPlayerNum === 1 ? 'player1' : 'player2']: prevScores[opponentPlayerNum === 1 ? 'player1' : 'player2'] + boxesCompleted,
    }))
    setCompletedBoxes(newBoxes)
  } else {
    // Switch turn to local player
    // Opponent didn't complete a box, switch to my turn
    setCurrentPlayer(opponentPlayerNum === 1 ? "player2" : "player1")
  }
},
```

**After:**
```typescript
onOpponentMove: (lineId, opponentPlayerNum) => {
  // Opponent move received

  // Update ref IMMEDIATELY (sync) to prevent race conditions
  drawnLinesRef.current.add(lineId)

  // Create new lines set for state
  const updated = new Set(drawnLinesRef.current)

  // Update state
  setDrawnLines(updated)

  // Determine opponent's player key
  const opponentPlayer: "player1" | "player2" = opponentPlayerNum === 1 ? 'player1' : 'player2'

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
```

---

### Change 4: Updated makeAIMove (Line 469)

**Before:**
```typescript
// Check for completed boxes
const { newBoxes, count: boxesCompleted } = checkBoxCompletion(aiMove.lineId, newDrawnLines)
```

**After:**
```typescript
// Check for completed boxes (AI is always player2)
const { newBoxes, count: boxesCompleted } = checkBoxCompletion(aiMove.lineId, newDrawnLines, "player2")
```

---

### Change 5: Updated handleLineClick - Multiplayer (Line 668)

**Before:**
```typescript
// Check for completed boxes with the updated lines
const { newBoxes, count: boxesCompleted } = checkBoxCompletion(lineId, newDrawnLines)
```

**After:**
```typescript
// Check for completed boxes with the updated lines (pass currentPlayer explicitly)
const { newBoxes, count: boxesCompleted } = checkBoxCompletion(lineId, newDrawnLines, currentPlayer)
```

---

### Change 6: Updated handleLineClick - AI Mode (Line 708)

**Before:**
```typescript
// Check for completed boxes
const { newBoxes, count: boxesCompleted } = checkBoxCompletion(lineId, newDrawnLines)
```

**After:**
```typescript
// Check for completed boxes (human is always player1 in AI mode)
const { newBoxes, count: boxesCompleted } = checkBoxCompletion(lineId, newDrawnLines, "player1")
```

---

## Summary of All Changes

| Location | Change | Purpose |
|----------|--------|---------|
| Lines 399-436 | Removed useEffect | Eliminate duplicate scoring |
| Line 413 | Added `player` param | Avoid stale closure |
| Line 434 | Removed `currentPlayer` dep | No longer needed |
| Line 148-152 | Added `opponentPlayer` var | Explicit player for scoring |
| Line 152 | Pass player to check | Correct attribution |
| Line 469 | Pass "player2" | AI is always player2 |
| Line 668 | Pass currentPlayer | Multiplayer scoring |
| Line 708 | Pass "player1" | Human is always player1 |

---

## Testing Checklist

### AI Mode Testing:
- [ ] Start AI game on Easy difficulty
- [ ] Complete a box - verify +1 score and bonus turn
- [ ] Let AI complete a box - verify AI gets +1 and bonus turn
- [ ] Complete multiple boxes in one move - verify correct total
- [ ] Finish game - verify final scores match completed boxes

### Multiplayer Mode Testing:
- [ ] Create game as Player 1
- [ ] Join game as Player 2 (different browser/device)
- [ ] Player 1 completes box - both see P1 score +1
- [ ] Player 2 completes box - both see P2 score +1
- [ ] Verify scores stay in sync throughout game
- [ ] Finish game - verify winner determined correctly

---

*Generated: 2025-12-31*
