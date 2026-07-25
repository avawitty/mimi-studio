import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { fetchUserZines } from '../services/firebaseUtils';
import { generateSignature } from '../services/signatureService';
import { AestheticSignature } from '../types';
import { Fingerprint } from 'lucide-react';

export const SignatureUI: React.FC = () => {
 const { user, profile } = useUser();
 const [signature, setSignature] = useState<AestheticSignature | null>(null);

 useEffect(() => {
 if (profile?.tasteProfile?.aestheticSignature) {
 setSignature(profile.tasteProfile.aestheticSignature);
 }
 }, [profile]);

 if (!signature) return <div className="text-nous-subtle text-xs italic">No signature generated yet.</div>;

 return (
 <div className="bg-nous-base p-4 border border-nous-border text-nous-subtle font-serif text-sm">
 <div className="flex justify-between items-center mb-4">
 <h3 className="italic text-lg">Aesthetic DNA</h3>
 <Fingerprint size={16} className="text-nous-subtle/50"/>
 </div>
 <div className="space-y-2">
 <div>
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle">Primary Axis</p>
 <p className="italic text-nous-subtle">{signature.primaryAxis}</p>
 </div>
 <div>
 <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle">Secondary Axis</p>
 <p className="italic text-indigo-400">{signature.secondaryAxis}</p>
 </div>
 </div>
 </div>
 );
};
