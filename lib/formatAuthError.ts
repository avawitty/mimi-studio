const AUTH_DOMAIN_HINT =
  "Add this site in Firebase Console → Authentication → Settings → Authorized domains (e.g. mimi.you, mimi.rip, mimi.fish, avainlife.com, and your Vercel *.vercel.app preview URL).";

export const formatAuthError = (codeOrMessage?: string | null): string => {
  if (!codeOrMessage) return "Authentication failed. Please try again.";

  const raw = String(codeOrMessage).trim();
  const authCodeMatch = raw.match(/auth\/[a-z0-9-]+/i);
  const code = authCodeMatch ? authCodeMatch[0] : raw;

  switch (code) {
    case "auth/unauthorized-domain":
      return `This domain is not authorized for sign-in. ${AUTH_DOMAIN_HINT}`;
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled. Please try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site or use email/password sign-in.";
    case "auth/cancelled-popup-request":
      return "Another sign-in window is already open. Close it and try again.";
    case "auth/network-request-failed":
      return "Network error during sign-in. Check your connection and try again.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/user-not-found":
      return "No account found for this email. Create one or check the address.";
    case "auth/email-already-in-use":
      return "This email is already registered. Sign in instead.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment, then try again.";
    case "auth/internal-error":
      return "Sign-in handshake failed. If you are in an embedded view, open the app in a full browser tab or use email/password.";
    default:
      if (raw.includes("Identity Anchor Failed") || raw.includes("third-party cookies")) {
        return raw;
      }
      if (raw.includes("Registry Connection Timeout")) {
        return "Could not reach the identity registry. You can continue as guest or retry sign-in.";
      }
      return raw.length > 160 ? "Authentication failed. Please try again." : raw;
  }
};
