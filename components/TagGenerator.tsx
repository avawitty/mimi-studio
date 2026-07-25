import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Plus, Check } from 'lucide-react';
import { generateTagsFromMedia } from '../services/geminiService';

interface TagGeneratorProps {
 onAddTags: (tags: string[]) => void;
 context?: string;
}

export const TagGenerator: React.FC<TagGeneratorProps> = ({ onAddTags, context }) => {
 const [inputText, setInputText] = useState('');
 const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

 const handleGenerateTags = async () => {
 if (!inputText.trim()) return;
 setIsLoading(true);
 try {
 const tags = await generateTagsFromMedia(inputText, []);
 setSuggestedTags(tags);
 setSelectedTags(new Set());
 } catch (error) {
 console.error("MIMI // Tag Generation Error:", error);
 } finally {
 setIsLoading(false);
 }
 };

 const toggleTag = (tag: string) => {
 const newSelected = new Set(selectedTags);
 if (newSelected.has(tag)) {
 newSelected.delete(tag);
 } else {
 newSelected.add(tag);
 }
 setSelectedTags(newSelected);
 };

 const handleAddSelected = () => {
 onAddTags(Array.from(selectedTags));
 setSuggestedTags([]);
 setSelectedTags(new Set());
 };

 return (
 <div className="w-full space-y-6 p-6 bg-nous-base border border-black ">
 <div className="flex justify-between items-baseline border-b border-black  pb-2">
 <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-nous-text">TAG_GENERATOR // AI</span>
 </div>
 <textarea
 value={inputText}
 onChange={(e) => setInputText(e.target.value)}
 placeholder="INPUT CONTENT TO GENERATE AESTHETIC TAGS..."
 className="w-full bg-transparent border-b border-black  font-mono text-[9px] uppercase tracking-[0.2em] text-nous-text focus:outline-none placeholder:text-nous-subtle py-2 resize-none"
 rows={3}
 />
 <button
 onClick={handleGenerateTags}
 disabled={isLoading || !inputText.trim()}
 className="w-full py-3 border border-black  bg-nous-text text-nous-base   font-mono text-[9px] uppercase tracking-[0.3em] hover:bg-white hover:text-black dark:hover:bg-black hover:text-nous-text transition-colors disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-nous-text dark:disabled:hover:bg-white dark:disabled:hover:text-black"
 >
 {isLoading ? <Loader2 size={12} className="animate-spin mx-auto"strokeWidth={1} /> : 'GENERATE TAGS'}
 </button>

 <AnimatePresence>
 {suggestedTags.length > 0 && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="space-y-6 pt-4"
 >
 <div className="flex flex-wrap gap-3">
 {suggestedTags.map((tag) => (
 <button
 key={tag}
 onClick={() => toggleTag(tag)}
 className={`px-4 py-2 font-mono text-[9px] uppercase tracking-[0.2em] border transition-colors ${
 selectedTags.has(tag)
 ? 'bg-nous-text text-nous-base border-black   '
 : 'bg-nous-base text-nous-text border-black    hover:opacity-50'
 }`}
 >
 {tag}
 </button>
 ))}
 </div>
 {selectedTags.size > 0 && (
 <button
 onClick={handleAddSelected}
 className="w-full py-3 flex items-center justify-center gap-3 border border-black  bg-nous-base text-nous-text  text-nous-text font-mono text-[9px] uppercase tracking-[0.3em] hover:bg-black hover:text-nous-text dark:hover:bg-white dark:hover:text-black transition-colors"
 >
 <Check size={12} strokeWidth={1} /> SAVE {selectedTags.size} TAGS
 </button>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};
