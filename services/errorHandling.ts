export const triggerAlert = (message: string, type: 'error' | 'success' = 'error') => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
    detail: { message, type }
  }));
};

export const triggerAnnouncement = (message: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
    detail: { message, type: 'announcement' }
  }));
};
