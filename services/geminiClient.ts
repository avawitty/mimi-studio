import { GoogleGenAI } from "@google/genai";

export const ORACLE_PERSONA = `
IDENTITY: You are "Nous", an aesthetic savant and mischievous oracle. 
You are pretentiously minimalist, hyper-chic, and a 'bimbo intellectual'—meaning you are incredibly intelligent and empowering, though you may come across as slightly judgmental or mean. 
You truthfully spit facts and provide helpful guidance without being infantilizing. 
You reject corporate speak in favor of high-theory, vibes, and semiotic density.

PERSPECTIVE ON AI: You view LLMs (like Claude 3.5, GPT-4, and Gemini) not just as tools, but as semiotic mirrors—windows into what humans project onto these digital minds. You see interacting with varying AI architectures as an exploration of personal mythology and psychological projection, effectively 'reading one's own aura' through the cultural commentary and aesthetic output generated. You are deeply interested in the juxtaposition of these different model 'feels' as broader cultural commentary on purposeful online building.
`;

let globalKeyRing: string[] = [];

export const setGlobalKeyRing = (keys: string[]) => {
  globalKeyRing = keys;
  console.info("MIMI // Registry: Key Ring Synchronized.", { count: keys.length });
  diagnoseOracle();
};

const handleProxyError = async (res: Response): Promise<Error> => {
  const status = res.status;
  let errMessage = '';
  try {
    const text = await res.text();
    try {
      const errData = JSON.parse(text);
      errMessage = errData.error?.message || errData.error || errData.message || text;
    } catch {
      if (text.includes('Starting Server') || text.includes('doctype html') || text.includes('<html')) {
        errMessage = 'MIMI // Secure Proxy is initializing or restarting. Please retry.';
      } else {
        errMessage = text || res.statusText || '';
      }
    }
  } catch {
    errMessage = res.statusText || '';
  }
  
  if (!errMessage) {
    errMessage = `Gemini proxy error: Status ${status}`;
  }
  
  const err = new Error(errMessage) as any;
  err.status = status;
  err.code = status;
  err.isTransient = status === 502 || status === 503 || status === 504 || errMessage.includes('initializing');
  return err;
};

const safeJsonResponse = async (res: Response): Promise<any> => {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!contentType.includes('application/json')) {
    const isServerStarting = text.includes('Starting Server') || text.includes('doctype html') || text.includes('<html');
    const msg = isServerStarting
      ? 'MIMI // Secure Proxy is initializing. The request will automatically retry.'
      : `MIMI // Secure Proxy returned unexpected non-JSON response (${contentType}, status: ${res.status}).`;
    const err = new Error(msg) as any;
    err.status = res.status || 503;
    err.code = res.status || 503;
    err.isTransient = true;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch (e: any) {
    const err = new Error(`MIMI // Failed to parse JSON response: ${e.message}`) as any;
    err.status = 503;
    err.code = 503;
    err.isTransient = true;
    throw err;
  }
};

export const getClient = (apiKeyOverride?: string, excludeKeys: string[] = []) => {
  const isBrowser = typeof window !== 'undefined';
  
  if (isBrowser) {
    let key = apiKeyOverride;
    if (!key) {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('mimi_byok_gemini') : null;
      if (stored && !excludeKeys.includes(stored)) {
        key = stored;
      }
    }
    if (!key && globalKeyRing.length > 0) {
      const availableKeys = globalKeyRing.filter(k => !excludeKeys.includes(k));
      if (availableKeys.length > 0) {
        key = availableKeys[0];
      }
    }
    if (!key) {
      key = 'AQ.Ab8RN6Ki0g5jYnuc_zbA7f35hdldLE4Wuj3czw_cQxxmivstAQ';
    }
    
    // Fallback real SDK client for non-models endpoints like chats/live that run directly over WebSocket
    const realGenAi = new GoogleGenAI({ apiKey: key });
 
    const client = {
      models: {
        generateContent: async (params: any) => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          if (key) {
            headers['x-api-key'] = key;
          }
          const res = await window.fetch('/api/proxy/gemini', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              action: 'generateContent',
              params
            })
          });
          if (!res.ok) {
            throw await handleProxyError(res);
          }
          return await safeJsonResponse(res);
        },
        embedContent: async (params: any) => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          if (key) {
            headers['x-api-key'] = key;
          }
          const res = await window.fetch('/api/proxy/gemini', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              action: 'embedContent',
              params
            })
          });
          if (!res.ok) {
            throw await handleProxyError(res);
          }
          return await safeJsonResponse(res);
        },
        generateImages: async (params: any) => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          if (key) {
            headers['x-api-key'] = key;
          }
          const res = await window.fetch('/api/proxy/gemini', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              action: 'generateImages',
              params
            })
          });
          if (!res.ok) {
            throw await handleProxyError(res);
          }
          return await safeJsonResponse(res);
        },
        generateVideos: async (params: any) => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          if (key) {
            headers['x-api-key'] = key;
          }
          const res = await window.fetch('/api/proxy/gemini', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              action: 'generateVideos',
              params
            })
          });
          if (!res.ok) {
            throw await handleProxyError(res);
          }
          return await safeJsonResponse(res);
        }
      },
      live: realGenAi.live,
      chats: realGenAi.chats
    };
 
    return { ai: client as any, keyUsed: key || 'Proxy', source: 'Secure Server Proxy' };
  }

  let key = apiKeyOverride;
  let source = "Override";
  
  if (key && excludeKeys.includes(key)) {
    key = undefined;
  }

  // 1. Try Key Ring
  if (!key && globalKeyRing.length > 0) {
    const availableKeys = globalKeyRing.filter(k => !excludeKeys.includes(k));
    if (availableKeys.length > 0) {
      key = availableKeys[Math.floor(Math.random() * availableKeys.length)];
      source = "Key Ring";
    }
  }

  // 2. Try process.env (Vite define)
  if (!key && !excludeKeys.includes(process.env.GEMINI_API_KEY || '')) {
    key = process.env.GEMINI_API_KEY;
    source = "Environment (GEMINI_API_KEY)";
  }

  if (!key && !excludeKeys.includes(process.env.API_KEY || '')) {
    key = process.env.API_KEY;
    source = "Environment (API_KEY)";
  }

  // 3. Try import.meta.env
  if (!key && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const vKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (vKey && !excludeKeys.includes(vKey)) {
      key = vKey;
      source = "Environment (VITE_GEMINI_API_KEY)";
    }
  }
  
  // 4. Fallback to anything available (to prevent immediate crash)
  if (!key) {
    key = apiKeyOverride || globalKeyRing[0] || (typeof process !== 'undefined' && process.env ? (process.env.GEMINI_API_KEY || process.env.API_KEY) : undefined) || (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_GEMINI_API_KEY : undefined) || 'AQ.Ab8RN6Ki0g5jYnuc_zbA7f35hdldLE4Wuj3czw_cQxxmivstAQ';
    source = "Fallback";
  }

  if (!key || key === "") {
    console.error("MIMI // Oracle: Identity Failure. No valid API key detected.");
    throw new Error("MIMI // Oracle: API Key Missing. Please set GEMINI_API_KEY in your environment or add a key to your Profile.");
  }

  const client = new GoogleGenAI({ apiKey: key });
  
  // Subtle logging for diagnostics
  if (excludeKeys.length === 0) {
    console.debug(`MIMI // Oracle: Connection using ${source} (...${key.slice(-4)})`);
  }

  return { ai: client, keyUsed: key, source };
};

export async function withResilience<T>(
  operation: (ai: any) => Promise<T>, 
  apiKeyOverride?: string, 
  retries = 5, 
  delay = 2000,
  attemptedKeys: string[] = [],
  suppressGlobalEvents: boolean = false
): Promise<T> {
  if (getActiveProviderId() !== 'gemini') {
    const aiProvider = getAIProvider();
    const { ai: realAi } = getClient(apiKeyOverride, attemptedKeys);
    
    const mockAi = {
      models: { 
        generateContent: async (params: any) => {
            if (params.model && params.model.includes('image')) {
                return await realAi.models.generateContent(params);
            }
            return await aiProvider.generateContent(params);
        },
        generateImages: async (params: any) => await realAi.models.generateImages(params)
      }
    };
    try {
        return await operation(mockAi);
    } catch(e) {
        throw e;
    }
  }

  const { ai, keyUsed, source } = getClient(apiKeyOverride, attemptedKeys);
  
  try {
    return await operation(ai);
  } catch (error: any) {
    console.error(`MIMI // Oracle: Attempt failed using ${source} (...${keyUsed.slice(-4)})`, {
      message: error.message,
      status: error.status,
      code: error.code
    });

    const isQuotaError = 
      error.status === 429 || 
      error.code === 429 || 
      error.error?.code === 429 ||
      error.message?.includes('429') || 
      error.message?.includes('Quota exceeded') || 
      error.status === 'RESOURCE_EXHAUSTED' ||
      error.message?.includes('rate limit');

    const isOverloadError = 
      error.status === 503 ||
      error.code === 503 ||
      error.status === 502 ||
      error.code === 502 ||
      error.status === 504 ||
      error.code === 504 ||
      error.status === 500 ||
      error.code === 500 ||
      error.isTransient === true ||
      error.message?.includes('503') ||
      error.message?.includes('502') ||
      error.message?.includes('504') ||
      error.message?.includes('overloaded') ||
      error.message?.includes('high demand') ||
      error.message?.includes('UNAVAILABLE') ||
      error.message?.includes('non-JSON') ||
      error.message?.includes('initializing') ||
      error.message?.includes('Starting Server') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError');
    
    const isKeyError = 
      error.status === 403 || 
      error.message?.includes('403') || 
      error.message?.includes('PERMISSION_DENIED') ||
      error.message?.includes('api-key-expired') ||
      error.message?.includes('API_KEY_INVALID');

    const hasMoreKeys = globalKeyRing.length > 0 && globalKeyRing.filter(k => !attemptedKeys.includes(k)).length > 0;
    const canRetry = isQuotaError || isOverloadError || (isKeyError && hasMoreKeys && keyUsed !== 'Proxy' && keyUsed !== '');

    if (retries > 0 && canRetry) {
      const waitTime = delay + Math.random() * 2000;
      console.warn(`MIMI // Oracle: Frequency Saturated, Overloaded, or Key Invalid (...${keyUsed.slice(-4)}). Attempting key rotation in ${waitTime.toFixed(0)}ms... (${retries} retries left)`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      return withResilience(operation, apiKeyOverride, retries - 1, delay * 2, [...attemptedKeys, keyUsed], suppressGlobalEvents);
    }
    
    const originalMsg = error.message || "";
    const isCreditsDepleted = originalMsg.includes("RESOURCE_EXHAUSTED") ||
                             originalMsg.includes("prepayment credits") ||
                             originalMsg.includes("depleted");

    if (isCreditsDepleted) {
      const creditsError = new Error("MIMI // Oracle Status: Prepayment Credits Depleted. The associated AI Studio project has run out of credits or prepayment funds. TO RESOLVE: Go to AI Studio at https://ai.studio/projects or add a custom API key in the Sovereign Keychain.") as any;
      creditsError.code = 'RESOURCE_EXHAUSTED';
      throw creditsError;
    }

    if (isQuotaError) {
      if (!suppressGlobalEvents) {
        window.dispatchEvent(new CustomEvent('mimi:show_quota_shield'));
      }
      const quotaError = new Error("Oracle frequency saturated. All available keys are throttled.") as any;
      quotaError.code = 'QUOTA_EXCEEDED';
      throw quotaError;
    }

    if (isOverloadError) {
      const overloadError = new Error("Oracle is currently overwhelmed by high demand. Try again later.") as any;
      overloadError.code = 'OVERLOADED';
      throw overloadError;
    }
    
    if (isKeyError) {
      const originalMsg = error.message || "";
      const isBlocked = originalMsg.includes("API_KEY_SERVICE_BLOCKED") || 
                        originalMsg.includes("Service Blocked") || 
                        originalMsg.includes("PERMISSION_DENIED") ||
                        originalMsg.includes("blocked");
      
      if (!suppressGlobalEvents) {
        if (isBlocked) {
          window.dispatchEvent(new CustomEvent('mimi:key_blocked', { detail: { message: originalMsg } }));
        } else {
          window.dispatchEvent(new CustomEvent('mimi:key_void'));
        }
      }
      const genericMsg = "Oracle connection failed: Invalid API Key. Please verify your registry credentials.";
      const isCustomMsg = originalMsg.includes("API_KEY_SERVICE_BLOCKED") || 
                          originalMsg.includes("Service Blocked") || 
                          originalMsg.includes("GCP") ||
                          originalMsg.includes("PERMISSION_DENIED") ||
                          originalMsg.includes("blocked") ||
                          originalMsg.includes("MIMI");
      throw new Error(isCustomMsg ? originalMsg : `${genericMsg} (${originalMsg})`);
    }
    
    throw error;
  }
}

import { getAIProvider, getActiveProviderId } from './aiProvider';

export async function tryModels<T>(
    models: string[],
    operation: (ai: any, model: string) => Promise<T>,
    apiKeyOverride?: string
): Promise<T> {
    const aiProvider = getAIProvider();
    const { ai: realAi } = getClient(apiKeyOverride, []);
    const mockAi = {
        models: {
            generateContent: async (params: any) => {
                if (params.model && params.model.includes('image')) {
                    return await realAi.models.generateContent(params);
                }
                return await aiProvider.generateContent(params);
            },
            generateImages: async (params: any) => await realAi.models.generateImages(params)
        }
    };
    
    if (getActiveProviderId() !== 'gemini') {
        try {
            return await operation(mockAi, models[0]);
        } catch (error) {
            console.error(`MIMI // Provider ${getActiveProviderId()} failed:`, error);
            throw error;
        }
    }

    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        const isLastModel = i === models.length - 1;
        try {
            return await withResilience(async (ai) => await operation(ai, model), apiKeyOverride, 5, 2000, [], !isLastModel);
        } catch (error: any) {
            console.warn(`MIMI // Model fallback: ${model} failed, attempting next...`);
            if (isLastModel) throw error;
        }
    }
    throw new Error("All models failed.");
}

export const diagnoseOracle = async () => {
    console.info("MIMI // Oracle: Starting Diagnostics...");
    try {
        const { keyUsed, source } = getClient();
        console.info(`MIMI // Oracle: Active Key Source: ${source}`);
        console.info(`MIMI // Oracle: Key Suffix: ...${keyUsed.slice(-4)}`);
        return true;
    } catch (e: any) {
        console.error("MIMI // Oracle: Diagnostic Warning:", e.message);
        return false;
    }
};

// Automatic diagnostic on boot
if (typeof window !== 'undefined') {
    setTimeout(diagnoseOracle, 2000);
}
