import * as THREE from 'three';

export type ThemeMode = 'dark' | 'light';

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
  dark: {
    tokens: {
      bgPrimary: '#04060A',
      bgSecondary: '#08111D',
      surface: 'rgba(8, 17, 29, 0.82)',
      surfaceElevated: 'rgba(13, 23, 36, 0.92)',
      textPrimary: '#F1F5F9',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      border: 'rgba(0, 240, 255, 0.16)',
      borderAccent: 'rgba(0, 240, 255, 0.45)',
      accent: '#00F0FF',
      accentSoft: 'rgba(0, 240, 255, 0.15)',
      success: '#00FF88',
      warning: '#FFAA00',
      danger: '#FF3366',
      shadow: '0 12px 32px -4px rgba(0, 0, 0, 0.75)',
    },
    three: {
      bgColor: '#04060A',
      ambientColor: '#CCE6FF',
      ambientIntensity: 0.5,
      dirLightColor: '#E0F2FE',
      dirLightIntensity: 1.5,
      fillLightColor: '#FFEDD5',
      fillLightIntensity: 0.4,

      trayGrateColor: '#0C0F17',
      trayGrateMetalness: 0.92,
      trayGrateRoughness: 0.25,
      busRailColor: '#D4AF37',
      wallColor: '#07090E',
      cornerStrutColor: '#0A0D14',
      gridColorCenter: '#00F0FF',
      gridColorGrid: '#1E293B',
      coilColor: '#FF4400',
      heaterPointColor: '#FF7700',
      heaterIntensity: 3.2,
      hudPlateColor: '#020305',
      hudTextColor: '#FFAA00',
      hudSubtextColor: '#00F0FF',
      laserScanColor: '#00F0FF',

      chipNormalColor: new THREE.Color('#00F0FF'),
      chipNormalEmissive: new THREE.Color('#003B46'),
      chipNormalEmissiveIntensity: 0.25,

      chipSuspectColor: new THREE.Color('#FFAA00'),
      chipSuspectEmissive: new THREE.Color('#7A4500'),
      chipSuspectEmissiveIntensity: 0.65,

      chipRejectColor: new THREE.Color('#FF3366'),
      chipRejectEmissive: new THREE.Color('#800020'),
      chipRejectEmissiveIntensity: 0.85,

      chipEarlyRejectColor: new THREE.Color('#FF00AA'),
      chipEarlyRejectEmissive: new THREE.Color('#7A004C'),
      chipEarlyRejectEmissiveIntensity: 0.85,

      chipSelectedColor: new THREE.Color('#FFFFFF'),
      chipLeadPinColor: '#D1D5DB',

      anomalySubduedColor: new THREE.Color('#151B28'),
      thermalParticleColor: '#FF6600',
      thermalParticleSize: 0.35,
      laserRingColor: '#00F0FF',
      dataBeamNormal: '#00F0FF',
      dataBeamReject: '#FF3366',
    },
    charts: {
      gridStroke: '#1E293B',
      axisStroke: '#475569',
      tickColor: '#94A3B8',
      tooltipBg: '#090D16',
      tooltipBorder: 'rgba(0, 240, 255, 0.35)',
      tooltipText: '#F1F5F9',
      nominalLine: '#00F0FF',
      driftBandFill: 'rgba(0, 240, 255, 0.15)',
      safetySlopeLine: '#FFAA00',
      datasheetLimitLine: '#FF3366',
      shapPositive: '#FF3366',
      shapNegative: '#00FF88',
    },
  },
  light: {
    tokens: {
      bgPrimary: '#F4F7FA',
      bgSecondary: '#EAF0F5',
      surface: 'rgba(255, 255, 255, 0.88)',
      surfaceElevated: 'rgba(248, 250, 252, 0.96)',
      textPrimary: '#0B132B',
      textSecondary: '#334155',
      textMuted: '#64748B',
      border: 'rgba(2, 132, 199, 0.22)',
      borderAccent: 'rgba(2, 132, 199, 0.55)',
      accent: '#0284C7',
      accentSoft: 'rgba(2, 132, 199, 0.12)',
      success: '#059669',
      warning: '#D97706',
      danger: '#E11D48',
      shadow: '0 12px 28px -4px rgba(11, 19, 43, 0.08)',
    },
    three: {
      bgColor: '#EAF0F5',
      ambientColor: '#FFFFFF',
      ambientIntensity: 0.95,
      dirLightColor: '#F8FAFC',
      dirLightIntensity: 1.35,
      fillLightColor: '#E2E8F0',
      fillLightIntensity: 0.6,

      trayGrateColor: '#D8E2EC',
      trayGrateMetalness: 0.65,
      trayGrateRoughness: 0.4,
      busRailColor: '#C59B27',
      wallColor: '#E2E8F0',
      cornerStrutColor: '#CBD5E1',
      gridColorCenter: '#0284C7',
      gridColorGrid: '#94A3B8',
      coilColor: '#D97706',
      heaterPointColor: '#F59E0B',
      heaterIntensity: 2.4,
      hudPlateColor: '#0F172A',
      hudTextColor: '#F59E0B',
      hudSubtextColor: '#38BDF8',
      laserScanColor: '#0284C7',

      chipNormalColor: new THREE.Color('#0284C7'), // Deep technical cobalt blue for high contrast
      chipNormalEmissive: new THREE.Color('#013B59'),
      chipNormalEmissiveIntensity: 0.15,

      chipSuspectColor: new THREE.Color('#D97706'),
      chipSuspectEmissive: new THREE.Color('#663700'),
      chipSuspectEmissiveIntensity: 0.35,

      chipRejectColor: new THREE.Color('#E11D48'),
      chipRejectEmissive: new THREE.Color('#6E0017'),
      chipRejectEmissiveIntensity: 0.45,

      chipEarlyRejectColor: new THREE.Color('#C026D3'),
      chipEarlyRejectEmissive: new THREE.Color('#5E0066'),
      chipEarlyRejectEmissiveIntensity: 0.45,

      chipSelectedColor: new THREE.Color('#0F172A'), // Dark contrast chip when selected in light theme
      chipLeadPinColor: '#64748B',

      anomalySubduedColor: new THREE.Color('#CBD5E1'),
      thermalParticleColor: '#D97706',
      thermalParticleSize: 0.28,
      laserRingColor: '#0284C7',
      dataBeamNormal: '#0284C7',
      dataBeamReject: '#E11D48',
    },
    charts: {
      gridStroke: '#E2E8F0',
      axisStroke: '#94A3B8',
      tickColor: '#475569',
      tooltipBg: '#FFFFFF',
      tooltipBorder: 'rgba(2, 132, 199, 0.4)',
      tooltipText: '#0B132B',
      nominalLine: '#0284C7',
      driftBandFill: 'rgba(2, 132, 199, 0.12)',
      safetySlopeLine: '#D97706',
      datasheetLimitLine: '#E11D48',
      shapPositive: '#E11D48',
      shapNegative: '#059669',
    },
  },
};

export const getThemeConfig = (theme: ThemeMode) => THEME_CONFIG[theme];
