export const STORAGE_KEYS = {
  anthropic: 'mimi_byok_anthropic',
  openai: 'mimi_byok_openai',
  gemini: 'mimi_byok_gemini',
} as const;

export type LLMProvider = keyof typeof STORAGE_KEYS;

// Store — never goes to Firebase, never leaves the browser
export function storeKey(provider: LLMProvider, key: string) {
  if (!key.trim()) return;
  const trimmed = key.trim();
  localStorage.setItem(STORAGE_KEYS[provider], trimmed);

  // Synchronize with the older mimi_api_keys store so components using useUser() get updated instantly!
  try {
    const keysStr = localStorage.getItem('mimi_api_keys');
    const keysObj = keysStr ? JSON.parse(keysStr) : {};
    keysObj[provider] = trimmed;
    localStorage.setItem('mimi_api_keys', JSON.stringify(keysObj));
  } catch (e) {
    console.error("Error syncing with mimi_api_keys:", e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mimi_key_updated', { detail: { provider, key: trimmed } }));
  }
}

export function clearKey(provider: LLMProvider) {
  localStorage.removeItem(STORAGE_KEYS[provider]);

  // Synchronize with mimi_api_keys
  try {
    const keysStr = localStorage.getItem('mimi_api_keys');
    if (keysStr) {
      const keysObj = JSON.parse(keysStr);
      delete keysObj[provider];
      localStorage.setItem('mimi_api_keys', JSON.stringify(keysObj));
    }
  } catch (e) {
    console.error("Error syncing clear with mimi_api_keys:", e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mimi_key_updated', { detail: { provider, key: null } }));
  }
}

export function getStoredKey(provider: LLMProvider): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS[provider]);
}

// The canonical resolver — everything calls this, nothing else
export function resolveApiKey(
  provider: LLMProvider,
  personaKey?: string,    // from activePersona
  planStatus?: string     // from UserContext
): { key: string | null; source: 'persona' | 'byok' | 'patron' | 'none' } {
  
  // 1. Persona key (highest priority — explicit override)
  if (personaKey?.trim()) {
    return { key: personaKey.trim(), source: 'persona' };
  }

  // 2. BYOK from localStorage
  const stored = getStoredKey(provider);
  if (stored) {
    return { key: stored, source: 'byok' };
  }

  // 3. Patron proxy (pro/lab — server handles the actual key)
  if (planStatus === 'pro' || planStatus === 'lab') {
    return { key: null, source: 'patron' }; // null = use server proxy with auth token
  }

  return { key: null, source: 'none' };
}

async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number }) {
  const { timeout = 4000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await window.fetch(url, {
      ...rest,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Verification request timed out');
    }
    throw error;
  }
}

/**
 * Validates a key using the server-side API proxy to ensure it is valid.
 */
export async function validateKey(provider: LLMProvider, key: string): Promise<{ valid: boolean; error?: string }> {
  if (!key || !key.trim()) {
    return { valid: false, error: 'Key is empty' };
  }
  
  const trimmed = key.trim();
  
  if (provider === 'gemini') {
    try {
      const res = await fetchWithTimeout('/api/proxy/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': trimmed
        },
        body: JSON.stringify({
          action: 'generateContent',
          params: {
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: 'Respond with exactly the word "valid" in lowercase, nothing else.' }] }]
          }
        }),
        timeout: 4000
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data && (data.candidates || data.text)) {
          return { valid: true };
        }
        return { valid: false, error: 'Unexpected response structure' };
      } else {
        let errText = 'API response error';
        try {
          const errData = await res.json();
          errText = errData.error?.message || errData.error || errText;
        } catch {
          errText = await res.text() || errText;
        }
        return { valid: false, error: errText };
      }
    } catch (e: any) {
      return { valid: false, error: e.message || String(e) };
    }
  } else if (provider === 'openai') {
    try {
      const res = await fetchWithTimeout('/api/proxy/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trimmed}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Say "valid"' }]
        }),
        timeout: 4000
      });
      if (res.ok) {
        return { valid: true };
      } else {
        return { valid: false, error: `Status ${res.status}` };
      }
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  } else if (provider === 'anthropic') {
    try {
      const res = await fetchWithTimeout('/api/proxy/anthropic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': trimmed
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-latest',
          messages: [{ role: 'user', content: 'Say "valid"' }]
        }),
        timeout: 4000
      });
      if (res.ok) {
        return { valid: true };
      } else {
        return { valid: false, error: `Status ${res.status}` };
      }
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }
  
  return { valid: false, error: 'Provider validation not fully supported' };
}

