
import { useUser } from '../contexts/UserContext';
import { logTasteEvent } from '../services/tasteLogger';
import { TasteEvent, TasteProfile, ToneTag } from '../types';

export const useTasteLogging = () => {
  const { user, profile } = useUser();
  
  const logEvent = async (
    event_type: 'view' | 'tweak' | 'save' | 'scry',
    input_context: {
      raw_text: string;
      selected_tone?: string;
      selected_archetype?: string;
      user_intent?: string;
    },
    output_context: {
      zineId?: string;
      generated_archetype?: string;
      colors?: string[];
      scry_insights?: any;
      taste_snapshot?: TasteProfile;
    }
  ) => {
    if (!user?.uid) return;
    
    // Ensure we capture the profile state at the moment of the event
    // If output_context provides a snapshot, use it; otherwise use current profile state
    const taste_snapshot = output_context.taste_snapshot || profile?.tasteProfile;

    const event: TasteEvent = {
      userId: user.uid,
      event_type,
      input_context,
      output_context: {
        ...output_context,
        taste_snapshot // Explicitly include the snapshot
      },
      timestamp: Date.now(),
      sessionId: typeof window !== 'undefined' ? sessionStorage.getItem('mimi_session_id') || 'unknown' : 'unknown'
    };
    
    try {
      // 1. Fire and forget logging (handled by service)
      await logTasteEvent(event);
      
      // 2. Emit for local UI reactivity (e.g. flash messages, Drift listeners)
      window.dispatchEvent(new CustomEvent('mimi:taste_logged', { detail: event }));
      
    } catch (error) {
      console.warn('MIMI // Nervous System Glitch:', error);
      // Fail silently to preserve user flow
    }
  };
  
  return { logEvent };
};
