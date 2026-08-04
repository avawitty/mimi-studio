// @ts-nocheck
import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit, deleteDoc, addDoc, updateDoc, arrayUnion, increment, onSnapshot, enableNetwork } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, sendPasswordResetEmail, linkWithPopup, linkWithRedirect, signInAnonymously, ActionCodeSettings, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth, db, storage } from "./firebaseInit";
import { devLog } from "../lib/devLog";

export const isFullyAuthenticated = () => {
  devLog.info("MIMI // isFullyAuthenticated check:", auth.currentUser ? "(authenticated)" : "null", auth.currentUser ? "isAnonymous: " + auth.currentUser.isAnonymous : "");
  return !!auth.currentUser;
};

import { ZineContent, ZineMetadata, ToneTag, PocketItem, UserProfile, DossierFolder, DossierArtifact, Treatment, UserPreferences, MediaFile, Proposal, ContextEntry, LineageEntry, UsedContextSnapshot } from "../types";
import { stampZineArtifactMetadata } from "../lib/zine/stampZineArtifactMetadata";
import { saveZineLocally, savePocketItemLocally, getLocalProfile, getLocalPocket, getLocalZines, deleteLocalPocketItem, saveFolderLocally, getLocalFolders, saveArtifactLocally, getLocalArtifacts } from "./localArchive";
import { syncToShadowMemory, deleteFromShadowMemory } from "./vectorSearch";
import { StrategyAudit, Task } from "../types";

export const saveStrategyAudit = async (userId: string, audit: StrategyAudit): Promise<void> => {
  if (!isFullyAuthenticated()) {
    console.warn("MIMI // Cannot save strategy audit: User not fully authenticated. Saving to local storage only.");
    const localAudits = JSON.parse(localStorage.getItem(`mimi_audits_${userId}`) || '[]');
    localAudits.push(audit);
    localStorage.setItem(`mimi_audits_${userId}`, JSON.stringify(localAudits));
    return;
  }
  try {
    const auditRef = doc(db, `users/${userId}/reads`, audit.id);
    await setDoc(auditRef, audit);
    console.log("MIMI // Strategy audit saved to Firebase.");
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}/reads/${audit.id}`);
  }
};

export const fetchStrategyAudits = async (userId: string): Promise<StrategyAudit[]> => {
  if (!isFullyAuthenticated()) {
    return JSON.parse(localStorage.getItem(`mimi_audits_${userId}`) || '[]');
  }
  try {
    const q = query(collection(db, `users/${userId}/reads`), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as StrategyAudit);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/reads`);
    return [];
  }
};

export const saveTask = async (userId: string, task: Task): Promise<void> => {
  if (!isFullyAuthenticated()) {
    console.warn("MIMI // Cannot save task: User not fully authenticated. Saving to local storage only.");
    const localTasks = JSON.parse(localStorage.getItem(`mimi_tasks_${userId}`) || '[]');
    localTasks.push(task);
    localStorage.setItem(`mimi_tasks_${userId}`, JSON.stringify(localTasks));
    return;
  }
  try {
    const taskRef = doc(db, `users/${userId}/tasks`, task.id);
    await setDoc(taskRef, task);
    console.log("MIMI // Task saved to Firebase.");
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}/tasks/${task.id}`);
  }
};

export const fetchTasks = async (userId: string): Promise<Task[]> => {
  if (!isFullyAuthenticated()) {
    return JSON.parse(localStorage.getItem(`mimi_tasks_${userId}`) || '[]');
  }
  try {
    const q = query(collection(db, `users/${userId}/tasks`), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Task);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/tasks`);
    return [];
  }
};

export const updateTask = async (userId: string, taskId: string, updates: Partial<Task>): Promise<void> => {
  if (!isFullyAuthenticated()) {
    const localTasks = JSON.parse(localStorage.getItem(`mimi_tasks_${userId}`) || '[]');
    const updatedTasks = localTasks.map((t: Task) => t.id === taskId ? { ...t, ...updates } : t);
    localStorage.setItem(`mimi_tasks_${userId}`, JSON.stringify(updatedTasks));
    return;
  }
  try {
    const taskRef = doc(db, `users/${userId}/tasks`, taskId);
    await updateDoc(taskRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/tasks/${taskId}`);
  }
};

export const deleteTask = async (userId: string, taskId: string): Promise<void> => {
  if (!isFullyAuthenticated()) {
    const localTasks = JSON.parse(localStorage.getItem(`mimi_tasks_${userId}`) || '[]');
    const updatedTasks = localTasks.filter((t: Task) => t.id !== taskId);
    localStorage.setItem(`mimi_tasks_${userId}`, JSON.stringify(updatedTasks));
    return;
  }
  try {
    const taskRef = doc(db, `users/${userId}/tasks`, taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/tasks/${taskId}`);
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Check for database not found or offline errors
  if (errorMessage.includes('not-found') && errorMessage.includes('Database') || errorMessage.includes('does not exist in project') || errorMessage.includes('dunning') || errorMessage.includes('403') || errorMessage.includes('invalid-credential') || errorMessage.includes('permission-denied')) {
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: {
        type: 'error',
        message: 'Database connection failed. Please check your Firebase configuration or project ID. Falling back to local cache where possible.'
      }
    }));
  } else if (errorMessage.includes('offline') || errorMessage.includes('Failed to get document because the client is offline')) {
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: {
        type: 'error',
        message: 'Network disconnected. Operating in offline mode.'
      }
    }));
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId || undefined,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Suppress throwing for api-key-expired to avoid crashing the app
  if (errorMessage.includes('api-key-expired')) {
      console.warn("MIMI // Firebase API Key Expired. Operating in degraded mode.");
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
          detail: {
              type: 'error',
              message: 'Firebase API Key Expired. Please review your firebase-applet-config.json.'
          }
      }));
      return;
  }
  
  throw new Error(JSON.stringify(errInfo));
}

export function logFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Suppress JSON logging for offline errors to prevent false alarms
  if (errorMessage.includes('offline') || errorMessage.includes('Failed to get document because the client is offline')) {
    console.warn(`MIMI // Firestore Offline: [${operationType}] at ${path}`);
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: {
        type: 'error',
        message: 'Network disconnected. Operating in offline mode.'
      }
    }));
    return; // Exit early, don't log the full JSON error
  }

  console.error(`MIMI // Firestore Error: [${operationType}] at ${path}:`, errorMessage);

  // Check for database not found errors
  if (errorMessage.includes('not-found') && errorMessage.includes('Database') || errorMessage.includes('does not exist in project') || errorMessage.includes('dunning') || errorMessage.includes('403') || errorMessage.includes('invalid-credential') || errorMessage.includes('permission-denied')) {
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: {
        type: 'error',
        message: 'Database connection failed. Please check your Firebase configuration or project ID. Falling back to local cache where possible.'
      }
    }));
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId || undefined,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export const sanitizeFirestoreData = (data: any): any => {
  if (data === undefined) return null;
  if (data === null) return null;
  if (data instanceof Date) return data;
  if (typeof data === 'function') return null; // Strip functions
  if (Array.isArray(data)) return data.map(sanitizeFirestoreData);
  if (typeof data === 'object') {
    // Check if it's a plain object or a custom class instance
    if (Object.getPrototypeOf(data) !== Object.prototype && Object.getPrototypeOf(data) !== null) {
        // If it's a custom class, try to convert it to a plain object or stringify it
        try {
            return JSON.parse(JSON.stringify(data));
        } catch (e) {
            return null; // Fallback if it can't be stringified
        }
    }

    const sanitized: any = {};
    for (const key in data) {
      if (data[key] !== undefined && typeof data[key] !== 'function') {
        sanitized[key] = sanitizeFirestoreData(data[key]);
      }
    }
    return sanitized;
  }
  return data;
};

export const isCaptiveInWebview = () => {
  if (typeof window === 'undefined' || !navigator) return false;
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
  const isSocial = /instagram|fb_iab|fban|fbav|tiktok|threads|wv|webview/i.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return isSocial && !isStandalone;
};

export const fetchAllPublicProfiles = async (): Promise<UserProfile[]> => {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    const q = query(collection(db, "profiles_public"), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, "profiles_public");
    return [];
  }
};

export const searchUsers = async (searchTerm: string): Promise<UserProfile[]> => {
  if (!searchTerm || searchTerm.length < 2) return [];
  const q = query(
    collection(db, "profiles_public"),
    where("handle", ">=", searchTerm.toLowerCase()),
    where("handle", "<=", searchTerm.toLowerCase() + "\uf8ff"),
    limit(10)
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserProfile);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, "profiles");
    return [];
  }
};

export const createStack = async (uid: string, title: string, description: string) => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) return '';
  const id = `stack_${Date.now()}`;
  const stack: Stack = { id, userId: uid, title, description, fragmentIds: [], createdAt: Date.now() };
  try {
    await setDoc(doc(db, "stacks", id), sanitizeFirestoreData(stack));
  } catch (e) {
    console.error("MIMI // createStack error:", e);
  }
  return id;
};

export const addFragmentToStack = async (stackId: string, fragmentId: string) => {
  try {
    await updateDoc(doc(db, "stacks", stackId), {
      fragmentIds: arrayUnion(fragmentId)
    });
    await updateDoc(doc(db, "dossier_artifacts", fragmentId), {
      stackIds: arrayUnion(stackId)
    });
  } catch (e) {
    console.error("MIMI // addFragmentToStack error:", e);
  }
};

export const getStacks = async (uid: string) => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) return [];
  const q = query(collection(db, "stacks"), where("userId", "==", uid));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Stack);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, "stacks");
    return [];
  }
};


import { createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail, EmailAuthProvider, linkWithCredential, signInWithCredential } from "firebase/auth";
import { writeBatch, doc } from "firebase/firestore";

export const signUpWithEmailPassword = async (email: string, password: string) => {
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.warn("MIMI // Email already in use, signing in instead.");
      return await signInWithEmailAndPassword(auth, email, password);
    }
    console.error("MIMI // Sign Up with Email/Password Failed:", error);
    throw error;
  }
};

export const signInWithEmailPassword = async (email: string, password: string) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    console.error("MIMI // Sign In with Email/Password Failed:", error);
    throw error;
  }
};

export const upgradeAnonymousWithEmail = async (email: string, password: string): Promise<User> => {
  if (!auth.currentUser || !auth.currentUser.isAnonymous) {
    throw new Error('No anonymous user to upgrade.');
  }
  const credential = EmailAuthProvider.credential(email, password);
  try {
    const userCred = await linkWithCredential(auth.currentUser, credential);
    return userCred.user;
  } catch (err: any) {
    if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
        console.warn("MIMI // Credential already in use, signing in instead.");
        const userCred = await signInWithCredential(auth, credential);
        return userCred.user;
    }
    console.error("MIMI // Credential Link Error:", err);
    throw err;
  }
};

export const getAuthContinueUrl = () => {
  if (typeof window === 'undefined') return '';
  return window.location.origin + window.location.pathname;
};

export const sendEmailLink = async (email: string, redirectUrl?: string): Promise<void> => {
  const actionCodeSettings = {
    url: redirectUrl || getAuthContinueUrl(),
    handleCodeInApp: true,
  };
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  } catch (error) {
    console.error("MIMI // Error sending email link:", error);
    throw error;
  }
};

export const completeEmailSignIn = async (url: string): Promise<void> => {
  if (isSignInWithEmailLink(auth, url)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('Please provide your email for confirmation');
    }
    if (email) {
      try {
        await signInWithEmailLink(auth, email, url);
        window.localStorage.removeItem('emailForSignIn');
      } catch (error) {
        console.error("MIMI // Error signing in with email link:", error);
        throw error;
      }
    }
  }
};

export const anchorIdentity = async (forceRedirect: boolean = false): Promise<void> => {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  
  // In AI Studio iframes, popups are generally more reliable than redirects
  // because redirects require complex top-level window configuration.
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  
  // Only redirect if explicitly forced AND we are not in an iframe, 
  // or if we are in a captive webview where popups are impossible.
  const isCaptive = isCaptiveInWebview();
  const shouldRedirect = forceRedirect || (isCaptive && !isIframe);

  try {
    if (shouldRedirect) {
      console.info("MIMI // Identity Anchor: Initiating Redirect Flow");
      await signInWithRedirect(auth, provider);
    } else {
      console.info("MIMI // Identity Anchor: Initiating Popup Flow");
      try {
        await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        if (popupError.code === 'auth/popup-blocked' && !isIframe) {
          console.warn("MIMI // Popup blocked. Falling back to redirect flow.");
          await signInWithRedirect(auth, provider);
          return;
        }
        if (popupError.code === 'auth/popup-blocked') {
          console.warn("MIMI // Popup Blocked in embedded context.");
          throw popupError;
        }

        // If it's an internal error in an iframe, it might be third-party cookie blocking
        if (popupError.code === 'auth/internal-error' && isIframe) {
          console.error("MIMI // Internal Error in Iframe. This usually means third-party cookies are blocked.");
          throw new Error("MIMI // Identity Anchor Failed: Your browser is blocking the authentication handshake. Please ensure third-party cookies are enabled, try opening the app in a new tab, or use Email/Password sign-in.");
        }

        throw popupError;
      }
    }
  } catch (e: any) {
    console.error("MIMI // Redirect anchor failed:", e);
    throw e;
  }
};

export const linkIdentity = async (forceRedirect: boolean = false): Promise<void> => {
  if (!auth.currentUser) throw new Error("No active session to link.");
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  
  try {
    if (forceRedirect) {
      await linkWithRedirect(auth.currentUser, provider);
    } else {
      await linkWithPopup(auth.currentUser, provider);
    }
  } catch (e: any) {
    if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
      console.warn("MIMI // Credential already in use, signing in instead.");
      const credential = GoogleAuthProvider.credentialFromError(e);
      if (credential) {
        await signInWithCredential(auth, credential);
        return;
      }
      // Fallback to popup sign in if credential extraction fails
      await signInWithPopup(auth, provider);
      return;
    }
    console.error("MIMI // Link redirect failed:", e);
    throw e;
  }
};

import { generateAndStoreZineEmbedding } from "./zineEmbeddingService";
import { getEditorialCompileExport } from "../lib/editCompileExport";
import {
  buildPublishConsent,
  consentFieldsForZine,
  type MmmContributionStatus,
} from "./collective/consent";
import { buildConsentAwareTransmission } from "./collective/broadcastTransmission";

export type SaveZineMmmConsent = {
  contributeToMeanMedianMode: boolean;
  disclosedAt?: number;
  disclosureVersion?: string;
};

type ZineConsentFields = {
  isPublic: true;
  contributeToMeanMedianMode: boolean;
  disclosedAt: number;
  disclosureVersion: string;
  mmmContributionStatus: MmmContributionStatus;
  mmmWithdrawnAt: null;
  publishedAt: number;
  timestamp: number;
};

export const saveZineToProfile = async (uid: string, handle: string, avatar: string | undefined, zine: ZineContent, tone: ToneTag, coverUrl?: string, deep?: boolean, isPublic?: boolean, isLite?: boolean, artifacts?: MediaFile[], originalInput?: string, transmissionsUsed?: any[], isHighFidelity?: boolean, tags?: string[], treatmentId?: string, fragmentsUsed?: string[], usedContextSnapshots?: UsedContextSnapshot[], lineage?: string[], mmmPublishConsent?: SaveZineMmmConsent | null): Promise<string> => {
  const targetUid = uid || 'ghost';
  const targetId = `zine_${targetUid}_${Date.now()}`;
  
  // Ensure we capture the original thought properly, falling back to metadata if arg is missing
  const rawInput = originalInput || zine.meta?.intent || "";

  // 1. Separate threadData
  const pagesWithoutThreadData = (zine.pages || []).map(page => ({ ...page, threadData: undefined }));
  const threadDataMap = new Map<number, any>();
  (zine.pages || []).forEach(page => {
    if (page.threadData) {
      threadDataMap.set(page.pageNumber, page.threadData);
    }
  });

  const zineWithoutThreadData: ZineContent = { ...zine, pages: [], pagesJson: JSON.stringify(pagesWithoutThreadData) };

  const editorialCompile = getEditorialCompileExport(targetUid, true);

  // Silent isPublic without Mean Median Mode disclosure is refused (finishing-pass trust).
  let stagedPublic = !!isPublic;
  let consentFields: ZineConsentFields | null = null;
  if (stagedPublic) {
    if (!mmmPublishConsent) {
      console.warn(
        "MIMI // saveZineToProfile: refused silent public stage — missing Mean Median Mode publish consent. Saving private.",
      );
      stagedPublic = false;
    } else {
      const consent = buildPublishConsent({
        artifactId: targetId,
        contributeToMeanMedianMode: mmmPublishConsent.contributeToMeanMedianMode,
        disclosedAt: mmmPublishConsent.disclosedAt,
        disclosureVersion: mmmPublishConsent.disclosureVersion,
      });
      consentFields = consentFieldsForZine(consent);
    }
  }

  let meta: ZineMetadata = {
    id: targetId, userId: uid, userHandle: handle, userAvatar: avatar || null,
    title: zine.title, tone, coverImageUrl: coverUrl || null, timestamp: Date.now(), likes: 0,
    content: zineWithoutThreadData, isDeepThinking: !!deep, isPublic: stagedPublic, isLite: !!isLite, isHighFidelity: !!isHighFidelity,
    publishedAt: stagedPublic ? (consentFields?.publishedAt ?? Date.now()) : undefined,
    ...(consentFields
      ? {
          contributeToMeanMedianMode: consentFields.contributeToMeanMedianMode,
          disclosedAt: consentFields.disclosedAt,
          disclosureVersion: consentFields.disclosureVersion,
          mmmContributionStatus: consentFields.mmmContributionStatus,
          mmmWithdrawnAt: consentFields.mmmWithdrawnAt,
        }
      : {}),
    artifacts: [],
    fragmentsUsed: fragmentsUsed && fragmentsUsed.length > 0 ? fragmentsUsed : [],
    usedContextSnapshots: usedContextSnapshots && usedContextSnapshots.length > 0 ? usedContextSnapshots : undefined,
    editorialCompileMarkdown: editorialCompile?.markdown,
    editorialCompileCompiledAt: editorialCompile?.compiledAt,
    editorialCompileOwnerUid: editorialCompile?.profileLink?.ownerUid,
    editorialCompileOwnerHandle: editorialCompile?.profileLink?.ownerHandle,
    editorialCompileLinkVersion: editorialCompile?.profileLink?.version,
    originalInput: rawInput,
    transmissionsUsed: (transmissionsUsed || []).map(t => ({ 
      id: t.id || '', 
      type: t.type || '', 
      content: typeof t.content === 'string' ? t.content.substring(0, 100) : '', 
      userId: t.userId || '' 
    })),
    treatmentId,
    lineage: lineage && lineage.length > 0 ? lineage : undefined,
    tags: tags && tags.length > 0 ? tags : await (await import("./geminiService")).generateTagsFromMedia(JSON.stringify(zine), artifacts || [])
  };

  meta = stampZineArtifactMetadata(meta, pagesWithoutThreadData);
  
  devLog.info("MIMI // saveZineToProfile: Starting zine save");
  await saveZineLocally(meta);
  try {
    await savePocketItemLocally({
      id: `pocket_${targetId}`,
      userId: targetUid,
      type: 'zine' as any,
      savedAt: Date.now(),
      content: {
        zineId: targetId,
        title: zine.title,
        coverUrl: coverUrl || null,
        tone,
        timestamp: Date.now(),
        meta
      },
      notes: zine.meta?.intent || zine.title,
      tags: tags || []
    });
  } catch (pocketErr) {
    console.warn("MIMI // Auto-save zine to Pocket failed:", pocketErr);
  }
  // Always mirror into the sovereign archive (Mine + Floor) — survives Firestore caps.
  {
    const { mirrorZineToSovereign } = await import("./sovereignClient");
    void mirrorZineToSovereign(meta);
  }
  if (uid && auth.currentUser && navigator.onLine) {
    try {
      console.info("MIMI // saveZineToProfile: Saving zine to Firestore...");
      
      // 2. Save Zine without threadData and artifacts
      await setDoc(doc(db, "zines", targetId), sanitizeFirestoreData(meta));
      
      // 3. Save threadData in subcollection
      for (const [pageNumber, threadData] of threadDataMap) {
        await setDoc(doc(db, "zines", targetId, "pages", pageNumber.toString()), { threadData: sanitizeFirestoreData(threadData) });
      }

      // 4. Save artifacts in subcollection
      if (artifacts && artifacts.length > 0) {
        const { archiveManager } = await import('./archiveManager');
        for (const artifact of artifacts) {
          let artifactToSave = { ...artifact };
          if (artifactToSave.data && artifactToSave.data.startsWith('data:')) { // If base64
              try {
                  const url = await archiveManager.uploadMedia(uid, artifactToSave.data, `zine_artifacts/${targetId}_${artifact.id || Date.now()}`);
                  artifactToSave.url = url;
                  artifactToSave.data = ''; // Clear base64 to save space
              } catch (e) {
                  console.warn("Failed to upload artifact to storage", e);
              }
          }
          // Remove File object before saving
          if (artifactToSave.file) {
              delete artifactToSave.file;
          }
          await setDoc(doc(db, "zines", targetId, "artifacts", artifact.id || Date.now().toString()), sanitizeFirestoreData(artifactToSave));
        }
      }
      
      syncToShadowMemory(meta);
      invalidateZineCache();
      
      // Generate and store embedding
      generateAndStoreZineEmbedding(meta);
      
      // Save Lineage Entry
      const { generateProfoundSignature } = await import("./thoughtSignatureService");
      await saveLineageEntry({
        artifact_id: targetId,
        userId: uid,
        thought_signature: await generateProfoundSignature(rawInput),
        fragment_ids: artifacts?.map(a => a.id) || [],
        archetype_weights: zine.archetype_weights || { Architect: 0.25, Dreamer: 0.25, Archivist: 0.25, Catalyst: 0.25 },
        synthesis_notes: zine.meta?.intent || 'Zine created.',
        timestamp: Date.now()
      });
      
      // Update taste graph with the generated zine content
      console.info("MIMI // saveZineToProfile: Calling updateTasteGraph...");
      updateTasteGraph(uid, 'text', { content: `${zine.title} - ${zine.meta?.intent || ''} - ${zine.pages?.map(p => p.bodyCopy).join(' ')}` });

      if (stagedPublic && consentFields) {
        const { transmission } = buildConsentAwareTransmission(
          {
            userId: uid,
            userHandle: handle,
            content: zine.title,
            imageUrl: coverUrl || (zine.pages && zine.pages[0]?.image_url) || '',
            type: 'manifest',
            likes: 0,
            zineData: meta,
            artifactId: targetId,
          },
          consentFields.contributeToMeanMedianMode,
        );
        const cleanTransmission = JSON.parse(JSON.stringify(transmission));
        await addDoc(collection(db, 'public_transmissions'), cleanTransmission);
      }
    } catch (e: any) { 
      handleFirestoreError(e, OperationType.WRITE, "zines");
    }
  }
  return targetId;
};

export const updateTasteGraph = async (uid: string, type: PocketItem['type'], content: any) => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) return;
  try {
    devLog.info("MIMI // Taste Graph Update Started, Type:", type);
    let textToAnalyze = '';
    let isImage = false;
    let mimeType = 'image/jpeg';

    let imageUrl = content.imageUrl || content.image;
    if (type === 'image' && imageUrl) {
      textToAnalyze = imageUrl;
      isImage = true;
      if (imageUrl.startsWith('data:')) {
         const match = imageUrl.match(/^data:(image\/[a-zA-Z0-9]+);base64,(.+)$/);
         if (match) {
            mimeType = match[1];
            textToAnalyze = match[2];
         } else {
            console.warn("MIMI // Taste Graph: Invalid base64 image");
            return; // Not a valid base64 image
         }
      } else {
         console.warn("MIMI // Taste Graph: External URL not supported");
         return; // Can't easily analyze external URLs without downloading
      }
    } else if (type === 'text' && content.content) {
      textToAnalyze = content.content;
    } else if (type === 'link' && content.url) {
      textToAnalyze = content.url + (content.title ? ` - ${content.title}` : '');
    } else {
      console.warn("MIMI // Taste Graph: Unsupported type", type);
      return; // Unsupported type for taste extraction
    }

    console.info("MIMI // Taste Graph: Analyzing content:", textToAnalyze.substring(0, 50));
    const { extractTasteVector } = await import("./geminiService");
    const newVector = await extractTasteVector(textToAnalyze, isImage, mimeType);
    console.info("MIMI // Taste Graph: New Vector Extracted:", newVector);
    if (!newVector || Object.keys(newVector).length === 0) {
        console.warn("MIMI // Taste Graph: No tags extracted");
        return;
    }

    // Fetch current profile
    const userRef = doc(db, "profiles_public", uid);
    const userSnap = await getDoc(userRef);
    const profile = userSnap.exists() ? userSnap.data() as UserProfile : {} as UserProfile;

    const currentVector = profile.tasteVector || {};
    const updatedVector = { ...currentVector };

    // Blend vectors with normalization
    // We use a weighted average approach to keep the sum around 1.0
    const learningRate = 0.2;
    const decayRate = 0.95;

    // 1. Apply decay to all existing tags
    for (const tag of Object.keys(updatedVector)) {
      updatedVector[tag] *= decayRate;
    }

    // 2. Blend in new intensities
    for (const [tag, intensity] of Object.entries(newVector)) {
       const currentVal = updatedVector[tag] || 0;
       updatedVector[tag] = (currentVal * (1 - learningRate)) + (intensity * learningRate);
    }

    // 3. Normalize so sum ≈ 1.0
    const sum = Object.values(updatedVector).reduce((a, b) => a + b, 0);
    if (sum > 0) {
       for (const tag of Object.keys(updatedVector)) {
          updatedVector[tag] = updatedVector[tag] / sum;
       }
    }

    console.info("MIMI // Taste Graph: Updating Firestore with:", updatedVector);
    await setDoc(userRef, { tasteVector: updatedVector }, { merge: true });
    console.info("MIMI // Taste Graph Updated");
  } catch (e) {
    console.warn("MIMI // Taste Graph Update Failed:", e);
  }
};


export const addToPocket = async (uid: string, type: PocketItem['type'], content: any, embedding?: number[], deltaVerdict?: any, originalContent?: any): Promise<string | undefined> => {
  if (!uid) return;
  const randomId = Math.random().toString(36).substring(2, 9);
  const itemId = `item_${Date.now()}_${randomId}`;
  
  const contentForAnalysis = originalContent || content;
  
  const mediaItems = contentForAnalysis.media || [];
  if (type === 'image') {
    if (contentForAnalysis.imageUrl && contentForAnalysis.imageUrl.startsWith('data:')) {
      mediaItems.push({ type: 'image', data: contentForAnalysis.imageUrl });
    } else if (contentForAnalysis.image && contentForAnalysis.image.startsWith('data:')) {
      mediaItems.push({ type: 'image', data: contentForAnalysis.image });
    }
  }

  // Generate tags automatically
  const { generateTagsFromMedia } = await import("./geminiService");
  // Remove the base64 string from the text content to avoid blowing up the prompt
  const textContent = { ...contentForAnalysis };
  delete textContent.imageUrl;
  delete textContent.image;
  delete textContent.media;
  
  const tags = await generateTagsFromMedia(JSON.stringify(textContent), mediaItems);
  
  const item: PocketItem = { id: itemId, userId: uid, type, savedAt: Date.now(), content, notes: content.notes || "", tags, embedding, deltaVerdict };
  
  if (uid === 'ghost' || !isFullyAuthenticated()) {
    const localPocket = await getLocalPocket() || [];
    if (localPocket.length >= 24) {
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: "Ghost Pocket Full (24/24). Please anchor your identity.", type: 'error' } }));
      return;
    }
    await savePocketItemLocally(item);
    window.dispatchEvent(new CustomEvent('mimi:pocket_updated'));
    return itemId;
  }

  await savePocketItemLocally(item);
  window.dispatchEvent(new CustomEvent('mimi:pocket_updated'));
  {
    const { mirrorPocketItemToSovereign } = await import("./sovereignClient");
    void mirrorPocketItemToSovereign(item);
  }
  if (uid && auth.currentUser && navigator.onLine) {
    try {
      await setDoc(doc(db, "pocket", itemId), sanitizeFirestoreData(item));
      syncToShadowMemory(item);
      // Asynchronously update the taste graph
      updateTasteGraph(uid, type, contentForAnalysis);
      invalidatePocketCache();
    } catch (e) { console.warn("MIMI // Pocket Sync Skipped:", e.code); }
  }
  return itemId; // Returned ID for immediate reference
};

export const deleteFromPocket = async (itemId: string): Promise<void> => {
  await deleteLocalPocketItem(itemId);
  window.dispatchEvent(new CustomEvent('mimi:pocket_updated'));
  if (auth.currentUser) {
    const { deleteSovereignPocketItem } = await import("./sovereignClient");
    void deleteSovereignPocketItem(itemId, auth.currentUser.uid);
  }
  if (auth.currentUser && navigator.onLine) {
    try {
      await deleteDoc(doc(db, "pocket", itemId));
      deleteFromShadowMemory(itemId);
      invalidatePocketCache();
    } catch (e) { console.warn("MIMI // Pocket Del Skipped:", e.code); }
  }
};

export const createMoodboard = async (uid: string, name: string, itemIds: string[]): Promise<string> => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) return '';
  const boardId = `moodboard_${Date.now()}`;
  const item: PocketItem = { 
    id: boardId, 
    userId: uid, 
    type: 'moodboard', 
    savedAt: Date.now(), 
    content: { name, itemIds } 
  };
  await savePocketItemLocally(item);
  window.dispatchEvent(new CustomEvent('mimi:pocket_updated'));
  if (uid && auth.currentUser && navigator.onLine) {
    try {
      await setDoc(doc(db, "pocket", boardId), sanitizeFirestoreData(item));
      syncToShadowMemory(item);
      invalidatePocketCache();
    } catch (e) { console.warn("MIMI // Board Sync Skipped:", e.code); }
  }
  return boardId;
};

export const updatePocketItem = async (itemId: string, patch: Partial<PocketItem>): Promise<void> => {
  const localPocket = await getLocalPocket();
  // null = IndexedDB miss — skip local mutate; cloud path may still run.
  if (localPocket) {
    const index = localPocket.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      const updated = { ...localPocket[index], ...patch };
      await savePocketItemLocally(updated);
      window.dispatchEvent(new CustomEvent("mimi:pocket_updated"));
    }
  }
  if (isFullyAuthenticated() && navigator.onLine) {
    try {
      await updateDoc(doc(db, "pocket", itemId), patch);
      invalidatePocketCache();
    } catch (e) { console.warn("MIMI // Pocket Update Skipped:", e.code); }
  }
};

let pocketCache: { [uid: string]: { data: PocketItem[], timestamp: number } } = {};
let zineCache: { [uid: string]: { data: ZineMetadata[], timestamp: number } } = {};
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export const invalidatePocketCache = () => { pocketCache = {}; };
export const invalidateZineCache = () => { zineCache = {}; };

export const fetchPocketItems = async (uid: string, forceRefresh = false) => {
    if (!uid || uid === 'ghost' || !isFullyAuthenticated()) return [];
    
    if (!forceRefresh && pocketCache[uid] && (Date.now() - pocketCache[uid].timestamp < CACHE_TTL)) {
        return pocketCache[uid].data;
    }

    try {
      const { fetchSovereignPocketItems, isSovereignOnline } = await import("./sovereignClient");
      const sovereign = await fetchSovereignPocketItems(uid);
      if (sovereign !== null && ((await isSovereignOnline()) || sovereign.length > 0)) {
        const sorted = [...sovereign].sort((a, b) => b.savedAt - a.savedAt);
        pocketCache[uid] = { data: sorted, timestamp: Date.now() };
        return sorted;
      }
    } catch {
      // fall through
    }

    try {
      const q = query(collection(db, "pocket"), where("userId", "==", uid));
      const docs = (await getDocs(q)).docs.map(d => d.data() as PocketItem);
      const sorted = docs.sort((a, b) => b.savedAt - a.savedAt);
      pocketCache[uid] = { data: sorted, timestamp: Date.now() };
      return sorted;
    } catch (e: any) { 
      console.warn("MIMI // Pocket Fetch Error:", e);
      return []; 
    }
};

export const subscribeToPocketItems = (uid: string, callback: (data: PocketItem[]) => void) => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, "pocket"), where("userId", "==", uid));
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(d => d.data() as PocketItem);
    const sorted = docs.sort((a, b) => b.savedAt - a.savedAt);
    pocketCache[uid] = { data: sorted, timestamp: Date.now() }; // Update cache on snapshot
    callback(sorted);
  }, (error: any) => {
    if (error.code === 'permission-denied' && auth.currentUser?.uid !== uid) {
      console.warn(`MIMI // Ignored permission-denied for pocket/${uid} due to auth state change.`);
      return;
    }
    logFirestoreError(error, OperationType.LIST, "pocket");
  });
};

export const fetchUserZines = async (uid: string, forceRefresh = false) => {
    if (!uid) return [];
    
    if (uid === 'ghost' || !isFullyAuthenticated()) {
        return getLocalZines();
    }
    
    if (!forceRefresh && zineCache[uid] && (Date.now() - zineCache[uid].timestamp < CACHE_TTL)) {
        return zineCache[uid].data;
    }

    try {
      const { fetchSovereignUserZines, isSovereignOnline } = await import("./sovereignClient");
      const publicOnly = !(auth.currentUser && uid === auth.currentUser.uid);
      const sovereign = await fetchSovereignUserZines(uid, { publicOnly });
      if (sovereign !== null && ((await isSovereignOnline()) || sovereign.length > 0)) {
        const sorted = [...sovereign].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        zineCache[uid] = { data: sorted, timestamp: Date.now() };
        return sorted;
      }
    } catch {
      // fall through
    }

    try {
      let q;
      devLog.info("MIMI // fetchUserZines: querying");
      if (auth.currentUser && uid === auth.currentUser.uid) {
        q = query(collection(db, "zines"), where("userId", "==", uid));
      } else {
        q = query(collection(db, "zines"), where("userId", "==", uid), where("isPublic", "==", true));
      }
      devLog.info("MIMI // fetchUserZines: Querying zines");
      const querySnapshot = await getDocs(q);
      console.info("MIMI // fetchUserZines: Found zines count:", querySnapshot.size);
      const docs = querySnapshot.docs.map(d => d.data() as ZineMetadata);
      const sorted = docs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      zineCache[uid] = { data: sorted, timestamp: Date.now() };
      return sorted;
    } catch (e: any) { 
      console.error("MIMI // Zine Fetch Error:", e);
      return []; 
    }
};

/** Cap Firestore community scans; prefer sovereign archive when available. */
const COMMUNITY_ZINE_READ_CAP = 60;

const isFirestoreQuotaError = (error: unknown): boolean => {
  const code = typeof (error as any)?.code === "string" ? (error as any).code : "";
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    code === "resource-exhausted" ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("Quota exceeded")
  );
};

export const subscribeToUserZines = (
  uid: string,
  callback: (data: ZineMetadata[]) => void,
  onError?: (error: unknown) => void,
) => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) {
    callback([]);
    return () => {};
  }

  let cancelled = false;
  let unsubFirestore = () => {};
  let unsubLive: (() => void) | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const publicOnly = !(auth.currentUser && uid === auth.currentUser.uid);

  const hydrateSovereign = async () => {
    try {
      const { fetchSovereignUserZines, isSovereignOnline } = await import("./sovereignClient");
      const online = await isSovereignOnline();
      const sovereign = await fetchSovereignUserZines(uid, { publicOnly });
      if (cancelled) return online;
      if (sovereign !== null) {
        const sorted = [...sovereign].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        zineCache[uid] = { data: sorted, timestamp: Date.now() };
        callback(sorted);
        return online;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const startPolling = () => {
    if (pollTimer || cancelled) return;
    pollTimer = setInterval(() => {
      void hydrateSovereign();
    }, 45_000);
  };

  (async () => {
    const sovereignOnline = await hydrateSovereign();
    if (cancelled) return;

    if (sovereignOnline) {
      const { subscribeSovereignLive } = await import("./sovereignClient");
      unsubLive = subscribeSovereignLive(
        "user",
        {
          onZine: () => {
            void hydrateSovereign();
          },
          onUnsupported: () => {
            unsubLive = null;
            startPolling();
          },
        },
        { userId: uid },
      );
      if (!unsubLive) startPolling();
      return;
    }

    let q;
    if (uid === auth.currentUser?.uid) {
      q = query(collection(db, "zines"), where("userId", "==", uid));
    } else {
      q = query(collection(db, "zines"), where("userId", "==", uid), where("isPublic", "==", true));
    }
    unsubFirestore = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as ZineMetadata);
      const sorted = docs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      zineCache[uid] = { data: sorted, timestamp: Date.now() };
      callback(sorted);
    }, (error: any) => {
      if (error.code === 'permission-denied' && auth.currentUser?.uid !== uid) {
        console.warn(`MIMI // Ignored permission-denied for zines/${uid} due to auth state change.`);
        onError?.(error);
        return;
      }
      if (isFirestoreQuotaError(error)) {
        console.warn("MIMI // Mine subscribe: Firestore quota exhausted — use sovereign host");
        onError?.(error);
        return;
      }
      logFirestoreError(error, OperationType.LIST, "zines");
      onError?.(error);
    });
  })();

  return () => {
    cancelled = true;
    unsubFirestore();
    unsubLive?.();
    if (pollTimer) clearInterval(pollTimer);
  };
};

/** Cap community scans so free-tier read quota isn't burned by full-collection gets. */
export const fetchCommunityZines = async (count: number) => {
    const take = Math.max(0, Math.min(count || 0, COMMUNITY_ZINE_READ_CAP));
    if (take === 0) return [];

    // Sovereign archive first — no Firestore free-tier burn for Floor.
    try {
      const { fetchSovereignCommunityZines, isSovereignOnline } = await import("./sovereignClient");
      const sovereign = await fetchSovereignCommunityZines(take);
      if (sovereign !== null && (await isSovereignOnline())) {
        return sovereign;
      }
      if (sovereign && sovereign.length > 0) return sovereign;
    } catch {
      // fall through
    }

    if (!auth.currentUser) return [];
    try {
      const q = query(
        collection(db, "zines"),
        where("isPublic", "==", true),
        orderBy("timestamp", "desc"),
        limit(Math.min(take, COMMUNITY_ZINE_READ_CAP)),
      );
      const docs = (await getDocs(q)).docs.map(d => d.data() as ZineMetadata);
      return docs.slice(0, take);
    } catch (e: any) {
      if (isFirestoreQuotaError(e)) {
        console.warn("MIMI // Community Fetch: Firestore quota exhausted — use sovereign host");
      } else {
        console.warn("MIMI // Community Fetch Error:", e.code);
      }
      return [];
    }
};

export const subscribeToCommunityZines = (
  callback: (data: ZineMetadata[]) => void,
  opts?: { limit?: number },
) => {
  const take = Math.max(1, Math.min(opts?.limit ?? 30, COMMUNITY_ZINE_READ_CAP));
  let cancelled = false;
  let unsubFirestore = () => {};
  let unsubLive: (() => void) | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const hydrateSovereign = async () => {
    try {
      const { fetchSovereignCommunityZines, isSovereignOnline } = await import("./sovereignClient");
      const online = await isSovereignOnline();
      const sovereign = await fetchSovereignCommunityZines(take);
      if (cancelled) return online;
      if (sovereign !== null) {
        callback(sovereign);
        return online;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const startPolling = () => {
    if (pollTimer || cancelled) return;
    pollTimer = setInterval(() => {
      void hydrateSovereign();
    }, 45_000);
  };

  (async () => {
    const sovereignOnline = await hydrateSovereign();
    if (cancelled) return;

    // When sovereign is online, prefer SSE; poll as fallback. Never open Firestore.
    if (sovereignOnline) {
      const { subscribeSovereignLive } = await import("./sovereignClient");
      unsubLive = subscribeSovereignLive("public", {
        onZine: () => {
          void hydrateSovereign();
        },
        onUnsupported: () => {
          unsubLive = null;
          startPolling();
        },
      });
      if (!unsubLive) startPolling();
      return;
    }

    if (!auth.currentUser) return;
    const q = query(
      collection(db, "zines"),
      where("isPublic", "==", true),
      orderBy("timestamp", "desc"),
      limit(Math.min(take * 3, COMMUNITY_ZINE_READ_CAP)),
    );
    unsubFirestore = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as ZineMetadata);
      callback(docs.slice(0, take));
    }, (e) => {
      if (isFirestoreQuotaError(e)) {
        console.warn("MIMI // Community subscribe: Firestore quota exhausted");
        return;
      }
      logFirestoreError(e, OperationType.LIST, "zines");
    });
  })();

  return () => {
    cancelled = true;
    unsubFirestore();
    unsubLive?.();
    if (pollTimer) clearInterval(pollTimer);
  };
};

/**
 * Persist zine metadata to Firestore when authenticated as owner.
 * Ghost / no-auth sessions still write IndexedDB via saveZineLocally.
 * @returns true when something was persisted (cloud and/or local); false when aborted (not owner).
 */
export const updateZineMetadata = async (metadata: ZineMetadata): Promise<boolean> => {
  if (!auth.currentUser) {
    console.warn("MIMI // updateZineMetadata: No current user — persisting locally only");
    await saveZineLocally(metadata);
    invalidateZineCache();
    {
      const { mirrorZineToSovereign } = await import("./sovereignClient");
      void mirrorZineToSovereign(metadata);
    }
    return true;
  }
  if (!metadata.userId) {
    console.error("MIMI // updateZineMetadata: metadata.userId is missing");
    throw new Error("MIMI // updateZineMetadata: metadata.userId is missing");
  }
  if (metadata.userId !== auth.currentUser.uid) {
    console.warn("MIMI // updateZineMetadata: User is not the owner of this zine. Update aborted.");
    return false;
  }
  try {
    devLog.info("MIMI // updateZineMetadata: Attempting update for zine:", metadata.id);
    const { setDoc, doc } = await import('firebase/firestore');
    
    // 1. Separate threadData and artifacts
    const threadDataMap = new Map<number, any>();
    const pagesWithoutThreadData = (metadata.content.pages || []).map(page => {
        const pageCopy = { ...page };
        if (pageCopy.threadData) {
            threadDataMap.set(pageCopy.pageNumber, pageCopy.threadData);
            pageCopy.threadData = undefined; // Remove from main doc
        }
        return pageCopy;
    });
    
    const artifacts = metadata.artifacts;
    
    // Create a sanitized copy of metadata for Firestore
    const firestoreMetadata: ZineMetadata = {
        ...metadata,
        artifacts: [], // Remove from main doc
        transmissionsUsed: (metadata.transmissionsUsed || []).map(t => ({ 
            id: t.id || '', 
            type: t.type || '', 
            content: typeof t.content === 'string' ? t.content.substring(0, 100) : '', 
            userId: t.userId || '' 
        })),
        content: {
            ...metadata.content,
            pages: [],
            pagesJson: JSON.stringify(pagesWithoutThreadData)
        }
    };

    // 2. Save Zine without threadData and artifacts
    console.info("MIMI // updateZineMetadata: Calling updateDoc for:", metadata.id);
    await updateDoc(doc(db, "zines", metadata.id), sanitizeFirestoreData(firestoreMetadata));
    console.info("MIMI // updateZineMetadata: updateDoc successful");
    
    // 3. Save threadData in subcollection
    for (const [pageNumber, threadData] of threadDataMap) {
        await setDoc(doc(db, "zines", metadata.id, "pages", pageNumber.toString()), { threadData: sanitizeFirestoreData(threadData) });
    }

    // 4. Save artifacts in subcollection
    if (artifacts && artifacts.length > 0) {
        const { archiveManager } = await import('./archiveManager');
        for (const artifact of artifacts) {
            let artifactToSave = { ...artifact };
            if (artifactToSave.data && artifactToSave.data.startsWith('data:')) { // If base64
                try {
                    const url = await archiveManager.uploadMedia(auth.currentUser.uid, artifactToSave.data, `zine_artifacts/${metadata.id}_${artifact.id || Date.now()}`);
                    artifactToSave.url = url;
                    artifactToSave.data = ''; // Clear base64 to save space
                } catch (e) {
                    console.warn("Failed to upload artifact to storage", e);
                }
            }
            // Remove File object before saving
            if (artifactToSave.file) {
                delete artifactToSave.file;
            }
            await setDoc(doc(db, "zines", metadata.id, "artifacts", artifact.id || Date.now().toString()), sanitizeFirestoreData(artifactToSave));
        }
    }

    await saveZineLocally(metadata);
    syncToShadowMemory(metadata);
    invalidateZineCache();
    {
      const { mirrorZineToSovereign } = await import("./sovereignClient");
      void mirrorZineToSovereign(metadata);
    }
    console.info("MIMI // updateZineMetadata: Update complete");
    return true;
  } catch (e) {
    console.error("MIMI // updateZineMetadata: Failed to update zine metadata", e);
    // Still try sovereign if Firestore write failed (quota / offline).
    try {
      const { mirrorZineToSovereign } = await import("./sovereignClient");
      await mirrorZineToSovereign(metadata);
      await saveZineLocally(metadata);
      return true;
    } catch {
      throw e;
    }
  }
};

export const fetchZineById = async (id: string) => {
    try {
      const { fetchSovereignZineById } = await import("./sovereignClient");
      const sovereign = await fetchSovereignZineById(id);
      if (sovereign) {
        if (sovereign.content?.pagesJson && (!sovereign.content.pages || sovereign.content.pages.length === 0)) {
          try {
            sovereign.content.pages = JSON.parse(sovereign.content.pagesJson);
          } catch {
            // keep as-is
          }
        }
        return sovereign;
      }
    } catch {
      // fall through
    }

    try {
      const zineDoc = await getDoc(doc(db, "zines", id));
      if (!zineDoc.exists()) return null;
      
      const zine = zineDoc.data() as ZineMetadata;
      
      // Reconstruct pages from pagesJson
      if (zine.content.pagesJson) {
        zine.content.pages = JSON.parse(zine.content.pagesJson);
      }
      
      // Fetch threadData from pages subcollection
      const pagesSnap = await getDocs(collection(db, "zines", id, "pages"));
      
      pagesSnap.forEach((pageDoc) => {
        const pageNumber = parseInt(pageDoc.id);
        const threadData = pageDoc.data().threadData;
        
        if (zine.content.pages) {
            const page = zine.content.pages.find(p => p.pageNumber === pageNumber);
            if (page) {
                page.threadData = threadData;
            }
        }
      });

      // Fetch artifacts from artifacts subcollection
      const artifactsSnap = await getDocs(collection(db, "zines", id, "artifacts"));
      zine.artifacts = artifactsSnap.docs.map(doc => doc.data() as MediaFile);
      
      return zine;
    } catch (e) { return null; }
};

export const getProfileByHandle = async (handle: string): Promise<UserProfile | null> => {
  try {
    const q = query(collection(db, 'users'), where('handle', '==', handle), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("MIMI // Error fetching profile by handle:", error);
    return null;
  }
};

export const getArchetypeClusterAlignment = async (archetype: string): Promise<UserProfile[]> => {
  try {
    // This requires a complex query or just fetching all and filtering if array-contains isn't exact.
    // For now, we'll fetch a limited set of users and filter client-side or use a simple query if possible.
    // Assuming aestheticDNA.archetypes is an array of strings.
    const q = query(collection(db, 'users'), limit(50));
    const snapshot = await getDocs(q);
    const users: UserProfile[] = [];
    snapshot.forEach(doc => {
      const data = doc.data() as UserProfile;
      if (data.aestheticDNA?.archetypes?.includes(archetype)) {
        users.push(data);
      }
    });
    return users;
  } catch (error) {
    console.error("MIMI // Error fetching archetype cluster:", error);
    return [];
  }
};

export const createDossierFolder = async (uid: string, name: string): Promise<string> => {
  const id = `folder_${Date.now()}`;
  const folder: DossierFolder = { id, userId: uid, name, createdAt: Date.now(), collaborators: [] };
  
  // Always save locally
  await saveFolderLocally(folder);
  
  if (uid && uid !== 'ghost' && isFullyAuthenticated() && navigator.onLine) {
    try { await setDoc(doc(db, "dossier_folders", id), sanitizeFirestoreData(folder)); } catch (e) {}
  }
  return id;
};

export const saveNarrativeThread = async (thread: NarrativeThread): Promise<void> => {
  if (!thread.userId || thread.userId === 'ghost' || !auth.currentUser) return;
  try {
    await setDoc(doc(db, "narrative_threads", thread.id), sanitizeFirestoreData(thread));
  } catch (e) {
    console.error("MIMI // saveNarrativeThread error:", e);
  }
};

export const fetchNarrativeThreads = async (userId: string): Promise<NarrativeThread[]> => {
  if (!userId || userId === 'ghost' || !auth.currentUser) return [];
  try {
    const q = query(collection(db, "narrative_threads"), where("userId", "==", userId), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as NarrativeThread);
  } catch (e) {
    console.error("MIMI // fetchNarrativeThreads error:", e);
    return [];
  }
};

export const absorbTransmission = async (uid: string, zineData: ZineMetadata): Promise<string> => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated() || !navigator.onLine) return '';
  
  try {
    // 1. Create a new Dossier Folder for the absorbed zine
    const folderId = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const folder: DossierFolder = { 
        id: folderId, 
        userId: uid, 
        name: `Absorbed: ${zineData.title}`, 
        createdAt: Date.now(), 
        collaborators: [],
        notes: `Absorbed from ${zineData.authorship || zineData.userHandle} on ${new Date().toLocaleDateString()}.\n\nOriginal Provocation: ${zineData.content.poetic_provocation || ''}`
    };
    await setDoc(doc(db, "dossier_folders", folderId), sanitizeFirestoreData(folder));

    // 2. Add the original input as a text artifact
    if (zineData.originalInput) {
        const textArtifactId = `art_${Date.now()}_text`;
        const textArtifact: DossierArtifact = {
            id: textArtifactId,
            userId: uid,
            folderId,
            type: 'text',
            title: 'Original Input',
            createdAt: Date.now(),
            elements: [{ id: `el_${Date.now()}`, type: 'text', content: zineData.originalInput, style: { zIndex: 1 } }]
        };
        await setDoc(doc(db, "dossier_artifacts", textArtifactId), sanitizeFirestoreData(textArtifact));
    }

    // 3. Add any media artifacts
    if (zineData.artifacts && zineData.artifacts.length > 0) {
        const { archiveManager } = await import('./archiveManager');
        for (const media of zineData.artifacts) {
            const mediaArtifactId = `art_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            let finalMediaContent = media.url || media.data;
            if (finalMediaContent && finalMediaContent.startsWith('data:')) {
                try {
                    finalMediaContent = await archiveManager.uploadMedia(uid, finalMediaContent, `dossier_artifacts/${mediaArtifactId}`);
                } catch (e) {
                    console.warn("Failed to upload absorbed media", e);
                }
            }
            const mediaArtifact: DossierArtifact = {
                id: mediaArtifactId,
                userId: uid,
                folderId,
                type: media.type,
                title: 'Absorbed Media',
                createdAt: Date.now(),
                elements: [{ id: `el_${Date.now()}`, type: media.type, content: finalMediaContent, style: { zIndex: 1 } }]
            };
            await setDoc(doc(db, "dossier_artifacts", mediaArtifactId), sanitizeFirestoreData(mediaArtifact));
        }
    }

    // 4. Add the generated zine content as a text artifact
    const contentArtifactId = `art_${Date.now()}_content`;
    const contentText = `
TITLE: ${zineData.content.title}
SUMMARY: ${zineData.content.vocal_summary_blurb || ''}
READING: ${zineData.content.the_reading || ''}
HYPOTHESIS: ${zineData.content.strategic_hypothesis || ''}
    `.trim();
    
    const contentArtifact: DossierArtifact = {
        id: contentArtifactId,
        userId: uid,
        folderId,
        type: 'text',
        title: 'Zine Manifest Content',
        createdAt: Date.now(),
        elements: [{ id: `el_${Date.now()}`, type: 'text', content: contentText, style: { zIndex: 1 } }]
    };
    await setDoc(doc(db, "dossier_artifacts", contentArtifactId), sanitizeFirestoreData(contentArtifact));

    return folderId;
  } catch (e) {
    console.error("Failed to absorb transmission:", e);
    return '';
  }
};

export const updateDossierFolder = async (folderId: string, patch: Partial<DossierFolder>) => {
  if (isFullyAuthenticated() && navigator.onLine) {
    try { await updateDoc(doc(db, "dossier_folders", folderId), patch); } catch (e) {}
  }
};

export const fetchDossierFolders = async (uid: string) => {
  const localFolders = await getLocalFolders();
  
  if (!uid || uid === 'ghost' || !auth.currentUser || !navigator.onLine) {
    return localFolders.sort((a, b) => b.createdAt - a.createdAt);
  }

  try {
    // We need to fetch folders where userId == uid OR collaborators array contains uid
    const q1 = query(collection(db, "dossier_folders"), where("userId", "==", uid));
    const q2 = query(collection(db, "dossier_folders"), where("collaborators", "array-contains", uid));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const foldersMap = new Map<string, DossierFolder>();
    // Add local folders first
    localFolders.forEach(f => foldersMap.set(f.id, f));
    // Overwrite with cloud folders
    snap1.docs.forEach(d => foldersMap.set(d.id, d.data() as DossierFolder));
    snap2.docs.forEach(d => foldersMap.set(d.id, d.data() as DossierFolder));
    
    return Array.from(foldersMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) { 
    console.error("MIMI // Dossier Fetch Error:", e);
    return localFolders.sort((a, b) => b.createdAt - a.createdAt); 
  }
};

export const createDossierArtifactFromImage = async (uid: string, folderId: string, title: string, imageUrl: string, layout?: MoodboardLayout) => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) return '';
  const id = `artifact_${Date.now()}`;
  
  let finalImageUrl = imageUrl;
  if (imageUrl && imageUrl.startsWith('data:')) {
      try {
          const { archiveManager } = await import('./archiveManager');
          finalImageUrl = await archiveManager.uploadMedia(uid, imageUrl, `dossier_artifacts/${id}`);
      } catch (e) {
          console.warn("Failed to upload dossier artifact image", e);
      }
  }

  // Generate tags automatically
  const { generateTagsFromMedia } = await import("./geminiService");
  const tags = await generateTagsFromMedia(`Image artifact: ${title}`);
  
  const artifact: DossierArtifact = {
    id, userId: uid, folderId, type: 'moodboard', title, createdAt: Date.now(),
    elements: [{ id: 'el_0', type: 'image', content: finalImageUrl }],
    tags, // Add tags
    status: 'active',
    ...(layout ? { layout } : {})
  };
  
  await saveArtifactLocally(artifact);
  
  if (uid && auth.currentUser && navigator.onLine) {
    try { 
      await setDoc(doc(db, "dossier_artifacts", id), sanitizeFirestoreData(artifact)); 
      updateTasteGraph(uid, 'image', { imageUrl: imageUrl });
    } catch (e) {}
  }
  return id;
};

export const createDossierArtifactFromStrategy = async (uid: string, folderId: string, audit: StrategyAudit) => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) return '';
  const id = `artifact_${Date.now()}`;
  
  const title = `${audit.platform} Strategy Audit`;
  const content = JSON.stringify(audit.read, null, 2);
  
  const artifact: DossierArtifact = {
    id, userId: uid, folderId, type: 'strategy', title, createdAt: Date.now(),
    elements: [{ id: 'el_0', type: 'text', content }],
    tags: [audit.platform.toLowerCase(), 'strategy', 'audit'],
    status: 'active'
  };
  
  await saveArtifactLocally(artifact);
  
  if (uid && auth.currentUser && navigator.onLine) {
    try { 
      await setDoc(doc(db, "dossier_artifacts", id), sanitizeFirestoreData(artifact)); 
    } catch (e) {}
  }
  return id;
};

export const createDossierArtifactFromText = async (uid: string, folderId: string, title: string, text: string, layout?: MoodboardLayout) => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) return '';
  const id = `artifact_${Date.now()}`;
  
  // Generate tags automatically
  const { generateTagsFromMedia } = await import("./geminiService");
  const tags = await generateTagsFromMedia(`Text artifact: ${title} - ${text}`);
  
  const artifact: DossierArtifact = {
    id, userId: uid, folderId, type: 'brief', title, createdAt: Date.now(),
    elements: [{ id: 'el_0', type: 'text', content: text }],
    tags, // Add tags
    status: 'active',
    ...(layout ? { layout } : {})
  };
  
  await saveArtifactLocally(artifact);
  
  if (uid && auth.currentUser && navigator.onLine) {
    try { 
      await setDoc(doc(db, "dossier_artifacts", id), sanitizeFirestoreData(artifact)); 
      updateTasteGraph(uid, 'text', { content: text });
    } catch (e) {}
  }
  return id;
};

export const deleteDossierArtifact = async (artifactId: string) => {
  try {
    await deleteDoc(doc(db, "dossier_artifacts", artifactId));
    // Note: We might also want to delete it from local storage if needed.
  } catch (e: any) {
    handleFirestoreError(e, OperationType.DELETE, `dossier_artifacts/${artifactId}`);
  }
};

export const updateDossierArtifact = async (artifactId: string, updates: Partial<DossierArtifact>) => {
  try {
    const artifactRef = doc(db, "dossier_artifacts", artifactId);
    await updateDoc(artifactRef, updates);
  } catch (e: any) {
    handleFirestoreError(e, OperationType.UPDATE, `dossier_artifacts/${artifactId}`);
  }
};

export const fetchDossierArtifacts = async (folderId: string) => {
  const localArtifacts = await getLocalArtifacts(folderId);
  
  if (!auth.currentUser || !navigator.onLine) {
    return localArtifacts.sort((a, b) => b.createdAt - a.createdAt);
  }

  try {
    const q = query(collection(db, "dossier_artifacts"), where("folderId", "==", folderId));
    const snap = await getDocs(q);
    const cloudArtifacts = snap.docs.map(d => d.data() as DossierArtifact);
    
    const artifactsMap = new Map<string, DossierArtifact>();
    localArtifacts.forEach(a => artifactsMap.set(a.id, a));
    cloudArtifacts.forEach(a => artifactsMap.set(a.id, a));
    
    return Array.from(artifactsMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) { 
    console.error("MIMI // Artifact Fetch Error:", e);
    return localArtifacts.sort((a, b) => b.createdAt - a.createdAt);
  }
};

export const fetchLineageEntry = async (artifactId: string): Promise<LineageEntry | null> => {
  if (!auth.currentUser || !navigator.onLine) return null;
  try {
    const q = query(collection(db, "lineage_entries"), where("artifact_id", "==", artifactId), where("userId", "==", auth.currentUser.uid));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as LineageEntry;
  } catch (e) {
    console.error("MIMI // Lineage Fetch Error:", e);
    return null;
  }
};

export const fetchAllLineageEntries = async (uid: string): Promise<LineageEntry[]> => {
  if (!uid || uid === 'ghost' || !auth.currentUser || !navigator.onLine) return [];
  try {
    const q = query(collection(db, "lineage_entries"), where("userId", "==", uid));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => d.data() as LineageEntry);
    return docs.sort((a, b) => a.timestamp - b.timestamp);
  } catch (e) {
    console.error("MIMI // Lineage Fetch Error:", e);
    return [];
  }
};

// -- PROPOSAL SYSTEM CRUD -- //

export const saveProposal = async (proposal: Proposal): Promise<void> => {
  if (auth.currentUser && navigator.onLine) {
    try { await setDoc(doc(db, "proposals", proposal.id), sanitizeFirestoreData(proposal)); } catch (e) {}
  }
};

export const fetchUserProposals = async (uid: string) => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) return [];
  try {
    const q = query(collection(db, "proposals"), where("userId", "==", uid));
    const docs = (await getDocs(q)).docs.map(d => d.data() as Proposal);
    return docs.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (e) { return []; }
};

export const getProposalById = async (id: string) => {
  try {
    const s = await getDoc(doc(db, "proposals", id));
    return s.exists() ? s.data() as Proposal : null;
  } catch (e) { return null; }
};

// -- SHARED CONTEXT SYSTEM -- //

export const addContextEntry = async (uid: string, text: string, type: 'note' | 'link' = 'note'): Promise<string> => {
  if (!uid || uid === 'ghost' || !auth.currentUser || !text) throw new Error("Invalid Context Input");
  const id = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const entry: ContextEntry = {
    id,
    userId: uid,
    text,
    type,
    timestamp: Date.now()
  };
  
  if (navigator.onLine && auth.currentUser) {
    try { await setDoc(doc(db, "context", id), sanitizeFirestoreData(entry)); } catch (e) {}
  }
  return id;
};

export const fetchContextEntries = async (limitCount: number = 50) => {
  if (!auth.currentUser) return [];
  try {
    const q = query(
      collection(db, "context"), 
      where("userId", "==", auth.currentUser.uid)
    );
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => d.data() as ContextEntry);
    return docs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limitCount);
  } catch (e) { return []; }
};

export const deleteContextEntry = async (id: string) => {
  if (auth.currentUser && navigator.onLine) {
    try { await deleteDoc(doc(db, "context", id)); } catch (e) {}
  }
};

// -- REAL-TIME LISTENERS & PROFILES --

const getCache = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data as T;
  } catch (e) {
    return null;
  }
};

const setCache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {}
};

export const resetFirestoreNetwork = async () => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  console.info("MIMI // Resetting Firestore Network Connection...");
  try {
    const { enableNetwork, disableNetwork } = await import('firebase/firestore');
    await disableNetwork(db);
    await enableNetwork(db);
    // Wait a bit for the network to actually stabilize
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (e) {
    try {
      const { enableNetwork } = await import('firebase/firestore');
      await enableNetwork(db);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (e2) {}
  }
};

// Updated: 'profiles' collection for Identity
export const getUserProfile = async (uid: string) => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) return null;
  
  const cacheKey = `profile_${uid}`;
  const cached = getCache<UserProfile>(cacheKey);
  if (cached) return cached;

  try {
    const { fetchSovereignProfileByUid } = await import("./sovereignClient");
    const sovereign = await fetchSovereignProfileByUid(uid);
    if (sovereign) {
      setCache(cacheKey, sovereign);
      return sovereign;
    }
  } catch {
    // fall through
  }

  let retries = 2; // Reduced retries
  while (retries > 0) {
    try {
      if (retries < 2) {
        await resetFirestoreNetwork();
      }
      const d = await getDoc(doc(db, "profiles_public", uid));
      if (d.exists()) {
        const data = d.data() as UserProfile;
        setCache(cacheKey, data);
        return data;
      }
      return null;
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (isFirestoreQuotaError(e)) {
        console.warn("MIMI // Profile Read: Firestore quota exhausted");
        return null;
      }
      if (errorMessage.includes('offline') && retries > 1) {
        console.warn(`MIMI // getUserProfile: Offline error, retrying... (${retries - 1} left)`);
        await new Promise(resolve => setTimeout(resolve, 800)); // Reduced delay
        retries--;
        continue;
      }
      console.warn("MIMI // Profile Read Blocked:", e.code);
      return null;
    }
  }
  return null;
};

export const saveUserProfile = async (p: UserProfile) => {
  if (!p.uid || p.uid === 'ghost' || !auth.currentUser) return;
  {
    const { mirrorProfileToSovereign } = await import("./sovereignClient");
    void mirrorProfileToSovereign(p);
  }
  try {
    await setDoc(doc(db, "profiles_public", p.uid), sanitizeFirestoreData(p), { merge: true });
    setCache(`profile_${p.uid}`, p);
  } catch (e: any) {
    console.warn("MIMI // Profile Write Blocked:", e.code);
  }
};

export const commitGlobalHandshake = async (uid: string, newHandle: string, newAvatar: string | null) => {
  if (!uid || uid === 'ghost' || !auth.currentUser) return;
  try {
    // 1. Update Zines
    const zinesQuery = query(collection(db, "zines"), where("userId", "==", uid));
    const zinesSnap = await getDocs(zinesQuery);
    const zineUpdates = zinesSnap.docs.map(d => 
      updateDoc(d.ref, { userHandle: newHandle, userAvatar: newAvatar })
    );

    // 2. Update Public Transmissions
    const transQuery = query(collection(db, "public_transmissions"), where("userId", "==", uid));
    const transSnap = await getDocs(transQuery);
    const transUpdates = transSnap.docs.map(d => {
      const data = d.data();
      const updates: any = { userHandle: newHandle };
      if (data.zineData) {
        updates['zineData.userHandle'] = newHandle;
        updates['zineData.userAvatar'] = newAvatar;
      }
      return updateDoc(d.ref, updates);
    });

    await Promise.all([...zineUpdates, ...transUpdates]);
    console.info("MIMI // Global Handshake Committed.");
  } catch (e: any) {
    console.error("MIMI // Global Handshake Failed:", e);
  }
};

// Updated: 'userPreferences' collection for private data (drafts, personas, etc)
export const getUserPreferences = async (uid: string) => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) return null;
  
  const cacheKey = `prefs_${uid}`;
  const cached = getCache<UserPreferences>(cacheKey);
  if (cached) return cached;

  let retries = 2; // Reduced retries
  while (retries > 0) {
    try {
      if (retries < 2) {
        await resetFirestoreNetwork();
      }
      const d = await getDoc(doc(db, "userPreferences", uid));
      if (d.exists()) {
        const data = d.data() as UserPreferences;
        setCache(cacheKey, data);
        return data;
      }
      return null;
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes('offline') && retries > 1) {
        console.warn(`MIMI // getUserPreferences: Offline error, retrying... (${retries - 1} left)`);
        await new Promise(resolve => setTimeout(resolve, 800)); // Reduced delay
        retries--;
        continue;
      }
      console.warn("MIMI // Prefs Read Blocked:", e.code);
      return null;
    }
  }
  return null;
};

export const saveUserPreferences = async (uid: string, p: UserPreferences) => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) return;
  try {
    await setDoc(doc(db, "userPreferences", uid), sanitizeFirestoreData(p), { merge: true });
    setCache(`prefs_${uid}`, p);
  } catch (e: any) {
    console.warn("MIMI // Prefs Write Blocked:", e.code);
  }
};

export const saveLineageEntry = async (entry: LineageEntry): Promise<string> => {
  if (!entry.userId || entry.userId === 'ghost' || !auth.currentUser || !navigator.onLine) return '';
  const id = `lineage_${Date.now()}`;
  const entryWithId = { ...entry, id };
  try {
    await setDoc(doc(db, "lineage_entries", id), sanitizeFirestoreData(entryWithId));
    return id;
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, "lineage_entries");
    return '';
  }
};

// REAL-TIME SUBSCRIPTIONS
export const subscribeToUserProfile = (uid: string, callback: (p: UserProfile | null) => void) => {
  devLog.info("MIMI // subscribeToUserProfile called");
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) {
    console.warn("MIMI // subscribeToUserProfile: Access denied or invalid UID:", uid);
    callback(null);
    return () => {};
  }
  return onSnapshot(doc(db, "profiles_public", uid), 
    (doc) => callback(doc.exists() ? doc.data() as UserProfile : null),
    (error) => {
        console.error("MIMI // subscribeToUserProfile Error:", error);
        logFirestoreError(error, OperationType.GET, `profiles_public/${uid}`);
    }
  );
};

export const subscribeToUserPreferences = (uid: string, callback: (p: UserPreferences | null) => void) => {
  if (!uid || uid === 'ghost' || !isFullyAuthenticated()) {
    callback(null);
    return () => {};
  }
  return onSnapshot(doc(db, "userPreferences", uid), 
    (doc) => callback(doc.exists() ? doc.data() as UserPreferences : null),
    (error) => {
      if (error.code === 'permission-denied' && auth.currentUser?.uid !== uid) {
        console.warn(`MIMI // Ignored permission-denied for userPreferences/${uid} due to auth state change.`);
        return;
      }
      logFirestoreError(error, OperationType.GET, `userPreferences/${uid}`);
    }
  );
};

// MIGRATION LOGIC REMOVED

export const startGhostSession = () => signInAnonymously(auth);

// SAFER REDIRECT HANDLER
export const handleAuthRedirect = async () => {
  try {
    // Add a timeout to prevent hanging in restricted iframes
    const redirectPromise = getRedirectResult(auth);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redirect handshake timed out')), 6000) // Increased to 6s
    );

    const result = await Promise.race([redirectPromise, timeoutPromise]) as any;
    if (result) {
      console.info("MIMI // Redirect Handshake Successful:", result.user.email);
    }
    return result;
  } catch(e: any) {
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    console.warn("MIMI // Redirect Handshake Error:", e.code || 'timeout', e.message);
    
    // Notify the user via a global event
    if (e.code === 'auth/credential-already-in-use') {
        window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
            detail: { message: "This Google frequency is already occupied by another registry.", type: 'error' } 
        }));
    } else if (e.code === 'auth/internal-error' && isIframe) {
        window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
            detail: { message: "Identity Anchor Failed: Browser blocked the handshake. Please enable third-party cookies, try opening in a new tab, or use Email/Password.", type: 'error' } 
        }));
    } else if (e.message !== 'Redirect handshake timed out') {
        window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
            detail: { message: `Identity Anchor Failed: ${e.message}`, type: 'error' } 
        }));
    }
    return null;
  }
};

export const isHandleAvailable = async (handle: string, excludeUid?: string): Promise<boolean> => {
  if (!handle || handle.length < 2) return false;
  try {
    const q = query(collection(db, "profiles_public"), where("handle", "==", handle.toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return true;
    if (excludeUid && snap.docs.length === 1 && snap.docs[0].data().uid === excludeUid) return true;
    return false;
  } catch (e) {
    console.error("MIMI // isHandleAvailable error:", e);
    return false;
  }
};

export const getUserByHandle = async (handle: string): Promise<UserProfile | null> => {
  try {
    const { fetchSovereignProfileByHandle } = await import("./sovereignClient");
    const sovereign = await fetchSovereignProfileByHandle(handle);
    if (sovereign) return sovereign;
  } catch {
    // fall through
  }
  try {
    const q = query(collection(db, "profiles_public"), where("handle", "==", handle.toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as UserProfile;
  } catch (e) {
    console.error("MIMI // getUserByHandle error:", e);
    return null;
  }
};

export const uploadBlob = async (blob: Blob, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
};

export const uploadBase64Image = async (base64String: string, path: string): Promise<string> => {
  const { uploadString } = await import("firebase/storage");
  const storageRef = ref(storage, path);
  await uploadString(storageRef, base64String, 'data_url');
  return getDownloadURL(storageRef);
};

export const fetchLatestLineageEntry = async (uid: string): Promise<LineageEntry | null> => {
    try {
        devLog.log("MIMI // Fetching lineage");
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(collection(db, "lineage_entries"), where("userId", "==", uid));
        const snap = await getDocs(q);
        console.log("MIMI // Lineage fetch successful, count:", snap.size);
        if (!snap.empty) {
            const sorted = snap.docs.map(d => d.data() as LineageEntry).sort((a, b) => b.timestamp - a.timestamp);
            return sorted[0];
        }
        return null;
    } catch (e: any) {
        console.error("MIMI // Latest Lineage Fetch Error:", e);
        return null;
    }
};

export const createNotification = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    try {
        const notificationRef = collection(db, 'notifications');
        await addDoc(notificationRef, {
            userId,
            title,
            message,
            type,
            read: false,
            timestamp: Date.now()
        });
    } catch (e: any) {
        console.error("MIMI // Notification Creation Error:", e);
    }
};

// --- Zine Folder Management ---
export const createZineFolder = async (userId: string, name: string): Promise<string | null> => {
  if (!isFullyAuthenticated()) return null;
  try {
    const folderRef = doc(collection(db, "zine_folders"));
    const folder = {
      id: folderRef.id,
      userId,
      name,
      createdAt: Date.now()
    };
    await setDoc(folderRef, folder);
    return folder.id;
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, "zine_folders");
    return null;
  }
};

export const fetchZineFolders = async (userId: string): Promise<any[]> => {
  if (!isFullyAuthenticated()) return [];
  try {
    const q = query(collection(db, "zine_folders"), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  } catch (e) {
    logFirestoreError(e, OperationType.LIST, "zine_folders");
    return [];
  }
};

export const updateZineFolder = async (folderId: string, name: string): Promise<boolean> => {
  if (!isFullyAuthenticated()) return false;
  try {
    const folderRef = doc(db, "zine_folders", folderId);
    await updateDoc(folderRef, { name });
    return true;
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, `zine_folders/${folderId}`);
    return false;
  }
};

export const deleteZineFolder = async (folderId: string): Promise<boolean> => {
  if (!isFullyAuthenticated()) return false;
  try {
    const folderRef = doc(db, "zine_folders", folderId);
    await deleteDoc(folderRef);
    return true;
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `zine_folders/${folderId}`);
    return false;
  }
};

export const deleteZine = async (zineId: string): Promise<void> => {
  await deleteLocalZine(zineId);
  if (isFullyAuthenticated()) {
    try {
      await deleteDoc(doc(db, "zines", zineId));
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, `zines/${zineId}`);
    }
  }
  // Keep the owned archive in sync so deleted issues leave Floor / Mine.
  try {
    const uid = auth.currentUser?.uid;
    if (uid && zineId) {
      const { deleteSovereignZine } = await import("./sovereignClient");
      void deleteSovereignZine(zineId, uid);
    }
  } catch {
    // ignore mirror failures
  }
};

export const moveZineToFolder = async (zineId: string, folderId: string | null): Promise<boolean> => {
  try {
    // Update locally first
    const localZines = await getLocalZines() || [];
    const zineIndex = localZines.findIndex(z => z.id === zineId);
    if (zineIndex !== -1) {
      localZines[zineIndex].folderId = folderId || undefined;
      await saveZineLocally(localZines[zineIndex]);
    }

    if (!isFullyAuthenticated()) return true; // If not authenticated, local update is enough

    const zineRef = doc(db, "zines", zineId);
    await updateDoc(zineRef, { folderId: folderId || null });
    return true;
  } catch (e) {
    console.error("MIMI // Error moving zine to folder:", e);
    return false;
  }
};
