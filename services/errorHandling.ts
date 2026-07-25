export const triggerAlert = (message: string, type: 'error' | 'success' = 'error') => {
  window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
    detail: { message, type }
  }));
};

export const triggerAnnouncement = (message: string) => {
  window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
    detail: { message, type: 'announcement' }
  }));
};
