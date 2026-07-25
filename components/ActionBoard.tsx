import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Plus, Trash2, Link2, Clock, CheckCircle2, Circle, X, CalendarDays, ListChecks, LayoutGrid, AlertCircle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { fetchTasks, updateTask, deleteTask, saveTask } from '../services/firebaseUtils';
import { Task } from '../types';
import { LoadingSkeleton } from './LoadingSkeleton';

export const ActionBoard = () => {
 const { user } = useUser();
 const [tasks, setTasks] = useState<Task[]>([]);
 const [loading, setLoading] = useState(true);
 const [newTaskText, setNewTaskText] = useState('');
 const [newTaskDate, setNewTaskDate] = useState('');
 const [newTaskPlatform, setNewTaskPlatform] = useState('');
 const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
 const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'canvas'>('list');
 const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
 const [zoom, setZoom] = useState(1);
 const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
 const canvasRef = React.useRef<HTMLDivElement>(null);

 const handleWheel = (e: React.WheelEvent) => {
 if (e.ctrlKey || e.metaKey) {
 e.preventDefault();
 setZoom(prev => Math.min(Math.max(0.5, prev - e.deltaY * 0.005), 3));
 }
 };

 const handleCanvasDoubleClick = async (e: React.MouseEvent) => {
 if (e.target !== canvasRef.current) return;
 const rect = canvasRef.current.getBoundingClientRect();
 const x = (e.clientX - rect.left) / zoom;
 const y = (e.clientY - rect.top) / zoom;
 
 const newTask: Task = {
 id: `task_${Date.now()}`,
 text: 'New Imperative',
 completed: false,
 createdAt: Date.now(),
 tags: ['manual'],
 position: { x, y }
 };
 
 setTasks(prev => [...prev, newTask]);
 
 try {
 await saveTask(user?.uid || 'ghost', newTask);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Imperative Anchored.", icon: <Target size={14} /> } }));
 } catch (e) {
 console.error("Task persistence failed", e);
 }
 };

 useEffect(() => {
 const loadTasks = async () => {
 setLoading(true);
 try {
 const fetchedTasks = await fetchTasks(user?.uid || 'ghost');
 setTasks(fetchedTasks);
 } catch (error) {
 console.error("Failed to load tasks:", error);
 } finally {
 setLoading(false);
 }
 };
 loadTasks();
 }, [user]);

 const handleAddTask = async () => {
 if (!newTaskText.trim()) return;
 const newTask: Task = {
 id: `task_${Date.now()}`,
 text: newTaskText.trim(),
 completed: false,
 dueDate: newTaskDate || undefined,
 createdAt: Date.now(),
 platform: newTaskPlatform || undefined,
 tags: ['manual']
 };
 
 setTasks(prev => [newTask, ...prev]);
 setNewTaskText('');
 setNewTaskDate('');
 setNewTaskPlatform('');
 
 try {
 await saveTask(user?.uid || 'ghost', newTask);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Imperative Anchored.", icon: <Target size={14} /> } }));
 } catch (e) {
 console.error("Task persistence failed", e);
 }
 };

 const handleTaskDragEnd = async (taskId: string, info: any) => {
 const task = tasks.find(t => t.id === taskId);
 if (!task) return;
 
 // Default center if no position exists
 const currentX = task.position?.x ?? 5000;
 const currentY = task.position?.y ?? 5000;
 
 const newPos = {
 x: currentX + info.offset.x / zoom,
 y: currentY + info.offset.y / zoom
 };
 
 setTasks(prev => prev.map(t => t.id === taskId ? { ...t, position: newPos } : t));
 try {
 await updateTask(user?.uid || 'ghost', taskId, { position: newPos });
 } catch (e) {
 console.error("Failed to update task position", e);
 }
 };

 const toggleNotes = (taskId: string) => {
 setExpandedNotes(prev => ({ ...prev, [taskId]: !prev[taskId] }));
 };

 const handleUpdateNotes = async (taskId: string, notes: string) => {
 setTasks(prev => prev.map(t => t.id === taskId ? { ...t, notes } : t));
 try {
 await updateTask(user?.uid || 'ghost', taskId, { notes });
 } catch (e) {
 console.error("Failed to update task notes", e);
 }
 };

 const toggleTask = async (taskId: string, currentStatus: boolean) => {
 setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !currentStatus } : t));
 try {
 await updateTask(user?.uid || 'ghost', taskId, { completed: !currentStatus });
 } catch (e) {
 console.error("Failed to update task", e);
 }
 };

 const confirmDeleteTask = async () => {
 if (!taskToDelete) return;
 setTasks(prev => prev.filter(t => t.id !== taskToDelete));
 const idToDelete = taskToDelete;
 setTaskToDelete(null);
 try {
 await deleteTask(user?.uid || 'ghost', idToDelete);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Imperative Purged.", icon: <Trash2 size={14} /> } }));
 } catch (e) {
 console.error("Failed to delete task", e);
 }
 };

 const filteredTasks = useMemo(() => {
 return tasks.filter(t => {
 if (filter === 'active') return !t.completed;
 if (filter === 'completed') return t.completed;
 return true;
 });
 }, [tasks, filter]);

 const tasksByDate = useMemo(() => {
 const groups: Record<string, Task[]> = {};
 const sorted = [...filteredTasks].sort((a,b) => {
 if (!a.dueDate) return 1;
 if (!b.dueDate) return -1;
 return a.dueDate.localeCompare(b.dueDate);
 });
 
 sorted.forEach(t => {
 const key = t.dueDate || 'Unscheduled';
 if (!groups[key]) groups[key] = [];
 groups[key].push(t);
 });
 return groups;
 }, [filteredTasks]);

 return (
 <div className="w-full h-full flex flex-col bg-nous-base text-nous-text font-mono transition-colors duration-1000 overflow-hidden relative">
 <div className="absolute inset-0 bg-nous-base bg-[size:40px_40px] opacity-20 pointer-events-none"/>

 <AnimatePresence>
 {taskToDelete && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
 <div className="bg-nous-base p-8 rounded-none max-w-sm w-full space-y-6 border border-nous-border">
 <div className="space-y-2">
 <h3 className="font-serif italic text-xl text-nous-text">Purge Imperative?</h3>
 <p className="font-mono text-[10px] text-nous-text uppercase tracking-widest">This action cannot be undone.</p>
 </div>
 <div className="flex gap-4">
 <button onClick={() => setTaskToDelete(null)} className="flex-1 py-3 text-nous-text hover:text-nous-text font-mono text-[9px] uppercase tracking-widest font-bold border border-nous-border hover:border-nous-border transition-all">Cancel</button>
 <button onClick={confirmDeleteTask} className="flex-1 py-3 bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 rounded-none font-mono text-[9px] uppercase tracking-widest font-bold transition-all">Confirm</button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 <header className="p-6 md:p-12 pb-8 flex flex-col md:flex-row justify-between items-start gap-6 border-b border-nous-border relative z-20 bg-nous-base/80 backdrop-blur-md">
 <div className="space-y-4">
 <div className="flex items-center gap-3 text-nous-text">
 <Target size={14} />
 <span className="font-mono text-[9px] uppercase tracking-[0.4em] font-bold">Action Board</span>
 </div>
 <h2 className="font-serif text-4xl md:text-6xl italic tracking-tighter text-nous-text leading-none">Strategic Imperatives.</h2>
 </div>
 <div className="flex flex-wrap gap-2 md:gap-4">
 <button onClick={() => setViewMode('list')} className={`p-3 border rounded-none transition-all ${viewMode === 'list' ? 'border-nous-border text-nous-text bg-nous-base0/10' : 'border-nous-border text-nous-text hover:border-nous-border hover:text-nous-text'}`} title="List View">
 <ListChecks size={16} />
 </button>
 <button onClick={() => setViewMode('calendar')} className={`p-3 border rounded-none transition-all ${viewMode === 'calendar' ? 'border-nous-border text-nous-text bg-nous-base0/10' : 'border-nous-border text-nous-text hover:border-nous-border hover:text-nous-text'}`} title="Timeline View">
 <CalendarDays size={16} />
 </button>
 <button onClick={() => setViewMode('canvas')} className={`p-3 border rounded-none transition-all ${viewMode === 'canvas' ? 'border-nous-border text-nous-text bg-nous-base0/10' : 'border-nous-border text-nous-text hover:border-nous-border hover:text-nous-text'}`} title="Canvas View">
 <LayoutGrid size={16} />
 </button>
 </div>
 </header>

 <div className="flex-1 relative z-10 overflow-hidden">
 {viewMode === 'canvas' ? (
 <div className="absolute inset-0 overflow-hidden bg-nous-base" onWheel={handleWheel}>
 <motion.div
 ref={canvasRef}
 drag
 dragConstraints={{ left: -5000, right: 5000, top: -5000, bottom: 5000 }}
 className="absolute w-[10000px] h-[10000px] left-[-5000px] top-[-5000px] cursor-grab active:cursor-grabbing"
 style={{ 
 backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 1px)', 
 backgroundSize: '40px 40px',
 scale: zoom
 }}
 onDoubleClick={handleCanvasDoubleClick}
 >
 {filteredTasks.map(task => (
 <motion.div
 key={task.id}
 drag
 dragMomentum={false}
 onDragEnd={(e, info) => handleTaskDragEnd(task.id, info)}
 initial={{ 
 x: task.position?.x ?? 5000 + Math.random() * 200, 
 y: task.position?.y ?? 5000 + Math.random() * 200 
 }}
 style={{ position: 'absolute' }}
 className={`w-64 p-4 border rounded-none cursor-grab active:cursor-grabbing ${task.completed ? 'bg-nous-base/50 border-nous-border/50' : 'bg-nous-base border-nous-border hover:border-nous-border/50'}`}
 >
 <div className="flex items-start gap-3">
 <button 
 onClick={(e) => { e.stopPropagation(); toggleTask(task.id, task.completed); }} 
 className={`mt-1 w-4 h-4 border flex items-center justify-center transition-all shrink-0 ${task.completed ? 'bg-stone-200 border-nous-border' : 'border-nous-border hover:border-nous-border'}`}
 >
 {task.completed && <X size={12} className="text-black stroke-[3]"/>}
 </button>
 <div className="flex-1">
 <p className={`font-sans font-medium text-sm ${task.completed ? 'text-nous-subtle line-through' : 'text-nous-text'}`}>
 {task.text}
 </p>
 {task.linkedContext && (
 <button 
 onClick={(e) => {
 e.stopPropagation();
 if (task.linkedContext?.type === 'zine') {
 window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'reveal_artifact', detail_id: task.linkedContext.id } as any));
 } else {
 window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: task.linkedContext?.type, detail_id: task.linkedContext?.id } as any));
 }
 }}
 className="mt-2 text-[9px] uppercase tracking-widest text-nous-text hover:text-nous-text flex items-center gap-1 font-mono transition-colors"
 >
 <Link2 size={10} /> Open Referenced {task.linkedContext.type}
 </button>
 )}
 <div className="flex flex-wrap gap-2 mt-3">
 {task.dueDate && (
 <span className="font-mono text-[8px] flex items-center gap-1 uppercase tracking-widest text-nous-text">
 <Clock size={8} /> {new Date(task.dueDate).toLocaleDateString()}
 </span>
 )}
 {task.platform && (
 <span className="px-1.5 py-0.5 rounded-none font-mono text-[7px] uppercase tracking-widest bg-nous-base text-nous-text">
 {task.platform}
 </span>
 )}
 </div>
 </div>
 <button 
 onClick={(e) => { e.stopPropagation(); setTaskToDelete(task.id); }} 
 className="text-nous-text hover:text-red-500 transition-all shrink-0"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </motion.div>
 ))}
 </motion.div>
 </div>
 ) : (
 <div className="h-full overflow-y-auto no-scrollbar p-6 md:p-12 pb-32">
 <div className="max-w-4xl mx-auto space-y-8">
 {/* Add Task Input */}
 <div className="border-y border-nous-border py-4 flex flex-col md:flex-row gap-4 items-center">
 <input 
 value={newTaskText} 
 onChange={e => setNewTaskText(e.target.value)} 
 onKeyDown={e => e.key === 'Enter' && handleAddTask()}
 placeholder="Define a new imperative..."
 className="flex-1 w-full bg-transparent border-none font-serif italic text-lg focus:outline-none text-nous-text placeholder:text-nous-subtle"
 />
 <div className="flex w-full md:w-auto gap-4">
 <input 
 type="text"
 value={newTaskPlatform} 
 onChange={e => setNewTaskPlatform(e.target.value)} 
 placeholder="Platform (e.g. TikTok)"
 className="w-1/2 md:w-32 bg-transparent border-b border-nous-border py-2 font-mono text-[10px] uppercase tracking-widest focus:outline-none focus:border-nous-border text-nous-text placeholder:text-nous-subtle"
 />
 <input 
 type="date"
 value={newTaskDate} 
 onChange={e => setNewTaskDate(e.target.value)} 
 className="w-1/2 md:w-32 bg-transparent border-b border-nous-border py-2 font-mono text-[10px] focus:outline-none focus:border-nous-border text-nous-text"
 />
 <button 
 onClick={handleAddTask} 
 disabled={!newTaskText.trim()} 
 className="px-4 py-2 bg-nous-base0 text-black rounded-none font-mono text-[9px] uppercase tracking-widest font-bold disabled:opacity-30 hover:bg-stone-400 transition-colors flex items-center gap-2"
 >
 <Plus size={14} /> Add
 </button>
 </div>
 </div>

 {/* Filters */}
 <div className="flex gap-4 border-b border-nous-border pb-4">
 {(['all', 'active', 'completed'] as const).map(f => (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={`font-mono text-[10px] uppercase tracking-widest font-bold transition-colors ${filter === f ? 'text-nous-text' : 'text-nous-text hover:text-nous-text'}`}
 >
 {f}
 </button>
 ))}
 </div>

 {loading ? (
 <div className="py-24 px-8"><LoadingSkeleton lines={5} className="w-full max-w-md mx-auto"/></div>
 ) : (
 <>
 {viewMode === 'list' ? (
 <div className="space-y-0">
 <AnimatePresence>
 {filteredTasks.map(task => (
 <motion.div 
 key={task.id} 
 initial={{ opacity: 0, y: 10 }} 
 animate={{ opacity: 1, y: 0 }} 
 exit={{ opacity: 0, scale: 0.95 }}
 className={`group relative flex flex-col p-4 border-b border-nous-border/50 transition-all ${task.completed ? 'opacity-50' : ''}`}
 >
 {/* Vertical Hairline for notes */}
 {(task.notes !== undefined || expandedNotes[task.id]) && (
 <div className="w-[1px] bg-nous-base absolute top-10 bottom-4 left-[23.5px] z-0"/>
 )}
 <div className="flex items-start gap-4 relative z-10">
 <div className="flex flex-col items-center">
 <button 
 onClick={() => toggleTask(task.id, task.completed)} 
 className={`mt-1 w-4 h-4 border flex items-center justify-center transition-all shrink-0 ${task.completed ? 'bg-stone-200 border-nous-border' : 'border-nous-border hover:border-nous-border'}`}
 >
 {task.completed && <X size={12} className="text-black stroke-[3]"/>}
 </button>
 </div>
 
 <div className="flex-1 flex flex-col gap-2 pb-2">
 <span className={`font-sans font-medium text-lg transition-all ${task.completed ? 'text-nous-subtle line-through' : 'text-nous-text'}`}>
 {task.text}
 </span>
 {task.linkedContext && (
 <button 
 onClick={(e) => {
 e.stopPropagation();
 if (task.linkedContext?.type === 'zine') {
 window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'reveal_artifact', detail_id: task.linkedContext.id } as any));
 } else {
 window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: task.linkedContext?.type, detail_id: task.linkedContext?.id } as any));
 }
 }}
 className="mt-1 text-[9px] uppercase tracking-widest text-nous-text hover:text-nous-text flex items-center gap-1 font-mono transition-colors self-start"
 >
 <Link2 size={10} /> Open Referenced {task.linkedContext.type}
 </button>
 )}
 
 <div className="flex flex-wrap gap-3 items-center mt-1">
 {task.dueDate && (
 <span className={`font-mono text-[9px] flex items-center gap-1.5 uppercase tracking-widest ${task.completed ? 'text-nous-text' : 'text-nous-text'}`}>
 <Clock size={10} /> {new Date(task.dueDate).toLocaleDateString()}
 </span>
 )}
 {task.platform && (
 <span className={`px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest ${task.completed ? 'text-nous-subtle border border-nous-border/50' : 'text-nous-text border border-nous-border'}`}>
 {task.platform}
 </span>
 )}
 {task.tags?.map(tag => (
 <span key={tag} className={`px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest bg-transparent ${task.completed ? 'text-nous-subtle border border-nous-border/50' : 'text-nous-text border border-nous-border'}`}>
 #{tag}
 </span>
 ))}
 </div>
 </div>
 
 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => toggleNotes(task.id)}
 className="font-mono text-[9px] uppercase tracking-widest text-nous-text hover:text-nous-text flex items-center gap-1"
 >
 <Plus size={10} /> {task.notes !== undefined || expandedNotes[task.id] ? 'LOG' : 'APPEND'}
 </button>
 <button 
 onClick={() => setTaskToDelete(task.id)} 
 className="p-2 text-nous-text hover:text-red-500 transition-all shrink-0"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </div>

 {/* Notes Section */}
 <AnimatePresence>
 {(task.notes !== undefined || expandedNotes[task.id]) && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden ml-[28px] mt-2 relative z-10"
 >
 <div className="font-mono text-[8px] uppercase tracking-widest text-nous-text mb-2">
 // EXECUTION LOG
 </div>
 <textarea
 value={task.notes || ''}
 onChange={(e) => handleUpdateNotes(task.id, e.target.value)}
 placeholder="█"
 className="w-full bg-transparent border-none resize-none font-serif italic text-nous-text focus:outline-none min-h-[60px]"
 />
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 ))}
 </AnimatePresence>
 {filteredTasks.length === 0 && (
 <div className="py-24 text-center opacity-30 border border-dashed border-nous-border rounded-none flex flex-col items-center justify-center gap-4">
 <AlertCircle size={32} className="text-nous-text"/>
 <p className="font-serif italic text-lg text-nous-text">No imperatives found.</p>
 </div>
 )}
 </div>
 ) : (
 <div className="space-y-12">
 {Object.keys(tasksByDate).length === 0 && (
 <div className="py-24 text-center opacity-30 border border-dashed border-nous-border rounded-none flex flex-col items-center justify-center gap-4">
 <CalendarDays size={32} className="text-nous-text"/>
 <p className="font-serif italic text-lg text-nous-text">Timeline Empty.</p>
 </div>
 )}
 {Object.entries(tasksByDate).sort().map(([date, groupTasks]) => (
 <div key={date} className="relative pl-8">
 {/* Timeline line */}
 <div className="absolute left-[11px] top-2 bottom-[-48px] w-px bg-nous-base last:bottom-0"/>
 
 {/* Timeline dot */}
 <div className="absolute left-0 top-1.5 w-6 h-6 rounded-none bg-nous-base border-2 border-nous-border flex items-center justify-center">
 <div className="w-1.5 h-1.5 rounded-none bg-nous-base0/50"/>
 </div>
 
 <div className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-nous-text mb-6 sticky top-0 bg-nous-base py-2 z-10">
 {date === 'Unscheduled' ? 'Backlog / Unscheduled' : new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
 </div>
 
 <div className="space-y-0">
 {groupTasks.map(task => (
 <div key={task.id} className={`group relative flex flex-col p-4 border-b border-nous-border/50 transition-all ${task.completed ? 'opacity-50' : ''}`}>
 {/* Vertical Hairline for notes */}
 {(task.notes !== undefined || expandedNotes[task.id]) && (
 <div className="w-[1px] bg-nous-base absolute top-10 bottom-4 left-[23.5px] z-0"/>
 )}
 <div className="flex items-start gap-4 relative z-10">
 <div className="flex flex-col items-center">
 <button 
 onClick={() => toggleTask(task.id, task.completed)} 
 className={`mt-1 w-4 h-4 border flex items-center justify-center transition-all shrink-0 ${task.completed ? 'bg-stone-200 border-nous-border' : 'border-nous-border hover:border-nous-border'}`}
 >
 {task.completed && <X size={12} className="text-black stroke-[3]"/>}
 </button>
 </div>
 
 <div className="flex-1 flex flex-col gap-2 pb-2">
 <span className={`font-sans font-medium text-lg transition-all ${task.completed ? 'text-nous-subtle line-through' : 'text-nous-text'}`}>
 {task.text}
 </span>
 {task.linkedContext && (
 <button 
 onClick={(e) => {
 e.stopPropagation();
 if (task.linkedContext?.type === 'zine') {
 window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'reveal_artifact', detail_id: task.linkedContext.id } as any));
 } else {
 window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: task.linkedContext?.type, detail_id: task.linkedContext?.id } as any));
 }
 }}
 className="mt-1 text-[9px] uppercase tracking-widest text-nous-text hover:text-nous-text flex items-center gap-1 font-mono transition-colors self-start"
 >
 <Link2 size={10} /> Open Referenced {task.linkedContext.type}
 </button>
 )}
 
 <div className="flex flex-wrap gap-3 items-center mt-1">
 {task.dueDate && (
 <span className={`font-mono text-[9px] flex items-center gap-1.5 uppercase tracking-widest ${task.completed ? 'text-nous-text' : 'text-nous-text'}`}>
 <Clock size={10} /> {new Date(task.dueDate).toLocaleDateString()}
 </span>
 )}
 {task.platform && (
 <span className={`px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest ${task.completed ? 'text-nous-subtle border border-nous-border/50' : 'text-nous-text border border-nous-border'}`}>
 {task.platform}
 </span>
 )}
 {task.tags?.map(tag => (
 <span key={tag} className={`px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest bg-transparent ${task.completed ? 'text-nous-subtle border border-nous-border/50' : 'text-nous-text border border-nous-border'}`}>
 #{tag}
 </span>
 ))}
 </div>
 </div>
 
 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => toggleNotes(task.id)}
 className="font-mono text-[9px] uppercase tracking-widest text-nous-text hover:text-nous-text flex items-center gap-1"
 >
 <Plus size={10} /> {task.notes !== undefined || expandedNotes[task.id] ? 'LOG' : 'APPEND'}
 </button>
 <button 
 onClick={() => setTaskToDelete(task.id)} 
 className="p-2 text-nous-text hover:text-red-500 transition-all shrink-0"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </div>

 {/* Notes Section */}
 <AnimatePresence>
 {(task.notes !== undefined || expandedNotes[task.id]) && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden ml-[28px] mt-2 relative z-10"
 >
 <div className="font-mono text-[8px] uppercase tracking-widest text-nous-text mb-2">
 // EXECUTION LOG
 </div>
 <textarea
 value={task.notes || ''}
 onChange={(e) => handleUpdateNotes(task.id, e.target.value)}
 placeholder="█"
 className="w-full bg-transparent border-none resize-none font-serif italic text-nous-text focus:outline-none min-h-[60px]"
 />
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 )}
 </>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 );
};