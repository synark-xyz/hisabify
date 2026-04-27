import { useTheme } from '@/hooks/useTheme';
import { PRESET_COLORS } from '@/lib/materialTheme';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Palette } from 'lucide-react';

export function ThemeColorPicker() {
  const { seedColor, setSeedColor } = useTheme();
  const { t } = useTranslation();

  return (
    <div className="p-4 bg-card rounded-2xl border border-border/50 space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Palette className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-bold text-foreground">{t('settings.accentColor')}</p>
          <p className="text-sm text-muted-foreground">{t('settings.accentColorDesc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 pt-1">
        {PRESET_COLORS.map((color) => {
          const isSelected = seedColor === color.hex;
          return (
            <button
              key={color.hex}
              onClick={() => setSeedColor(color.hex)}
              className="flex flex-col items-center gap-1.5 group"
              aria-label={color.name}
              aria-pressed={isSelected}
            >
              <div
                className="relative w-10 h-10 rounded-full transition-transform group-active:scale-95"
                style={{
                  backgroundColor: color.hex,
                  boxShadow: isSelected ? `0 0 0 3px ${color.hex}40, 0 0 0 5px ${color.hex}` : undefined,
                  transform: isSelected ? 'scale(1.1)' : undefined,
                }}
              >
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
                    <Check className="w-4 h-4 text-white drop-shadow" strokeWidth={3} />
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground leading-none truncate w-full text-center">
                {t(`settings.color${color.name}`, color.name)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
