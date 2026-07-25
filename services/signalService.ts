import { TasteEvent } from "../types";
import { logTasteEvent } from "./tasteLogger";

export const trackSignal = async (userId: string, signal: { 
  type: 'view' | 'save' | 'export', 
  zineId: string, 
  timestamp: number, 
  context: string 
}) => {
  const event: TasteEvent = {
    userId,
    event_type: signal.type === 'view' ? 'tweak' : 'save',
    input_context: {
      raw_text: '', // Anonymous context for aggregate view tracking
    },
    output_context: {
      zineId: signal.zineId,
      layout_type: signal.context
    },
    timestamp: signal.timestamp
  };
  return logTasteEvent(event);
};