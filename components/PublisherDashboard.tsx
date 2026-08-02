import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  HelpCircle, 
  Check, 
  Sparkles, 
  RefreshCw, 
  ArrowUpRight, 
  Users, 
  Clock, 
  Mail, 
  Coins, 
  AlertTriangle,
  Flame,
  Globe,
  Gauge,
  Sliders,
  CalendarCheck,
  ChevronRight
} from 'lucide-react';
import { ShopifyPressBridge } from './ShopifyPressBridge';
import { SessionInsightsWidget } from './SessionInsightsWidget';

export const PublisherDashboard: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '12m'>('7d');
  const [activeSponsorTab, setActiveSponsorTab] = useState<'all' | 'pending' | 'active'>('all');

  const stats = [
    {
      label: "Canonical Reach",
      value: "14,821",
      change: "+22.4%",
      sub: "Active email subscribers node links",
      desc: "Measures actual audience ownership rate.",
      trend: [10, 15, 23, 19, 32, 45, 62] // sparkline points
    },
    {
      label: "Retention (30/60/90d)",
      value: "92% / 84% / 78%",
      change: "Stable",
      sub: "Open and action rates active",
      desc: "Verifies high-value attention quality.",
      trend: [80, 81, 79, 82, 85, 87, 88]
    },
    {
      label: "B2B Sponsorship Yield",
      value: "$4,240",
      change: "+15.2%",
      sub: "Weekly sponsor placement conversions",
      desc: "Affiliate monetization levels.",
      trend: [5, 12, 10, 18, 14, 25, 30]
    },
    {
      label: "Deliverability Health",
      value: "99.8%",
      change: "Pristine",
      sub: "Spam Complaint Rate: < 0.04%",
      desc: "Aligned SPF, DKIM, and DMARC credentials.",
      trend: [99, 99.1, 99.4, 99.3, 99.8, 99.8, 99.8]
    }
  ];

  const bookings = [
    { id: 1, sponsor: "Are.na Lab", asset: "Tactile Monoliths Ad Unit", status: "Active", date: "May 25", revenue: "$850", clicks: "411" },
    { id: 2, sponsor: "Cormorant Typography", asset: "Display Serif Font Sponsorship", status: "Pending Review", date: "June 01", revenue: "$1,200", clicks: "—" },
    { id: 3, sponsor: "Forma Speculative Studio", asset: "Issue 02 Primary Slot", status: "Booked", date: "June 15", revenue: "$1,500", clicks: "—" }
  ];

  return (
    <div className="w-full min-h-screen bg-stone-950 text-stone-100 p-6 md:p-12 font-sans relative">
      
      {/* Absolute layout markers matching sovereign aesthetic styling */}
      <div className="absolute inset-x-0 top-0 h-px bg-stone-850 pointer-events-none" />
      <div className="absolute inset-y-0 left-12 w-px bg-stone-900 pointer-events-none hidden md:block" />
      <div className="absolute inset-y-0 right-12 w-px bg-stone-900 pointer-events-none hidden md:block" />

      {/* Title block */}
      <header className="max-w-6xl mx-auto mb-12 relative z-10 flex flex-col md:flex-row md:items-end justify-between border-b border-stone-850 pb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-stone-900 border border-stone-800 text-stone-300 rounded-sm mb-4">
            <Gauge size={10} className="text-emerald-500 animate-pulse" />
            <span className="text-[9px] uppercase tracking-widest font-black">Operator Analytics Layer</span>
          </div>
          <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-white mb-2">
            Publisher Console.
          </h1>
          <p className="font-mono text-[9px] tracking-[0.2em] text-stone-500 font-extrabold">
            Mimi Metrics Core // Secure Data Widgets Active
          </p>
        </div>

        {/* Time selector controls */}
        <div className="flex bg-stone-900 border border-stone-800 p-1">
          {(['7d', '30d', '12m'] as const).map(t => (
            <button 
              key={t}
              onClick={() => {
                setTimeframe(t);
                window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                  detail: { message: `Query Period Mapped to ${t.toUpperCase()}`, type: 'success' } 
                }));
              }}
              className={`px-3 py-1 font-mono text-[8px] uppercase tracking-widest transition-all ${timeframe === t ? 'bg-[#EAE9E5] text-stone-950 font-black' : 'text-stone-500 hover:text-stone-300'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Metrics Core Dashboard Cards Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 relative z-10">
        {stats.map(stat => (
          <div key={stat.label} className="border border-stone-850 bg-[#121112] p-5 relative overflow-hidden flex flex-col justify-between h-48 group hover:border-stone-700 transition-colors">
            
            {/* Top Stat Row */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-[8px] uppercase tracking-wider text-stone-500 font-black">{stat.label}</span>
                <span className="text-[9px] text-emerald-400 font-mono font-bold">{stat.change}</span>
              </div>
              <p className="font-serif text-2xl font-semibold text-white tracking-tight leading-snug">{stat.value}</p>
            </div>

            {/* Simulated mini SVG sparkline */}
            <div className="w-full h-8 flex items-end">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 20">
                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="1.5"
                  points={stat.trend.map((val, i) => `${(i / (stat.trend.length - 1)) * 100},${20 - (val / 100) * 18}`).join(' ')}
                  className="transition-all duration-1000"
                />
              </svg>
            </div>

            {/* Meta tags descriptions at bottom */}
            <div className="border-t border-stone-900 pt-3">
              <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wide leading-none">{stat.sub}</p>
              <p className="text-[10px] text-stone-500 leading-normal font-serif mt-1 italic">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Session Insights Widget */}
      <div className="max-w-6xl mx-auto mb-12 relative z-10">
        <SessionInsightsWidget />
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Section: B2B sponsorship board */}
        <div className="lg:col-span-8 space-y-6">
          <div className="border border-stone-850 bg-[#121112] p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-850 pb-4 mb-6 gap-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Sponsorship Operations</h3>
                <p className="font-mono text-[8px] uppercase tracking-wider text-stone-500">MANAGE ACTIVE AND FUTURE BRAND PLACEMENTS</p>
              </div>

              {/* Status categories switches */}
              <div className="flex bg-stone-900 border border-stone-850 p-1 self-start md:self-auto">
                {(['all', 'pending', 'active'] as const).map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveSponsorTab(tab)}
                    className={`px-3 py-1 font-mono text-[8px] uppercase tracking-wider transition-all ${activeSponsorTab === tab ? 'bg-stone-800 text-white font-bold' : 'text-stone-500 hover:text-stone-300'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Interactive Table */}
            <div className="overflow-x-auto no-scrollbar scroll-fade-x">
              <table className="w-full min-w-[560px] text-left font-mono text-[9px] uppercase tracking-wider">
                <thead>
                  <tr className="border-b border-stone-850 text-stone-500">
                    <th className="p-3">Partner Code</th>
                    <th className="p-3">Asset Spot</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Yield</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-900">
                  {bookings
                    .filter(b => activeSponsorTab === 'all' || (activeSponsorTab === 'pending' && b.status.includes('Pending')) || (activeSponsorTab === 'active' && b.status === "Active"))
                    .map(b => (
                      <tr key={b.id} className="hover:bg-stone-900/30 transition-colors">
                        <td className="p-3 font-bold text-white leading-normal">{b.sponsor}</td>
                        <td className="p-3 text-stone-400">{b.asset}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-none font-bold text-[8px] ${b.status === "Active" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : b.status.includes("Pending") ? "bg-amber-500/10 border border-amber-500/30 text-amber-400" : "bg-stone-800 border border-stone-700 text-stone-400"}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3 text-stone-300">{b.revenue}</td>
                        <td className="p-3">
                          <button 
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                                detail: { message: `Ad Copy Approved for ${b.sponsor}`, type: 'success' } 
                              }));
                            }}
                            className="text-stone-400 hover:text-emerald-400 font-bold tracking-widest uppercase text-[8px] border border-stone-800 hover:border-emerald-500/20 px-2 py-1 bg-stone-950 hover:bg-emerald-500/5 transition-all"
                          >
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Section: Deliverability & Domain Compliance */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border border-stone-850 bg-[#121112] p-6 space-y-6">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Sovereign Domain Verification</h3>
              <p className="font-mono text-[8px] uppercase tracking-wider text-stone-500">COMPLIANCE PROTOCOLS STATUS</p>
            </div>

            {/* Validation items list */}
            <div className="space-y-4">
              {[
                { label: "SPF RECORD", status: "Verified", desc: "mimi.you authorized sender node configuration.", color: "text-emerald-400" },
                { label: "DKIM SIGNATURE", status: "Verified", desc: "1024-bit cryptographic public keys matched.", color: "text-emerald-400" },
                { label: "DMARC POLICY", status: "Aligned (p=reject)", desc: "Hard reject protections activated against spoofing.", color: "text-emerald-400" },
                { label: "Yahoo/Google Complaint Index", status: "<0.03%", desc: "Strict spam threshold safely under 0.3% limitation.", color: "text-emerald-400" }
              ].map(comp => (
                <div key={comp.label} className="border border-stone-900 p-3 bg-stone-950">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="font-mono text-[8px] tracking-widest uppercase font-extrabold text-stone-400">{comp.label}</span>
                    <span className={`font-mono text-[8px] font-bold ${comp.color}`}>{comp.status}</span>
                  </div>
                  <p className="text-[10px] text-stone-500 font-serif italic leading-relaxed">{comp.desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-stone-900 flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500 animate-pulse" />
              <span className="font-mono text-[8px] uppercase tracking-widest text-[#937C64] font-black">All secure node pathways operational</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-8 relative z-10">
        <ShopifyPressBridge />
      </div>
    </div>
  );
};
