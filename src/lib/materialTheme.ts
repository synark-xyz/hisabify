import { argbFromHex, themeFromSourceColor } from '@material/material-color-utilities';

export interface PresetColor {
  name: string;
  hex: string;
}

export const PRESET_COLORS: PresetColor[] = [
  { name: 'Violet', hex: '#6750A4' },
  { name: 'Blue', hex: '#1565C0' },
  { name: 'Teal', hex: '#00695C' },
  { name: 'Green', hex: '#2E7D32' },
  { name: 'Red', hex: '#C62828' },
  { name: 'Orange', hex: '#E65100' },
  { name: 'Pink', hex: '#AD1457' },
  { name: 'Indigo', hex: '#283593' },
  { name: 'Brown', hex: '#4E342E' },
  { name: 'Cyan', hex: '#00838F' },
];

export const DEFAULT_SEED = '#6750A4';

function argbToHsl(argb: number): string {
  const r = ((argb >> 16) & 0xff) / 255;
  const g = ((argb >> 8) & 0xff) / 255;
  const b = (argb & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function injectM3Theme(seedHex: string, isDark: boolean): void {
  const argb = argbFromHex(seedHex);
  const { schemes, palettes } = themeFromSourceColor(argb);
  const scheme = isDark ? schemes.dark : schemes.light;
  const root = document.documentElement;

  root.style.setProperty('--primary', argbToHsl(scheme.primary));
  root.style.setProperty('--primary-foreground', argbToHsl(scheme.onPrimary));
  root.style.setProperty('--secondary', argbToHsl(scheme.secondaryContainer));
  root.style.setProperty('--secondary-foreground', argbToHsl(scheme.onSecondaryContainer));
  // Use vivid primary-palette tone so --accent always matches the user's chosen seed hue
  root.style.setProperty('--accent', argbToHsl(palettes.primary.tone(isDark ? 70 : 45)));
  root.style.setProperty('--accent-foreground', argbToHsl(scheme.onPrimary));
  root.style.setProperty('--muted', argbToHsl(scheme.surfaceVariant));
  root.style.setProperty('--muted-foreground', argbToHsl(scheme.onSurfaceVariant));
  root.style.setProperty('--border', argbToHsl(scheme.outlineVariant));
  root.style.setProperty('--input', argbToHsl(scheme.outlineVariant));
  root.style.setProperty('--ring', argbToHsl(scheme.primary));

  // Tonal palette chart colors — spread across perceptually distinct tones
  const pt = palettes.primary;
  const st = palettes.secondary;
  const tt = palettes.tertiary;
  root.style.setProperty('--chart-1', argbToHsl(pt.tone(isDark ? 70 : 40)));
  root.style.setProperty('--chart-2', argbToHsl(st.tone(isDark ? 70 : 40)));
  root.style.setProperty('--chart-3', argbToHsl(tt.tone(isDark ? 70 : 40)));
  root.style.setProperty('--chart-4', argbToHsl(pt.tone(isDark ? 50 : 60)));
  root.style.setProperty('--chart-5', argbToHsl(st.tone(isDark ? 50 : 60)));

  // Card gradient vars — adapt to seed hue
  root.style.setProperty('--card-purple', argbToHsl(pt.tone(isDark ? 60 : 45)));
  root.style.setProperty('--card-purple-light', argbToHsl(pt.tone(isDark ? 70 : 55)));
  root.style.setProperty('--card-green', argbToHsl(st.tone(isDark ? 60 : 45)));
  root.style.setProperty('--card-green-light', argbToHsl(st.tone(isDark ? 70 : 55)));
}
