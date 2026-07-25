
import { setPersistence, browserLocalPersistence, indexedDBLocalPersistence, onAuthStateChanged, User } from "firebase/auth";
import { auth, db, storage } from "./firebaseInit";
import { PocketItem, Stack, UserProfile } from "../types";
import { logFirestoreError, handleFirestoreError, OperationType } from "./firebaseUtils";

export { auth, db, storage };

// Test connection on boot to catch "Database not found" early
const testConnection = async () => {
  // Wait a bit for the network and SDK to stabilize
  await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 3s to 1s
  
  let retries = 5; // Increased retries
  let success = false;
  
  // Proactive online listener
  if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
      console.info("MIMI // Browser Online: Re-enabling Firestore Network...");
      try {
        const { enableNetwork } = await import('firebase/firestore');
        await enableNetwork(db);
      } catch (e) {
        console.warn("MIMI // Failed to re-enable network on online event:", e);
      }
    });
  }

  while (retries > 0 && !success) {
    try {
      const { doc, getDocFromServer } = await import('firebase/firestore');
      
      await getDocFromServer(doc(db, 'system', 'connection_test'));
      console.info("MIMI // Connection Test: Success");
      success = true;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // If it's a permission error, we're actually connected!
      if (errorMessage.includes('permission-denied')) {
        console.info("MIMI // Connection Test: Connected (Permission Denied as expected)");
        success = true;
        break;
      }

      if (errorMessage.includes('offline')) {
        console.warn(`MIMI // Connection Test: Offline error, attempting network reset... (${retries} left)`);
        const { resetFirestoreNetwork } = await import('./firebaseUtils');
        await resetFirestoreNetwork();
      }

      console.warn(`MIMI // Connection Test: Attempt failed (${retries} left). Error: ${errorMessage}`);
      
      if (retries > 1) {
        // Linear backoff
        const delay = 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Only log to registry if we've exhausted all retries
        if (errorMessage.includes('not-found') || errorMessage.includes('offline') || errorMessage.includes('does not exist')) {
          logFirestoreError(error, OperationType.GET, 'system/connection_test');
        }
      }
      retries--;
    }
  }
};
testConnection();

// INITIALIZE PERSISTENCE ONCE
let persistenceInitialized = false;

export const initializeAuthPersistence = async (): Promise<void> => {
  if (persistenceInitialized) return;

  // indexedDB survives iframe / third-party cookie restrictions better than localStorage.
  const strategies: { name: string; persistence: typeof indexedDBLocalPersistence }[] = [
    { name: "indexedDBLocalPersistence", persistence: indexedDBLocalPersistence },
    { name: "browserLocalPersistence", persistence: browserLocalPersistence },
  ];

  for (const { name, persistence } of strategies) {
    try {
      await setPersistence(auth, persistence);
      persistenceInitialized = true;
      console.info(`MIMI // Persistence Locked: ${name}`);
      return;
    } catch (err: any) {
      console.warn(`MIMI // Persistence strategy ${name} failed:`, err.code, err.message);
    }
  }

  console.error("MIMI // Persistence Calibration Failed: no strategy available.");
  persistenceInitialized = true;
};

/**
 * BOOTSTRAP AUTH
 * Extended timeout (5s) to allow for redirect recovery in iframes.
 */
export const bootstrapAuth = async (): Promise<User | null> => {
  try {
    await initializeAuthPersistence();
    
    if (auth.currentUser) {
      console.info("MIMI // Bootstrap: Identity detected in memory.");
      return auth.currentUser;
    }
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn("MIMI // Bootstrap: Signal Weak, Proceeding as Guest.");
        resolve(null);
      }, 5000); // Increased to 5s for iframe reliability

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        clearTimeout(timeout);
        unsubscribe();
        if (user) {
          console.info("MIMI // Bootstrap: Identity anchored.");
        }
        resolve(user);
      }, (error) => {
        console.error("MIMI // Bootstrap: Auth failure.", error);
        clearTimeout(timeout);
        resolve(null);
      });
    });
  } catch (error: any) {
    console.error("MIMI // Bootstrap: Fatal error.", error);
    return null;
  }
};

export const ensureAuth = async () => {
  await initializeAuthPersistence();
  return auth;
};

export const ensureDb = async () => db;
export const ensureStorage = async () => storage;

export const fetchFragmentsByStackId = async (stackId: string) => {
    try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(collection(db, "pocket"), where("stackIds", "array-contains", stackId));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as PocketItem);
    } catch (e: any) {
        handleFirestoreError(e, OperationType.LIST, "pocket");
        return [];
    }
};

export const fetchStackById = async (stackId: string) => {
    try {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, "stacks", stackId));
        if (snap.exists()) return snap.data() as Stack;
        return null;
    } catch (e: any) {
        handleFirestoreError(e, OperationType.GET, `stacks/${stackId}`);
        return null;
    }
};

export const fetchStacksByUserId = async (userId: string) => {
    try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(collection(db, "stacks"), where("userId", "==", userId));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as Stack);
    } catch (e: any) {
        handleFirestoreError(e, OperationType.LIST, "stacks");
        return [];
    }
};

export const saveStack = async (stack: Stack) => {
    try {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, "stacks", stack.id), stack);
    } catch (e: any) {
        handleFirestoreError(e, OperationType.WRITE, `stacks/${stack.id}`);
    }
};

export const fetchProfileByHandle = async (handle: string): Promise<UserProfile | null> => {
    try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(collection(db, "users"), where("handle", "==", handle));
        const snap = await getDocs(q);
        if (!snap.empty) {
            return snap.docs[0].data() as UserProfile;
        }
        return null;
    } catch (e: any) {
        handleFirestoreError(e, OperationType.GET, "users");
        return null;
    }
};

// Export all utilities to prevent missing export errors
export * from './firebaseUtils';
