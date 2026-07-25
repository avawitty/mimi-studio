export const t = (key: string, params?: Record<string, string | number>): string => {
  const strings: Record<string, string> = {
    'app.offline': 'You are currently offline. Some features may be unavailable.',
    'app.online': 'Connection restored.',
    'app.loading': 'Initializing...',
    'auth.signIn': 'Sign In',
    'auth.joinWaitlist': 'Join Waitlist',
    'auth.email': 'Email Address',
    'auth.password': 'Password',
    'auth.fastAccess': 'Fast Access via Google',
    'auth.continueEmail': 'Continue with Email',
    'auth.privacyPromise': 'We will never sell your data or train public models on your private archives.',
    'nav.studio': 'Work Table',
    'nav.thimble': 'The Thimble',
    'nav.loom': 'The Loom',
    'nav.actionBoard': 'Action Board',
    'nav.tailor': 'Tailor Tools',
    'nav.dossier': 'Presets',
    'nav.signature': 'Dashboard',
    'nav.ward': 'The Ward',
    'nav.profile': 'Profile',
    'nav.archival': 'Library',
    'nav.lens': 'The Lens',
    'nav.darkroom': 'Darkroom',
    'nav.threads': 'Narrative Pathing',
    'nav.scry': 'Trace & Scry',
    'nav.latent': 'Latent Constellation',
    'nav.nebula': 'Resonance Feed',
    'nav.press': 'The Edit',
    'nav.proscenium': 'Proscenium',
    'nav.help': 'Codex',
    'nav.membership': 'Membership',
    'action.save': 'Save',
    'action.discuss': 'Discuss',
    'action.cancel': 'Cancel',
    'action.confirm': 'Confirm',
    'action.delete': 'Delete',
    'action.report': 'Report',
    'action.extract': 'Extract Artifact',
    'action.notes': 'Field Notes',
    'status.resonance': 'Resonance',
    'empty.comments': 'The discourse is silent. Be the first to refract.',
    'empty.dossier': 'No artifacts found.',
    'error.auth': 'Authentication failed.',
    'error.general': 'An unexpected error occurred.',
  };

  let str = strings[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(`{{${k}}}`, String(v));
    });
  }
  return str;
};
