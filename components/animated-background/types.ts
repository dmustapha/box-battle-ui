/**
 * Type Definitions for Glassmorphism-Enhanced Animated Background
 *
 * This file defines all TypeScript interfaces and types used throughout
 * the animated background component system.
 *
 * Structure:
 * 1. Core particle interface (EnhancedBox)
 * 2. Configuration interfaces
 * 3. Helper types
 *
 * @module types
 */

// =============================================================================
// CORE PARTICLE INTERFACE
// =============================================================================

/**
 * Enhanced particle (box) with glassmorphism and depth properties
 *
 * This extends the original Box interface with:
 * - Depth layer properties for parallax effects
 * - Gradient properties for glassmorphic rendering
 * - Animation properties for rotation and scaling
 * - Shimmer properties for highlight effects
 * - Trail properties for motion blur (optional)
 */
export interface EnhancedBox {
  // ---------------------------------------------------------------------------
  // Core Properties (from original implementation)
  // ---------------------------------------------------------------------------

  /** Unique identifier for this particle */
  id: number

  /** X position in pixels */
  x: number

  /** Y position in pixels */
  y: number

  /** Size in pixels (width and height, particles are square) */
  size: number

  /** Velocity X in pixels per SECOND (not per frame!) */
  vx: number

  /** Velocity Y in pixels per SECOND (not per frame!) */
  vy: number

  /** Current opacity (0-1) - can be boosted by proximity */
  opacity: number

  /** Color hex string (e.g., "#3B82F6") */
  color: string

  // ---------------------------------------------------------------------------
  // Depth Layer Properties (NEW - Phase 2)
  // ---------------------------------------------------------------------------

  /** Depth layer: 'far' (background), 'mid' (middle), or 'near' (foreground) */
  depth: 'far' | 'mid' | 'near'

  /** Base opacity for this particle (depth-dependent, before proximity boost) */
  baseOpacity: number

  /** Z-index for rendering order (far=0, mid=1, near=2) */
  zIndex: number

  // ---------------------------------------------------------------------------
  // Gradient Properties (NEW - Phase 3)
  // ---------------------------------------------------------------------------

  /** Center point of radial gradient relative to particle position */
  gradientCenter: { x: number; y: number }

  /** Radius of radial gradient in pixels */
  gradientRadius: number

  /** Gradient color stops (offset 0-1, color hex, alpha 0-1) */
  gradientStops: Array<{ offset: number; color: string; alpha: number }>

  /** Cached CanvasGradient object (created once, reused each frame) */
  cachedGradient?: CanvasGradient

  /** Flag to indicate gradient needs recreation */
  gradientNeedsUpdate: boolean

  // ---------------------------------------------------------------------------
  // Animation Properties (NEW - Phase 3)
  // ---------------------------------------------------------------------------

  /** Current rotation in radians (0 to 2π) */
  rotation: number

  /** Rotation speed in radians per second */
  rotationSpeed: number

  /** Current scale multiplier (1.0 = normal size) */
  scale: number

  /** Target scale for smooth interpolation (used for proximity pulsing) */
  targetScale: number

  // ---------------------------------------------------------------------------
  // Shimmer Properties (NEW - Phase 4)
  // ---------------------------------------------------------------------------

  /** Current shimmer animation progress (0-1, where 1 = complete) */
  shimmerProgress: number

  /** Whether shimmer is currently active */
  shimmerActive: boolean

  /** Timestamp when current/last shimmer started (milliseconds) */
  shimmerStartTime: number

  // ---------------------------------------------------------------------------
  // Trail Properties (OPTIONAL - Phase 4)
  // ---------------------------------------------------------------------------

  /** Array of historical positions for trail effect */
  trailPoints: Array<{ x: number; y: number; alpha: number }>

  /** Maximum number of trail points to keep */
  maxTrailLength: number

  // ---------------------------------------------------------------------------
  // Lifecycle Properties (NEW - Phase 5)
  // ---------------------------------------------------------------------------

  /** Current lifecycle state: spawning (fade in), alive (normal), dying (fade out), dead (respawn) */
  lifecycleState: 'spawning' | 'alive' | 'dying' | 'dead'

  /** Progress through current lifecycle phase (0-1) */
  lifecycleProgress: number

  /** Total lifespan in seconds before dying */
  lifespan: number

  /** Time alive in current life cycle (seconds) */
  age: number

  /** Duration of fade-in effect (seconds) */
  fadeInDuration: number

  /** Duration of fade-out effect (seconds) */
  fadeOutDuration: number
}

// =============================================================================
// DEPTH LAYER CONFIGURATION
// =============================================================================

/**
 * Configuration for a single depth layer
 *
 * Defines size ranges, movement speed, opacity, visual effects,
 * and parallax behavior for particles in this layer.
 */
export interface LayerConfig {
  /** Fraction of total particles in this layer (0-1, should sum to 1.0) */
  count: number

  /** Min and max size in pixels [min, max] */
  sizeRange: [number, number]

  /** Speed multiplier relative to base speed (e.g., 0.4 = 40% speed) */
  speedMultiplier: number

  /** Min and max opacity [min, max] */
  opacityRange: [number, number]

  /** Shadow blur amount in pixels */
  blurAmount: number

  /** Parallax factor for mouse interaction (0-2, where 1.0 = baseline) */
  parallaxFactor: number
}

// =============================================================================
// PHYSICS CONFIGURATION
// =============================================================================

/**
 * Physics simulation parameters
 *
 * Controls movement speed, friction, bouncing, and mouse interaction forces.
 */
export interface PhysicsConfig {
  /** Base velocity in pixels per second */
  baseSpeed: number

  /** Friction coefficient (0-1, where 1 = no friction) */
  friction: number

  /** Energy retained after wall bounce (0-1, where 1 = elastic collision) */
  bounceEnergyLoss: number

  /** Radius in pixels where mouse affects particles */
  mouseRepulsionRadius: number

  /** Strength of mouse repulsion force */
  mouseRepulsionStrength: number

  /** How much velocity influences rotation (0-1) */
  rotationInfluence: number
}

// =============================================================================
// RENDERING CONFIGURATION
// =============================================================================

/**
 * Rendering and visual effect parameters
 *
 * Controls shadow blur, gradient intensity, and border rendering.
 */
export interface RenderingConfig {
  /** Shadow blur amount per depth layer */
  shadowBlur: {
    far: number
    mid: number
    near: number
  }

  /** Gradient intensity multiplier (0-1) */
  gradientIntensity: number

  /** Border alpha/opacity (0-1) */
  borderAlpha: number
}

// =============================================================================
// INTERACTION CONFIGURATION
// =============================================================================

/**
 * Mouse/touch interaction parameters
 *
 * Controls proximity effects, opacity boosting, and scale pulsing.
 */
export interface InteractionConfig {
  /** Radius in pixels where proximity effects apply */
  proximityRadius: number

  /** Maximum opacity when mouse is very close */
  opacityBoostMax: number

  /** Scale range for pulsing effect */
  pulseScale: {
    min: number  // Minimum scale (usually 1.0)
    max: number  // Maximum scale (e.g., 1.15 = 15% larger)
  }

  /** Speed of scale interpolation (higher = faster response) */
  pulseSpeed: number
}

// =============================================================================
// SHIMMER CONFIGURATION
// =============================================================================

/**
 * Shimmer highlight effect parameters
 *
 * Controls timing, duration, and intensity of shimmer highlights.
 */
export interface ShimmerConfig {
  /** Whether shimmer effect is enabled */
  enabled: boolean

  /** Minimum time between shimmers in milliseconds */
  minInterval: number

  /** Maximum time between shimmers in milliseconds */
  maxInterval: number

  /** Shimmer animation duration in milliseconds */
  duration: number

  /** Shimmer brightness intensity (0-1) */
  intensity: number
}

// =============================================================================
// LIFECYCLE CONFIGURATION
// =============================================================================

/**
 * Particle lifecycle parameters
 *
 * Controls particle lifespan, fade in/out durations, and respawn behavior.
 */
export interface LifecycleConfig {
  /** Whether lifecycle (fade in/out) is enabled */
  enabled: boolean

  /** Minimum lifespan in seconds */
  minLifespan: number

  /** Maximum lifespan in seconds */
  maxLifespan: number

  /** Fade-in duration in seconds */
  fadeInDuration: number

  /** Fade-out duration in seconds */
  fadeOutDuration: number
}

// =============================================================================
// MAIN CONFIGURATION INTERFACE
// =============================================================================

/**
 * Complete animation configuration
 *
 * Top-level configuration object containing all parameters
 * for the animated background system.
 */
export interface AnimationConfig {
  /** Particle counts for different device types */
  particleCounts: {
    mobile: number
    desktop: number
  }

  /** Configuration for each depth layer */
  depthLayers: {
    far: LayerConfig
    mid: LayerConfig
    near: LayerConfig
  }

  /** Physics simulation parameters */
  physics: PhysicsConfig

  /** Rendering and visual effect parameters */
  rendering: RenderingConfig

  /** Interaction parameters */
  interaction: InteractionConfig

  /** Shimmer effect parameters */
  shimmer: ShimmerConfig

  /** Lifecycle (fade in/out) parameters */
  lifecycle: LifecycleConfig
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Depth layer literal type
 */
export type DepthLayer = 'far' | 'mid' | 'near'

/**
 * Lifecycle state literal type
 */
export type LifecycleState = 'spawning' | 'alive' | 'dying' | 'dead'

/**
 * Color palette entry
 */
export interface ColorEntry {
  hex: string
  name: string
}

/**
 * Gradient stop for radial gradients
 */
export interface GradientStop {
  offset: number  // 0-1
  color: string   // Hex color
  alpha: number   // 0-1
}

/**
 * Performance metrics (for monitoring)
 */
export interface PerformanceMetrics {
  fps: number
  avgFrameTime: number
  particleCount: number
  memoryUsage?: number
}

// =============================================================================
// NOTES FOR IMPLEMENTATION
// =============================================================================

/**
 * TODO: When implementing Phase 1 (Delta Time):
 * - Ensure all velocity calculations use pixels per SECOND
 * - Add delta time tracking refs
 * - Convert existing code from pixels/frame to pixels/second
 *
 * TODO: When implementing Phase 2 (Depth Layers):
 * - Initialize EnhancedBox with depth property
 * - Distribute particles across layers
 * - Implement layer-specific rendering
 *
 * TODO: When implementing Phase 3 (Glassmorphism):
 * - Create gradient stops based on color
 * - Cache gradients in EnhancedBox
 * - Implement rotation and scaling animations
 *
 * TODO: When implementing Phase 4 (Shimmer):
 * - Add shimmer scheduling logic
 * - Implement shimmer rendering
 * - Add easing functions for smooth animation
 */
