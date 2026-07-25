import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { generateTasteDiscovery } from '../services/geminiService';
import { startTailorFromIntake } from '../services/tailorBridge';
import { resolveApiKey } from '../services/apiKeyService';
import { TasteDiscoveryResult } from '../types';
import { Sparkles, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

const DISCOVERY_QUESTIONS = [
  {
    id: 'structure',
    title: 'Structure vs. Flow',
    options: [
      { id: 'rigid', label: 'Architectural & Rigid', description: 'Clean lines, tailored fits, defined boundaries.' },
      { id: 'fluid', label: 'Fluid & Draped', description: 'Movement, soft fabrics, ambiguous silhouettes.' }
    ]
  },
  {
    id: 'color',
    title: 'Color Philosophy',
    options: [
      { id: 'monochrome', label: 'Monochrome & Muted', description: 'Blacks, whites, greys, earth tones.' },
      { id: 'vibrant', label: 'Vibrant & Saturated', description: 'Bold hues, high contrast, expressive palettes.' }
    ]
  },
  {
    id: 'texture',
    title: 'Material Preference',
    options: [
      { id: 'synthetic', label: 'Synthetic & Technical', description: 'Nylon, latex, metallic, futuristic.' },
      { id: 'organic', label: 'Organic & Natural', description: 'Linen, wool, leather, grounded.' }
    ]
  },
  {
    id: 'vibe',
    title: 'Emotional Resonance',
    options: [
      { id: 'understated', label: 'Understated & Quiet', description: 'Subtle, anonymous, whisper-quiet luxury.' },
      { id: 'provocative', label: 'Provocative & Loud', description: 'Statement-making, disruptive, attention-commanding.' }
    ]
  }
];

export const TasteDiscoveryView: React.FC = () => {
  const { activePersona, user } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TasteDiscoveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendingToTailor, setSendingToTailor] = useState(false);

  const handleSendToTailor = async () => {
    if (!user?.uid || !result) return;
    setSendingToTailor(true);
    try {
      const { projectId } = await startTailorFromIntake(user.uid, 'creative_practice', {
        title: 'Taste Discovery intake',
        blurb: result.evolutionPath,
        noteTitle: result.coreAesthetic,
        noteBody: JSON.stringify({ selections, result }, null, 2),
      });
      window.location.href = `/tailor?project=${projectId}`;
    } finally {
      setSendingToTailor(false);
    }
  };

  const handleSelect = (categoryId: string, choiceId: string, choiceLabel: string) => {
    setSelections(prev => ({ ...prev, [categoryId]: choiceLabel }));
    if (currentStep < DISCOVERY_QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleAnalyze({ ...selections, [categoryId]: choiceLabel });
    }
  };

  const handleAnalyze = async (finalSelections: Record<string, string>) => {
    setLoading(true);
    setError('');
    try {
      const analysis = await generateTasteDiscovery(finalSelections, activePersona?.apiKey);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze taste preferences.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelections({});
    setCurrentStep(0);
    setResult(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-nous-base text-nous-text font-serif custom-scrollbar p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-light italic tracking-tight">Taste Discovery</h1>
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-nous-subtle">
            Identify your aesthetic attractors
          </p>
        </div>

        {error && <p className="text-red-500 font-mono text-[10px] uppercase text-center">{error}</p>}

        {!result && !loading && (
          <div className="max-w-2xl mx-auto mt-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <span className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">
                    Question {currentStep + 1} of {DISCOVERY_QUESTIONS.length}
                  </span>
                  <h2 className="text-3xl italic">{DISCOVERY_QUESTIONS[currentStep].title}</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {DISCOVERY_QUESTIONS[currentStep].options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(DISCOVERY_QUESTIONS[currentStep].id, option.id, option.label)}
                      className="p-8 border border-nous-border hover:bg-nous-text hover:text-nous-base transition-colors text-left group flex flex-col gap-4"
                    >
                      <span className="font-sans text-sm uppercase tracking-widest font-bold block">
                        {option.label}
                      </span>
                      <span className="font-serif text-sm text-nous-subtle group-hover:text-nous-base/80">
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 space-y-6"
          >
            <Loader2 size={32} className="animate-spin text-nous-text" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle animate-pulse">
              Synthesizing Aesthetic Profile...
            </p>
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <div className="text-center space-y-4 border-b border-nous-border pb-12">
              <h2 className="font-sans text-[10px] uppercase tracking-[0.3em] text-nous-subtle font-black">Your Core Aesthetic</h2>
              <h3 className="text-5xl italic">{result.coreAesthetic}</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-nous-base0/30 p-8 border border-nous-border space-y-4">
                <h4 className="font-sans text-[10px] uppercase tracking-widest font-black text-nous-subtle">Psychological Profile</h4>
                <p className="font-serif text-sm leading-relaxed">{result.psychologicalProfile}</p>
              </div>

              <div className="bg-nous-base0/30 p-8 border border-nous-border space-y-6">
                <h4 className="font-sans text-[10px] uppercase tracking-widest font-black text-nous-subtle">Visual Preferences</h4>
                <div className="space-y-4 font-mono text-[10px]">
                  <div><span className="text-nous-subtle block mb-1">Color:</span> {result.visualPreferences.color}</div>
                  <div><span className="text-nous-subtle block mb-1">Form:</span> {result.visualPreferences.form}</div>
                  <div><span className="text-nous-subtle block mb-1">Texture:</span> {result.visualPreferences.texture}</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="font-sans text-[10px] uppercase tracking-widest font-black text-nous-subtle text-center">Recommended Keywords</h4>
              <div className="flex flex-wrap justify-center gap-3">
                {result.recommendedKeywords.map((keyword, idx) => (
                  <span key={idx} className="px-4 py-2 border border-nous-border font-mono text-[10px] uppercase tracking-wider">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-nous-text text-nous-base p-8 space-y-4">
              <h4 className="font-sans text-[10px] uppercase tracking-widest font-black opacity-70">Evolution Path</h4>
              <p className="font-serif text-sm leading-relaxed">{result.evolutionPath}</p>
            </div>

            <div className="flex justify-center gap-4 pt-8 flex-wrap">
              <button
                onClick={handleSendToTailor}
                disabled={sendingToTailor}
                className="flex items-center gap-2 px-6 py-3 bg-nous-text text-nous-base font-mono text-[10px] uppercase tracking-widest disabled:opacity-50"
              >
                Continue in Tailor
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 border border-nous-border hover:bg-nous-text hover:text-nous-base transition-colors font-mono text-[10px] uppercase tracking-widest"
              >
                <RefreshCw size={14} />
                Recalibrate
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
