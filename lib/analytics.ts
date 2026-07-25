/** Lightweight product funnel events — console + optional Firebase Analytics. */
import { logEvent } from "firebase/analytics";
import { analytics } from "../services/firebaseInit";
import { isAnalyticsAllowed } from "./cookieConsent";

export const trackMimiEvent = (
  name: string,
  params?: Record<string, string | number | boolean>,
) => {
  if (typeof console !== "undefined") {
    console.info(`MIMI // event:${name}`, params || {});
  }
  if (analytics && isAnalyticsAllowed()) {
    logEvent(analytics, name, params);
  }
};

export const trackTailorScryStarted = (imageCount: number) =>
  trackMimiEvent("tailor_scry_started", { image_count: imageCount });

export const trackTailorScryCompleted = (referenceCount: number) =>
  trackMimiEvent("tailor_scry_completed", { reference_count: referenceCount });

export const trackLikenessAccepted = () => trackMimiEvent("likeness_accepted");
