import React, { useEffect, useState } from 'react';
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset, checkActionCode, getAuth } from 'firebase/auth';

export const AuthAction: React.FC = () => {
 const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resetting'>('loading');
 const [message, setMessage] = useState('Verifying your request...');
 const [newPassword, setNewPassword] = useState('');
 const [actionCode, setActionCode] = useState('');
 const [email, setEmail] = useState('');

 useEffect(() => {
 const auth = getAuth();
 const urlParams = new URLSearchParams(window.location.search);
 const mode = urlParams.get('mode');
 const oobCode = urlParams.get('oobCode');
 const continueUrl = urlParams.get('continueUrl');

 if (!mode || !oobCode) {
 setStatus('error');
 setMessage('Invalid request. Missing parameters.');
 return;
 }

 setActionCode(oobCode);

 const handleAction = async () => {
 try {
 switch (mode) {
 case 'resetPassword':
 const emailAddress = await verifyPasswordResetCode(auth, oobCode);
 setEmail(emailAddress);
 setStatus('resetting');
 setMessage('Please enter your new password.');
 break;
 case 'recoverEmail':
 const restoredEmailInfo = await checkActionCode(auth, oobCode);
 await applyActionCode(auth, oobCode);
 setStatus('success');
 setMessage(`Your email has been successfully recovered to ${restoredEmailInfo.data.email}.`);
 break;
 case 'verifyEmail':
 await applyActionCode(auth, oobCode);
 setStatus('success');
 setMessage('Your email address has been successfully verified.');
 if (continueUrl) {
 setTimeout(() => {
 window.location.href = continueUrl;
 }, 3000);
 }
 break;
 case 'signIn':
 // The actual sign in is handled by App.tsx's useEffect, but we can show a loading state here
 setStatus('loading');
 setMessage('Completing sign in...');
 // We'll let App.tsx handle it, or we can handle it here if we want.
 // But since App.tsx has completeEmailLogin, let's just wait.
 // Actually, if we are in AuthAction, we might as well handle it here or just redirect to / to let App.tsx handle it.
 // Let's redirect to / with the same query params so App.tsx can handle it.
 window.location.href = `/${window.location.search}`;
 break;
 default:
 setStatus('error');
 setMessage('Invalid mode.');
 }
 } catch (error: any) {
 setStatus('error');
 setMessage(error.message || 'An error occurred while processing your request.');
 }
 };

 handleAction();
 }, []);

 const handleResetPassword = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newPassword || newPassword.length < 6) {
 setMessage('Password must be at least 6 characters long.');
 return;
 }
 
 setStatus('loading');
 setMessage('Updating password...');
 
 try {
 const auth = getAuth();
 await confirmPasswordReset(auth, actionCode, newPassword);
 setStatus('success');
 setMessage('Your password has been successfully reset. You can now log in.');
 } catch (error: any) {
 setStatus('error');
 setMessage(error.message || 'Failed to reset password.');
 }
 };

 return (
 <div className="min-h-screen bg-nous-base flex flex-col items-center justify-center p-8">
 <div className="max-w-md w-full bg-[#050505] border border-nous-border p-12 flex flex-col items-center text-center">
 <h1 className="font-serif text-3xl italic mb-6 text-white">Authentication</h1>
 
 {status === 'loading' && (
 <div className="animate-pulse text-nous-subtle font-mono text-xs uppercase tracking-widest">
 {message}
 </div>
 )}

 {status === 'success' && (
 <div className="flex flex-col items-center gap-6">
 <div className="text-green-500 font-mono text-xs uppercase tracking-widest">
 {message}
 </div>
 <button 
 onClick={() => window.location.href = '/'} 
 className="font-sans text-xs uppercase tracking-widest font-black text-white border-b border-current pb-1 hover:text-nous-subtle transition-colors"
 >
 Return to Vault
 </button>
 </div>
 )}

 {status === 'error' && (
 <div className="flex flex-col items-center gap-6">
 <div className="text-red-500 font-mono text-xs uppercase tracking-widest">
 {message}
 </div>
 <button 
 onClick={() => window.location.href = '/'} 
 className="font-sans text-xs uppercase tracking-widest font-black text-white border-b border-current pb-1 hover:text-nous-subtle transition-colors"
 >
 Return to Vault
 </button>
 </div>
 )}

 {status === 'resetting' && (
 <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-6">
 <div className="text-nous-subtle font-mono text-xs uppercase tracking-widest mb-2">
 Resetting password for {email}
 </div>
 <input
 type="password"
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 placeholder="New Password"
 className="w-full bg-transparent border-b border-nous-border text-white font-mono text-sm py-2 focus:outline-none focus:border-nous-border transition-colors"
 required
 minLength={6}
 />
 <button 
 type="submit"
 className="w-full bg-nous-base text-nous-text font-sans text-xs uppercase tracking-widest font-black py-3 hover:bg-stone-200 transition-colors"
 >
 Update Password
 </button>
 </form>
 )}
 </div>
 </div>
 );
};
