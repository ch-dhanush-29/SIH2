import * as THREE from 'three';

export type ThemeMode = 'dark' | 'light';

/**
 * BURNWATCH 3D — INDIAN FLAG COLOUR SYSTEM
 *
 * Palette (exclusive — nothing outside this list):
 *   Saffron      #FF9933   primary accent (Bhagwa)
 *   Saffron dim  #CC7A29   deep saffron shade
 *   Saffron tint #FFB566   highlight tint
 *   India Green  #138808   success / healthy
 *   Green dim    #0D5C06   deep green shade
 *   Ashoka Navy  #000080   secondary accent (Chakra blue)
 *   Navy tint    #3333BB   lighter navy
 *   White        #FFFFFF   text / surface
 *   Black        #000000   background
 */

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderAccent: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
  shadow: string;
}

export interface Theme3DConfig {
  bgColor: string;
  ambientColor: string;
  ambientIntensity: number;
  dirLightColor: string;
  dirLightIntensity: number;
  fillLightColor: string;
  fillLightIntensity: number;

  // Oven architecture
  trayGrateColor: string;
  trayGrateMetalness: number;
  trayGrateRoughness: number;
  busRailColor: string;
  wallColor: string;
  cornerStrutColor: string;
  gridColorCenter: string;
  gridColorGrid: string;
  coilColor: string;
  heaterPointColor: string;
  heaterIntensity: number;
  hudPlateColor: string;
  hudTextColor: string;
  hudSubtextColor: string;
  laserScanColor: string;

  // Components
  chipNormalColor: THREE.Color;
  chipNormalEmissive: THREE.Color;
  chipNormalEmissiveIntensity: number;
  chipSuspectColor: THREE.Color;
  chipSuspectEmissive: THREE.Color;
  chipSuspectEmissiveIntensity: number;
  chipRejectColor: THREE.Color;
  chipRejectEmissive: THREE.Color;
  chipRejectEmissiveIntensity: number;
  chipEarlyRejectColor: THREE.Color;
  chipEarlyRejectEmissive: THREE.Color;
  chipEarlyRejectEmissiveIntensity: number;
  chipSelectedColor: THREE.Color;
  chipLeadPinColor: string;

  // Visual mode variants
  anomalySubduedColor: THREE.Color;
  thermalParticleColor: string;
  thermalParticleSize: number;
  laserRingColor: string;
  dataBeamNormal: string;
  dataBeamReject: string;
}

export interface ThemeChartConfig {
  gridStroke: string;
  axisStroke: string;
  tickColor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  nominalLine: string;
  driftBandFill: string;
  safetySlopeLine: string;
  datasheetLimitLine: string;
  shapPositive: string;
  shapNegative: string;
}

export const THEME_CONFIG: Record<
  ThemeMode,
  {
    tokens: ThemeColors;
    three: Theme3DConfig;
    charts: ThemeChartConfig;
  }
> = {
  /* =========================================================
     DARK THEME — Black backgrounds + Indian flag colours
  ========================================================= */
  dark: {
    tokens: {
      bgPrimary:       '#000000',
      bgSecondary:     '#0a0a0a',
      surface:         'rgba(15, 10, 5, 0.92)',
      surfaceElevated: 'rgba(22, 14, 6, 0.97)',
      textPrimary:     '#ffffff',
      textSecondary:   '#d9a96e',
      textMuted:       '#7a5c3a',
      border:          'rgba(255, 153, 51, 0.20)',
      borderAccent:    'rgba(255, 153, 51, 0.55)',
      accent:          '#FF9933',        // Saffron
      accentSoft:      'rgba(255, 153, 51, 0.14)',
      success:         '#138808',        // India Green
      warning:         '#FF9933',        // Saffron
      danger:          '#CC2200',        // Deep red-saffron
      shadow:          '0 8px 24px -2px rgba(0,0,0,0.85)',
    },
    three: {
      bgColor:           '#000000',
      ambientColor:      '#FF9933',      // Saffron warmth
      ambientIntensity:  0.35,
      dirLightColor:     '#FFE5C0',      // Warm saffron-white
      dirLightIntensity: 1.4,
      fillLightColor:    '#138808',      // India Green fill from below
      fillLightIntensity: 0.25,

      trayGrateColor:      '#0f0800',
      trayGrateMetalness:  0.92,
      trayGrateRoughness:  0.25,
      busRailColor:        '#FF9933',    // Saffron bus rails
      wallColor:           '#060300',
      cornerStrutColor:    '#0a0500',
      gridColorCenter:     '#FF9933',    // Saffron centre grid
      gridColorGrid:       '#1a0d00',
      coilColor:           '#FF6600',    // Deep saffron-orange
      heaterPointColor:    '#FF9933',
      heaterIntensity:     3.0,
      hudPlateColor:       '#000000',
      hudTextColor:        '#FF9933',    // Saffron HUD text
      hudSubtextColor:     '#138808',    // India Green HUD sub
      laserScanColor:      '#FF9933',

      // Normal chip → Ashoka Navy (cool, healthy, stable)
      chipNormalColor:             new THREE.Color('#000080'),
      chipNormalEmissive:          new THREE.Color('#000033'),
      chipNormalEmissiveIntensity: 0.4,

      // Suspect chip → Saffron warning
      chipSuspectColor:             new THREE.Color('#FF9933'),
      chipSuspectEmissive:          new THREE.Color('#7a3a00'),
      chipSuspectEmissiveIntensity: 0.7,

      // Reject chip → Deep red-saffron
      chipRejectColor:             new THREE.Color('#CC2200'),
      chipRejectEmissive:          new THREE.Color('#660000'),
      chipRejectEmissiveIntensity: 0.9,

      // Early-reject chip → Vivid saffron-orange
      chipEarlyRejectColor:             new THREE.Color('#FF6600'),
      chipEarlyRejectEmissive:          new THREE.Color('#7a2200'),
      chipEarlyRejectEmissiveIntensity: 0.85,

      chipSelectedColor:  new THREE.Color('#FFFFFF'),
      chipLeadPinColor:   '#ccaa77',

      anomalySubduedColor:  new THREE.Color('#1a0d00'),
      thermalParticleColor: '#FF9933',
      thermalParticleSize:  0.35,
      laserRingColor:       '#FF9933',
      dataBeamNormal:       '#000080',   // Ashoka Navy data beam
      dataBeamReject:       '#CC2200',
    },
    charts: {
      gridStroke:         '#1a0d00',
      axisStroke:         '#4d2600',
      tickColor:          '#7a5c3a',
      tooltipBg:          '#0a0500',
      tooltipBorder:      'rgba(255, 153, 51, 0.40)',
      tooltipText:        '#ffffff',
      nominalLine:        '#000080',     // Ashoka Navy nominal line
      driftBandFill:      'rgba(0, 0, 128, 0.15)',
      safetySlopeLine:    '#FF9933',     // Saffron safety slope
      datasheetLimitLine: '#CC2200',
      shapPositive:       '#CC2200',
      shapNegative:       '#138808',     // India Green (good SHAP)
    },
  },

  /* =========================================================
     LIGHT THEME — Warm parchment + Indian flag colours
  ========================================================= */
  light: {
    tokens: {
      bgPrimary:       '#fff8f0',
      bgSecondary:     '#ffeedd',
      surface:         'rgba(255, 255, 255, 0.95)',
      surfaceElevated: 'rgba(255, 252, 245, 0.99)',
      textPrimary:     '#1a0d00',
      textSecondary:   '#7a3d00',
      textMuted:       '#a05a20',
      border:          'rgba(255, 153, 51, 0.22)',
      borderAccent:    'rgba(255, 153, 51, 0.55)',
      accent:          '#CC6600',        // Deep saffron for light mode
      accentSoft:      'rgba(204, 102, 0, 0.12)',
      success:         '#0d5c06',        // Deep India Green
      warning:         '#CC6600',
      danger:          '#AA1100',
      shadow:          '0 4px 16px -2px rgba(80,30,0,0.10)',
    },
    three: {
      bgColor:           '#fff8f0',
      ambientColor:      '#FFFFFF',
      ambientIntensity:  0.95,
      dirLightColor:     '#FFF5E0',
      dirLightIntensity: 1.3,
      fillLightColor:    '#0d5c06',
      fillLightIntensity: 0.5,

      trayGrateColor:      '#e8d4b8',
      trayGrateMetalness:  0.55,
      trayGrateRoughness:  0.45,
      busRailColor:        '#CC6600',
      wallColor:           '#f0e0c8',
      cornerStrutColor:    '#d4c0a0',
      gridColorCenter:     '#CC6600',
      gridColorGrid:       '#cc9966',
      coilColor:           '#CC6600',
      heaterPointColor:    '#FF9933',
      heaterIntensity:     2.2,
      hudPlateColor:       '#1a0d00',
      hudTextColor:        '#CC6600',
      hudSubtextColor:     '#0d5c06',
      laserScanColor:      '#CC6600',

      chipNormalColor:             new THREE.Color('#000080'),
      chipNormalEmissive:          new THREE.Color('#00003a'),
      chipNormalEmissiveIntensity: 0.2,

      chipSuspectColor:             new THREE.Color('#CC6600'),
      chipSuspectEmissive:          new THREE.Color('#663300'),
      chipSuspectEmissiveIntensity: 0.4,

      chipRejectColor:             new THREE.Color('#AA1100'),
      chipRejectEmissive:          new THREE.Color('#550000'),
      chipRejectEmissiveIntensity: 0.5,

      chipEarlyRejectColor:             new THREE.Color('#FF6600'),
      chipEarlyRejectEmissive:          new THREE.Color('#662200'),
      chipEarlyRejectEmissiveIntensity: 0.45,

      chipSelectedColor: new THREE.Color('#1a0d00'),
      chipLeadPinColor:  '#7a5c3a',

      anomalySubduedColor:  new THREE.Color('#f0dfc0'),
      thermalParticleColor: '#CC6600',
      thermalParticleSize:  0.28,
      laserRingColor:       '#CC6600',
      dataBeamNormal:       '#000080',
      dataBeamReject:       '#AA1100',
    },
    charts: {
      gridStroke:         '#f0d8b0',
      axisStroke:         '#cc9966',
      tickColor:          '#7a5c3a',
      tooltipBg:          '#ffffff',
      tooltipBorder:      'rgba(204, 102, 0, 0.45)',
      tooltipText:        '#1a0d00',
      nominalLine:        '#000080',
      driftBandFill:      'rgba(0, 0, 128, 0.10)',
      safetySlopeLine:    '#CC6600',
      datasheetLimitLine: '#AA1100',
      shapPositive:       '#AA1100',
      shapNegative:       '#0d5c06',
    },
  },
};

export const getThemeConfig = (theme: ThemeMode) => THEME_CONFIG[theme];
