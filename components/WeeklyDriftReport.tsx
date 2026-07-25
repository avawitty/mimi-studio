import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, X, Loader2, Compass } from 'lucide-react';
import { PocketItem, AestheticDNA } from '../types';
import { useUser } from '../contexts/UserContext';
import { getClient, withResilience } from '../services/geminiService';
import { Type } from '@google/genai';

interface DriftReport {
  tasteDriftVector: string;
  variancePercentage: number;
  divergenceAnalysis: string;
  alignmentScore: number;
  poeticObservation: string;
}

export const WeeklyDriftReport: React.FC<{ items: PocketItem[]; onClose: () => void }> = ({ items, onClose }) => {
  const [report, setReport] = useState<DriftReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const { profile } = useUser();

  useEffect(() => {
    const generateReport = async () => {
      if (!profile?.aestheticDNA || items.length === 0) {
        setIsAnalyzing(false);
        return;
      }

      const recentItems = items.slice(0, 10).map(i => ({
        type: i.type,
        content: i.content
      }));

      try {
        const result = await withResilience(async (ai) => {
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: `You are Mimi, an aesthetic oracle. Compare the user's core Aesthetic DNA with their 10 most recent Pocket saves. Calculate their "Taste Drift Vector".
            
            Aesthetic DNA: ${JSON.stringify(profile.aestheticDNA)}
            Recent Saves: ${JSON.stringify(recentItems)}
            
            Output a JSON object with:
            - tasteDriftVector: A short, poetic description of the direction they are drifting (e.g., "Towards brutalist minimalism").
            - variancePercentage: A number from 0 to 100 representing how far they've drifted from their core DNA.
            - divergenceAnalysis: A brutal, analytical explanation of the drift.
            - alignmentScore: A number from 0 to 100 representing how aligned they still are with their core.
            - poeticObservation: A haunting, poetic observation about their evolving taste.`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  tasteDriftVector: { type: Type.STRING },
                  variancePercentage: { type: Type.NUMBER },
                  divergenceAnalysis: { type: Type.STRING },
                  alignmentScore: { type: Type.NUMBER },
                  poeticObservation: { type: Type.STRING }
                },
                required: ["tasteDriftVector", "variancePercentage", "divergenceAnalysis", "alignmentScore", "poeticObservation"]
              }
            }
          });
          return JSON.parse(response.text || '{}') as DriftReport;
        });
        setReport(result);
      } catch (error) {
        console.error("Failed to generate drift report:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    generateReport();
  }, [items, profile]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[8000] bg-nous-base/90 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <div className="w-full max-w-2xl bg-white border border-nous-border p-8 md:p-12 relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-nous-subtle hover:text-nous-text transition-colors">
          <X size={24} />
        </button>

        <div className="space-y-8">
          <div className="flex items-center gap-4 border-b border-nous-border pb-6">
            <Compass size={32} className="text-nous-subtle" />
            <div>
              <h2 className="font-serif text-3xl italic text-nous-text">Weekly Drift Report</h2>
              <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle font-black mt-1">
                Aesthetic Variance Analysis
              </p>
            </div>
          </div>

          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 size={48} className="animate-spin text-nous-subtle" />
              <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle font-black">
                Calculating Taste Drift Vector...
              </p>
            </div>
          ) : !profile?.aestheticDNA ? (
            <div className="py-12 text-center space-y-4">
              <p className="font-serif italic text-xl text-nous-subtle">Aesthetic DNA Required</p>
            </div>
          ) : report ? (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8 border-b border-nous-border pb-8">
                <div className="space-y-2">
                  <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">Taste Drift Vector</span>
                  <p className="font-serif italic text-2xl">{report.tasteDriftVector}</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">Variance</span>
                    <span className="font-mono text-xs font-bold">{report.variancePercentage}%</span>
                  </div>
                  <div className="w-full h-1 bg-nous-base">
                    <div className="h-full bg-nous-text" style={{ width: `${report.variancePercentage}%` }} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">Alignment</span>
                    <span className="font-mono text-xs font-bold">{report.alignmentScore}%</span>
                  </div>
                  <div className="w-full h-1 bg-nous-base">
                    <div className="h-full bg-nous-text" style={{ width: `${report.alignmentScore}%` }} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">Divergence Analysis</span>
                <p className="font-sans text-sm leading-relaxed text-nous-text">{report.divergenceAnalysis}</p>
              </div>

              <div className="p-6 bg-nous-base border border-nous-border space-y-2">
                <span className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">Poetic Observation</span>
                <p className="font-serif italic text-lg text-nous-subtle">{report.poeticObservation}</p>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="font-serif italic text-xl text-nous-subtle">Insufficient Data</p>
              <p className="font-sans text-xs text-nous-subtle">Save more items to your Pocket to generate a drift report.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
