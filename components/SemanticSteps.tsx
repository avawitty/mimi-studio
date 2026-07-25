import React from 'react';

interface Step {
 label: string;
 value: number;
}

interface SemanticStepsProps {
 steps: Step[];
 value: number;
 onChange: (value: number) => void;
}

export const SemanticSteps: React.FC<SemanticStepsProps> = ({ steps, value, onChange }) => {
 // Find the closest step to the current value
 const closestStepIndex = steps.reduce((prev, curr, index) => {
 return Math.abs(curr.value - value) < Math.abs(steps[prev].value - value) ? index : prev;
 }, 0);

 return (
 <div className="flex w-full bg-nous-base rounded-none p-1 border border-nous-border">
 {steps.map((step, index) => {
 const isActive = index === closestStepIndex;
 return (
 <button
 key={step.label}
 onClick={() => onChange(step.value)}
 className={`flex-1 py-2 px-2 text-[9px] uppercase tracking-widest font-black transition-all rounded-none ${
 isActive 
 ? 'bg-white text-primary  ' 
 : 'text-nous-subtle hover:text-nous-subtle hover:bg-stone-200/50 /50'
 }`}
 >
 {step.label}
 </button>
 );
 })}
 </div>
 );
};
