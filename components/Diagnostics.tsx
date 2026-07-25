
import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { CheckCircle, XCircle, Loader2, Activity, Database, Key, Mic, HardDrive } from 'lucide-react';

interface DiagnosticResult {
 id: string;
 label: string;
 status: 'pending' | 'success' | 'failure';
 message?: string;
 icon: React.ReactNode;
}

export const Diagnostics: React.FC = () => {
 const [results, setResults] = useState<DiagnosticResult[]>([
 { id: 'auth', label: 'Identity Anchor', status: 'pending', icon: <Activity size={16} /> },
 { id: 'api', label: 'Oracle Connection', status: 'pending', icon: <Key size={16} /> },
 { id: 'storage', label: 'Local Persistence', status: 'pending', icon: <HardDrive size={16} /> },
 { id: 'speech', label: 'Vocal Interface', status: 'pending', icon: <Mic size={16} /> },
 ]);
 const [isRunning, setIsRunning] = useState(false);

 const runDiagnostics = async () => {
 setIsRunning(true);
 
 // 1. Auth Check
 setResults(prev => prev.map(r => r.id === 'auth' ? { ...r, status: 'pending' } : r));
 await new Promise(resolve => setTimeout(resolve, 500)); // Visual delay
 const user = auth.currentUser;
 setResults(prev => prev.map(r => r.id === 'auth' ? { 
 ...r, 
 status: user ? 'success' : 'failure', 
 message: user ? `Anchored: ${user.uid.slice(0, 6)}...` : 'No active session found.' 
 } : r));

 // 2. API Key Check
 setResults(prev => prev.map(r => r.id === 'api' ? { ...r, status: 'pending' } : r));
 await new Promise(resolve => setTimeout(resolve, 500));
 // We can't see the actual key value for security, but we can check if the env var is likely set
 // In this environment, we assume if the app is running, the key is injected.
 // We'll check if we can instantiate the client or if the global key ring has entries.
 const hasKey = true; // In this environment, we assume true if not crashing, but let's be safer.
 // Actually, let's check if window.aistudio is available or just assume success for now as we can't easily ping without spending quota.
 // A better check:
 const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
 setResults(prev => prev.map(r => r.id === 'api' ? { 
 ...r, 
 status: apiKey ? 'success' : 'failure', 
 message: apiKey ? 'Oracle Key Detected' : 'API Key Missing' 
 } : r));

 // 3. Storage Check
 setResults(prev => prev.map(r => r.id === 'storage' ? { ...r, status: 'pending' } : r));
 await new Promise(resolve => setTimeout(resolve, 500));
 try {
 localStorage.setItem('mimi_diag', 'test');
 localStorage.removeItem('mimi_diag');
 setResults(prev => prev.map(r => r.id === 'storage' ? { ...r, status: 'success', message: 'Read/Write Operational' } : r));
 } catch (e) {
 setResults(prev => prev.map(r => r.id === 'storage' ? { ...r, status: 'failure', message: 'Storage Access Denied' } : r));
 }

 // 4. Speech Check
 setResults(prev => prev.map(r => r.id === 'speech' ? { ...r, status: 'pending' } : r));
 await new Promise(resolve => setTimeout(resolve, 500));
 const hasSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
 setResults(prev => prev.map(r => r.id === 'speech' ? { 
 ...r, 
 status: hasSpeech ? 'success' : 'failure', 
 message: hasSpeech ? 'Browser Supported' : 'Not Supported' 
 } : r));

 setIsRunning(false);
 };

 return (
 <div className="p-6 bg-nous-base border border-nous-border rounded-none space-y-6">
 <div className="flex items-center justify-between">
 <h3 className="font-serif text-2xl italic tracking-tighter text-nous-text ">System Diagnostics</h3>
 <button 
 onClick={runDiagnostics} 
 disabled={isRunning}
 className="px-6 py-2 bg-nous-text text-nous-base font-sans text-[9px] uppercase tracking-widest font-black rounded-none active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
 >
 {isRunning && <Loader2 size={12} className="animate-spin"/>}
 {isRunning ? 'Running...' : 'Run Sweep'}
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {results.map(r => (
 <div key={r.id} className="flex items-center gap-4 p-4 border border-nous-border rounded-none bg-nous-base/20">
 <div className={`p-2 rounded-none ${
 r.status === 'pending' ? 'bg-nous-base text-nous-subtle' :
 r.status === 'success' ? 'bg-nous-base /20 text-nous-subtle' :
 'bg-red-50 dark:bg-red-900/20 text-red-500'
 }`}>
 {r.status === 'pending' ? r.icon : r.status === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
 </div>
 <div>
 <p className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle">{r.label}</p>
 <p className="font-serif italic text-sm text-nous-text text-nous-text">
 {r.status === 'pending' && !isRunning ? 'Ready' : r.message || 'Checking...'}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
};
