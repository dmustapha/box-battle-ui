/**
 * Configuration Constants for Glassmorphism-Enhanced Animated Background
 *
 * This file contains all configuration values used throughout the animation system.
 * Centralizing these values makes the system easy to tune and customize.
 *
 * IMPORTANT: These values have been carefully tuned for optimal visual effect
 * and performance. Adjust with care and test thoroughly after changes.
 *
 * @module constants
 */

import type { AnimationConfig, ColorEntry } from './types'

// =============================================================================
// ANIMATION CONFIGURATION
// =============================================================================

/**
 * Main animation configuration object
 *
 * This is the single source of truth for all animation parameters.
 * Designers can adjust these values to fine-tune the aesthetic.
 *
 * Performance impact ratings:
 * - 🟢 Low impact (adjust freely)
 * - 🟡 Medium impact (test after adjusting)
 * - 🔴 High impact (adjust with caution)
 */
export const ANIMATION_CONFIG: AnimationConfig = {
  // ---------------------------------------------------------------------------
  // PARTICLE COUNTS
  // Performance: 🔴 High impact
  // ---------------------------------------------------------------------------

  particleCounts: {
    /**
     * Particle count on mobile devices
     * Volume 5 spec: 25 mobile
     */
    mobile: 25,

    /**
     * Particle count on desktop devices
     */
    desktop: 25,
  },

  // ---------------------------------------------------------------------------
  // DEPTH LAYERS
  // Performance: 🟡 Medium impact
  // ---------------------------------------------------------------------------

  depthLayers: {
    /**
     * FAR LAYER (Background)
     *
     * These particles appear distant and create depth.
     * Characteristics:
     * - Smaller size
     * - Slower movement
     * - Lower opacity
     * - More blur
     * - Less mouse influence
     *
     * This creates the illusion of distance.
     */
    far: {
      /**
       * Fraction of total particles (40%)
       * Should sum to 1.0 across all layers
       */
      count: 0.4,

      /**
       * Size range in pixels [min, max]
       */
      sizeRange: [20, 35],

      /**
       * Speed multiplier (40% of base speed)
       * Slower movement enhances distance perception
       */
      speedMultiplier: 0.4,

      /**
       * Opacity range [min, max]
       * Volume 5 spec: 0.6-0.8 for far layer
       */
      opacityRange: [0.6, 0.8],

      /**
       * Shadow blur amount in pixels
       * Volume 5 spec: 8px for far layer
       */
      blurAmount: 8,

      /**
       * Parallax factor for mouse interaction
       * Lower value = less mouse influence = feels far away
       * 0.3 = 30% of mouse effect
       */
      parallaxFactor: 0.3,
    },

    /**
     * MID LAYER (Middle ground)
     *
     * These are the baseline particles.
     * Characteristics:
     * - Medium size
     * - Normal movement
     * - Medium opacity
     * - Medium blur
     * - Normal mouse influence
     */
    mid: {
      /**
       * Fraction of total particles (40%)
       */
      count: 0.4,

      /**
       * Size range in pixels [min, max]
       */
      sizeRange: [30, 50],

      /**
       * Speed multiplier (100% of base speed)
       * Baseline movement speed
       */
      speedMultiplier: 1.0,

      /**
       * Opacity range [min, max]
       * Volume 5 spec: 0.7-0.85 for mid layer
       */
      opacityRange: [0.7, 0.85],

      /**
       * Shadow blur amount in pixels
       * Volume 5 spec: 5px for mid layer
       */
      blurAmount: 5,

      /**
       * Parallax factor for mouse interaction
       * 1.0 = full mouse effect (baseline)
       */
      parallaxFactor: 1.0,
    },

    /**
     * NEAR LAYER (Foreground)
     *
     * These particles appear close and create depth.
     * Characteristics:
     * - Larger size
     * - Faster movement
     * - Higher opacity
     * - Less blur (sharp = close)
     * - More mouse influence
     *
     * This creates dramatic depth contrast.
     */
    near: {
      /**
       * Fraction of total particles (20%)
       * Fewer near particles prevent overcrowding
       */
      count: 0.2,

      /**
       * Size range in pixels [min, max]
       */
      sizeRange: [45, 70],

      /**
       * Speed multiplier (160% of base speed)
       * Faster movement creates sense of proximity
       */
      speedMultiplier: 1.6,

      /**
       * Opacity range [min, max]
       * Volume 5 spec: 0.8-1.0 for near layer
       */
      opacityRange: [0.8, 1.0],

      /**
       * Shadow blur amount in pixels
       * Volume 5 spec: 2px for near layer (sharp)
       */
      blurAmount: 2,

      /**
       * Parallax factor for mouse interaction
       * Higher value = more mouse influence = feels close
       * 1.7 = 170% of mouse effect
       */
      parallaxFactor: 1.7,
    },
  },

  // ---------------------------------------------------------------------------
  // PHYSICS SIMULATION
  // Performance: 🟡 Medium impact
  // ---------------------------------------------------------------------------

  physics: {
    /**
     * Base velocity in pixels per SECOND (not per frame!)
     *
     * This is the key change from original implementation.
     * Original used pixels/frame which caused speed differences
     * between 60Hz and 120Hz displays.
     *
     * 60 pixels/second = 1 pixel/frame at 60fps
     *
     * Range: 30-120 recommended
     * Lower = calmer, Higher = more energetic
     */
    baseSpeed: 40,

    /**
     * Friction coefficient (applied each frame)
     *
     * 0.98 means particles retain 98% of velocity each frame.
     * This creates very subtle slowdown over time.
     *
     * Range: 0.95-1.0 recommended
     * 1.0 = no friction (perpetual motion)
     * 0.95 = noticeable slowdown
     */
    friction: 0.98,

    /**
     * Energy retained after bouncing off walls
     *
     * 0.8 means particles retain 80% of velocity after bounce.
     * This prevents them from bouncing forever.
     *
     * Range: 0.7-1.0 recommended
     * 1.0 = perfectly elastic (unrealistic)
     * 0.7 = very damped (stops quickly)
     */
    bounceEnergyLoss: 0.8,

    /**
     * Mouse repulsion radius in pixels
     *
     * Particles within this distance are affected by mouse.
     * Matches original implementation.
     *
     * Range: 100-200 recommended
     */
    mouseRepulsionRadius: 150,

    /**
     * Mouse repulsion force strength
     *
     * Higher values = stronger repulsion.
     * Adjusted from original for smoother feel.
     *
     * Range: 1-5 recommended
     */
    mouseRepulsionStrength: 3,

    /**
     * How much velocity influences rotation (0-1)
     *
     * 0.5 means fast-moving particles rotate more.
     * This creates sense of momentum and direction.
     *
     * Range: 0-1
     * 0 = rotation independent of movement
     * 1 = rotation fully coupled to movement
     */
    rotationInfluence: 0.5,
  },

  // ---------------------------------------------------------------------------
  // RENDERING & VISUAL EFFECTS
  // Performance: 🟡 Medium impact
  // ---------------------------------------------------------------------------

  rendering: {
    /**
     * Shadow blur amounts per depth layer
     *
     * Controls the glow effect intensity for each layer.
     * Far layers have more blur (soft, distant feel).
     * Near layers have less blur (sharp, close feel).
     *
     * Performance note: Shadow blur is GPU-accelerated but
     * has some cost. Reduce on low-end devices.
     */
    shadowBlur: {
      far: 8,   // Softest glow
      mid: 15,  // Medium glow (original value)
      near: 25, // Strongest glow for wow factor
    },

    /**
     * Gradient intensity multiplier (0-1)
     *
     * Currently unused, reserved for future use.
     * Could control overall gradient brightness.
     */
    gradientIntensity: 0.7,

    /**
     * Border opacity relative to particle opacity
     *
     * 0.6 means border is 60% as opaque as fill.
     * This creates subtle definition.
     *
     * Range: 0.3-0.8 recommended
     */
    borderAlpha: 0.6,
  },

  // ---------------------------------------------------------------------------
  // MOUSE/TOUCH INTERACTION
  // Performance: 🟢 Low impact
  // ---------------------------------------------------------------------------

  interaction: {
    /**
     * Proximity radius for opacity/scale effects
     *
     * Same as mouse repulsion radius for consistency.
     * Particles within this distance get boosted opacity and scale.
     */
    proximityRadius: 150,

    /**
     * Maximum opacity when mouse is very close
     *
     * Particles can boost up to this opacity near mouse.
     * 1.0 for full brightness on hover.
     *
     * Range: 0.6-1.0 recommended
     */
    opacityBoostMax: 1.0,

    /**
     * Scale range for pulsing effect
     *
     * Particles pulse between min and max scale near mouse.
     * 1.15 = 15% larger (subtle but noticeable)
     *
     * Range: 1.0-1.3 recommended
     * 1.0 = no pulsing
     * 1.3 = very dramatic (might be too much)
     */
    pulseScale: {
      min: 1.0,   // Normal size
      max: 1.15,  // 15% larger
    },

    /**
     * Scale interpolation speed
     *
     * How quickly scale changes when mouse enters/exits.
     * 2.0 = reaches target in ~0.5 seconds
     *
     * Range: 1.0-5.0 recommended
     * Lower = smoother, Higher = snappier
     */
    pulseSpeed: 2.0,
  },

  // ---------------------------------------------------------------------------
  // SHIMMER EFFECTS
  // Performance: 🟢 Low impact (when not active)
  // ---------------------------------------------------------------------------

  shimmer: {
    /**
     * Whether shimmer effect is enabled
     *
     * Set to false to disable entirely (saves minimal CPU).
     * Useful for performance debugging.
     */
    enabled: true,

    /**
     * Minimum time between shimmers (milliseconds)
     *
     * No particle will shimmer more often than this.
     * 3000ms = 3 seconds
     *
     * Range: 2000-10000 recommended
     */
    minInterval: 3000,

    /**
     * Maximum time between shimmers (milliseconds)
     *
     * Particles will shimmer within this timeframe.
     * 8000ms = 8 seconds
     *
     * Range: 5000-15000 recommended
     */
    maxInterval: 8000,

    /**
     * Shimmer animation duration (milliseconds)
     *
     * How long each shimmer lasts.
     * 800ms = 0.8 seconds (quick and subtle)
     *
     * Range: 500-1500 recommended
     * Shorter = snappy, Longer = smooth
     */
    duration: 800,

    /**
     * Shimmer brightness intensity (0-1)
     *
     * How bright the shimmer highlight is.
     * 0.4 = subtle highlight
     *
     * Range: 0.2-0.7 recommended
     * Higher values can look garish
     */
    intensity: 0.4,
  },

  // ---------------------------------------------------------------------------
  // LIFECYCLE (FADE IN/OUT)
  // Performance: 🟢 Low impact
  // ---------------------------------------------------------------------------

  lifecycle: {
    /**
     * Whether lifecycle (fade in/out) is enabled
     *
     * When enabled, particles will fade in when spawning,
     * live for a period, then fade out and respawn elsewhere.
     * This creates an organic, breathing effect.
     */
    enabled: true,

    /**
     * Minimum lifespan in seconds
     *
     * Shortest time a particle will live before fading out.
     * 8 seconds gives time for particles to be seen
     *
     * Range: 5-15 recommended
     */
    minLifespan: 8,

    /**
     * Maximum lifespan in seconds
     *
     * Longest time a particle will live before fading out.
     * 15 seconds prevents particles from living too long
     *
     * Range: 10-25 recommended
     */
    maxLifespan: 15,

    /**
     * Fade-in duration in seconds
     *
     * How long it takes for a particle to fade in from invisible.
     * 1.5 seconds is smooth but noticeable
     *
     * Range: 0.5-3 recommended
     */
    fadeInDuration: 1.5,

    /**
     * Fade-out duration in seconds
     *
     * How long it takes for a particle to fade out to invisible.
     * 2 seconds is slightly longer for dramatic exit
     *
     * Range: 0.5-3 recommended
     */
    fadeOutDuration: 2,
  },
}

// =============================================================================
// COLOR PALETTE
// =============================================================================

/**
 * Color palette from Box Battle design system
 *
 * Colors are taken from design-tokens.css to ensure consistency.
 * These match the Player 1 (blue) and Player 2 (red) colors.
 *
 * Modification note: If you want to add more color variety,
 * you can include the accent colors (emerald, amber) from design tokens.
 */
export const COLOR_PALETTE: {
  blues: ColorEntry[]
  reds: ColorEntry[]
  accents?: ColorEntry[]  // Optional, currently unused
} = {
  /**
   * Blue color variations (Player 1 theme)
   */
  blues: [
    { hex: '#3B82F6', name: 'primary-blue' },      // Matches --color-accent-blue
    { hex: '#60A5FA', name: 'light-blue' },        // Lighter variant
    { hex: '#2563EB', name: 'dark-blue' },         // Darker variant
    { hex: '#1E40AF', name: 'darker-blue' },       // Darkest variant
  ],

  /**
   * Red color variations (Player 2 theme)
   */
  reds: [
    { hex: '#EF4444', name: 'primary-red' },       // Matches --color-accent-red
    { hex: '#F87171', name: 'light-red' },         // Lighter variant
    { hex: '#DC2626', name: 'dark-red' },          // Darker variant
    { hex: '#B91C1C', name: 'darker-red' },        // Darkest variant
  ],

  /**
   * Optional accent colors (currently unused)
   *
   * Uncomment to add more color variety:
   */
  // accents: [
  //   { hex: '#10B981', name: 'emerald' },  // Success color
  //   { hex: '#F59E0B', name: 'amber' },    // Warning color
  // ],
}

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

/**
 * Performance thresholds and monitoring settings
 *
 * Used for FPS tracking and adaptive quality adjustments.
 */
export const PERFORMANCE = {
  /**
   * Target frame rate
   */
  targetFPS: 60,

  /**
   * FPS threshold for "low performance" warning
   */
  lowFPSThreshold: 30,

  /**
   * How often to check FPS (milliseconds)
   */
  fpsCheckInterval: 1000,

  /**
   * How many particles to remove if FPS is low
   * (For adaptive quality - Phase 5 feature)
   */
  particleReductionStep: 5,

  /**
   * Minimum particle count (never reduce below this)
   */
  minParticles: 10,
}

// =============================================================================
// DEVICE DETECTION
// =============================================================================

/**
 * Device detection patterns and thresholds
 */
export const DEVICE = {
  /**
   * User agent regex for mobile detection
   */
  mobileUserAgents: /Android|webOS|iPhone|iPad/i,

  /**
   * Refresh rate threshold for "high refresh rate" displays
   */
  highRefreshRateThreshold: 90,  // Hz
}

// =============================================================================
// UTILITY CONSTANTS
// =============================================================================

/**
 * Border radius for rounded rectangles (pixels)
 * Matches design system
 */
export const BORDER_RADIUS = 6

/**
 * Border width for particle outlines (pixels)
 */
export const BORDER_WIDTH = 1.5

/**
 * Maximum delta time clamp (seconds)
 * Prevents huge jumps if tab was hidden
 */
export const MAX_DELTA_TIME = 0.1  // 100ms = 10fps minimum

// =============================================================================
// EXPORT ALL COLORS AS FLAT ARRAY
// =============================================================================

/**
 * All colors as a flat array for easy random selection
 */
export const ALL_COLORS = [
  ...COLOR_PALETTE.blues.map((c) => c.hex),
  ...COLOR_PALETTE.reds.map((c) => c.hex),
  // Uncomment if using accent colors:
  // ...(COLOR_PALETTE.accents?.map((c) => c.hex) ?? []),
]

// =============================================================================
// CONFIGURATION VALIDATION
// =============================================================================

/**
 * Validate configuration at runtime (development only)
 *
 * This runs in development to catch configuration errors early.
 * Disabled in production for performance.
 */
if (process.env.NODE_ENV === 'development') {
  // Check that layer counts sum to 1.0
  const layerSum =
    ANIMATION_CONFIG.depthLayers.far.count +
    ANIMATION_CONFIG.depthLayers.mid.count +
    ANIMATION_CONFIG.depthLayers.near.count

  if (Math.abs(layerSum - 1.0) > 0.01) {
    console.warn(
      `[AnimatedBackground] Layer counts should sum to 1.0, got ${layerSum}`
    )
  }

  // Check that particle counts are reasonable
  if (ANIMATION_CONFIG.particleCounts.desktop < 10) {
    console.warn(
      '[AnimatedBackground] Desktop particle count very low (< 10)'
    )
  }

  if (ANIMATION_CONFIG.particleCounts.mobile > 30) {
    console.warn(
      '[AnimatedBackground] Mobile particle count high (> 30), may impact performance'
    )
  }
}
