/**
 * Utility Functions for Glassmorphism-Enhanced Animated Background
 *
 * This file contains helper functions used throughout the animation system.
 * Functions are organized by category:
 * 1. Particle creation and initialization
 * 2. Color manipulation
 * 3. Math and easing functions
 * 4. Gradient creation
 * 5. Performance utilities
 *
 * @module utils
 */

import type {
  EnhancedBox,
  DepthLayer,
  GradientStop,
  ColorEntry,
} from './types'
import { ANIMATION_CONFIG, ALL_COLORS, BORDER_RADIUS } from './constants'

// =============================================================================
// PARTICLE CREATION & INITIALIZATION
// =============================================================================

/**
 * Creates a fully initialized particle with layer-specific properties
 *
 * This is the main factory function for creating particles. It:
 * 1. Assigns layer-specific size, speed, and opacity
 * 2. Randomly positions the particle
 * 3. Gives it random velocity
 * 4. Creates gradient stops
 * 5. Initializes animation properties
 *
 * @param id - Unique particle identifier
 * @param depth - Depth layer ('far', 'mid', or 'near')
 * @returns Fully initialized EnhancedBox particle
 *
 * @example
 * ```ts
 * const particle = createParticle(0, 'mid')
 * // particle.size will be between 25-40 (mid layer range)
 * // particle.vx will be scaled by 1.0x (mid layer speed)
 * ```
 */
export function createParticle(id: number, depth: DepthLayer): EnhancedBox {
  const layerConfig = ANIMATION_CONFIG.depthLayers[depth]
  const color = selectRandomColor()

  // Size from layer-specific range
  const size = randomInRange(...layerConfig.sizeRange)

  // Velocity in pixels per SECOND (not pixels per frame!)
  const baseVelocity = ANIMATION_CONFIG.physics.baseSpeed
  const vx =
    randomInRange(-1, 1) * baseVelocity * layerConfig.speedMultiplier
  const vy =
    randomInRange(-1, 1) * baseVelocity * layerConfig.speedMultiplier

  // Opacity from layer-specific range
  const baseOpacity = randomInRange(...layerConfig.opacityRange)

  // Z-index for rendering order (far=0, mid=1, near=2)
  const zIndex = depth === 'far' ? 0 : depth === 'mid' ? 1 : 2

  // Create gradient stops for this color
  const gradientStops = createGradientStops(color)

  // Random rotation speed (some clockwise, some counter-clockwise)
  const rotationSpeed =
    randomInRange(-0.1, 0.1) * layerConfig.speedMultiplier

  return {
    // Core properties
    id,
    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
    y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
    size,
    vx,
    vy,
    opacity: baseOpacity,
    color,

    // Depth properties
    depth,
    baseOpacity,
    zIndex,

    // Gradient properties
    gradientCenter: { x: size / 2, y: size / 2 },  // Center of particle
    gradientRadius: size * 0.7,  // 70% of size creates nice fade
    gradientStops,
    cachedGradient: undefined,  // Will be created on first render
    gradientNeedsUpdate: true,   // Flag to create gradient

    // Animation properties
    rotation: 0,  // Start at 0 radians
    rotationSpeed,
    scale: 1.0,         // Start at normal scale
    targetScale: 1.0,   // No pulsing initially

    // Shimmer properties
    shimmerProgress: 0,
    shimmerActive: false,
    shimmerStartTime: 0,

    // Trail properties (optional, currently unused)
    trailPoints: [],
    maxTrailLength: 5,
  }
}

// =============================================================================
// COLOR UTILITIES
// =============================================================================

/**
 * Selects a random color from the palette
 *
 * @returns Hex color string (e.g., "#3B82F6")
 */
export function selectRandomColor(): string {
  return ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)]
}

/**
 * Converts hex color to RGB object
 *
 * @param hex - Hex color string (e.g., "#3B82F6" or "3B82F6")
 * @returns RGB object { r, g, b } with values 0-255
 *
 * @example
 * ```ts
 * hexToRGB("#3B82F6")  // { r: 59, g: 130, b: 246 }
 * ```
 */
export function hexToRGB(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  const cleanHex = hex.replace('#', '')

  // Parse hex string
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)

  return { r, g, b }
}

/**
 * Converts RGB and alpha to rgba string
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @param a - Alpha (0-1)
 * @returns rgba string (e.g., "rgba(59, 130, 246, 0.8)")
 */
export function rgbaString(
  r: number,
  g: number,
  b: number,
  a: number
): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

// =============================================================================
// GRADIENT CREATION
// =============================================================================

/**
 * Creates gradient stops for a glassmorphic radial gradient
 *
 * Glassmorphism style:
 * - Center: Vibrant and bright (high opacity)
 * - Middle: Transitioning (medium opacity)
 * - Edge: Nearly transparent (low opacity)
 *
 * This creates the characteristic "glowing center with fading edges" look.
 *
 * @param baseColor - Hex color string
 * @returns Array of gradient stops
 *
 * @example
 * ```ts
 * const stops = createGradientStops("#3B82F6")
 * // [
 * //   { offset: 0, color: "#3B82F6", alpha: 0.8 },   // Bright center
 * //   { offset: 0.6, color: "#3B82F6", alpha: 0.4 }, // Fading
 * //   { offset: 1.0, color: "#3B82F6", alpha: 0.05 } // Transparent edge
 * // ]
 * ```
 */
export function createGradientStops(baseColor: string): GradientStop[] {
  return [
    // Center: Bright and vibrant
    {
      offset: 0,
      color: baseColor,
      alpha: 0.8,  // High opacity at center
    },
    // Mid-point: Transition
    {
      offset: 0.6,
      color: baseColor,
      alpha: 0.4,  // Medium opacity
    },
    // Edge: Nearly transparent
    {
      offset: 1.0,
      color: baseColor,
      alpha: 0.05,  // Almost invisible at edge
    },
  ]
}

/**
 * Creates a CanvasGradient from gradient stops
 *
 * This function is called during rendering to create the actual
 * CanvasGradient object used for filling.
 *
 * @param ctx - Canvas rendering context
 * @param x - Center X position
 * @param y - Center Y position
 * @param radius - Gradient radius
 * @param stops - Array of gradient stops
 * @param color - Base color hex string
 * @returns CanvasGradient ready to use
 */
export function createCanvasGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  stops: GradientStop[],
  color: string
): CanvasGradient {
  // Create radial gradient from center to radius
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)

  // Convert color to RGB once
  const rgb = hexToRGB(color)

  // Add each stop to the gradient
  stops.forEach((stop) => {
    const rgba = rgbaString(rgb.r, rgb.g, rgb.b, stop.alpha)
    gradient.addColorStop(stop.offset, rgba)
  })

  return gradient
}

// =============================================================================
// MATH UTILITIES
// =============================================================================

/**
 * Returns random number between min and max (inclusive)
 *
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random number in range
 *
 * @example
 * ```ts
 * randomInRange(10, 20)  // e.g., 15.7
 * randomInRange(-1, 1)   // e.g., 0.3
 * ```
 */
export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/**
 * Clamps a value between min and max
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 *
 * @example
 * ```ts
 * clamp(15, 0, 10)   // 10
 * clamp(-5, 0, 10)   // 0
 * clamp(5, 0, 10)    // 5
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Linear interpolation between two values
 *
 * @param start - Starting value
 * @param end - Ending value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 *
 * @example
 * ```ts
 * lerp(0, 100, 0.5)   // 50
 * lerp(0, 100, 0.25)  // 25
 * lerp(10, 20, 1.0)   // 20
 * ```
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

// =============================================================================
// EASING FUNCTIONS
// =============================================================================

/**
 * Ease-in-out cubic easing function
 *
 * Starts slow, accelerates in middle, slows at end.
 * Perfect for smooth animations like shimmer.
 *
 * @param t - Time value (0-1)
 * @returns Eased value (0-1)
 *
 * @see https://easings.net/#easeInOutCubic
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Ease-out cubic easing function
 *
 * Starts fast, decelerates at end.
 * Good for bounce-back effects.
 *
 * @param t - Time value (0-1)
 * @returns Eased value (0-1)
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Ease-in cubic easing function
 *
 * Starts slow, accelerates at end.
 * Good for drop-in effects.
 *
 * @param t - Time value (0-1)
 * @returns Eased value (0-1)
 */
export function easeInCubic(t: number): number {
  return t * t * t
}

// =============================================================================
// DISTANCE & GEOMETRY
// =============================================================================

/**
 * Calculates Euclidean distance between two points
 *
 * @param x1 - First point X
 * @param y1 - First point Y
 * @param x2 - Second point X
 * @param y2 - Second point Y
 * @returns Distance in pixels
 *
 * @example
 * ```ts
 * distance(0, 0, 3, 4)  // 5 (Pythagorean triple)
 * ```
 */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Normalizes an angle to 0-2π range
 *
 * @param angle - Angle in radians
 * @returns Normalized angle (0 to 2π)
 */
export function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2
  return ((angle % twoPi) + twoPi) % twoPi
}

// =============================================================================
// DEVICE DETECTION
// =============================================================================

/**
 * Detects if the current device is mobile
 *
 * @returns true if mobile, false otherwise
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad/i.test(navigator.userAgent)
}

/**
 * Gets device pixel ratio (for retina displays)
 *
 * @returns Device pixel ratio (1, 2, 3, etc.)
 */
export function getDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1
  return window.devicePixelRatio || 1
}

// =============================================================================
// PERFORMANCE UTILITIES
// =============================================================================

/**
 * Formats FPS for display
 *
 * @param fps - Frame rate
 * @returns Formatted string (e.g., "60 FPS" or "30 FPS (LOW)")
 */
export function formatFPS(fps: number): string {
  const rounded = Math.round(fps)
  const isLow = fps < 30
  return `${rounded} FPS${isLow ? ' (LOW)' : ''}`
}

/**
 * Formats memory usage for display
 *
 * @param bytes - Memory in bytes
 * @returns Formatted string (e.g., "5.2 MB")
 */
export function formatMemory(bytes: number): string {
  const mb = bytes / 1024 / 1024
  return `${mb.toFixed(1)} MB`
}

// =============================================================================
// DEBUG UTILITIES (Development only)
// =============================================================================

/**
 * Logs particle state for debugging
 *
 * Only logs in development mode.
 *
 * @param particle - Particle to log
 */
export function debugParticle(particle: EnhancedBox): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Particle Debug]', {
      id: particle.id,
      position: { x: particle.x, y: particle.y },
      velocity: { vx: particle.vx, vy: particle.vy },
      size: particle.size,
      depth: particle.depth,
      opacity: particle.opacity,
      scale: particle.scale,
      rotation: particle.rotation,
      shimmerActive: particle.shimmerActive,
    })
  }
}

/**
 * Draws debug information on canvas
 *
 * Shows particle bounds, velocity vectors, etc.
 * Only in development mode.
 *
 * @param ctx - Canvas context
 * @param particle - Particle to debug
 */
export function drawDebugInfo(
  ctx: CanvasRenderingContext2D,
  particle: EnhancedBox
): void {
  if (process.env.NODE_ENV === 'development') {
    // Draw velocity vector
    ctx.strokeStyle = 'yellow'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(particle.x + particle.size / 2, particle.y + particle.size / 2)
    ctx.lineTo(
      particle.x + particle.size / 2 + particle.vx * 0.5,
      particle.y + particle.size / 2 + particle.vy * 0.5
    )
    ctx.stroke()

    // Draw bounding box
    ctx.strokeStyle = 'red'
    ctx.lineWidth = 1
    ctx.strokeRect(particle.x, particle.y, particle.size, particle.size)

    // Draw depth label
    ctx.fillStyle = 'white'
    ctx.font = '10px monospace'
    ctx.fillText(particle.depth, particle.x + 2, particle.y + 12)
  }
}

// =============================================================================
// NOTES FOR IMPLEMENTATION
// =============================================================================

/**
 * TODO: Phase 1 (Delta Time)
 * - All velocity calculations already use pixels/second
 * - createParticle() initializes velocities correctly
 *
 * TODO: Phase 2 (Depth Layers)
 * - createParticle() fully implements depth-aware initialization
 * - Particles are distributed across layers in main component
 *
 * TODO: Phase 3 (Glassmorphism)
 * - createGradientStops() is ready to use
 * - createCanvasGradient() will be called during rendering
 * - Gradient caching handled in main component
 *
 * TODO: Phase 4 (Shimmer)
 * - Easing functions ready for shimmer animation
 * - Shimmer logic will be in main component
 *
 * TODO: Testing
 * - Test color utilities with various hex formats
 * - Test math utilities with edge cases (negative, zero, infinity)
 * - Test easing functions visually
 */
