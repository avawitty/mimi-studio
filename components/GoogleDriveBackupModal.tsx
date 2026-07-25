// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, Database, RefreshCw, CheckCircle2, AlertTriangle, 
  X, ShieldCheck, ChevronRight, Play, Loader2, ArrowUpRight
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { 
  connectGoogleDrive, 
  backupArchivesToDrive, 
  BackupProgress 
} from '../services/googleDriveService';
import { fetchUserZines, fetchPocketItems, deleteZine, deleteFromPocket } from '../services/firebase';

interface GoogleDriveBackupModalProps {
  onClose: () => void;
  zinesList?: any[]; // Optionally pre-fetched list of user zines
  pocketItemsList?: any[]; // Optionally pre-fetched pocket shards
}

export const GoogleDriveBackupModal: React.FC<GoogleDriveBackupModalProps> = ({ 
  onClose,
  zinesList = [],
  pocketItemsList = []
}) => {
  const { user } = useUser();
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [purgeAfterBackup, setPurgeAfterBackup] = useState(false);

  // Load all zines and pocket elements for this user if not provided in props
  const [allZines, setAllZines] = useState<any[]>(zinesList);
  const [allPocketItems, setAllPocketItems] = useState<any[]>(pocketItemsList);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  const [progress, setProgress] = useState<BackupProgress>({
    status: 'idle',
    currentZine: 0,
    totalZines: 0,
    currentPocket: 0,
    totalPocket: 0,
    log: ['Awaiting authorization...']
  });

  const logEndRef = useRef<HTMLDivElement>(null);

  // Load actual state if lists are empty and user is active
  useEffect(() => {
    if (user?.uid && (allZines.length === 0 || allPocketItems.length === 0)) {
      setIsLoadingMetadata(true);
      Promise.all([
        fetchUserZines(user.uid).catch(() => []),
        fetchPocketItems(user.uid).catch(() => [])
      ]).then(([userZines, userShards]) => {
        setAllZines(userZines || []);
        setAllPocketItems(userShards || []);
        setIsLoadingMetadata(false);
      }).catch(e => {
        console.error("MIMI // Failed pre-fetching archival volumes info", e);
        setIsLoadingMetadata(false);
      });
    }
  }, [user]);

  // Scroll active sync logs down smoothly
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [progress.log]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const gToken = await connectGoogleDrive();
      setToken(gToken);
      setProgress(prev => ({
        ...prev,
        status: 'idle',
        log: [...prev.log, `[${new Date().toLocaleTimeString()}] Secure connection anchored. Scope Authorized: /auth/drive.file`]
      }));
    } catch (err: any) {
      console.error(err);
      setConnectionError(err.message || "OAuth validation handshake aborted.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBackup = async () => {
    if (!token) return;
    setIsSyncing(true);
    try {
      await backupArchivesToDrive(
        token, 
        allZines, 
        allPocketItems, 
        (p) => {
          setProgress(p);
        }
      );

      // Evaluate purging condition if backup reaches completion
      if (purgeAfterBackup) {
        setProgress(prev => {
          const updatedLog = [...prev.log, `[${new Date().toLocaleTimeString()}] Purge sequence initiated. Cleaning local database structures...`];
          return { ...prev, log: updatedLog };
        });

        // Delete Zines
        for (const zine of allZines) {
          try {
            await deleteZine(zine.id);
          } catch (e) {
            console.error(`MIMI // Failed purging zine ${zine.id}:`, e);
          }
        }

        // Delete Shards
        for (const item of allPocketItems) {
          try {
            await deleteFromPocket(item.id);
          } catch (e) {
            console.error(`MIMI // Failed purging pocket item ${item.id}:`, e);
          }
        }

        // Clear component metadata references
        setAllZines([]);
        setAllPocketItems([]);

        // Dispatch state invalidation signals across standard views
        window.dispatchEvent(new CustomEvent('mimi:pocket_updated'));
        window.dispatchEvent(new CustomEvent('mimi:artifact_finalized'));

        setProgress(prev => ({
          ...prev,
          status: 'completed',
          currentZine: prev.totalZines,
          currentPocket: prev.totalPocket,
          log: [
            ...prev.log,
            `[${new Date().toLocaleTimeString()}] Purge sequence completed.`,
            `[${new Date().toLocaleTimeString()}] Mimi database storage cleared of backed up items.`
          ]
        }));
      }
    } catch (err: any) {
      console.error("Sync workflow failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[10000] bg-nous-base/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 selection:bg-black selection:text-white"
    >
      <div className="w-full max-w-4xl bg-[#141414] text-white border border-white/10 rounded-none flex flex-col max-h-[90vh] overflow-hidden relative shadow-2xl">
        
        {/* Progress header border line */}
        {isSyncing && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-900 overflow-hidden">
            <div className="h-full bg-stone-300 animate-pulse w-1/3" />
          </div>
        )}

        <header className="p-6 md:p-8 flex justify-between items-start border-b border-white/10 shrink-0">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-stone-400">
              <Cloud size={16} className="animate-pulse" />
              <span className="font-sans text-[9px] uppercase tracking-[0.4em] font-black">Digital Cloud Archive</span>
            </div>
            <h2 className="font-serif text-3xl md:text-5xl italic tracking-tighter text-white leading-tight">Mimi Cloud Vault.</h2>
            <p className="font-sans text-xs text-stone-300 max-w-xl">
              Back up your compiled issues and creative visual artifacts directly to your <strong className="text-white">Google Drive</strong>. This establishes a fully owned, private, decentralized mirror of your aesthetic database with permission.
            </p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSyncing}
            className="p-3 text-stone-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all rounded-none"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar space-y-8">
          
          {/* Metadata Statistics Panel */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 border-b border-white/5 pb-8">
            <div className="space-y-1">
              <span className="font-sans text-[8px] uppercase tracking-widest text-stone-500 font-extrabold">Active Session</span>
              <p className="font-sans text-sm font-bold text-stone-200">{user?.email || 'Anonymous Collector (Ghost)'}</p>
            </div>
            <div className="space-y-1">
              <span className="font-sans text-[8px] uppercase tracking-widest text-stone-500 font-extrabold">Authored Zines</span>
              <p className="font-serif italic text-2xl text-white">
                {isLoadingMetadata ? <Loader2 size={16} className="animate-spin text-stone-600 inline" /> : `${allZines.length} volume(s)`}
              </p>
            </div>
            <div className="space-y-1 col-span-2 md:col-span-1">
              <span className="font-sans text-[8px] uppercase tracking-widest text-stone-500 font-extrabold">Creative Shards</span>
              <p className="font-serif italic text-2xl text-white">
                {isLoadingMetadata ? <Loader2 size={16} className="animate-spin text-stone-600 inline" /> : `${allPocketItems.length} artifact(s)`}
              </p>
            </div>
          </div>

          {/* Drive status action card */}
          {!token ? (
            <div className="bg-white/5 border border-white/10 p-6 md:p-8 space-y-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-lg">
                <span className="font-sans text-[8px] font-black uppercase tracking-widest text-stone-400 bg-white/5 px-2 py-1">Authorization Phase</span>
                <p className="font-serif italic text-xl text-stone-200">Establish the digital handshake with Google Drive.</p>
                <p className="font-sans text-xs text-stone-400">
                  We will request safe, isolated write/create permissions exclusively within a folder named <code className="text-white">Mimi Archive</code>. Mimi cannot read your other personal Drive files.
                </p>
                {connectionError && (
                  <p className="font-sans text-xs text-red-400 flex items-center gap-2 pt-2">
                    <AlertTriangle size={14} /> {connectionError}
                  </p>
                )}
              </div>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-8 py-4 bg-white text-black font-sans text-[10px] uppercase tracking-[0.3em] font-black hover:bg-stone-200 active:scale-95 transition-all text-center flex items-center justify-center gap-3 shrink-0 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    Connect Google Drive <ArrowUpRight size={14} />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-stone-900 border border-white/10">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <ShieldCheck size={20} className="shrink-0" />
                    <div className="text-left">
                      <p className="font-sans text-xs font-bold text-white">Drive Secure Connection Nominal</p>
                      <p className="font-sans text-[9px] uppercase tracking-widest text-stone-400">Read/Write Sandbox Restricted</p>
                    </div>
                  </div>
                  
                  {/* Purging option checkbox */}
                  {progress.status === 'idle' && (
                    <label className="flex items-center gap-2.5 cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox" 
                        checked={purgeAfterBackup} 
                        onChange={(e) => setPurgeAfterBackup(e.target.checked)}
                        className="rounded-none border-white/20 bg-stone-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 h-4 w-4 shrink-0 transition-colors"
                      />
                      <div className="text-left">
                        <span className="font-sans text-[10px] uppercase tracking-widest text-stone-300 font-bold">Purge Local Storage After Success</span>
                        <p className="font-sans text-[8px] tracking-wide text-stone-500 uppercase leading-none mt-1">Deletes backup-ed local and cloud lists from mimi app once drive transfer settles.</p>
                      </div>
                    </label>
                  )}
                </div>
                {progress.status === 'idle' && (
                  <button
                    onClick={handleBackup}
                    disabled={isSyncing}
                    className="px-6 py-3 bg-white text-black font-sans text-[9px] uppercase tracking-widest font-black hover:bg-stone-200 active:scale-95 transition-all flex items-center gap-2 shadow"
                  >
                    <Play size={12} fill="currentColor" /> Initiate Encryption Backup
                  </button>
                )}
              </div>

              {/* Real-time operations Console logs */}
              {progress.status !== 'idle' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-sans text-[9px] uppercase tracking-widest text-stone-400 font-extrabold flex items-center gap-2">
                      {progress.status === 'completed' ? (
                        <span className="text-emerald-400">● Cloud Mirror Verified</span>
                      ) : progress.status === 'failed' ? (
                        <span className="text-red-400">● Synchronization Aborted</span>
                      ) : (
                        <span className="text-stone-300 animate-pulse">● Executing backup cycles</span>
                      )}
                    </span>
                    <span className="font-mono text-[10px] text-stone-400">
                      Zines: {progress.currentZine}/{progress.totalZines} | Shards: {progress.currentPocket}/{progress.totalPocket}
                    </span>
                  </div>

                  {/* Progress bar visual container */}
                  <div className="w-full bg-white/5 h-1 border border-white/5 rounded-none overflow-hidden relative">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        progress.status === 'completed' ? 'bg-emerald-400' : progress.status === 'failed' ? 'bg-red-400' : 'bg-white'
                      }`}
                      style={{ 
                        width: `${
                          progress.totalZines + progress.totalPocket > 0
                            ? ((progress.currentZine + progress.currentPocket) / (progress.totalZines + progress.totalPocket)) * 100
                            : 0
                        }%` 
                      }}
                    />
                  </div>

                  {/* Mono styled Console scrolling logs container */}
                  <div className="h-60 bg-stone-950/80 border border-white/5 p-4 font-mono text-[10px] text-stone-300 overflow-y-auto no-scrollbar rounded-none space-y-1 select-text">
                    {progress.log.map((logLine, idx) => (
                      <div key={idx} className="leading-relaxed whitespace-pre-wrap break-all opacity-85 hover:opacity-100 transition-opacity">
                        <span className="text-neutral-500">❯</span> {logLine}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="p-6 md:p-8 border-t border-white/10 shrink-0 flex items-center justify-between bg-stone-950/40">
          <div className="flex items-center gap-2 text-[10px] font-sans text-stone-500 uppercase tracking-widest font-bold">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            End-To-End User Sandbox Encryption
          </div>
          <button
            onClick={onClose}
            disabled={isSyncing}
            className="px-6 py-2.5 border border-white/10 hover:border-white/20 text-stone-300 hover:text-white font-sans text-[8px] uppercase tracking-widest font-semibold transition-all rounded-none"
          >
            {progress.status === 'completed' ? 'Close Vault' : 'Cancel Sync'}
          </button>
        </footer>
      </div>
    </motion.div>
  );
};
