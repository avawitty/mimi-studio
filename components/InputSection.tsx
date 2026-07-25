import React, { useState, useCallback, useRef, useEffect } from 'react';

interface InputSectionProps {
 onRefine: (thought: string) => void;
 isThinking: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ onRefine, isThinking }) => {
 const [input, setInput] = useState('');
 const textareaRef = useRef<HTMLTextAreaElement>(null);

 const handleSubmit = useCallback(() => {
 if (input.trim() && !isThinking) {
 onRefine(input);
 }
 }, [input, isThinking, onRefine]);

 const handleKeyDown = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 handleSubmit();
 }
 };

 // Auto-resize textarea
 useEffect(() => {
 const textarea = textareaRef.current;
 if (textarea) {
 textarea.style.height = 'auto';
 textarea.style.height = `${textarea.scrollHeight}px`;
 }
 }, [input]);

 return (
 <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] transition-all duration-700">
 <div className="w-full opacity-0 animate-fade-in"style={{ animationDelay: '0.2s' }}>
 <p className="text-center font-serif italic text-nous-subtle mb-12 text-lg">
 Paste journals, notes, chats, or fragments.<br/>
 Mimi will curate them into a cinematic zine.
 </p>
 
 <div className="relative group">
 <textarea
 ref={textareaRef}
 value={input}
 onChange={(e) => setInput(e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="It started when..."
 disabled={isThinking}
 className="w-full bg-transparent border-b border-nous-border text-2xl md:text-3xl font-serif text-nous-text placeholder-stone-300 focus:outline-none focus:border-nous-border py-4 resize-none text-center transition-colors duration-500 overflow-hidden"
 rows={1}
 style={{ minHeight: '80px' }}
 />
 </div>

 <div className="mt-16 flex justify-center">
 <button
 onClick={handleSubmit}
 disabled={!input.trim() || isThinking}
 className={`
 font-sans text-xs tracking-[0.2em] uppercase text-nous-text
 py-3 px-8 border border-transparent hover:border-nous-text
 transition-all duration-500
 ${!input.trim() ? 'opacity-0 cursor-default' : 'opacity-100'}
 ${isThinking ? 'opacity-50 cursor-wait' : ''}
 `}
 >
 {isThinking ? 'Curating Issue...' : 'Generate Zine'}
 </button>
 </div>
 </div>
 </div>
 );
};