"use client"

import { useEffect, useRef } from "react"
import type { EnhancedBox, DepthLayer } from "./animated-background/types"
import { createParticle } from "./animated-background/utils"
import { ANIMATION_CONFIG } from "./animated-background/constants"

// Legacy type alias for backward compatibility during migration
type Box = EnhancedBox

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxesRef = useRef<Box[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const animationFrameRef = useRef<number>()

  // Delta time tracking refs (Phase 1)
  const previousTimeRef = useRef<number>(0)
  const deltaTimeRef = useRef<number>(0)
  const fpsRef = useRef<number>(60)
  const fpsCounterRef = useRef({ frames: 0, lastCheck: 0 })

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      console.log('[AnimatedBackground] Reduced motion preferred - using static background')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      console.log('[AnimatedBackground] Canvas ref not found')
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      console.log('[AnimatedBackground] Canvas context not found')
      return
    }

    console.log('[AnimatedBackground] Initializing animation')

    // Set canvas size with device pixel ratio for crisp rendering
    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(dpr, dpr)
    }
    setCanvasSize()

    // Phase 2: Use configuration-driven particle counts
    const isMobile = /Android|webOS|iPhone|iPad/i.test(navigator.userAgent)
    const boxCount = isMobile
      ? ANIMATION_CONFIG.particleCounts.mobile    // 15 particles
      : ANIMATION_CONFIG.particleCounts.desktop   // 30 particles

    // Phase 2: Initialize boxes with depth layering system
    const initializeBoxes = () => {
      // Calculate layer distribution (40% far, 40% mid, 20% near)
      const farCount = Math.floor(boxCount * ANIMATION_CONFIG.depthLayers.far.count)
      const midCount = Math.floor(boxCount * ANIMATION_CONFIG.depthLayers.mid.count)
      const nearCount = boxCount - farCount - midCount  // Remainder goes to near layer

      const boxes: EnhancedBox[] = []
      let id = 0

      // Create far layer particles (40%)
      for (let i = 0; i < farCount; i++) {
        boxes.push(createParticle(id++, 'far'))
      }

      // Create mid layer particles (40%)
      for (let i = 0; i < midCount; i++) {
        boxes.push(createParticle(id++, 'mid'))
      }

      // Create near layer particles (20%)
      for (let i = 0; i < nearCount; i++) {
        boxes.push(createParticle(id++, 'near'))
      }

      boxesRef.current = boxes

      console.log('[AnimatedBackground] Layer distribution:', {
        total: boxes.length,
        far: farCount,
        mid: midCount,
        near: nearCount,
      })
    }
    initializeBoxes()
    console.log('[AnimatedBackground] Initialized', boxesRef.current.length, 'boxes')

    // Track mouse position
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    // Phase 2: Draw a box with depth-aware blur and glow effect
    const drawBox = (box: Box, opacity: number) => {
      const { x, y, size, color, depth } = box
      const borderRadius = 6 // Rounded corners

      // Phase 2: Layer-specific blur for depth perception
      // Far layer: 20px (very soft), Mid: 15px (medium), Near: 10px (sharp)
      const layerBlur = ANIMATION_CONFIG.depthLayers[depth].blurAmount
      ctx.shadowBlur = layerBlur
      ctx.shadowColor = color

      // Draw filled rounded rectangle
      ctx.fillStyle = color
      ctx.globalAlpha = opacity
      ctx.beginPath()
      ctx.roundRect(x, y, size, size, borderRadius)
      ctx.fill()

      // Reset shadow for border
      ctx.shadowBlur = 0

      // Draw border
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.globalAlpha = opacity * 0.6
      ctx.beginPath()
      ctx.roundRect(x, y, size, size, borderRadius)
      ctx.stroke()
    }

    // Track visibility for pausing animation when tab is hidden
    let isVisible = true
    const handleVisibilityChange = () => {
      isVisible = !document.hidden
      if (isVisible && !animationFrameRef.current) {
        console.log('[AnimatedBackground] Resuming animation')
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    // Animation loop
    const animate = (currentTime: number) => {
      if (!isVisible) {
        animationFrameRef.current = undefined
        return
      }

      // Phase 1: Calculate delta time for refresh-rate independence
      if (previousTimeRef.current === 0) {
        // First frame: assume 60fps to avoid division by zero
        deltaTimeRef.current = 1 / 60
      } else {
        // Calculate actual delta time in seconds
        const rawDelta = (currentTime - previousTimeRef.current) / 1000
        // Clamp to prevent teleporting after tab switch (max 100ms = 10fps)
        const MAX_DELTA = 0.1
        deltaTimeRef.current = Math.min(rawDelta, MAX_DELTA)
      }
      previousTimeRef.current = currentTime

      // Optional: FPS monitoring (for debugging/performance tracking)
      fpsCounterRef.current.frames++
      if (currentTime - fpsCounterRef.current.lastCheck >= 1000) {
        fpsRef.current = fpsCounterRef.current.frames
        if (fpsRef.current < 30) {
          console.warn(`[AnimatedBackground] Low FPS detected: ${fpsRef.current}`)
        }
        fpsCounterRef.current.frames = 0
        fpsCounterRef.current.lastCheck = currentTime
      }

      const deltaTime = deltaTimeRef.current

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      // Phase 2: Sort boxes by zIndex for correct depth rendering (far → mid → near)
      // This ensures background particles render first, foreground particles last
      const sortedBoxes = [...boxesRef.current].sort((a, b) => a.zIndex - b.zIndex)

      sortedBoxes.forEach((box) => {
        // Phase 1: Update position with delta time (pixels per second * seconds)
        box.x += box.vx * deltaTime
        box.y += box.vy * deltaTime

        // Bounce off walls with energy loss (0.8 = retain 80% of velocity)
        if (box.x < 0 || box.x + box.size > window.innerWidth) box.vx *= -0.8
        if (box.y < 0 || box.y + box.size > window.innerHeight) box.vy *= -0.8

        // Keep in bounds
        box.x = Math.max(0, Math.min(window.innerWidth - box.size, box.x))
        box.y = Math.max(0, Math.min(window.innerHeight - box.size, box.y))

        // Calculate distance to mouse
        const dx = mouseRef.current.x - (box.x + box.size / 2)
        const dy = mouseRef.current.y - (box.y + box.size / 2)
        const distance = Math.sqrt(dx * dx + dy * dy)

        // Phase 2: Proximity effect with parallax
        let opacity = box.baseOpacity  // Use baseOpacity from layer config
        if (distance < ANIMATION_CONFIG.interaction.proximityRadius) {
          // Increase opacity when mouse is near
          const proximityFactor = 1 - distance / ANIMATION_CONFIG.interaction.proximityRadius
          opacity = Math.min(
            ANIMATION_CONFIG.interaction.maxProximityOpacity,
            box.baseOpacity + proximityFactor * 0.7
          )

          // Phase 2: Parallax mouse repulsion (layer-dependent)
          // Each layer responds differently to mouse (far=0.3x, mid=1.0x, near=1.7x)
          const layerConfig = ANIMATION_CONFIG.depthLayers[box.depth]
          const baseRepulsion = ANIMATION_CONFIG.physics.mouseRepulsionStrength
          const parallaxRepulsion = baseRepulsion * layerConfig.parallaxFactor
          const angle = Math.atan2(-dy, -dx)  // Angle away from mouse
          box.x += Math.cos(angle) * parallaxRepulsion * deltaTime
          box.y += Math.sin(angle) * parallaxRepulsion * deltaTime
        }

        // Draw the box
        drawBox(box, opacity)
      })

      // Reset global alpha
      ctx.globalAlpha = 1

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    // Handle resize with debounce
    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        setCanvasSize()
        // Reinitialize boxes with new canvas size
        initializeBoxes()
      }, 100)
    }

    // Add event listeners
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("resize", handleResize)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Start animation
    console.log('[AnimatedBackground] Starting animation loop')
    animationFrameRef.current = requestAnimationFrame(animate)

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("resize", handleResize)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      console.log('[AnimatedBackground] Cleanup complete')
    }
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-10 pointer-events-none"
        aria-hidden="true"
      />
      {/* Static fallback for reduced motion preference */}
      <div
        className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-0 motion-reduce:opacity-100"
        aria-hidden="true"
      />
    </>
  )
}
