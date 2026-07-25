import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, FileText, FlaskConical, Plus, Save, SlidersHorizontal } from 'lucide-react';
import {
  BRIEF_PRESETS,
  BriefPreset,
  GatewayCapabilityRole,
  loadCustomBriefPresets,
  saveCustomBriefPresets,
} from './UseCaseSelector';
import {
  getApprovedUsedContext,
  subscribeUsedContext,
} from '../services/usedContextService';
import { UsedContextEntry } from '../types';

const makeDraft = (): BriefPreset => ({
  id: `custom-${Date.now()}`,
  title: 'New brief preset',
  icon: <FileText className="w-4 h-4" />,
  tag: 'Custom workflow',
  description: 'A reusable brief for a recurring Worktable job.',
  briefInstruction: 'State what Mimi should preserve, decide, and produce.',
  outputContract: ['primary outcome', 'supporting evidence', 'next action'],
  temperature: 0.5,
  gatewayCapability: 'text-fast',
  routingPolicy: 'gateway-auto',
  telemetryCode: `BRIEF_CUSTOM_${Date.now()}`,
});

export const BriefCalibrationChamber: React.FC = () => {
  const [customPresets, setCustomPresets] = useState<BriefPreset[]>(() => loadCustomBriefPresets());
  const [active, setActive] = useState<BriefPreset>(() => BRIEF_PRESETS[0]);
  const [sample, setSample] = useState('Paste a representative fragment, client ask, or recurring worktable task here.');
  const [compiled, setCompiled] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [researchContexts, setResearchContexts] = useState<UsedContextEntry[]>([]);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const presets = useMemo(() => [...BRIEF_PRESETS, ...customPresets], [customPresets]);

  useEffect(() => {
    const refresh = () => {
      const next = getApprovedUsedContext('build-brief').filter(
        (entry) => entry.objectType === 'context_packet',
      );
      setResearchContexts(next);
      setSelectedContextIds((current) => {
        const available = new Set(next.map((entry) => entry.objectId || entry.atomId));
        const retained = current.filter((id) => available.has(id));
        return retained.length > 0 ? retained : [...available];
      });
    };
    refresh();
    return subscribeUsedContext(refresh);
  }, []);

  const updateActive = <K extends keyof BriefPreset>(key: K, value: BriefPreset[K]) => {
    setActive((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setCompiled(null);
  };

  const savePreset = () => {
    const next = [
      ...customPresets.filter((preset) => preset.id !== active.id),
      { ...active, id: active.id.startsWith('custom-') ? active.id : `custom-${Date.now()}` },
    ];
    setCustomPresets(next);
    saveCustomBriefPresets(next);
    setActive(next[next.length - 1]);
    setSaved(true);
  };

  const compileTest = () => {
    const selectedResearch = researchContexts.filter((entry) =>
      selectedContextIds.includes(entry.objectId || entry.atomId),
    );
    setCompiled([
      `ROLE: ${active.title}`,
      `GATEWAY CAPABILITY: ${active.gatewayCapability}`,
      `CREATIVE RANGE: ${active.temperature.toFixed(2)}`,
      `INSTRUCTION: ${active.briefInstruction}`,
      `OUTPUT CONTRACT: ${active.outputContract.join(' · ')}`,
      `TEST MATERIAL: ${sample}`,
      selectedResearch.length > 0
        ? `APPROVED RESEARCH CONTEXT:\n${selectedResearch
            .map(
              (entry) =>
                `--- ${entry.title} ---\n${entry.content}\nPROVENANCE: ${entry.source || 'Scry Research Context'} · ${entry.objectId || entry.atomId}`,
            )
            .join('\n\n')}`
        : 'APPROVED RESEARCH CONTEXT: none selected',
    ].join('\n\n'));
  };

  const applyToWorktable = () => {
    localStorage.setItem('mimi_cognitive_persona', JSON.stringify({ id: active.id }));
    localStorage.setItem(
      'mimi_active_brief_context_ids',
      JSON.stringify(selectedContextIds),
    );
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: { message: `${active.title} applied to the Worktable.`, type: 'success' },
    }));
    window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'studio' }));
  };

  return (
    <div className="h-full overflow-y-auto bg-[#f7f5f0] dark:bg-[#10100f] text-stone-900 dark:text-stone-100">
      <div className="max-w-7xl mx-auto px-5 md:px-10 py-8">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 border-b border-stone-300 dark:border-stone-800 pb-6">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-stone-500">Create / reusable instruction system</p>
            <h1 className="font-serif italic text-4xl md:text-5xl mt-2">Brief Calibration</h1>
            <p className="font-sans text-sm text-stone-600 dark:text-stone-400 mt-2 max-w-2xl">
              Build a repeatable brief once, test the exact instruction package, then apply it to the Worktable without choosing a provider.
            </p>
          </div>
          <button onClick={applyToWorktable} className="px-5 py-3 bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950 font-mono text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">
            Apply to Worktable <ArrowRight size={14} />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_minmax(300px,0.8fr)] gap-5 mt-6">
          <aside className="border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-950 p-3">
            <div className="flex items-center justify-between px-2 py-2 mb-2">
              <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">Preset library</span>
              <button onClick={() => setActive(makeDraft())} title="Create preset" className="w-8 h-8 border border-stone-300 dark:border-stone-700 flex items-center justify-center"><Plus size={14} /></button>
            </div>
            <div className="space-y-1.5">
              {presets.map((preset) => (
                <button key={preset.id} onClick={() => { setActive(preset); setCompiled(null); setSaved(false); }} className={`w-full p-3 border text-left ${preset.id === active.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-stone-200 dark:border-stone-800 hover:border-stone-400'}`}>
                  <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500">{preset.tag}</span>
                  <span className="block font-sans text-xs font-semibold mt-1">{preset.title}</span>
                  <span className="block font-sans text-[10px] text-stone-500 mt-1 line-clamp-2">{preset.description}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-950 p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-amber-600" />
                <h2 className="font-mono text-[10px] uppercase tracking-widest font-bold">Brief builder</h2>
              </div>
              <button onClick={savePreset} className="px-3 py-2 border border-stone-300 dark:border-stone-700 font-mono text-[8px] uppercase tracking-widest flex items-center gap-2">
                {saved ? <Check size={12} /> : <Save size={12} />} {saved ? 'Saved' : 'Save copy'}
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">Preset name</span>
                <input value={active.title} onChange={(e) => updateActive('title', e.target.value)} className="mt-1 w-full border border-stone-300 dark:border-stone-700 bg-transparent px-3 py-2 font-serif text-xl" />
              </label>
              <label className="block">
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">What this preset is for</span>
                <textarea value={active.description} onChange={(e) => updateActive('description', e.target.value)} className="mt-1 w-full min-h-20 border border-stone-300 dark:border-stone-700 bg-transparent px-3 py-2 font-sans text-sm" />
              </label>
              <label className="block">
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">Brief instruction</span>
                <textarea value={active.briefInstruction} onChange={(e) => updateActive('briefInstruction', e.target.value)} className="mt-1 w-full min-h-32 border border-stone-300 dark:border-stone-700 bg-transparent px-3 py-2 font-sans text-sm leading-relaxed" />
              </label>
              <label className="block">
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">Output contract · one item per line</span>
                <textarea value={active.outputContract.join('\n')} onChange={(e) => updateActive('outputContract', e.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} className="mt-1 w-full min-h-24 border border-stone-300 dark:border-stone-700 bg-transparent px-3 py-2 font-mono text-[10px]" />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">Gateway capability</span>
                  <select value={active.gatewayCapability} onChange={(e) => updateActive('gatewayCapability', e.target.value as GatewayCapabilityRole)} className="mt-1 w-full border border-stone-300 dark:border-stone-700 bg-transparent px-3 py-2 font-mono text-[10px] uppercase">
                    <option value="text-fast">Text fast</option>
                    <option value="text-deep">Text deep</option>
                    <option value="research-deep">Research deep</option>
                  </select>
                </label>
                <label>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">Creative range · {active.temperature.toFixed(2)}</span>
                  <input type="range" min="0" max="1" step="0.05" value={active.temperature} onChange={(e) => updateActive('temperature', Number(e.target.value))} className="mt-3 w-full accent-amber-500" />
                </label>
              </div>
            </div>
          </section>

          <section className="border border-stone-300 dark:border-stone-800 bg-[#171716] text-stone-100 p-5 md:p-6">
            <div className="flex items-center gap-2 border-b border-stone-700 pb-4 mb-5">
              <FlaskConical size={16} className="text-purple-400" />
              <h2 className="font-mono text-[10px] uppercase tracking-widest font-bold">Test panel</h2>
            </div>
            <p className="font-sans text-xs text-stone-400 mb-4">Compile a representative input and inspect exactly what the gateway receives. This test does not spend model tokens.</p>
            <div className="mb-4 border border-stone-700 bg-stone-950 p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500">
                  Approved Scry research
                </span>
                <span className="font-mono text-[7px] text-purple-300">
                  {selectedContextIds.length}/{researchContexts.length} selected
                </span>
              </div>
              {researchContexts.length === 0 ? (
                <button
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('mimi:change_view', { detail: 'scry' }),
                    )
                  }
                  className="w-full border border-dashed border-stone-700 p-3 text-left font-sans text-[10px] text-stone-400 hover:border-purple-400"
                >
                  No approved Research Context yet. Open Scry, save findings,
                  then approve a context for this Build Brief.
                </button>
              ) : (
                <div className="space-y-2">
                  {researchContexts.map((entry) => {
                    const id = entry.objectId || entry.atomId;
                    const selected = selectedContextIds.includes(id);
                    return (
                      <label
                        key={id}
                        className={`flex items-start gap-2 border p-2 cursor-pointer ${
                          selected
                            ? 'border-purple-400 bg-purple-500/10'
                            : 'border-stone-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setSelectedContextIds((current) =>
                              selected
                                ? current.filter((candidate) => candidate !== id)
                                : [...current, id],
                            )
                          }
                          className="mt-0.5 accent-purple-400"
                        />
                        <span className="min-w-0">
                          <span className="font-sans text-[10px] text-stone-200 block">
                            {entry.title}
                          </span>
                          <span className="font-mono text-[7px] uppercase tracking-wide text-stone-500 block mt-1">
                            {(entry.tags || []).slice(0, 4).join(' · ')}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <textarea value={sample} onChange={(e) => setSample(e.target.value)} className="w-full min-h-32 border border-stone-700 bg-stone-950 p-3 font-serif text-sm text-stone-200" />
            <button onClick={compileTest} className="mt-3 w-full py-3 bg-purple-500 text-stone-950 font-mono text-[9px] uppercase tracking-widest font-bold">Compile test brief</button>
            <div className="mt-5 border border-stone-700 bg-stone-950 min-h-72 p-4">
              <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500">Compiled gateway packet</span>
              <pre className="mt-3 whitespace-pre-wrap font-mono text-[9px] leading-relaxed text-stone-300">{compiled || 'Run the test to preview the reusable instruction packet.'}</pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BriefCalibrationChamber;
