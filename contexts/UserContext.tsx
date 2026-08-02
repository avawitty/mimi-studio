// @ts-nocheck
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { UserProfile, UserPreferences, Persona, TailorLogicDraft, NarrativeThread } from '../types';
import { getLocalProfile, getLocalPocket, saveProfileLocally } from '../services/localArchive';
import { 
  bootstrapAuth, ensureAuth, getUserProfile, saveUserProfile, commitGlobalHandshake,
  anchorIdentity, linkIdentity, handleAuthRedirect, startGhostSession, 
  initializeAuthPersistence, getUserPreferences, saveUserPreferences, 
  subscribeToUserProfile, subscribeToUserPreferences, migrateLocalToCloud, db, auth,
  isCaptiveInWebview, subscribeToPocketItems
} from '../services/firebase';
import { recordSession as recordSessionService } from '../services/retentionService';
import { syncSessionCookie, clearSessionCookie } from '../services/authSession';
import { formatAuthError } from '../lib/formatAuthError';
import { devLog } from '../lib/devLog';
import { onAuthStateChanged } from 'firebase/auth';
import { Star } from 'lucide-react';
import { setGlobalKeyRing } from '../services/geminiClient';
import { hasAccess } from '../constants';
import { fetchUserSubscription } from '../services/membershipPipeline';
import { clearLegacyUsedContextState } from '../services/usedContextService';
import { clearLegacyEditCompileState } from '../lib/editCompileExport';
import { buildCreditGrant } from '../lib/mimiEntitlements';

interface SystemStatus {
  auth: 'syncing' | 'anchored' | 'offline';
  oracle: 'ready' | 'saturated' | 'unavailable';
  storage: 'nominal' | 'limited' | 'full';
  latency?: number;
  ai?: {
    serverAiEnabled: boolean;
    defaultProvider?: 'gateway' | 'legacy';
    openai: boolean;
    gemini: boolean;
    anthropic: boolean;
    openrouter?: boolean;
    aiGateway?: boolean;
    replicate?: boolean;
  };
}

export interface FeatureFlags {
  scry: boolean;
  darkroom: boolean;
  theLens: boolean;
  tailor: boolean;
  proposal: boolean;
}

interface UserContextType {
  user: { uid: string, isAnonymous: boolean, email?: string | null } | null;
  profile: UserProfile | null;
  loading: boolean;
  isElevatorLoading: boolean;
  setElevatorLoading: (loading: boolean) => void;
  updateProfile: (profile: UserProfile) => Promise<void>;
  toggleZineStar: (zineId: string) => Promise<void>;
  login: (forceRedirect?: boolean) => Promise<void>;
  loginWithEmail: (email: string, redirectUrl: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  upgradeGhostAccount: (email: string, password: string) => Promise<void>;
  completeEmailLogin: (url: string) => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  ghostLogin: () => Promise<void>;
  speedGhostEntrance: () => Promise<void>;
  linkAccount: (forceRedirect?: boolean) => Promise<void>;
  keyLogin: (handle: string, apiKey: string) => Promise<void>;
  verifyIdentity: () => Promise<void>;
  isEnvironmentRestricted: boolean;
  isDatabaseMissing: boolean;
  isSimulatedMode: boolean;
  isKeyBlocked: boolean;
  setKeyBlocked: (blocked: boolean) => void;
  authError: string | null;
  hasApiKey: boolean;
  openKeySelector: () => Promise<void>;
  logout: () => void;
  refreshHasApiKey: () => Promise<void>;
  systemStatus: SystemStatus;
  setOracleStatus: (status: SystemStatus['oracle']) => void;
  apiKeys: Record<string, string>;
  setApiKey: (provider: string, key: string) => void;
  removeApiKey: (provider: string) => void;
  activeLlmProvider: 'gemini' | 'openai' | 'anthropic';
  setActiveLlmProvider: (provider: 'gemini' | 'openai' | 'anthropic') => void;
  featureFlags: FeatureFlags;
  toggleFeature: (key: keyof FeatureFlags) => void;
  enabledAlgos: string[];
  toggleAlgo: (algoId: string) => void;
  personas: Persona[];
  activePersonaId: string | undefined;
  activePersona: Persona | undefined;
  switchPersona: (personaId: string) => void;
  createPersona: (name: string, apiKey?: string, identityReframe?: string) => Promise<void>;
  updatePersona: (persona: Persona) => Promise<void>;
  deletePersona: (personaId: string) => Promise<void>;
  // Patron & Generation Tracking
  canGenerate: boolean;
  generationsRemaining: number;
  activatePatron: (key: string) => Promise<void>;
  upgradePlan: (plan: 'core' | 'optioning' | 'pro' | 'lab', interval?: 'month' | 'year') => Promise<void>;
  incrementGeneration: (cost?: number) => Promise<void>;
  recordSession: () => Promise<void>;
  forceBypassAuth: () => void;
  activeThread: NarrativeThread | null;
  setActiveThread: (thread: NarrativeThread | null) => void;
  pocket: any[];
  setPocket: (pocket: any[]) => void;
  setUiMode: (mode: 'stage' | 'control') => Promise<void>;
  setDnaMapped: (mapped: boolean) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

const DEFAULT_FLAGS: FeatureFlags = {
  scry: true,
  darkroom: true,
  theLens: true,
  tailor: true,
  proposal: true
};

const DEFAULT_DRAFT: TailorLogicDraft = {
  positioningCore: {
    anchors: { culturalReferences: ['Brutalism', 'Cyber-Noir', 'Analog-Glitch'], ideologicalBias: [] },
    aestheticCore: { silhouettes: [], materiality: [], eraBias: 'Post-Digital', presentation: 'Androgynous', density: 5, entropy: 5, tags: [] },
    positioningAxis: 'Signal vs Noise',
    authorityClaim: 'Aesthetic infrastructure for long-term cultural positioning.',
    exclusionPrinciples: ['Avoid reactive trend commentary', 'Refuse cross-cluster dilution without thesis']
  },
  algoDials: {
    webScry: 50,
    memorySynthesis: 50,
    dissonance: 10
  },
  expressionEngine: {
    chromaticRegistry: { primaryPalette: [], baseNeutral: '#F2F1ED', accentSignal: '#1C1917' },
    typographyIntent: { styleDescription: 'Cormorant Garamond', weightPreference: 'Light' },
    narrativeVoice: { emotionalTemperature: 'CLINICAL', structureBias: 'CONCISE', lexicalDensity: 5, restraintLevel: 8, voiceNotes: '' },
    brandIdentity: { fonts: { serif: 'Cormorant Garamond', sans: 'Inter', mono: 'Space Mono' }, logo: '', palette: ['#000000', '#FFFFFF'] }
  },
  strategicVectors: {
    expansionTolerance: 5,
    fiscalVelocity: 'measured',
    desireVectors: { deepen: [], reduce: [], experiment: [], refuse: [] },
    saturationAwareness: { oversaturatedClusters: [], fragileDifferentiators: [] }
  },
  diagnostics: {
    contradictionFlags: [],
    dilutionRisks: [],
    authorityStrengthScore: 50,
    driftVulnerability: 5
  },
  strategicSummary: {
    identityVector: 'A baseline identity vector focused on signal over noise.',
    authorityAnchor: 'Aesthetic infrastructure.',
    exclusionRules: [],
    elasticityIndex: 5,
    tonalConstraints: 'Restrained and precise.',
    aestheticDNA: 'Post-Digital Minimalism.'
  },
  celestialCalibration: { enabled: false, zodiac: 'gemini', astrologicalLineage: '', seasonalAlignment: '' },
  generationTemperature: 0.8,
  draftStatus: 'provisional',
  lastTailored: Date.now()
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  devLog.info("MIMI // UserProvider Rendering");
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<{ uid: string, isAnonymous: boolean, email?: string | null } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isElevatorLoading, setElevatorLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isEnvironmentRestricted, setIsEnvironmentRestricted] = useState(false);
  const [isDatabaseMissing, setIsDatabaseMissing] = useState(false);
  const [isSimulatedMode, setIsSimulatedMode] = useState(() => {
    try {
      return localStorage.getItem('mimi_simulated_mode') === '1';
    } catch {
      return false;
    }
  });
  const [isKeyBlocked, setKeyBlocked] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    auth: 'syncing',
    oracle: 'ready',
    storage: isSimulatedMode ? 'limited' : 'nominal'
  });
  
  const [activeThread, setActiveThread] = useState<NarrativeThread | null>(null);
  const [pocket, setPocket] = useState<any[]>([]);
  
  const [apiKeys, setApiKeysState] = useState<Record<string, string>>({});
  const [activeLlmProvider, setActiveLlmProviderState] = useState<'gemini' | 'openai' | 'anthropic' | 'gateway'>(() => {
    const stored = localStorage.getItem('mimi_active_llm');
    return stored === 'gemini' || stored === 'anthropic' || stored === 'openai' || stored === 'gateway'
      ? stored
      : 'gemini';
  });

  useEffect(() => {
    import('../services/aiProvider').then(m => m.setGlobalAIProvider(activeLlmProvider));
  }, [activeLlmProvider]);

  const setActiveLlmProvider = (provider: 'gemini' | 'openai' | 'anthropic' | 'gateway') => {
      setActiveLlmProviderState(provider);
      localStorage.setItem('mimi_active_llm', provider);
      import('../services/aiProvider').then(m => m.setGlobalAIProvider(provider));
  };

  // Keep React state in sync when Oracle failover writes mimi_active_llm outside setActiveLlmProvider.
  useEffect(() => {
    const onProviderChanged = (event: Event) => {
      const provider = (event as CustomEvent<{ provider?: string }>).detail?.provider;
      if (
        provider === 'gemini' ||
        provider === 'openai' ||
        provider === 'anthropic' ||
        provider === 'gateway'
      ) {
        setActiveLlmProviderState(provider);
      }
    };
    window.addEventListener('mimi:llm_provider_changed', onProviderChanged);
    return () => window.removeEventListener('mimi:llm_provider_changed', onProviderChanged);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (cancelled || !payload?.ai) return;
        setSystemStatus((previous) => ({ ...previous, ai: payload.ai }));
        const storedProvider = localStorage.getItem('mimi_active_llm');
        // Only pick a default when the user has never chosen a provider.
        // Do NOT force-switch to gateway on every load — that routes Compose
        // through funded AI Gateway and 403s when trial credits are exhausted.
        if (storedProvider === 'gemini' || storedProvider === 'anthropic' || storedProvider === 'openai' || storedProvider === 'gateway') {
          return;
        }
        const availableProvider: 'gateway' | 'openai' | 'gemini' | 'anthropic' | null =
          (payload.ai.gateway || payload.ai.aiGateway)
            ? 'gateway'
            : payload.ai.openai
              ? 'openai'
              : payload.ai.gemini
                ? 'gemini'
                : payload.ai.anthropic
                  ? 'anthropic'
                  : null;
        if (availableProvider) {
          setActiveLlmProviderState(availableProvider);
          localStorage.setItem('mimi_active_llm', availableProvider);
          import('../services/aiProvider').then((module) =>
            module.setGlobalAIProvider(availableProvider),
          );
        }
      })
      .catch(() => {
        // The studio remains usable in local/simulated mode when health is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(() => {
    try {
      const stored = localStorage.getItem('mimi_feature_flags');
      return stored ? { ...DEFAULT_FLAGS, ...JSON.parse(stored) } : DEFAULT_FLAGS;
    } catch {
      return DEFAULT_FLAGS;
    }
  });

  // Listeners Ref
  const unsubscribeProfile = useRef<(() => void) | null>(null);
  const unsubscribePrefs = useRef<(() => void) | null>(null);
  const unsubscribePocket = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Ignore Vite & WebSocket errors
      if (event.reason) {
        const reasonMsg = (event.reason instanceof Error ? event.reason.message : String(event.reason)).toLowerCase();
        if (
          reasonMsg.includes('websocket closed without opened') ||
          reasonMsg.includes('failed to connect to websocket') ||
          reasonMsg.includes('websocket connection') ||
          reasonMsg.includes('[vite] failed to connect')
        ) {
          event.preventDefault();
          return;
        }
      }

      // Ignore MetaMask extension errors
      if (event.reason && (
          (event.reason instanceof Error && event.reason.message.includes('Failed to connect to MetaMask')) ||
          (typeof event.reason === 'string' && event.reason.includes('Failed to connect to MetaMask'))
      )) {
        event.preventDefault();
        return;
      }

      // Ignore empty errors
      if (event.reason instanceof Error && !event.reason.message) {
        event.preventDefault();
        return;
      }

      // Ignore Firestore errors that are already logged by handleFirestoreError
      if (event.reason instanceof Error && event.reason.message.includes('{"error":') && event.reason.message.includes('"operationType":')) {
        event.preventDefault();
        return;
      }

      // Ignore Firestore errors that are already logged by handleFirestoreError
      if (event.reason instanceof Error && event.reason.message.includes('{"error":') && event.reason.message.includes('"operationType":')) {
        event.preventDefault();
        return;
      }

      console.error("MIMI // Unhandled Rejection:", event.reason);
      if (event.reason instanceof Error) {
        console.error("MIMI // Error Message:", event.reason.message);
        console.error("MIMI // Stack:", event.reason.stack);
      } else {
        console.error("MIMI // Reason:", JSON.stringify(event.reason));
      }
    };
    const handleErrorEvent = (event: ErrorEvent) => {
      if (event.message && typeof event.message === 'string' && event.message.includes('Failed to connect to MetaMask')) {
        event.preventDefault();
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleErrorEvent);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleErrorEvent);
    };
  }, []);

  useEffect(() => {
    const handleKeyUpdated = (e: any) => {
      const { provider, key } = e.detail;
      setApiKeysState(prev => {
        const next = { ...prev };
        if (key) {
          next[provider] = key;
        } else {
          delete next[provider];
        }
        return next;
      });
    };
    window.addEventListener('mimi_key_updated' as any, handleKeyUpdated);
    return () => {
      window.removeEventListener('mimi_key_updated' as any, handleKeyUpdated);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mimi_api_keys');
      if (stored) {
          const keys = JSON.parse(stored);
          setApiKeysState(keys);
      } else {
        // Fallback or migration
        const oldStored = localStorage.getItem('mimi_key_ring');
        if (oldStored) {
          const oldKeys = JSON.parse(oldStored);
          if (oldKeys.length > 0) {
            const migrated = { gemini: oldKeys[0] };
            setApiKeysState(migrated);
            localStorage.setItem('mimi_api_keys', JSON.stringify(migrated));
          }
        }
      }
    } catch(e) {}
  }, []);

  const toggleFeature = (key: keyof FeatureFlags) => {
    setFeatureFlags(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('mimi_feature_flags', JSON.stringify(next));
      return next;
    });
  };

  const toggleAlgo = (algoId: string) => {
    if (!profile) return;
    const current = profile.enabledAlgos || [];
    const next = current.includes(algoId) ? current.filter(a => a !== algoId) : [...current, algoId];
    updateProfile({ ...profile, enabledAlgos: next });
  };

  const setApiKey = (provider: string, key: string) => {
    const trimmed = key.trim();
    if (!trimmed) return;
    const updated = { ...apiKeys, [provider]: trimmed };
    setApiKeysState(updated);
    localStorage.setItem('mimi_api_keys', JSON.stringify(updated));
    setOracleStatus('ready');
    setKeyBlocked(false);
  };

  const removeApiKey = (provider: string) => {
    const updated = { ...apiKeys };
    delete updated[provider];
    setApiKeysState(updated);
    localStorage.setItem('mimi_api_keys', JSON.stringify(updated));
  };

  useEffect(() => {
    if (apiKeys.gemini) {
        setGlobalKeyRing([apiKeys.gemini]);
    } else {
        setGlobalKeyRing([]);
    }
  }, [apiKeys]);

  const initStarted = useRef(false);
  const reconciliationInProgress = useRef<string | null>(null);
  const pocketSyncGeneration = useRef(0);

  const refreshHasApiKey = useCallback(async () => {
    // Sovereign Gating Disabled as per user request
    setHasApiKey(true);
  }, []);

  const attachLocalPocketSync = useCallback(() => {
    if (unsubscribePocket.current) unsubscribePocket.current();
    const gen = ++pocketSyncGeneration.current;

    const hydrateLocalPocket = async () => {
      const items = await getLocalPocket();
      if (pocketSyncGeneration.current !== gen) return;
      setPocket(items || []);
    };

    void hydrateLocalPocket();
    const onLocalPocketUpdate = () => {
      void hydrateLocalPocket();
    };
    window.addEventListener("mimi:pocket_updated", onLocalPocketUpdate);
    unsubscribePocket.current = () => {
      window.removeEventListener("mimi:pocket_updated", onLocalPocketUpdate);
    };
  }, []);

  const setOracleStatus = (status: SystemStatus['oracle']) => {
    setSystemStatus(prev => ({ ...prev, oracle: status }));
  };

  useEffect(() => {
    refreshHasApiKey();
    const handleKeyVoid = () => {
      // Mark oracle unavailable, but never toast "configure API keys".
      // Plan-funded AI Gateway is the primary path; personal BYOK is optional.
      setOracleStatus('unavailable');
    };

    const handleKeyBlocked = () => {
      setOracleStatus('unavailable');
      setKeyBlocked(true);
      // Same rule: do not push users into Sovereign Profiles for BYOK.
    };
    
    const handleRegistryAlert = (e: any) => {
      const { message } = e.detail;
      if (!message) return;

      const msg = String(message).toLowerCase();
      const isHardMissing =
        msg.includes('database connection failed') ||
        (msg.includes('not-found') && msg.includes('database')) ||
        msg.includes('does not exist in project');
      // AI Gateway credit / sign-in denials mention "billing period" and must NOT
      // trip Simulated Mode — that was stacking System Dissonance toasts on Lab.
      const isGatewayCreditNotice =
        msg.includes('ai gateway') ||
        msg.includes('membership credits') ||
        msg.includes('plan credits') ||
        msg.includes('credits reload') ||
        msg.includes('billing period') ||
        msg.includes('sign in to use mimi') ||
        msg.includes('credits_exhausted') ||
        msg.includes('oracle could not complete') ||
        msg.includes('personal api keys are optional') ||
        msg.includes('personal gateway key');

      if (isGatewayCreditNotice) {
        // Unstick false-positive Simulated Mode from older "billing period" matches.
        setIsSimulatedMode(false);
        setIsDatabaseMissing(false);
        return;
      }

      const isBillingOrLimit =
        msg.includes('dunning') ||
        msg.includes('billing') ||
        msg.includes('quota') ||
        msg.includes('limit') ||
        msg.includes('403') ||
        msg.includes('invalid credential') ||
        msg.includes('invalid-credential') ||
        msg.includes('permission-denied');

      if (isBillingOrLimit) {
        setIsSimulatedMode(true);
        setIsDatabaseMissing(false);
        if (!msg.includes('automatic fallback to simulated mode')) {
          window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
            detail: {
              type: 'error',
              message: 'Automatic Fallback to Simulated Mode active due to billing/limit. Limiting functions in the Tailor.'
            }
          }));
        }
        return;
      }

      if (isHardMissing) {
        setIsDatabaseMissing(true);
      }
    };

    window.addEventListener('mimi:key_void', handleKeyVoid);
    window.addEventListener('mimi:key_blocked', handleKeyBlocked);
    window.addEventListener('mimi:registry_alert', handleRegistryAlert);
    return () => {
      window.removeEventListener('mimi:key_void', handleKeyVoid);
      window.removeEventListener('mimi:key_blocked', handleKeyBlocked);
      window.removeEventListener('mimi:registry_alert', handleRegistryAlert);
    };
  }, [refreshHasApiKey, apiKeys]);

  const ensurePersonas = (p: UserProfile): UserProfile => {
    // Keep guest identity and access truthful. Older local profiles may still
    // contain the former investor-demo overrides, so normalize them on read.
    const isGhostProfile = p.isSwan === false || p.uid.startsWith('local_ghost_');
    const normalizedProfile: UserProfile = isGhostProfile
      ? { ...p, isSwan: false, plan: 'free', planStatus: 'ghost', isPatron: false }
      : p;
    
    if (normalizedProfile.personas && normalizedProfile.personas.length > 0) {
        if (!normalizedProfile.activePersonaId) {
            return { ...normalizedProfile, activePersonaId: normalizedProfile.personas[0].id };
        }
        return normalizedProfile;
    }
    const defaultPersona: Persona = {
        id: 'persona_default',
        name: 'Personal',
        tailorDraft: normalizedProfile.tailorDraft || DEFAULT_DRAFT,
        createdAt: Date.now()
    };
    return {
        ...normalizedProfile,
        personas: [defaultPersona],
        activePersonaId: defaultPersona.id
    };
  };

  const reconcileProfile = useCallback(async (fbUser: any) => {
    const uid = auth.currentUser?.uid || fbUser.uid;
    if (!uid) {
      console.warn("MIMI // Reconcile: No UID available.");
      setUser(null); setProfile(null); setLoading(false);
      setSystemStatus(prev => ({ ...prev, auth: 'offline' }));
      if (unsubscribeProfile.current) unsubscribeProfile.current();
      if (unsubscribePrefs.current) unsubscribePrefs.current();
      if (unsubscribePocket.current) unsubscribePocket.current();
      setPocket([]);
      reconciliationInProgress.current = null;
      return;
    }
    
    // Key includes anon/registered so linking the same uid re-runs listeners.
    const reconcileKey = `${uid}:${fbUser.isAnonymous ? "a" : "r"}`;
    console.info("MIMI // Reconciling Profile for:", uid, fbUser.isAnonymous ? "(Ghost)" : "(Swan)");
    if (reconciliationInProgress.current === reconcileKey) {
      console.info("MIMI // Reconciliation already in progress for this identity. Skipping.");
      return;
    }
    reconciliationInProgress.current = reconcileKey;
    setSystemStatus(prev => ({ ...prev, auth: 'syncing' }));

    // Clear existing listeners to prevent duplication
    if (unsubscribeProfile.current) unsubscribeProfile.current();
    if (unsubscribePrefs.current) unsubscribePrefs.current();
    if (unsubscribePocket.current) unsubscribePocket.current();
    setPocket([]);

    try {
      const currentLocal = await getLocalProfile();
      
      // Unblock UI immediately if we have local data
      if (currentLocal && !profile) {
          const safeLocal = ensurePersonas({ 
              ...currentLocal, 
              uid: uid, 
              isSwan: !fbUser.isAnonymous,
              email: fbUser.email || currentLocal.email
          });
          setProfile(safeLocal);
          setUser({ uid: fbUser.uid, isAnonymous: !!fbUser.isAnonymous, email: fbUser.email });
          setLoading(false);
          console.info("MIMI // Reconcile: UI unblocked via Local Archive.");
      }

      let initialProfile = currentLocal;

      // 1. Initial Cloud Check & potential Migration
      let cloudProfileSnap = null;
      let cloudPrefsSnap = null;
      
      // Safety timeout for cloud sync to prevent hanging the splash screen
      const cloudSyncPromise = (async () => {
          // Retry logic for "permission-denied" or "offline" which often happens during the auth-to-firestore propagation window
          let retries = 3; // Reduced retries
          while (retries > 0) {
              try {
                  const { enableNetwork } = await import('firebase/firestore');
                  if (retries < 3) {
                      console.info("MIMI // Reconcile: Forcing network enable...");
                      await enableNetwork(db);
                  }
                  
                  return await Promise.all([
                      getUserProfile(uid),
                      getUserPreferences(uid)
                  ]);
              } catch (err: any) {
                  const isPermissionDenied = err.code === 'permission-denied';
                  const isOffline = err.message?.includes('offline') || err.code === 'unavailable';
                  
                  if ((isPermissionDenied || isOffline) && retries > 1) {
                      console.warn(`MIMI // ${isPermissionDenied ? 'Permission Denied' : 'Offline'}. Retrying... (${retries - 1} left)`);
                      // Exponential backoff
                      const delay = (4 - retries) * 1000;
                      await new Promise(r => setTimeout(r, delay));
                      retries--;
                  } else {
                      throw err;
                  }
              }
          }
          return [null, null];
      })();

      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve([null, null]), 5000));
      
      [cloudProfileSnap, cloudPrefsSnap] = await Promise.race([cloudSyncPromise, timeoutPromise]) as any;
      
      if (reconciliationInProgress.current !== reconcileKey) {
          console.info("MIMI // User changed during reconciliation. Aborting.");
          return;
      }

      // Prefer live auth identity — fbUser can be stale if account was linked mid-flight.
      const liveIsAnonymous = () => auth.currentUser?.isAnonymous ?? !!fbUser.isAnonymous;

      // Fetch subscription data with a race to prevent hanging.
      // Anonymous ghosts don't have billing docs — skip the read.
      let subscription: any = null;
      if (!liveIsAnonymous()) {
        const subPromise = fetchUserSubscription(uid);
        const subTimeout = new Promise((resolve) => setTimeout(() => resolve(null), 4000));
        subscription = await Promise.race([subPromise, subTimeout]) as any;
      }
      
      // 2. Setup Real-time Listeners
      unsubscribeProfile.current = subscribeToUserProfile(uid, async (pData) => {
         try {
             // Ghosts never carry billing — clear explicitly (null ?? prev would keep stale sub).
             const isGhost = liveIsAnonymous();
             const nextSub = isGhost ? null : await fetchUserSubscription(uid);
             setProfile(prev => {
                 const merged = {
                   ...(prev || {}),
                   ...pData,
                   uid: uid,
                   subscription: isGhost ? null : (nextSub ?? prev?.subscription ?? null),
                 } as UserProfile;
                 return ensurePersonas(merged);
             });
         } catch (e) {
             console.error("MIMI // Error in profile subscription callback:", e);
         }
      });

      unsubscribePrefs.current = subscribeToUserPreferences(uid, async (prefsData) => {
         try {
             const isGhost = liveIsAnonymous();
             const nextSub = isGhost ? null : await fetchUserSubscription(uid);
             setProfile(prev => {
                 const merged = {
                   ...(prev || {}),
                   ...prefsData,
                   subscription: isGhost ? null : (nextSub ?? prev?.subscription ?? null),
                 } as UserProfile;
                 return ensurePersonas(merged);
             });
         } catch (e) {
             console.error("MIMI // Error in prefs subscription callback:", e);
         }
      });

      // Pocket live sync is for registered sessions; ghosts stay on local pocket.
      // Re-check live auth in case identity upgraded during cloud fetch.
      if (!liveIsAnonymous()) {
        pocketSyncGeneration.current += 1;
        unsubscribePocket.current = subscribeToPocketItems(uid, (items) => {
          setPocket(items);
        });
      } else {
        attachLocalPocketSync();
      }
      
      // Construct initial state from one-time fetch to unblock UI immediately
      // (Listeners will follow up with updates)
      const mergedCloud = { 
          ...(cloudProfileSnap || {}), 
          ...(cloudPrefsSnap || {}),
          uid: uid,
          isSwan: !fbUser.isAnonymous,
          email: fbUser.email,
          photoURL: (cloudProfileSnap?.photoURL) || fbUser.photoURL || null,
          subscription
      } as UserProfile;

      // If migration happened, local is the best source until listeners fire
      // If cloud data existed, use that.
      if (cloudProfileSnap || cloudPrefsSnap) {
          initialProfile = mergedCloud;
          
          // Upgrade ghost trial to full trial if user is no longer anonymous
          if (!fbUser.isAnonymous && initialProfile.planStatus === 'ghost') {
              initialProfile.planStatus = 'trial';
              if (initialProfile.trial) {
                  initialProfile.trial.grantedCredits = 12;
                  initialProfile.trial.remainingCredits = 12 - (initialProfile.trial.usedCredits || 0);
                  initialProfile.trial.endsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
                  initialProfile.trial.convertedAt = Date.now();
              }
              // Save the upgraded profile to the cloud
              if (navigator.onLine) {
                  saveUserProfile(initialProfile).catch(console.error);
              }
          }
      } else if (currentLocal) {
          initialProfile = { 
            ...currentLocal, 
            uid: uid, 
            isSwan: !fbUser.isAnonymous,
            email: fbUser.email,
            photoURL: currentLocal.photoURL || fbUser.photoURL || null,
            subscription
          };
          
          // Upgrade ghost trial to full trial if user is no longer anonymous
          if (!fbUser.isAnonymous && initialProfile.planStatus === 'ghost') {
              initialProfile.planStatus = 'trial';
              if (initialProfile.trial) {
                  initialProfile.trial.grantedCredits = 12;
                  initialProfile.trial.remainingCredits = 12 - (initialProfile.trial.usedCredits || 0);
                  initialProfile.trial.endsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
                  initialProfile.trial.convertedAt = Date.now();
              }
          }
      } else {
          // Brand new user, no local data either
          const isGhost = !!fbUser.isAnonymous;
          initialProfile = {
              uid: uid,
              handle: (isGhost ? 'Ghost_' : 'Swan_') + uid.slice(-4),
              isSwan: !isGhost,
              email: fbUser.email,
              photoURL: fbUser.photoURL || null,
              createdAt: Date.now(),
              lastActive: Date.now(),
              tasteProfile: { archetype_weights: {}, color_frequency: {} },
              starredZineIds: [],
              subscription,
              planStatus: isGhost ? 'ghost' : 'trial',
              trial: {
                startedAt: Date.now(),
                endsAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
                grantedCredits: isGhost ? 4 : 12,
                usedCredits: 0,
                remainingCredits: isGhost ? 4 : 12,
              },
              usage: {
                totalGenerations: 0,
                tailorRuns: 0,
                reportRuns: 0,
                imageRuns: 0,
              }
          };
      }

      const safeProfile = ensurePersonas(initialProfile);
      
      // Check for trial expiration
      if (safeProfile.planStatus === 'trial' && safeProfile.trial) {
          const isTimeExpired = safeProfile.trial.endsAt ? Date.now() > safeProfile.trial.endsAt : false;
          const isCreditsExpired = (safeProfile.trial.remainingCredits || 0) <= 0;
          if (isTimeExpired || isCreditsExpired) {
              safeProfile.planStatus = 'expired';
              safeProfile.trial.expiredAt = Date.now();
              if (navigator.onLine) {
                  saveUserProfile(safeProfile).catch(console.error);
              }
          }
      }

      setProfile(safeProfile);
      setUser({ uid: fbUser.uid, isAnonymous: !!fbUser.isAnonymous, email: fbUser.email });
      setAuthError(null);
      setSystemStatus(prev => ({ ...prev, auth: 'anchored' }));
      
      // Save local backup for offline resilience
      await saveProfileLocally(safeProfile);
      
      // Ensure profile exists in cloud
      if (!cloudProfileSnap && navigator.onLine) {
          try {
              await saveUserProfile(safeProfile);
          } catch (e) {
              console.warn("MIMI // Failed to save initial profile to cloud", e);
          }
      }

    } catch (e: any) {
      console.error("MIMI // Reconciliation Failed", e);
      setSystemStatus(prev => ({ ...prev, auth: 'offline' }));
      // Fallback to local
      if (!profile) {
          const local = await getLocalProfile();
          if (local) setProfile(ensurePersonas(local));
      }
    } finally {
      // Only clear the guard if this invocation still owns it — an aborted
      // mid-flight reconcile must not wipe a newer reconcile's in-progress key.
      if (reconciliationInProgress.current === reconcileKey) {
        reconciliationInProgress.current = null;
        setLoading(false);
      }
      document.body.classList.add('hydrated');
    }
  }, [isEnvironmentRestricted]);

  const speedGhostEntrance = useCallback(async () => {
    let ghostUid = '';
    try {
      const authPromise = startGhostSession();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("MIMI // Auth Timeout")), 1200)
      );
      const result = await Promise.race([authPromise, timeoutPromise]);
      ghostUid = result.user.uid;
    } catch (e: any) {
      console.warn("MIMI // Ghost session failed or timed out, generating local fallback:", e.message || e);
      ghostUid = 'local_ghost_' + Math.random().toString(36).substr(2, 6);
    }
      
    const speedProfile: UserProfile = {
      uid: ghostUid,
      handle: 'Ghost_' + ghostUid.slice(-4),
      photoURL: `https://ui-avatars.com/api/?name=G&background=1c1917&color=fff`,
      isSwan: false,
      currentSeason: 'blooming',
      createdAt: Date.now(),
      lastActive: Date.now(),
      tasteProfile: { archetype_weights: {}, color_frequency: {} },
      starredZineIds: [],
    };

    const safeSpeedProfile = ensurePersonas(speedProfile);
    await saveProfileLocally(safeSpeedProfile);
    setProfile(safeSpeedProfile);
    setUser({ uid: ghostUid, isAnonymous: true });
    attachLocalPocketSync();
    setLoading(false);
    setSystemStatus(prev => ({ ...prev, auth: 'offline' }));
    document.body.classList.add('hydrated');
  }, [attachLocalPocketSync]);

  const ghostLogin = useCallback(async () => {
    setElevatorLoading(true);
    try {
      const result = await startGhostSession();
      await reconcileProfile(result.user);
    } catch (e: any) {
      if (e.code === 'auth/unauthorized-domain') setIsEnvironmentRestricted(true);
      await speedGhostEntrance();
    } finally {
      setElevatorLoading(false);
    }
  }, [reconcileProfile, speedGhostEntrance]);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    const performRitual = async () => {
      console.info("MIMI // Initiating Auth Ritual...");
      
      // Safety timeout to prevent hanging the splash screen if Firebase Auth is silent
      const safetyTimeout = setTimeout(() => {
        if (loading) {
          console.warn("MIMI // Auth Ritual Safety Timeout: Proceeding as Guest.");
          setAuthError("Registry Connection Timeout: Operating in local-only mode.");
          setLoading(false);
          setIsInitializing(false);
          if (!profile) {
            speedGhostEntrance().catch(err => console.error("MIMI // Safety Ghost Entrance Failed:", err));
          }
        }
      }, 6000); // Reduced to 6 seconds for better responsiveness

      try {
        console.info("MIMI // Ritual: Initializing Persistence...");
        await initializeAuthPersistence();
        console.info("MIMI // Ritual: Ensuring Auth Instance...");
        const authInstance = await ensureAuth();
        console.info("MIMI // Ritual: Auth Instance Ready.");

        // 1. Handle Email Link Sign-In
        const emailForSignIn = window.localStorage.getItem('emailForSignIn');
        if (emailForSignIn) {
            try {
                const { completeEmailSignIn } = await import('../services/firebaseUtils');
                await completeEmailSignIn(window.location.href);
                console.info("MIMI // Email Link Sign-In Successful");
                window.localStorage.removeItem('emailForSignIn');
                    window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                        detail: { message: "Identity Anchored via Email Link.", type: 'success' } 
                    }));
            } catch (e) {
                console.warn("MIMI // Email Link Sign-In Error:", e);
            }
        }

        // 1. Handle Redirect Result FIRST
        // We wait for this to resolve before we trust the onAuthStateChanged(null) signal
        let rResult = null;
        try {
          rResult = await handleAuthRedirect();
        } catch (e) {
          console.warn("MIMI // Redirect Result Error:", e);
        }

        if (rResult && rResult.user) {
           console.info("MIMI // Redirect Result Detected:", rResult.user.email);
           await syncSessionCookie(await rResult.user.getIdToken());
           await reconcileProfile(rResult.user);
           
           // Notify user and switch to profile view
           setTimeout(() => {
             window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                 detail: { message: "Identity Anchored Successfully.", type: 'success' } 
             }));
             window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }));
           }, 1000);
        }

        // 2. Setup Observer
        const unsubscribe = onAuthStateChanged(authInstance, async (fbUser) => {
          clearTimeout(safetyTimeout); // Clear timeout as soon as we get a signal
          try {
            devLog.info("MIMI // onAuthStateChanged:", fbUser ? "(authenticated)" : "null", fbUser ? "isAnonymous: " + fbUser.isAnonymous : "");
            clearLegacyUsedContextState();
            clearLegacyEditCompileState();
            if (fbUser) {
              devLog.info("MIMI // Auth State Changed: Active");
              await syncSessionCookie();
              await reconcileProfile(fbUser);
            } else {
               console.info("MIMI // Auth State Changed: Null");
               
               // CRITICAL: Only fallback to ghost if we are NOT in a redirect flow
               // and we don't already have a profile (to prevent flicker)
               if (!rResult && !profile) {
                   const local = await getLocalProfile();
                   // Only restore if it is explicitly a ghost profile
                   if (local && (local.uid.startsWith('local_ghost_') || local.isAnonymous === true || local.isSwan === false)) {
                     // Double check it's not a real Firebase UID that got mislabeled
                     if (local.uid.length > 20 && !local.uid.startsWith('local_ghost_')) {
                       console.info("MIMI // Stale Registered Profile Found. Entering Speed Ghost Flow.");
                       await speedGhostEntrance();
                     } else {
                       console.info("MIMI // Local Archive Found. Restoring Ghost Identity.");
                       setProfile(ensurePersonas(local));
                       setUser({ uid: local.uid, isAnonymous: true });
                       setSystemStatus(prev => ({ ...prev, auth: 'offline' }));
                     }
                   } else {
                     console.info("MIMI // No Identity Found or Session Expired. Entering Speed Ghost Flow.");
                     await speedGhostEntrance();
                   }
               }
               
               if (!fbUser && !rResult) {
                  setLoading(false);
               }
            }
            setIsInitializing(false);
          } catch (err) {
            console.error("MIMI // onAuthStateChanged Error:", err);
            setLoading(false);
            setIsInitializing(false);
          }
        });

        unsubscribeProfile.current = unsubscribe;
      } catch (e) {
        console.error("MIMI // Ritual Failed:", e);
        clearTimeout(safetyTimeout);
        setLoading(false);
        setIsInitializing(false);
        document.body.classList.add('hydrated');
      }
    };

    performRitual().catch(err => console.error("MIMI // Perform Ritual Unhandled Error:", err));
  }, [reconcileProfile, speedGhostEntrance]);

  const updateProfile = async (newProfile: UserProfile) => {
    devLog.info("MIMI // updateProfile called");
    try {
      const currentUid = user?.uid || newProfile.uid;
      const updated = { ...newProfile, uid: currentUid, lastActive: Date.now() };
      
      // Optimistic Update
      setProfile(updated);
      await saveProfileLocally(updated);
      
      console.info("MIMI // updateProfile: navigator.onLine:", navigator.onLine, "user:", !!user, "currentUid:", currentUid);
      if (navigator.onLine && user && currentUid && !currentUid.startsWith('local_')) {
        // Split data into Identity (Public) and Preferences (Private)
        const { tailorDraft, personas, activePersonaId, starredZineIds, lastAuditReport, likenessManifest, evidenceDossier, ...identity } = updated;
        const preferences: UserPreferences = {
            tailorDraft,
            likenessManifest,
            evidenceDossier,
            starredZineIds,
            lastAuditReport,
            personas,
            activePersonaId,
            zineOptions: updated.zineOptions
        };
        
        await Promise.all([
            saveUserProfile(identity as UserProfile), // Writes to 'profiles_public'
            saveUserPreferences(currentUid, preferences) // Writes to 'userPreferences'
        ]);
        
        // If handle or photoURL changed, trigger global handshake
        if (profile && (profile.handle !== updated.handle || profile.photoURL !== updated.photoURL)) {
          await commitGlobalHandshake(currentUid, updated.handle, updated.photoURL || null);
        }
      }
    } catch (e) { 
      console.error("MIMI // updateProfile error:", e);
    }
  };

  const switchPersona = async (personaId: string) => {
      if (!profile) return;
      try {
        const target = profile.personas?.find(p => p.id === personaId);
        if (target) {
            await updateProfile({ ...profile, activePersonaId: personaId, tailorDraft: target.tailorDraft });
        }
      } catch (e) {
        console.error("MIMI // Failed to switch persona", e);
      }
  };

  const createPersona = async (name: string, apiKey?: string, identityReframe?: string) => {
      if (!profile) return;
      try {
        const newPersona: Persona = {
            id: `persona_${Date.now()}`,
            name,
            tailorDraft: { 
                ...DEFAULT_DRAFT,
                strategicSummary: {
                    ...DEFAULT_DRAFT.strategicSummary,
                    aestheticDNA: identityReframe || DEFAULT_DRAFT.strategicSummary.aestheticDNA
                }
            },
            apiKey,
            createdAt: Date.now()
        };
        const updatedPersonas = [...(profile.personas || []), newPersona];
        await updateProfile({ ...profile, personas: updatedPersonas, activePersonaId: newPersona.id, tailorDraft: newPersona.tailorDraft });
      } catch (e) {
        console.error("MIMI // Failed to create persona", e);
      }
  };

  const updatePersona = async (updatedPersona: Persona) => {
      if (!profile) return;
      try {
        const updatedPersonas = (profile.personas || []).map(p => p.id === updatedPersona.id ? updatedPersona : p);
        const isUpdatingActive = profile.activePersonaId === updatedPersona.id;
        await updateProfile({ ...profile, personas: updatedPersonas, tailorDraft: isUpdatingActive ? updatedPersona.tailorDraft : profile.tailorDraft });
      } catch (e) {
        console.error("MIMI // Failed to update persona", e);
      }
  };

  const deletePersona = async (personaId: string) => {
      if (!profile || !profile.personas || profile.personas.length <= 1) return;
      try {
        const filtered = profile.personas.filter(p => p.id !== personaId);
        const newActiveId = profile.activePersonaId === personaId ? filtered[0].id : profile.activePersonaId;
        const newActiveDraft = filtered.find(p => p.id === newActiveId)?.tailorDraft || DEFAULT_DRAFT;
        await updateProfile({ ...profile, personas: filtered, activePersonaId: newActiveId, tailorDraft: newActiveDraft });
      } catch (e) {
        console.error("MIMI // Failed to delete persona", e);
      }
  };

  const toggleZineStar = async (zineId: string) => {
    if (!profile) return;
    try {
      const currentStars = profile.starredZineIds || [];
      const isStarred = currentStars.includes(zineId);
      const newStars = isStarred ? currentStars.filter(id => id !== zineId) : [...currentStars, zineId];
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: isStarred ? "Manifest removed from Favorites." : "Manifest anchored to Favorites.", icon: <Star size={14} className={isStarred ? "" : "text-amber-500 fill-amber-500"} /> } }));
      await updateProfile({ ...profile, starredZineIds: newStars });
    } catch (e) {
      console.error("MIMI // Failed to toggle zine star", e);
    }
  };

  const loginWithEmail = async (email: string, redirectUrl: string) => {
    setAuthError(null);
    try {
      const { sendEmailLink } = await import('../services/firebaseUtils');
      await sendEmailLink(email, redirectUrl);
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: "Access link sent to email.", icon: <Star size={14} className="text-stone-500 fill-stone-500" /> } }));
    } catch (e: any) {
      console.error("MIMI // Email Login Error:", e);
      setAuthError(formatAuthError(e.code || e.message));
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const { signUpWithEmailPassword } = await import('../services/firebaseUtils');
      await signUpWithEmailPassword(email, password);
      window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }));
    } catch (e: any) {
      console.error("MIMI // Sign Up Error:", e);
      setAuthError(formatAuthError(e.code || e.message));
      throw e;
    }
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const { signInWithEmailPassword } = await import('../services/firebaseUtils');
      await signInWithEmailPassword(email, password);
      window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }));
    } catch (e: any) {
      console.error("MIMI // Sign In Error:", e);
      setAuthError(formatAuthError(e.code || e.message));
      throw e;
    }
  };

  const upgradeGhostAccount = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const authInstance = await ensureAuth();
      // If we have a real anonymous Firebase user, link it
      if (authInstance.currentUser && authInstance.currentUser.isAnonymous) {
        const { upgradeAnonymousWithEmail } = await import('../services/firebaseUtils');
        await upgradeAnonymousWithEmail(email, password);
      } else {
        // We are likely a "Speed Ghost" (local only) or already logged in
        // Just perform a normal sign up/in. ReconcileProfile will handle the local data migration.
        const { signUpWithEmailPassword } = await import('../services/firebaseUtils');
        await signUpWithEmailPassword(email, password);
      }
      window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }));
    } catch (e: any) {
      console.error("MIMI // Upgrade Ghost Error:", e);
      setAuthError(formatAuthError(e.code || e.message));
      throw e;
    }
  };

  const completeEmailLogin = async (url: string) => {
    setAuthError(null);
    try {
      const { completeEmailSignIn } = await import('../services/firebaseUtils');
      await completeEmailSignIn(url);
      window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }));
    } catch (e: any) {
      console.error("MIMI // Complete Email Login Error:", e);
      setAuthError(formatAuthError(e.code || e.message));
    }
  };

  const login = async (forceRedirect = false) => {
    setAuthError(null);
    try { 
      await anchorIdentity(forceRedirect); 
      await syncSessionCookie();

      // For popup flow, auth state change fires immediately — navigate to profile
      if (!forceRedirect) {
        window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }));
      }
      // For redirect flow, page reloads — handleAuthRedirect in performRitual catches the result
    } catch (e: any) { 
      console.error("MIMI // Login Error:", e);
      const message = formatAuthError(e.code || e.message);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const signInWithGoogleRedirect = async () => {
    setAuthError(null);
    try { 
      await import('../services/firebaseUtils').then(m => m.anchorIdentity(false)); 
      await syncSessionCookie();
      window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }));
    } catch (e: any) { 
      console.error("MIMI // Sign In Error:", e);
      const message = formatAuthError(e.code || e.message);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const linkAccount = async (forceRedirect = false) => {
    devLog.log("MIMI // linkAccount called");
    setAuthError(null);
    try { 
        const authInstance = await ensureAuth();
        console.log("MIMI // authInstance:", authInstance);
        if (user?.isAnonymous) {
            if (!authInstance.currentUser) {
                console.log("MIMI // User is Speed Ghost, signing in with Google");
                // User is a Speed Ghost (local only), no Firebase Auth session to link.
                // Just sign in, and reconcileProfile will migrate local data.
                await signInWithGoogleRedirect();
                return;
            }
            console.log("MIMI // User is anonymous, linking identity");
            await linkIdentity(forceRedirect);
            // If it was a popup, we need to manually reconcile to propagate the "Swan" state
            if (!forceRedirect && !isCaptiveInWebview()) {
                if (authInstance.currentUser) {
                    console.log("MIMI // Reconciling profile after link");
                    await reconcileProfile(authInstance.currentUser);
                }
            }
        } else {
            console.log("MIMI // Already anchored, signing in with Google");
            // Already anchored, or switching
            await signInWithGoogleRedirect(); 
        }
    } catch (e: any) { 
        console.error("MIMI // linkAccount error:", e);
        const message = formatAuthError(e.code || e.message);
        setAuthError(message); 
        throw new Error(message);
    }
  };

  const keyLogin = async (handle: string, apiKey: string) => {
    setLoading(true);
    try {
      const trimmedHandle = handle.trim().toLowerCase();
      const trimmedKey = apiKey.trim();
      
      if (!trimmedHandle || !trimmedKey) throw new Error("Handle and Key are required.");

      // 1. Add key to ring
      addKeyToRing(trimmedKey);

      // 2. Update profile
      if (profile) {
        const updated = { 
          ...profile, 
          handle: trimmedHandle, 
          lastActive: Date.now()
        };
        await updateProfile(updated);
      }
      
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: `Identity Anchored: @${trimmedHandle}`, type: 'success' } 
      }));
    } catch (e: any) {
      setAuthError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const verifyIdentity = async () => {
    setLoading(true);
    try {
      const authInstance = await ensureAuth();
      if (authInstance.currentUser) {
        // Force a fresh reconciliation
        reconciliationInProgress.current = null; 
        await reconcileProfile(authInstance.currentUser);
        window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
            detail: { message: "Identity Verified. Handshake complete.", type: 'success' } 
        }));
      }
    } catch (e) {
      setAuthError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openKeySelector = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio?.openSelectKey) {
        await aistudio.openSelectKey();
        setHasApiKey(true);
        setOracleStatus('ready');
      }
    } catch (e) {}
  };

  const logout = async () => {
    setLoading(true);
    // Unsubscribe listeners
    if (unsubscribeProfile.current) unsubscribeProfile.current();
    if (unsubscribePrefs.current) unsubscribePrefs.current();
    if (unsubscribePocket.current) unsubscribePocket.current();
    setPocket([]);
    
    try {
      clearLegacyUsedContextState();
      clearLegacyEditCompileState();
      const authInstance = await ensureAuth();
      await authInstance.signOut();
      await clearSessionCookie();
      
      setUser(null); setProfile(null);
      await speedGhostEntrance();
    } catch (e) { setLoading(false); }
  };

  const activePersona = profile?.personas?.find(p => p.id === profile.activePersonaId);

  const isPaid = hasAccess(profile?.plan, 'core') || profile?.isPatron;
  const trialActive = profile?.planStatus === 'trial' && profile?.trial && profile.trial.remainingCredits > 0 && Date.now() < profile.trial.endsAt;
  const ghostActive = profile?.planStatus === 'ghost' && profile?.trial && profile.trial.remainingCredits > 0;
  
  const canGenerate = true;
  const generationsRemaining = Infinity;

  const activatePatron = async (key: string) => {
    if (!profile || !user) return;
    const { applyPromoCode } = await import('../services/membershipPipeline');
    const result = await applyPromoCode(user.uid, key);
    // Prefer server credits (including restored grants). Never invent a full
    // allowance when the API omitted membershipCredits — that desyncs UI vs spend.
    const credits =
      result?.membershipCredits ||
      profile.membershipCredits ||
      (result?.applied
        ? buildCreditGrant({ plan: 'lab', interval: 'year' }).credits
        : profile.membershipCredits);
    // Server Admin already wrote entitlement fields — only refresh local state.
    setProfile({
      ...profile,
      planStatus: 'lab',
      plan: 'lab',
      mimiPlan: 'lab',
      isPatron: true,
      patronActivatedAt: Date.now(),
      patronKey: key,
      subscriptionStatus: 'active',
      subscriptionInterval: 'year',
      ...(credits ? { membershipCredits: credits } : {}),
    });
  };

  const upgradePlan = async (plan: 'core' | 'optioning' | 'pro' | 'lab', interval?: 'month' | 'year') => {
    if (!profile) return;
    // Entitlement fields are Admin / Stripe-webhook only in Firestore rules.
    // Optimistic local UI after Checkout; durable grant arrives via webhook.
    const updated = {
      ...profile,
      planStatus: plan,
      plan,
      subscriptionInterval: interval || 'month',
      subscriptionStatus: 'active' as const,
      lastActive: Date.now(),
    };
    setProfile(updated);
    await saveProfileLocally(updated);
  };

  const incrementGeneration = async (cost: number = 2) => {
    if (!profile) return;
    try {
      const updatedProfile = { ...profile };
      
      // Update generation count
      updatedProfile.generationCount = (profile.generationCount || 0) + 1;
      
      // Deduct credits if trial is active
      if (updatedProfile.trial && updatedProfile.trial.remainingCredits > 0) {
          updatedProfile.trial.remainingCredits = Math.max(0, updatedProfile.trial.remainingCredits - cost);
          updatedProfile.trial.usedCredits = (updatedProfile.trial.usedCredits || 0) + cost;
          
          if (updatedProfile.trial.remainingCredits === 0 && updatedProfile.planStatus === 'trial') {
              updatedProfile.planStatus = 'expired';
              updatedProfile.trial.expiredAt = Date.now();
          }
      }
      
      // Update usage stats
      if (!updatedProfile.usage) {
          updatedProfile.usage = { totalGenerations: 0, tailorRuns: 0, reportRuns: 0, imageRuns: 0 };
      }
      updatedProfile.usage.totalGenerations += 1;
      updatedProfile.usage.lastGenerationAt = Date.now();
      
      await updateProfile(updatedProfile);
    } catch (e) {
      console.error("MIMI // Failed to increment generation count", e);
    }
  };

  const recordSession = async () => {
    if (!user || user.uid.startsWith('local_')) return;
    try {
      await recordSessionService(user.uid);
    } catch (e) {
      console.error("MIMI // Failed to record session", e);
    }
  };

  const setUiMode = async (mode: 'stage' | 'control') => {
    if (!profile) return;
    await updateProfile({ ...profile, uiMode: mode });
  };

  const setDnaMapped = async (mapped: boolean) => {
    if (!profile) return;
    await updateProfile({ ...profile, dnaMapped: mapped });
  };

  const forceBypassAuth = useCallback(() => {
    setLoading(false);
    console.warn("MIMI // Auth Bypassed by User.");
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('mimi_simulated_mode', isSimulatedMode ? '1' : '0');
    } catch {
      // no-op
    }
    setSystemStatus((prev) => ({
      ...prev,
      storage: isSimulatedMode ? 'limited' : (prev.storage === 'limited' ? 'nominal' : prev.storage)
    }));
  }, [isSimulatedMode]);

  return (
    <UserContext.Provider value={{ 
      user, profile, loading, isElevatorLoading, setElevatorLoading, updateProfile, toggleZineStar,
      login, loginWithEmail, completeEmailLogin, signUpWithEmailPassword, signInWithEmailPassword, upgradeGhostAccount, signInWithGoogleRedirect, ghostLogin, speedGhostEntrance, linkAccount, keyLogin, verifyIdentity, isEnvironmentRestricted, isDatabaseMissing, isKeyBlocked, setKeyBlocked, authError,
      isSimulatedMode,
      hasApiKey, openKeySelector, logout, refreshHasApiKey, systemStatus, setOracleStatus,
      apiKeys, setApiKey, removeApiKey, activeLlmProvider, setActiveLlmProvider,
      featureFlags, toggleFeature,
      enabledAlgos: profile?.enabledAlgos || [],
      toggleAlgo,
      personas: profile?.personas || [],
      activePersonaId: profile?.activePersonaId,
      activePersona,
      switchPersona,
      createPersona,
      updatePersona,
      deletePersona,
      canGenerate,
      generationsRemaining,
      activatePatron,
      upgradePlan,
      incrementGeneration,
      recordSession,
      forceBypassAuth,
      activeThread,
      setActiveThread,
      pocket,
      setPocket,
      setUiMode,
      setDnaMapped
    }}>
      {children}
    </UserContext.Provider>
  );
};
