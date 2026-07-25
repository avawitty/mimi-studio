
import { useMemo } from 'react';

export type FeatureKey = 'studio' | 'scry' | 'darkroom' | 'the-lens' | 'archival';

interface FeatureConfig {
  active: boolean;
  window: string | null; // e.g. "18:00-21:00"
  message: string;
}

const AVAILABILITY_MAP: Record<FeatureKey, FeatureConfig> = {
  studio: { active: true, window: null, message: "Studio access is consistent." },
  scry: { active: true, window: "18:00-02:00", message: "Trajectory scrying requires evening scotopic light." },
  darkroom: { active: true, window: null, message: "Darkroom is permanently active." },
  'the-lens': { active: true, window: "20:00-05:00", message: "The Lens opens during mesopic hours." },
  archival: { active: true, window: null, message: "Registry is always accessible." }
};

export const useAvailability = (key: FeatureKey) => {
  const config = AVAILABILITY_MAP[key];
  
  return useMemo(() => {
    if (!config.active) return { isAvailable: false, reason: "Temporarily offline to preserve quality." };
    if (!config.window) return { isAvailable: true, reason: null };

    const now = new Date();
    const [start, end] = config.window.split('-').map(t => {
      const [h, m] = t.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0);
      return d;
    });

    const isAvailable = now >= start || now <= end; // Handles overnight windows
    
    return {
      isAvailable,
      reason: isAvailable ? null : config.message,
      nextWindow: config.window
    };
  }, [key]);
};
