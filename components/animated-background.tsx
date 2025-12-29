"use client"

import { useEffect, useRef } from "react"

interface Box {
  id: number
  x: number
  y: number
  size: number
  vx: number
  vy: number
  opacity: number
  color: string
}

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

    // Detect mobile for optimization
    const isMobile = /Android|webOS|iPhone|iPad/i.test(navigator.userAgent)
    const boxCount = isMobile ? 20 : 35

    // Initialize boxes with Box Battle color scheme
    const initializeBoxes = () => {
      // Box Battle colors: blues and reds (like completed game boxes)
      const colors = [
        "#3b82f6", // blue
        "#60a5fa", // light blue
        "#2563eb", // dark blue
        "#1e40af", // darker blue
        "#ef4444", // red
        "#f87171", // light red
        "#dc2626", // darker red
      ]

      boxesRef.current = Array.from({ length: boxCount }, (_, i) => ({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 30 + 20, // 20-50px
        // Phase 1: Changed from px/frame to px/second for refresh-rate independence
        // Old: (Math.random() - 0.5) * 0.5 = -0.25 to +0.25 px/frame
        // New: (Math.random() - 0.5) * 30 = -15 to +15 px/sec (same visual speed at 60fps)
        vx: (Math.random() - 0.5) * 30, // -15 to +15 px/sec
        vy: (Math.random() - 0.5) * 30, // -15 to +15 px/sec
        opacity: Math.random() * 0.3 + 0.1, // 0.1-0.4 base opacity
        color: colors[Math.floor(Math.random() * colors.length)],
      }))
    }
    initializeBoxes()
    console.log('[AnimatedBackground] Initialized', boxesRef.current.length, 'boxes')

    // Track mouse position
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    // Draw a box with rounded corners and glow effect
    const drawBox = (box: Box, opacity: number) => {
      const { x, y, size, color } = box
      const borderRadius = 6 // Rounded corners

      // Add glow effect
      ctx.shadowBlur = 15
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

      boxesRef.current.forEach((box) => {
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

        // Proximity effect
        let opacity = box.opacity
        if (distance < 150) {
          // Increase opacity when mouse is near
          opacity = Math.min(0.8, box.opacity + (1 - distance / 150) * 0.7)

          // Phase 1: Repel from mouse with delta time
          // Force of 120 px/sec (was 2 px/frame at 60fps)
          const repulsionForce = 120
          const angle = Math.atan2(dy, dx)
          box.x += Math.cos(angle) * repulsionForce * deltaTime
          box.y += Math.sin(angle) * repulsionForce * deltaTime
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
