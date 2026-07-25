export const reportSystemAnomaly = (error: any, silent: boolean = false) => {
  console.error("MIMI // System Anomaly:", error);
  if (!silent) {
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: error.message || "System Anomaly Detected.", type: 'error' } 
    }));
  }
};
