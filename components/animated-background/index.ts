/**
 * Animated Background Component - Main Export
 *
 * This is the barrel export file that consolidates all exports
 * from the animated-background module.
 *
 * Usage:
 * ```ts
 * import { AnimatedBackground } from '@/components/animated-background'
 * import type { EnhancedBox, AnimationConfig } from '@/components/animated-background'
 * import { ANIMATION_CONFIG, createParticle } from '@/components/animated-background'
 * ```
 *
 * @module animated-background
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Core types
  EnhancedBox,
  DepthLayer,
  ColorEntry,
  GradientStop,
  PerformanceMetrics,

  // Configuration types
  AnimationConfig,
  LayerConfig,
  PhysicsConfig,
  RenderingConfig,
  InteractionConfig,
  ShimmerConfig,
} from './types'

// =============================================================================
// CONSTANT EXPORTS
// =============================================================================

export {
  // Main configuration
  ANIMATION_CONFIG,

  // Color palette
  COLOR_PALETTE,
  ALL_COLORS,

  // Performance settings
  PERFORMANCE,

  // Device detection
  DEVICE,

  // Rendering constants
  BORDER_RADIUS,
  BORDER_WIDTH,
  MAX_DELTA_TIME,
} from './constants'

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export {
  // Particle creation
  createParticle,

  // Color utilities
  selectRandomColor,
  hexToRGB,
  rgbaString,

  // Gradient creation
  createGradientStops,
  createCanvasGradient,

  // Math utilities
  randomInRange,
  clamp,
  lerp,

  // Easing functions
  easeInOutCubic,
  easeOutCubic,
  easeInCubic,

  // Geometry
  distance,
  normalizeAngle,

  // Device detection
  isMobileDevice,
  getDevicePixelRatio,

  // Performance utilities
  formatFPS,
  formatMemory,

  // Debug utilities (development only)
  debugParticle,
  drawDebugInfo,
} from './utils'

// =============================================================================
// COMPONENT EXPORT (will be added in implementation)
// =============================================================================

/**
 * Main AnimatedBackground component
 *
 * NOTE: This export will be added when we migrate the component
 * from /components/animated-background.tsx to this directory.
 *
 * For now, import from the old location:
 * ```ts
 * import { AnimatedBackground } from '@/components/animated-background.tsx'
 * ```
 *
 * After migration, import from this index:
 * ```ts
 * import { AnimatedBackground } from '@/components/animated-background'
 * ```
 */

// TODO: After component migration, add this export:
// export { AnimatedBackground } from './animated-background'

// =============================================================================
// RE-EXPORT PATTERN FOR CONVENIENCE
// =============================================================================

/**
 * Convenience object containing all constants
 *
 * Usage:
 * ```ts
 * import { CONFIG } from '@/components/animated-background'
 * console.log(CONFIG.particleCounts.desktop)
 * ```
 */
// export { ANIMATION_CONFIG as CONFIG } from './constants'

// =============================================================================
// VERSION INFO
// =============================================================================

/**
 * Module version (updated with each phase)
 */
export const VERSION = '0.1.0-phase0' as const

/**
 * Module metadata
 */
export const METADATA = {
  version: VERSION,
  phase: 0,
  name: 'Glassmorphism-Enhanced Animated Background',
  author: 'Box Battle Team',
  lastUpdated: '2025-12-29',
} as const
