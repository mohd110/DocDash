/**
 * Per-doctor theming.
 *
 * A doctor picks two colours — one brand colour (the "ink") and one surface
 * colour (the "paper") — and the whole dashboard follows. Rather than asking
 * them to specify ten shades, we take the shape of the original cream + bottle
 * green palette (its lightness rhythm, saturation falloff and slight hue drift)
 * and re-anchor it on their colour, so any pick comes out as balanced as the
 * one this app was designed with.
 *
 * The scales are published as CSS custom properties, which is what the Tailwind
 * `brand-*` / `surface-*` classes resolve to — so every existing class in the
 * app re-themes without being touched.
 */

export interface ThemeColors {
  /** Brand / ink colour. Buttons, headings, the active nav item. */
  primary: string
  /** Surface / paper colour. The page behind everything. */
  background: string
}

/** Hakiman's original cream + bottle green, and the fallback for everyone. */
export const DEFAULT_THEME: ThemeColors = {
  primary: '#0B5540',
  background: '#FDF8EC',
}

export interface ThemePreset extends ThemeColors {
  name: string
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: 'Cream & Olive', primary: '#0B5540', background: '#FDF8EC' },
  { name: 'Ivory & Navy', primary: '#1B3A5C', background: '#F6F7F9' },
  { name: 'Mist & Teal', primary: '#0F5C63', background: '#EFF6F5' },
  { name: 'Blush & Plum', primary: '#6B2C5C', background: '#FBF3F7' },
  { name: 'Sand & Rust', primary: '#9A3F1F', background: '#FBF3EA' },
  { name: 'Paper & Ink', primary: '#26302F', background: '#F5F5F3' },
]

/* -------------------------------------------------------------- colour maths */

interface Hsl {
  h: number
  s: number
  l: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function hexToHsl(hex: string): Hsl | null {
  const clean = hex.trim().replace(/^#/, '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean

  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null

  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min

  if (d === 0) return { h: 0, s: 0, l: l * 100 }

  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4

  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 }
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sat = s / 100
  const light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = light - c / 2

  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]

  const hex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase()
}

/** Tailwind's `<alpha-value>` syntax needs the channels bare, not wrapped. */
function channels({ h, s, l }: Hsl): string {
  return `${h.toFixed(1)} ${clamp(s, 0, 100).toFixed(1)}% ${clamp(l, 0, 100).toFixed(1)}%`
}

/* ------------------------------------------------------------ palette shapes */

interface ShapeStep {
  step: number
  /** Hue drift from the anchor shade — the original palette warms as it lightens. */
  dh: number
  /** Saturation as a fraction of the anchor's. */
  sr: number
  /** Lightness of this step in the original palette. */
  l: number
}

/** Measured off the original bottle green scale; anchored on 600. */
const BRAND_SHAPE: ShapeStep[] = [
  { step: 50, dh: -17.3, sr: 0.363, l: 95.1 },
  { step: 100, dh: -14.8, sr: 0.362, l: 88.0 },
  { step: 200, dh: -13.0, sr: 0.376, l: 75.7 },
  { step: 300, dh: -10.9, sr: 0.372, l: 60.4 },
  { step: 400, dh: -6.0, sr: 0.428, l: 43.3 },
  { step: 500, dh: -2.6, sr: 0.868, l: 26.1 },
  { step: 600, dh: 0, sr: 1, l: 18.8 },
  { step: 700, dh: 0.3, sr: 0.973, l: 14.1 },
  { step: 800, dh: -2.0, sr: 0.966, l: 10.8 },
  { step: 900, dh: -3.0, sr: 0.973, l: 7.8 },
]

const BRAND_ANCHOR_L = 18.8
const BRAND_LIGHTEST_L = 95.1
const BRAND_DARKEST_L = 7.8

/** Measured off the original cream scale; anchored on 100. */
const SURFACE_SHAPE: ShapeStep[] = [
  { step: 50, dh: 2.6, sr: 1.235, l: 98.4 },
  { step: 100, dh: 0, sr: 1, l: 95.9 },
  { step: 200, dh: 1.0, sr: 0.795, l: 91.2 },
  { step: 300, dh: 1.6, sr: 0.721, l: 84.9 },
  { step: 400, dh: 1.1, sr: 0.659, l: 77.3 },
  { step: 500, dh: 0.3, sr: 0.621, l: 67.6 },
]

const SURFACE_ANCHOR_L = 95.9

/** How light the very top of a brand ramp goes, and how dark the very bottom. */
const RAMP_TOP_L = 97.5
const RAMP_BOTTOM_L = 5

/**
 * The two colours have jobs, and the jobs bound them.
 *
 * The surface is paper: every text colour in the app is dark, so a genuinely
 * dark pick would be unreadable — a too-dark choice keeps its hue and character
 * but is lifted into paper territory.
 *
 * The brand colour is ink: it carries white text on buttons and sits as text on
 * that paper, so a pale pick is deepened until both hold their contrast. Hue and
 * saturation are always the doctor's; only lightness is negotiated.
 */
const MIN_SURFACE_L = 88
const MAX_BRAND_L = 44

function brandLightness(shapeL: number, chosenL: number): number {
  if (shapeL >= BRAND_ANCHOR_L) {
    const t = (shapeL - BRAND_ANCHOR_L) / (BRAND_LIGHTEST_L - BRAND_ANCHOR_L)
    return chosenL + t * (RAMP_TOP_L - chosenL)
  }
  const t = (BRAND_ANCHOR_L - shapeL) / (BRAND_ANCHOR_L - BRAND_DARKEST_L)
  return chosenL - t * (chosenL - RAMP_BOTTOM_L)
}

function buildScale(
  chosen: Hsl,
  shape: ShapeStep[],
  lightness: (shapeL: number, chosenL: number) => number,
): Map<number, Hsl> {
  return new Map(
    shape.map((entry) => [
      entry.step,
      {
        h: (chosen.h + entry.dh + 360) % 360,
        s: clamp(chosen.s * entry.sr, 0, 100),
        l: clamp(lightness(entry.l, chosen.l), 0, 100),
      },
    ]),
  )
}

/* ------------------------------------------------------------------ the theme */

interface Scales {
  primary: Hsl
  surface: Hsl
  brand: Map<number, Hsl>
  paper: Map<number, Hsl>
}

function buildScales(theme: ThemeColors): Scales {
  const rawPrimary = hexToHsl(theme.primary) ?? hexToHsl(DEFAULT_THEME.primary)!
  const rawSurface = hexToHsl(theme.background) ?? hexToHsl(DEFAULT_THEME.background)!
  const primary: Hsl = { ...rawPrimary, l: Math.min(rawPrimary.l, MAX_BRAND_L) }
  const surface: Hsl = { ...rawSurface, l: Math.max(rawSurface.l, MIN_SURFACE_L) }

  return {
    primary,
    surface,
    brand: buildScale(primary, BRAND_SHAPE, brandLightness),
    // The paper scale keeps the original spacing exactly: its steps are
    // absolute offsets from the anchor rather than a stretch, so it never
    // runs to black.
    paper: buildScale(surface, SURFACE_SHAPE, (shapeL, chosenL) =>
      clamp(chosenL + (shapeL - SURFACE_ANCHOR_L), 0, 100),
    ),
  }
}

/**
 * The full set of CSS custom properties for a theme: the two scales plus every
 * semantic token derived from them. Invalid hex falls back to the default, so a
 * half-typed colour in the picker never blanks the screen.
 */
export function buildThemeVars(theme: ThemeColors): Record<string, string> {
  const { primary, surface, brand, paper } = buildScales(theme)

  const vars: Record<string, string> = {}
  for (const [step, value] of brand) vars[`--brand-${step}`] = channels(value)
  for (const [step, value] of paper) vars[`--surface-${step}`] = channels(value)

  const brandAt = (step: number) => brand.get(step)!
  const paperAt = (step: number) => paper.get(step)!

  // Semantic tokens, in the same relationships the original palette used.
  Object.assign(vars, {
    '--background': channels(paperAt(100)),
    '--foreground': channels({ h: primary.h, s: 32, l: 12 }),

    '--card': channels(paperAt(50)),
    '--card-foreground': channels({ h: primary.h, s: 32, l: 12 }),

    '--primary': channels(brandAt(600)),
    '--primary-foreground': channels(paperAt(100)),

    '--secondary': channels(paperAt(200)),
    '--secondary-foreground': channels({ h: primary.h, s: 45, l: 16 }),

    '--muted': channels({ h: surface.h, s: surface.s * 0.55, l: 92 }),
    '--muted-foreground': channels({ h: primary.h, s: 12, l: 38 }),

    '--accent': channels({ h: primary.h, s: 30, l: 90 }),
    '--accent-foreground': channels({ h: primary.h, s: 60, l: 16 }),

    '--border': channels({ h: surface.h, s: surface.s * 0.4, l: 84 }),
    '--input': channels({ h: surface.h, s: surface.s * 0.4, l: 80 }),
    '--ring': channels({ h: primary.h, s: primary.s, l: 26 }),

    // The paper texture dots and the card shadows are tinted by the theme too,
    // otherwise a purple dashboard still casts green shadows.
    '--texture-dot': channels({ h: surface.h, s: surface.s * 0.5, l: 88 }),
    '--shadow-color': channels({ h: primary.h, s: primary.s, l: 14 }),
  })

  return vars
}

/** Writes a theme onto an element (the document root, in practice). */
export function applyTheme(theme: ThemeColors, target?: HTMLElement) {
  const element = target ?? document.documentElement
  for (const [name, value] of Object.entries(buildThemeVars(theme))) {
    element.style.setProperty(name, value)
  }
}

/** What the doctor's saved columns mean when they are still empty. */
export function themeFrom(
  primary: string | null | undefined,
  background: string | null | undefined,
): ThemeColors {
  return {
    primary: primary?.trim() || DEFAULT_THEME.primary,
    background: background?.trim() || DEFAULT_THEME.background,
  }
}

export function isValidHex(value: string): boolean {
  return hexToHsl(value) !== null
}

/**
 * The same theme as flat hex, for the prescription PDF. `@react-pdf/renderer`
 * has no CSS variables to resolve, so the colours are baked in at render time.
 */
export interface PrintPalette {
  brand: string
  brandLight: string
  surface: string
  ink: string
  muted: string
  /** Hairlines: table borders, the footer rule. */
  rule: string
}

export function buildPrintPalette(theme: ThemeColors): PrintPalette {
  const { primary, brand, paper } = buildScales(theme)
  return {
    brand: hslToHex(brand.get(600)!),
    brandLight: hslToHex(brand.get(400)!),
    surface: hslToHex(paper.get(100)!),
    ink: hslToHex({ h: primary.h, s: 34, l: 12 }),
    muted: hslToHex({ h: primary.h, s: 9, l: 40 }),
    rule: hslToHex(paper.get(400)!),
  }
}

/**
 * Whether a pick will be adjusted to stay legible, so the picker can say so
 * rather than silently handing back a different colour than was chosen.
 */
export function describeAdjustment(theme: ThemeColors): string | null {
  const primary = hexToHsl(theme.primary)
  const surface = hexToHsl(theme.background)

  if (primary && primary.l > MAX_BRAND_L && surface && surface.l < MIN_SURFACE_L) {
    return 'Both colours are adjusted: the brand colour is deepened and the background lightened, so text stays readable.'
  }
  if (primary && primary.l > MAX_BRAND_L) {
    return 'This brand colour is light, so it is deepened for buttons and headings — white text on it has to stay readable.'
  }
  if (surface && surface.l < MIN_SURFACE_L) {
    return 'This background is dark, so it is lightened into a paper tint — the dashboard prints dark text on it.'
  }
  return null
}
