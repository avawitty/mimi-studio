import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Smartphone, Database, ServerOff, Zap, EyeOff, Radio, Box, Terminal } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'infrastructure'>('privacy');

  return (
    <div className="min-h-screen bg-nous-base text-nous-text font-sans p-8 pt-24 max-w-4xl mx-auto flex flex-col">
      <header className="mb-12 border-b border-nous-border pb-8">
        <h1 className="font-serif italic text-4xl mb-2 text-nous-text flex items-center gap-3">
          <Terminal size={32} className="text-nous-subtle" />
          System Architecture
        </h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-nous-subtle font-bold">
          Privacy by Design &bull; Sandboxed Execution
        </p>
      </header>

      <div className="flex gap-4 border-b border-nous-border mb-8">
        <button
          onClick={() => setActiveTab('privacy')}
          className={`pb-4 text-xs font-bold uppercase tracking-widest transition-colors ${
            activeTab === 'privacy' 
              ? 'text-nous-text border-b-2 border-nous-text' 
              : 'text-nous-subtle hover:text-nous-text/80'
          }`}
        >
          Privacy Framework
        </button>
        <button
          onClick={() => setActiveTab('infrastructure')}
          className={`pb-4 text-xs font-bold uppercase tracking-widest transition-colors ${
            activeTab === 'infrastructure' 
              ? 'text-nous-text border-b-2 border-nous-text' 
              : 'text-nous-subtle hover:text-nous-text/80'
          }`}
        >
          Infrastructure
        </button>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1"
      >
        {activeTab === 'privacy' && (
          <div className="space-y-8">
            <div className="prose prose-sm prose-invert max-w-none text-nous-text">
              <p className="text-sm leading-relaxed mb-6">
                Mimi is constructed as an evasive, sandboxed web application. By bypassing traditional App Stores, we eliminate arbitrary review boards, hostile tracking injections, and background data harvesting. You exist within a secure container running locally on your device.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard 
                icon={<EyeOff size={24} />}
                title="Zero Silent Harvesting"
                description="Native apps run background tasks that monitor device usage. As a PWA, we are intrinsically restricted to browser sandbox environments. When the tab closes, the monitoring dies."
              />
              <FeatureCard 
                icon={<Shield size={24} />}
                title="Key Sovereignty"
                description="We support BYOK (Bring Your Own Key). You maintain conscious control over which models compute your data. Intellectual property remains yours; it is not fed into massive corporate training arrays without consent."
              />
              <FeatureCard 
                icon={<ServerOff size={24} />}
                title="Local Pre-Processing"
                description="Data processing happens locally wherever possible. AI requests are strictly scoped, sending only mandatory context required for generation."
              />
              <FeatureCard 
                icon={<Box size={24} />}
                title="App Store Immune"
                description="Uncensorable and immune to arbitrary 30% financial taxes or policy changes. The application lives on the open web, accessible via a single un-throttled endpoint."
              />
            </div>
          </div>
        )}

        {activeTab === 'infrastructure' && (
          <div className="space-y-8">
            <div className="prose prose-sm prose-invert max-w-none text-nous-text">
              <p className="text-sm leading-relaxed mb-6">
                Our infrastructure is built for zero-friction distribution and immediate updates. A single tap to add to homescreen, 0mb initial install size, and instantaneous over-the-air updates.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="border border-nous-border p-6 flex items-start gap-4 bg-nous-subtle/5">
                <Smartphone className="text-nous-text shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-bold text-sm tracking-widest uppercase mb-2">Progressive Web Application</h3>
                  <p className="text-sm text-nous-subtle leading-relaxed mb-4">
                    Installable directly from Safari/Chrome. Requires no App Store authentication, no download queues, and consumes negligible local storage space until cached.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-nous-border text-[9px] uppercase tracking-widest">Install Time: &lt;1s</span>
                    <span className="px-2 py-1 bg-nous-border text-[9px] uppercase tracking-widest">App Store Tax: 0%</span>
                  </div>
                </div>
              </div>

              <div className="border border-nous-border p-6 flex items-start gap-4 bg-nous-subtle/5">
                <Database className="text-nous-text shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-bold text-sm tracking-widest uppercase mb-2">Relational Security Gates</h3>
                  <p className="text-sm text-nous-subtle leading-relaxed mb-4">
                    Backend architecture uses partitioned Firebase instances protected by Zero-Trust Firestore Security Rules. Every read and write is authenticated at the edge. "Master Gate" relational sync prevents data spillage.
                  </p>
                </div>
              </div>

              <div className="border border-nous-border p-6 flex items-start gap-4 bg-nous-subtle/5">
                <Zap className="text-nous-text shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-bold text-sm tracking-widest uppercase mb-2">Instantaneous Updates</h3>
                  <p className="text-sm text-nous-subtle leading-relaxed">
                    Updates to Mimi are deployed directly. When users reopen the application, it automatically fetches the latest client code. No more manual app updates or fragmented version audiences.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
  <div className="border border-nous-border p-5 group hover:bg-nous-subtle/10 transition-colors">
    <div className="text-nous-subtle mb-4 group-hover:text-nous-text transition-colors">
      {icon}
    </div>
    <h3 className="font-bold text-xs tracking-widest uppercase mb-2">{title}</h3>
    <p className="text-xs text-nous-subtle leading-relaxed">{description}</p>
  </div>
);
