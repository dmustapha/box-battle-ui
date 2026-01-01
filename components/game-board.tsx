"use client"

import { useState, useEffect, useRef } from "react"
import { gsap } from "gsap"
import { animateLinePlacement, animateBoxCompletion } from "@/lib/animations"

interface GameBoardProps {
  currentPlayer: "player1" | "player2"
  onLineClick: (lineId: string) => void
  drawnLines: Map<string, "player1" | "player2">  // Changed from Set to Map to track who drew each line
  completedBoxes: Map<string, "player1" | "player2">
  gridSize?: 3 | 4 | 5 | 6
}

const DOT_SPACING = 110
const DOT_RADIUS = 7
const LINE_WIDTH = 5

export default function GameBoard({
  currentPlayer,
  onLineClick,
  drawnLines,
  completedBoxes,
  gridSize = 5
}: GameBoardProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const prevDrawnLinesRef = useRef(new Map<string, "player1" | "player2">())
  const prevCompletedBoxesRef = useRef(new Map<string, "player1" | "player2">())

  const padding = 40
  const width = (gridSize - 1) * DOT_SPACING + padding * 2
  const height = (gridSize - 1) * DOT_SPACING + padding * 2

  // Player colors from design tokens
  const playerColors = {
    player1: 'var(--color-player-1)',
    player2: 'var(--color-player-2)',
  }

  // Animate new lines
  useEffect(() => {
    const newLines = Array.from(drawnLines.keys()).filter(
      (lineId) => !prevDrawnLinesRef.current.has(lineId)
    )

    newLines.forEach((lineId) => {
      const lineElement = document.getElementById(`drawn-${lineId}`)
      if (lineElement) {
        animateLinePlacement(lineElement)
      }
    })

    prevDrawnLinesRef.current = new Map(drawnLines)
  }, [drawnLines])

  // Animate new boxes
  useEffect(() => {
    const newBoxes = Array.from(completedBoxes.keys()).filter(
      (boxId) => !prevCompletedBoxesRef.current.has(boxId)
    )

    newBoxes.forEach((boxId) => {
      const owner = completedBoxes.get(boxId)
      if (owner) {
        const boxElement = document.getElementById(boxId)
        if (boxElement) {
          const color = owner === 'player1' ? '#3B82F6' : '#EF4444'
          animateBoxCompletion(boxElement, color)
        }
      }
    })

    prevCompletedBoxesRef.current = new Map(completedBoxes)
  }, [completedBoxes])

  const handleLineClick = (lineId: string) => {
    if (drawnLines.has(lineId)) return
    onLineClick(lineId)
  }

  // Generate horizontal and vertical lines
  const lines = []

  // Horizontal lines
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize - 1; j++) {
      const hLineId = `h-${i}-${j}-${i}-${j + 1}`
      lines.push({
        id: hLineId,
        x1: padding + j * DOT_SPACING,
        y1: padding + i * DOT_SPACING,
        x2: padding + (j + 1) * DOT_SPACING,
        y2: padding + i * DOT_SPACING,
        isHorizontal: true,
      })
    }
  }

  // Vertical lines
  for (let i = 0; i < gridSize - 1; i++) {
    for (let j = 0; j < gridSize; j++) {
      const vLineId = `v-${i}-${j}-${i + 1}-${j}`
      lines.push({
        id: vLineId,
        x1: padding + j * DOT_SPACING,
        y1: padding + i * DOT_SPACING,
        x2: padding + j * DOT_SPACING,
        y2: padding + (i + 1) * DOT_SPACING,
        isHorizontal: false,
      })
    }
  }

  // Generate boxes
  const boxes = []
  for (let i = 0; i < gridSize - 1; i++) {
    for (let j = 0; j < gridSize - 1; j++) {
      boxes.push({
        id: `box-${i}-${j}`,
        x: padding + j * DOT_SPACING,
        y: padding + i * DOT_SPACING,
      })
    }
  }

  return (
    <div className="flex items-center justify-center">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, #1E2A45 0%, #2A3250 100%)',
          borderRadius: '20px',
          border: '3px solid rgba(59, 130, 246, 0.25)',
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.03), inset 0 2px 4px rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Draw completed boxes */}
        {boxes.map((box) => {
          const owner = completedBoxes.get(box.id)
          if (!owner) return null

          const isPlayer1 = owner === "player1"
          const fillColor = isPlayer1 ? '#3B82F6' : '#EF4444'

          return (
            <g key={box.id} id={box.id}>
              {/* Box fill */}
              <rect
                x={box.x}
                y={box.y}
                width={DOT_SPACING}
                height={DOT_SPACING}
                fill={fillColor}
                opacity={0.35}
              />
              {/* Box border */}
              <rect
                x={box.x + 3}
                y={box.y + 3}
                width={DOT_SPACING - 6}
                height={DOT_SPACING - 6}
                fill="none"
                stroke={fillColor}
                strokeWidth="3"
                rx="6"
                opacity={0.8}
              />
            </g>
          )
        })}

        {/* Draw lines */}
        {lines.map((line) => {
          const lineOwner = drawnLines.get(line.id)
          const isDrawn = lineOwner !== undefined
          const isHovered = hoveredLine === line.id && !isDrawn
          // For hover preview, use current player's color
          const hoverColor = currentPlayer === "player1" ? '#3B82F6' : '#EF4444'
          // For drawn lines, use the line owner's color (who actually drew it)
          const drawnColor = lineOwner === "player1" ? '#3B82F6' : '#EF4444'

          return (
            <g key={line.id}>
              {/* Invisible hitbox for better clickability */}
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="transparent"
                strokeWidth="14"
                style={{ cursor: isDrawn ? "default" : "pointer" }}
                onClick={() => handleLineClick(line.id)}
                onMouseEnter={() => setHoveredLine(line.id)}
                onMouseLeave={() => setHoveredLine(null)}
              />

              {/* Visible line - undrawn state */}
              {!isDrawn && (
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={isHovered ? hoverColor : '#94A3B8'}
                  strokeWidth={isHovered ? 5 : 2.5}
                  opacity={isHovered ? 1 : 0.7}
                  strokeDasharray={isHovered ? "0" : "10,10"}
                  style={{
                    transition: 'all 0.2s ease',
                    filter: isHovered ? `drop-shadow(0 0 16px ${hoverColor})` : undefined,
                  }}
                />
              )}

              {/* Visible line - drawn state */}
              {isDrawn && (
                <line
                  id={`drawn-${line.id}`}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={drawnColor}
                  strokeWidth={LINE_WIDTH}
                  strokeLinecap="round"
                />
              )}
            </g>
          )
        })}

        {/* Draw dots */}
        {Array.from({ length: gridSize }).map((_, i) =>
          Array.from({ length: gridSize }).map((_, j) => (
            <g key={`dot-${i}-${j}`}>
              {/* Dot glow */}
              <circle
                cx={padding + j * DOT_SPACING}
                cy={padding + i * DOT_SPACING}
                r={DOT_RADIUS + 4}
                fill="#3B82F6"
                opacity={0.3}
              />
              {/* Dot */}
              <circle
                cx={padding + j * DOT_SPACING}
                cy={padding + i * DOT_SPACING}
                r={DOT_RADIUS}
                fill="#E5E7EB"
              />
            </g>
          )),
        )}
      </svg>
    </div>
  )
}
