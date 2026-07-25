
import { useState, useRef, useCallback } from 'react';

interface UseRecorderReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  duration: number;
  permissionError: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
}

export const useRecorder = (): UseRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    setPermissionError(null);
    try {
      // Check for API support first
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("ENVIRONMENT_INCOMPATIBLE");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        setAudioBlob(finalBlob);
        setDuration((Date.now() - startTimeRef.current) / 1000);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setAudioBlob(null);
    } catch (err: any) {
      // Distinguish between system errors and permission denials for cleaner logging
      const isPermissionDenied = 
        err.name === 'NotAllowedError' || 
        err.name === 'PermissionDeniedError' || 
        err.message?.toLowerCase().includes('permission denied');

      if (isPermissionDenied) {
        console.warn("MIMI // Mic Access: Permission Denied by User/Policy.");
      } else {
        console.warn("MIMI // Mic Access Failure:", err.name, err.message);
      }

      let msg = "Audio input initialization failed.";
      if (isPermissionDenied) {
        msg = "Microphone access denied. Enable permissions in browser settings.";
      } else if (err.name === 'NotFoundError' || err.message === 'ENVIRONMENT_INCOMPATIBLE' || (err.message && err.message.includes('Requested device not found'))) {
        msg = "No compatible microphone detected on this frequency.";
      } else if (err.name === 'NotReadableError') {
        msg = "Microphone is busy or obstructed by another application.";
      }
      
      setPermissionError(msg);
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
          detail: { message: msg, type: 'error' } 
      }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setIsRecording(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  return {
    isRecording,
    audioBlob,
    duration,
    permissionError,
    startRecording,
    stopRecording,
    resetRecording
  };
};
