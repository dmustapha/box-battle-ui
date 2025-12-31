"use client"

import { useEffect, useRef } from "react"
import type { EnhancedBox, DepthLayer } from "./animated-background/types"
import { createParticle, createCanvasGradient, respawnParticle, easeInOutCubic } from "./animated-background/utils"
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

    // Phase 3: Draw a box with glassmorphic radial gradient
    const drawBox = (box: Box, opacity: number) => {
      const { x, y, size, color, depth, rotation, scale } = box
      const borderRadius = 6 // Rounded corners

      // Phase 2: Layer-specific blur for depth perception
      const layerBlur = ANIMATION_CONFIG.depthLayers[depth].blurAmount
      ctx.shadowBlur = layerBlur
      ctx.shadowColor = color

      // Phase 3: Apply rotation and scaling transforms
      ctx.save()
      const centerX = x + size / 2
      const centerY = y + size / 2
      ctx.translate(centerX, centerY)
      ctx.rotate(rotation)
      ctx.scale(scale, scale)
      ctx.translate(-centerX, -centerY)

      // Phase 3: Create or use cached radial gradient
      if (!box.cachedGradient || box.gradientNeedsUpdate) {
        // Create radial gradient from center of particle
        const gradientCenterX = x + box.gradientCenter.x
        const gradientCenterY = y + box.gradientCenter.y
        const gradientRadius = box.gradientRadius

        box.cachedGradient = createCanvasGradient(
          ctx,
          gradientCenterX,
          gradientCenterY,
          gradientRadius,
          box.gradientStops,
          color
        )
        box.gradientNeedsUpdate = false
      }

      // Draw filled rounded rectangle with gradient
      ctx.fillStyle = box.cachedGradient
      ctx.globalAlpha = opacity
      ctx.beginPath()
      ctx.roundRect(x, y, size, size, borderRadius)
      ctx.fill()

      // Reset shadow for border
      ctx.shadowBlur = 0

      // Draw border (optional, subtle)
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.globalAlpha = opacity * 0.4  // More subtle border for glass effect
      ctx.beginPath()
      ctx.roundRect(x, y, size, size, borderRadius)
      ctx.stroke()

      // Restore transform
      ctx.restore()
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

        // Phase 3: Update rotation with delta time
        box.rotation += box.rotationSpeed * deltaTime
        // Normalize rotation to 0-2π range
        if (box.rotation > Math.PI * 2) box.rotation -= Math.PI * 2
        if (box.rotation < 0) box.rotation += Math.PI * 2

        // Phase 5: Update lifecycle state (fade in/out)
        if (ANIMATION_CONFIG.lifecycle.enabled) {
          box.age += deltaTime

          switch (box.lifecycleState) {
            case 'spawning':
              // Fade in: progress from 0 to 1 over fadeInDuration
              box.lifecycleProgress = Math.min(1, box.age / box.fadeInDuration)
              if (box.lifecycleProgress >= 1) {
                box.lifecycleState = 'alive'
                box.lifecycleProgress = 0
              }
              break

            case 'alive':
              // Normal state: check if lifespan exceeded
              if (box.age >= box.lifespan) {
                box.lifecycleState = 'dying'
                box.lifecycleProgress = 0
              }
              break

            case 'dying':
              // Fade out: progress from 0 to 1 over fadeOutDuration
              const dyingAge = box.age - box.lifespan
              box.lifecycleProgress = Math.min(1, dyingAge / box.fadeOutDuration)
              if (box.lifecycleProgress >= 1) {
                box.lifecycleState = 'dead'
              }
              break

            case 'dead':
              // Respawn the particle
              respawnParticle(box)
              break
          }
        }

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

        // Phase 2-3: Proximity effect with parallax and scaling
        let opacity = box.baseOpacity  // Use baseOpacity from layer config
        if (distance < ANIMATION_CONFIG.interaction.proximityRadius) {
          // Increase opacity when mouse is near
          const proximityFactor = 1 - distance / ANIMATION_CONFIG.interaction.proximityRadius
          opacity = Math.min(
            ANIMATION_CONFIG.interaction.opacityBoostMax,
            box.baseOpacity + proximityFactor * 0.7
          )

          // Phase 3: Proximity scaling (particles grow when mouse is near)
          const maxScale = ANIMATION_CONFIG.interaction.pulseScale.max
          box.targetScale = 1 + proximityFactor * (maxScale - 1)

          // Phase 2: Parallax mouse repulsion (layer-dependent)
          // Each layer responds differently to mouse (far=0.3x, mid=1.0x, near=1.7x)
          const layerConfig = ANIMATION_CONFIG.depthLayers[box.depth]
          const baseRepulsion = ANIMATION_CONFIG.physics.mouseRepulsionStrength
          const parallaxRepulsion = baseRepulsion * layerConfig.parallaxFactor
          const angle = Math.atan2(-dy, -dx)  // Angle away from mouse
          box.x += Math.cos(angle) * parallaxRepulsion * deltaTime
          box.y += Math.sin(angle) * parallaxRepulsion * deltaTime
        } else {
          // Far from mouse: return to normal scale
          box.targetScale = 1.0
        }

        // Phase 5: Apply lifecycle opacity modifier (fade in/out)
        if (ANIMATION_CONFIG.lifecycle.enabled) {
          let lifecycleOpacity = 1.0
          switch (box.lifecycleState) {
            case 'spawning':
              // Fade in with easing
              lifecycleOpacity = easeInOutCubic(box.lifecycleProgress)
              break
            case 'alive':
              lifecycleOpacity = 1.0
              break
            case 'dying':
              // Fade out with easing (1 - progress)
              lifecycleOpacity = 1 - easeInOutCubic(box.lifecycleProgress)
              break
            case 'dead':
              lifecycleOpacity = 0
              break
          }
          opacity *= lifecycleOpacity
        }

        // Phase 3: Smooth scale interpolation (lerp)
        const scaleSpeed = 5.0 // How fast scale changes (higher = faster)
        box.scale += (box.targetScale - box.scale) * scaleSpeed * deltaTime

        // Draw the box
        drawBox(box, opacity)
      })

      // Draw network connection lines between nearby particles
      const connectionRadius = 150 // Max distance for connections
      ctx.lineWidth = 1

      for (let i = 0; i < sortedBoxes.length; i++) {
        for (let j = i + 1; j < sortedBoxes.length; j++) {
          const p1 = sortedBoxes[i]
          const p2 = sortedBoxes[j]

          // Only connect particles in the same depth layer
          if (p1.depth !== p2.depth) continue

          // Skip connections for dead or nearly dead particles
          if (p1.lifecycleState === 'dead' || p2.lifecycleState === 'dead') continue

          // Calculate distance between particle centers
          const p1CenterX = p1.x + p1.size / 2
          const p1CenterY = p1.y + p1.size / 2
          const p2CenterX = p2.x + p2.size / 2
          const p2CenterY = p2.y + p2.size / 2

          const dx = p2CenterX - p1CenterX
          const dy = p2CenterY - p1CenterY
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < connectionRadius) {
            // Opacity fades with distance
            let lineOpacity = (1 - distance / connectionRadius) * 0.4

            // Apply lifecycle opacity to connections
            if (ANIMATION_CONFIG.lifecycle.enabled) {
              const getLifecycleOpacity = (p: EnhancedBox): number => {
                switch (p.lifecycleState) {
                  case 'spawning': return easeInOutCubic(p.lifecycleProgress)
                  case 'alive': return 1.0
                  case 'dying': return 1 - easeInOutCubic(p.lifecycleProgress)
                  default: return 0
                }
              }
              // Use the minimum opacity of both connected particles
              const p1Opacity = getLifecycleOpacity(p1)
              const p2Opacity = getLifecycleOpacity(p2)
              lineOpacity *= Math.min(p1Opacity, p2Opacity)
            }

            ctx.beginPath()
            ctx.moveTo(p1CenterX, p1CenterY)
            ctx.lineTo(p2CenterX, p2CenterY)
            ctx.strokeStyle = p1.color
            ctx.globalAlpha = lineOpacity
            ctx.stroke()
          }
        }
      }

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
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 30%, #1e2541 0%, #151929 40%, #0f141f 100%)' }}
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
