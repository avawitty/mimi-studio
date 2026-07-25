import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { UserProfile } from '../types';
import { AestheticReferenceCard } from '../components/AestheticReferenceCard';

export const generateAestheticReferenceCardBase64 = async (profile: UserProfile): Promise<string | null> => {
  if (!profile.tailorDraft?.expressionEngine) return null;

  return new Promise((resolve) => {
    // Create a hidden container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '800px';
    container.style.height = '800px';
    document.body.appendChild(container);

    const root = createRoot(container);
    
    // We need a ref to pass to html2canvas
    const ref = React.createRef<HTMLDivElement>();

    root.render(<AestheticReferenceCard profile={profile} ref={ref} />);

    // Wait for render and fonts to load
    setTimeout(async () => {
      try {
        if (ref.current) {
          const canvas = await html2canvas(ref.current, {
            scale: 1, // 800x800 is enough
            useCORS: true,
            backgroundColor: '#ffffff'
          });
          
          const base64 = canvas.toDataURL('image/png').split(',')[1]; // Return just the base64 part
          resolve(base64);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Failed to generate aesthetic reference card:', error);
        resolve(null);
      } finally {
        // Cleanup
        root.unmount();
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }
    }, 500); // Give it a moment to render
  });
};
