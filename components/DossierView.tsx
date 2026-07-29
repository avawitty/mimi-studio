// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { hasAccess } from '../constants';
import { fetchDossierFolders, fetchDossierArtifacts, createDossierFolder, createDossierArtifactFromImage, createDossierArtifactFromText, updateDossierFolder, fetchPocketItems, deleteDossierArtifact, updateDossierArtifact } from '../services/firebase';
import { DossierFolder, DossierArtifact, FruitionTrajectory, Task, UserProfile } from '../types';
import { Briefcase, Folder, Plus, ChevronRight, FileText, Share2, Layout, ArrowRight, Loader2, X, Archive, Eye, Trash2, Globe, ExternalLink, Upload, ImageIcon, HeartHandshake, FolderOpen, LayoutGrid, FolderPlus, PenTool, Save, Quote, Info, StickyNote, Compass, Map, Terminal, Check, Calendar, AlertTriangle, ListChecks, Sparkles, Clock, Target, CalendarDays, GripVertical, Users, UserPlus, Search, Cpu, Activity, Lock, Presentation } from 'lucide-react';
import { LoadingSkeleton } from './LoadingSkeleton';
import { DossierArtifactView } from './DossierArtifactView';
import { MoodboardComposer } from './MoodboardComposer';
import { CollabModal } from './CollabModal';
import { generateStrategicBlueprint, generateProjectTasks, generateFolderTasks } from '../services/geminiService';
import { db } from '../services/firebaseInit';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { getLocalFolders, getLocalArtifacts } from '../services/localArchive';
import { handleFirestoreError, OperationType } from '../services/firebaseUtils';
import { getClient } from '../services/geminiClient';
import { GoogleGenAI, Type } from '@google/genai';

export default function DossierView() {
 const { user, profile } = useUser();
 const [folders, setFolders] = useState<DossierFolder[]>([]);
 const [activeFolder, setActiveFolder] = useState<DossierFolder | null>(null);
 const [artifacts, setArtifacts] = useState<DossierArtifact[]>([]);
 const [activeArtifact, setActiveArtifact] = useState<DossierArtifact | null>(null);
 const [loadingFolders, setLoadingFolders] = useState(true);
 const [loadingArtifacts, setLoadingArtifacts] = useState(false);
 const [showNewFolder, setShowNewFolder] = useState(false);
 const [newFolderName, setNewFolderName] = useState('');
 const [isUploading, setIsUploading] = useState(false);
 const [folderSearchTerm, setFolderSearchTerm] = useState('');
 const [viewMode, setViewMode] = useState<'grid' | 'moodboard'>('grid');
 const [showImportModal, setShowImportModal] = useState(false);
 const [pocketItems, setPocketItems] = useState<any[]>([]);
 const [isImporting, setIsImporting] = useState(false);
 const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([]);
 const [selectedPocketItemIds, setSelectedPocketItemIds] = useState<string[]>([]);
 const [isSelectingForMoodboard, setIsSelectingForMoodboard] = useState(false);
 const [isSelectingFromPocketForMoodboard, setIsSelectingFromPocketForMoodboard] = useState(false);
 const [moodboardTitle, setMoodboardTitle] = useState('');
 const [isSavingMoodboard, setIsSavingMoodboard] = useState(false);

 // Collaborator State
 const [showCollabModal, setShowCollabModal] = useState(false);
 const [collabSearchTerm, setCollabSearchTerm] = useState('');
 const [collabSearchResults, setCollabSearchResults] = useState<UserProfile[]>([]);
 const [isSearchingCollab, setIsSearchingCollab] = useState(false);
 const [collabProfiles, setCollabProfiles] = useState<UserProfile[]>([]);

 // Note Modal State (Artifact Note)
 const [showNoteModal, setShowNoteModal] = useState(false);
 const [noteTitle, setNoteTitle] = useState('');
 const [noteContent, setNoteContent] = useState('');
 const [isSavingNote, setIsSavingNote] = useState(false);
 
 // Folder Memo State
 const [folderMemo, setFolderMemo] = useState('');
 const [isSavingMemo, setIsSavingMemo] = useState(false);

 // Exporters
 const [isExportingSlides, setIsExportingSlides] = useState(false);
 const [isExportingFolderDocs, setIsExportingFolderDocs] = useState(false);
 const [showExportModal, setShowExportModal] = useState(false);

 const handleExportDossierToSlides = async () => {
  if (!activeFolder || artifacts.length === 0) return;
  setIsExportingSlides(true);
  try {
   const { connectGoogleDrive, exportToGoogleSlides } = await import('../services/googleDriveService');
   const token = await connectGoogleDrive();
   
   const slideData = artifacts.map(art => {
    const isImg = art.elements[0]?.type === 'image';
    return {
     title: art.title || "Project Element",
     subtitle: art.description || "",
     body: isImg ? "" : art.elements[0]?.content || "",
     imageUrl: isImg ? art.elements[0]?.content : undefined
    };
   });

   const presentationId = await exportToGoogleSlides(token, `Dossier: ${activeFolder.name}`, slideData);
   
   window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
    detail: { 
     message: "Dossier exported to Google Slides!", 
     icon: <Check size={14} />,
     action: {
      label: "Open Slides",
      onClick: () => window.open(`https://docs.google.com/presentation/d/${presentationId}/edit`, '_blank')
     }
    } 
   }));
   setShowExportModal(false);
  } catch (e: any) {
   console.error(e);
   window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: `Slides Export failed: ${e.message || e}`, type: 'error' } }));
  } finally {
   setIsExportingSlides(false);
  }
 };

 const handleExportDossierToDocs = async () => {
  if (!activeFolder) return;
  setIsExportingFolderDocs(true);
  try {
   const { connectGoogleDrive, exportToGoogleDocs } = await import('../services/googleDriveService');
   const token = await connectGoogleDrive();
   
   let docContent = `# Project Dossier: ${activeFolder.name}\n\n`;
   
   if (activeFolder.memo) {
    docContent += `## Project Strategy Memo\n${activeFolder.memo}\n\n`;
   }
   
   docContent += `## Dossier Artifacts\n\n`;
   artifacts.forEach((art, index) => {
    docContent += `### ${index + 1}. ${art.title}\n`;
    if (art.description) docContent += `*Description:* ${art.description}\n\n`;
    
    if (art.elements[0]?.type === 'image') {
     docContent += `*Image URL:* ${art.elements[0].content}\n\n`;
    } else {
     docContent += `${art.elements[0]?.content || ''}\n\n`;
    }
    docContent += `* * *\n\n`;
   });

   const docId = await exportToGoogleDocs(token, `Dossier: ${activeFolder.name}`, docContent);
   
   window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
    detail: { 
     message: "Dossier exported to Google Docs!", 
     icon: <Check size={14} />,
     action: {
      label: "Open Doc",
      onClick: () => window.open(`https://docs.google.com/document/d/${docId}/edit`, '_blank')
     }
    } 
   }));
   setShowExportModal(false);
  } catch (e: any) {
   console.error(e);
   window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: `Docs Export failed: ${e.message || e}`, type: 'error' } }));
  } finally {
   setIsExportingFolderDocs(false);
  }
 };

 // Strategic Blueprint State
 const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
 const [activeBlueprint, setActiveBlueprint] = useState<FruitionTrajectory | null>(null);
 const [showBlueprintModal, setShowBlueprintModal] = useState(false);
 const [isPlanning, setIsPlanning] = useState(false);

 // Task Management State
 const [tasks, setTasks] = useState<Task[]>([]);
 const [newTaskText, setNewTaskText] = useState('');
 const [newTaskDate, setNewTaskDate] = useState('');
 const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
 const [artifactToDelete, setArtifactToDelete] = useState<string | null>(null);

 // Canvas Widget State
 const [showMemoWidget, setShowMemoWidget] = useState(true);
 const [showPunchlistWidget, setShowPunchlistWidget] = useState(false);
 const [isSidebarOpen, setIsSidebarOpen] = useState(true);
 const [isPresentationMode, setIsPresentationMode] = useState(false);
 const [editingTextArtifactId, setEditingTextArtifactId] = useState<string | null>(null);
 const [editingTextArtifactContent, setEditingTextArtifactContent] = useState('');
 const [editingTextArtifactTitle, setEditingTextArtifactTitle] = useState('');

 const fileInputRef = useRef<HTMLInputElement>(null);

 // Canvas mapping
 const canvasX = useMotionValue(0);
 const canvasY = useMotionValue(0);
 const mapSize = 120;
 const canvasSize = 4000;
 const minimapX = useTransform(canvasX, [-2000, 2000], [mapSize / 2, -mapSize / 2]);
 const minimapY = useTransform(canvasY, [-2000, 2000], [mapSize / 2, -mapSize / 2]);

 const loadFolders = async () => {
 if (folders.length === 0) setLoadingFolders(true);
 try {
 const data = await fetchDossierFolders(user?.uid || 'ghost');
 setFolders(data || []);
 } catch (e) {
 console.error("Dossier Registry Obscured:", e);
 } finally { setLoadingFolders(false); }
 };

 const loadArtifacts = async (folderId: string) => {
 setLoadingArtifacts(true);
 try {
 const data = await fetchDossierArtifacts(folderId);
 setArtifacts(data || []);
 } catch (e) {
 console.error("Artifact Extraction Failed:", e);
 } finally { setLoadingArtifacts(false); }
 };

  // Real-time folders subscription
  useEffect(() => {
    if (!user || user.uid === 'ghost') {
      loadFolders();
      return;
    }

    setLoadingFolders(true);
    
    // Subscribe to folders owned by user OR co-authored (collaborators)
    const q1 = query(collection(db, "dossier_folders"), where("userId", "==", user.uid));
    const q2 = query(collection(db, "dossier_folders"), where("collaborators", "array-contains", user.uid));

    let docs1: any[] = [];
    let docs2: any[] = [];

    const handleUpdate = () => {
      getLocalFolders().then(localFolders => {
        const foldersMap = new Map<string, DossierFolder>();
        localFolders.forEach(f => foldersMap.set(f.id, f));
        
        docs1.forEach(d => foldersMap.set(d.id, d.data() as DossierFolder));
        docs2.forEach(d => foldersMap.set(d.id, d.data() as DossierFolder));
        
        const sorted = Array.from(foldersMap.values()).sort((a, b) => b.createdAt - a.createdAt);
        setFolders(sorted);
        setLoadingFolders(false);

        // Update active folder state if any updates occur in real-time
        if (activeFolder) {
          const fresh = sorted.find(f => f.id === activeFolder.id);
          if (fresh) {
            setActiveFolder(fresh);
          }
        }
      }).catch(err => {
        console.error("MIMI // local folders load error:", err);
        setLoadingFolders(false);
      });
    };

    const unsub1 = onSnapshot(q1, (snap) => {
      docs1 = snap.docs;
      handleUpdate();
    }, (err) => {
      console.error("MIMI // Folders query 1 stream failed:", err);
      loadFolders();
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      docs2 = snap.docs;
      handleUpdate();
    }, (err) => {
      console.error("MIMI // Folders query 2 stream failed:", err);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user, activeFolder?.id]);

  // Real-time artifacts subscription
  useEffect(() => {
    if (!activeFolder) {
      setArtifacts([]);
      setFolderMemo('');
      setTasks([]);
      setCollabProfiles([]);
      setPocketItems([]);
      return;
    }

    setFolderMemo(activeFolder.notes || '');
    setTasks(activeFolder.tasks || []);
    loadCollaboratorProfiles(activeFolder.collaborators || []);
    fetchPocketItems(user?.uid || 'ghost').then(items => setPocketItems(items || [])).catch(console.error);

    if (!user || user.uid === 'ghost') {
      loadArtifacts(activeFolder.id);
      return;
    }

    setLoadingArtifacts(true);
    
    // Real-time query for dossier artifacts in activeFolder (no userId restriction for collaboration/multiplayer!)
    const q = query(collection(db, "dossier_artifacts"), where("folderId", "==", activeFolder.id));
    
    const unsub = onSnapshot(q, (snap) => {
      getLocalArtifacts(activeFolder.id).then(localArtifacts => {
        const cloudArtifacts = snap.docs.map(doc => doc.data() as DossierArtifact);
        
        const artifactsMap = new Map<string, DossierArtifact>();
        localArtifacts.forEach(a => artifactsMap.set(a.id, a));
        cloudArtifacts.forEach(a => artifactsMap.set(a.id, a));
        
        const sorted = Array.from(artifactsMap.values()).sort((a, b) => b.createdAt - a.createdAt);
        setArtifacts(sorted);
        setLoadingArtifacts(false);
      }).catch(err => {
        console.error("MIMI // local artifacts fetch err:", err);
        const cloudArtifacts = snap.docs.map(doc => doc.data() as DossierArtifact);
        setArtifacts(cloudArtifacts.sort((a, b) => b.createdAt - a.createdAt));
        setLoadingArtifacts(false);
      });
    }, (err) => {
      console.error("MIMI // Artifacts snapshot subscription failed:", err);
      loadArtifacts(activeFolder.id);
    });

    return () => unsub();
  }, [activeFolder?.id, user]);

 const loadCollaboratorProfiles = async (uids: string[]) => {
 if (!uids.length) {
 setCollabProfiles([]);
 return;
 }
 try {
 // Chunking to avoid 'in' query limits (max 10)
 const chunks = [];
 for (let i = 0; i < uids.length; i += 10) {
 chunks.push(uids.slice(i, i + 10));
 }
 
 let profiles: UserProfile[] = [];
 for (const chunk of chunks) {
 const q = query(collection(db, 'profiles'), where('uid', 'in', chunk));
 try {
 const snap = await getDocs(q);
 profiles = [...profiles, ...snap.docs.map(d => d.data() as UserProfile)];
 } catch (e) {
 handleFirestoreError(e, OperationType.LIST, 'profiles');
 }
 }
 setCollabProfiles(profiles);
 } catch (e) {
 console.error("Failed to load collaborator profiles", e);
 }
 };

 const handleSearchCollaborators = async () => {
 if (!collabSearchTerm.trim()) return;
 setIsSearchingCollab(true);
 try {
 // Simple prefix search on handle
 const q = query(
 collection(db, 'profiles'), 
 where('handle', '>=', collabSearchTerm.toLowerCase()),
 where('handle', '<=', collabSearchTerm.toLowerCase() + '\uf8ff')
 );
 try {
 const snap = await getDocs(q);
 const results = snap.docs.map(d => d.data() as UserProfile).filter(p => p.uid !== user?.uid);
 setCollabSearchResults(results);
 } catch (e) {
 handleFirestoreError(e, OperationType.LIST, 'profiles');
 }
 } catch (e) {
 console.error(e);
 } finally {
 setIsSearchingCollab(false);
 }
 };

 const handleAddCollaborator = async (collabUid: string) => {
 if (!activeFolder) return;
 const currentCollabs = activeFolder.collaborators || [];
 if (currentCollabs.includes(collabUid)) return;
 
 const updatedCollabs = [...currentCollabs, collabUid];
 try {
 await updateDossierFolder(activeFolder.id, { collaborators: updatedCollabs });
 setActiveFolder({ ...activeFolder, collaborators: updatedCollabs });
 setFolders(prev => prev.map(f => f.id === activeFolder.id ? { ...f, collaborators: updatedCollabs } : f));
 loadCollaboratorProfiles(updatedCollabs);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Collaborator Added.", icon: <UserPlus size={14} /> } }));
 } catch (e) {
 console.error(e);
 }
 };

 const handleRemoveCollaborator = async (collabUid: string) => {
 if (!activeFolder) return;
 const updatedCollabs = (activeFolder.collaborators || []).filter(id => id !== collabUid);
 try {
 await updateDossierFolder(activeFolder.id, { collaborators: updatedCollabs });
 setActiveFolder({ ...activeFolder, collaborators: updatedCollabs });
 setFolders(prev => prev.map(f => f.id === activeFolder.id ? { ...f, collaborators: updatedCollabs } : f));
 loadCollaboratorProfiles(updatedCollabs);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Collaborator Removed.", icon: <Trash2 size={14} /> } }));
 } catch (e) {
 console.error(e);
 }
 };

 const handleCreateFolder = async () => {
 if (!newFolderName.trim()) return;
 if (!hasAccess(profile?.plan, 'pro') && folders.length >= 1) {
 window.dispatchEvent(new CustomEvent('mimi:open_patron_modal'));
 return;
 }
 try {
 await createDossierFolder(user?.uid || 'ghost', newFolderName);
 setNewFolderName(''); 
 setShowNewFolder(false);
 await loadFolders();
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Project Space Manifested.", icon: <FolderPlus size={14} /> } }));
 } catch (e) {}
 };

 const handleSaveFolderMemo = async () => {
 if (!activeFolder) return;
 setIsSavingMemo(true);
 try {
 await updateDossierFolder(activeFolder.id, { notes: folderMemo });
 // Update local state
 setActiveFolder(prev => prev ? { ...prev, notes: folderMemo } : null);
 setFolders(prev => prev.map(f => f.id === activeFolder.id ? { ...f, notes: folderMemo } : f));
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Folder Strategic Memo Anchored.", icon: <Check size={14} /> } }));
 } catch (e) {
 console.error(e);
 } finally {
 setIsSavingMemo(false);
 }
 };

 const handleArtifactDragEnd = async (e: any, info: any, artifact: DossierArtifact) => {
 const index = artifacts.findIndex(a => a.id === artifact.id);
 const defaultX = 100 + ((index % 4) * 280);
 const defaultY = 400 + (Math.floor(index / 4) * 280);
 
 const currentX = artifact.layout?.x ?? defaultX;
 const currentY = artifact.layout?.y ?? defaultY;
 const newX = currentX + info.offset.x;
 const newY = currentY + info.offset.y;
 
 setArtifacts(prev => prev.map(art => 
 art.id === artifact.id 
 ? { ...art, layout: { x: newX, y: newY, zIndex: (art.layout?.zIndex || 0) + 1 } }
 : art
 ));

 try {
 await updateDossierArtifact(artifact.id, {
 layout: { x: newX, y: newY, zIndex: (artifact.layout?.zIndex || 0) + 1 }
 });
 } catch (err) {
 console.error("Failed to update artifact layout", err);
 }
 };

 const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (!files || files.length === 0 || !activeFolder) return;
 setIsUploading(true);
 
 // Create optimistic artifacts
 const newOptimistic: DossierArtifact[] = [];
 
 try {
 for (let i = 0; i < files.length; i++) {
 const file = files[i];
 
 // Read file as Data URL to compress
 const base64 = await new Promise<string>((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = (ev) => {
 const img = new Image();
 img.onload = () => {
 const canvas = document.createElement('canvas');
 const MAX_WIDTH = 800; // downscale
 const MAX_HEIGHT = 800;
 let width = img.width;
 let height = img.height;
 if (width > height) {
 if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
 } else {
 if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
 }
 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext('2d');
 ctx?.drawImage(img, 0, 0, width, height);
 resolve(canvas.toDataURL('image/jpeg', 0.6));
 };
 img.onerror = reject;
 img.src = ev.target?.result as string;
 };
 reader.onerror = reject;
 reader.readAsDataURL(file);
 });
 
 const tempId = `temp_${Date.now()}_${i}`;
 const layout = {
 x: 500 - canvasX.get() + ((artifacts.length + i) % 4) * 50,
 y: 500 - canvasY.get() + Math.random() * 50,
 w: 256,
 h: 256,
 zIndex: 30 + artifacts.length + i
 };
 
 newOptimistic.push({
 id: tempId,
 userId: user?.uid || 'ghost',
 folderId: activeFolder.id,
 type: 'moodboard',
 title: file.name,
 createdAt: Date.now(),
 layout,
 elements: [{ type: 'image', content: base64 }]
 });
 
 // Fire and forget in background to not block UI
 createDossierArtifactFromImage(user?.uid || 'ghost', activeFolder.id, file.name, base64 as string, layout).catch(console.error);
 }
 setArtifacts(prev => [...prev, ...newOptimistic]);
 } catch (err) {
 console.error(err);
 } finally {
 setIsUploading(false);
 e.target.value = '';
 }
 };

 const handleSaveNote = async () => {
 if (!noteContent.trim() || !activeFolder) return;
 setIsSavingNote(true);
 try {
 const title = noteTitle.trim() ||"Semiotic Fragment";
 const layout = {
 x: 100 + ((artifacts.length % 4) * 280),
 y: 400 + (Math.floor(artifacts.length / 4) * 280),
 w: 256,
 h: 256,
 zIndex: 30 + artifacts.length
 };
 await createDossierArtifactFromText(user?.uid || 'ghost', activeFolder.id, title, noteContent, layout);
 setNoteTitle('');
 setNoteContent('');
 setShowNoteModal(false);
 await loadArtifacts(activeFolder.id);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Semiotic Shard Anchored.", icon: <PenTool size={14} /> } }));
 } catch (e) {
 console.error(e);
 } finally {
 setIsSavingNote(false);
 }
 };

 const handleGenerateBlueprint = async () => {
 if (!activeFolder) return;
 setIsGeneratingBlueprint(true);
 try {
 const res = await generateStrategicBlueprint(artifacts, folderMemo, profile);
 setActiveBlueprint(res);
 setShowBlueprintModal(true);
 } catch (e) {
 console.error(e);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Blueprint Generation Failed.", type: 'error' } }));
 } finally {
 setIsGeneratingBlueprint(false);
 }
 };

 // --- ARTIFACT MANAGEMENT LOGIC ---
 const confirmDeleteArtifact = async () => {
 if (!artifactToDelete || !activeFolder) return;
 await deleteDossierArtifact(artifactToDelete);
 setArtifactToDelete(null);
 loadArtifacts(activeFolder.id);
 };

 // --- TASK MANAGEMENT LOGIC ---

 const [isGeneratingPunchlist, setIsGeneratingPunchlist] = useState(false);

 const handleAutoPunchlist = async () => {
 if (!activeFolder || !user?.uid) return;
 setIsGeneratingPunchlist(true);
 try {
 const [ownedBoardsSnapshot, sharedBoardsSnapshot] = await Promise.all([
   getDocs(query(collection(db, 'thimbleBoards'), where('userId', '==', user.uid))),
   getDocs(query(collection(db, 'thimbleBoards'), where('collaborators', 'array-contains', user.uid)))
 ]);
 const boardMap = new Map<string, any>();
 ownedBoardsSnapshot.docs.forEach((docSnap) => {
   boardMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
 });
 sharedBoardsSnapshot.docs.forEach((docSnap) => {
   boardMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
 });
 const boards = Array.from(boardMap.values());
 const boardIds = boards.map((board) => board.id);

 const itemsMap = new Map<string, any>();
 if (boardIds.length > 0) {
   const FIRESTORE_IN_QUERY_LIMIT = 10;
   const boardIdChunks: string[][] = [];
   for (let i = 0; i < boardIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
     boardIdChunks.push(boardIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT));
   }
   const boardItemSnapshots = await Promise.all(
     boardIdChunks.map((chunk) =>
       getDocs(query(collection(db, 'thimbleItems'), where('boardId', 'in', chunk)))
     )
   );
   boardItemSnapshots.forEach((snapshot) => {
     snapshot.docs.forEach((docSnap) => {
       itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
     });
   });
 }
 const items = Array.from(itemsMap.values());

 const { ai } = getClient();
 const response = await ai.models.generateContent({
 model: 'gemini-3.5-flash',
 contents: `Generate a short, actionable punchlist (3-5 items) for the project"${activeFolder.name}".
 Consider the user's sourcing boards: ${JSON.stringify(boards)} and items: ${JSON.stringify(items)}.
 Return ONLY a JSON array of strings representing the tasks.`,
 config: {
 responseMimeType: 'application/json',
 responseSchema: {
 type: Type.ARRAY,
 items: { type: Type.STRING }
 }
 }
 });

 const newTasksText: string[] = JSON.parse(response.text || '[]');
 const newTasks: Task[] = newTasksText.map((text, i) => ({
 id: `task_${Date.now()}_${i}`,
 text,
 completed: false,
 createdAt: new Date().toISOString()
 }));

 const updatedTasks = [...tasks, ...newTasks];
 setTasks(updatedTasks);
 await updateDossierFolder(activeFolder.id, { tasks: updatedTasks });
 setActiveFolder(prev => prev ? { ...prev, tasks: updatedTasks } : null);
 } catch (err) {
 console.error(err);
 } finally {
 setIsGeneratingPunchlist(false);
 }
 };

 const handleAddTask = async () => {
 if (!newTaskText.trim() || !activeFolder) return;
 const newTask: Task = {
 id: `task_${Date.now()}`,
 text: newTaskText.trim(),
 completed: false,
 dueDate: newTaskDate || undefined,
 createdAt: Date.now()
 };
 const updatedTasks = [...tasks, newTask];
 
 setTasks(updatedTasks);
 setNewTaskText('');
 setNewTaskDate('');
 
 // Persist
 try {
 await updateDossierFolder(activeFolder.id, { tasks: updatedTasks });
 // Update local folders list to reflect state
 setFolders(prev => prev.map(f => f.id === activeFolder.id ? { ...f, tasks: updatedTasks } : f));
 } catch(e) {
 console.error("Task persistence failed", e);
 }
 };

 const toggleTask = async (taskId: string) => {
 if (!activeFolder) return;
 const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
 setTasks(updatedTasks);
 try {
 await updateDossierFolder(activeFolder.id, { tasks: updatedTasks });
 setFolders(prev => prev.map(f => f.id === activeFolder.id ? { ...f, tasks: updatedTasks } : f));
 } catch(e) {}
 };

 const confirmDeleteTask = async () => {
 if (!activeFolder || !taskToDelete) return;
 const updatedTasks = tasks.filter(t => t.id !== taskToDelete);
 setTasks(updatedTasks);
 setTaskToDelete(null);
 try {
 await updateDossierFolder(activeFolder.id, { tasks: updatedTasks });
 setFolders(prev => prev.map(f => f.id === activeFolder.id ? { ...f, tasks: updatedTasks } : f));
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Imperative Purged.", icon: <Trash2 size={14} /> } }));
 } catch(e) {}
 };

 const handleAutoPlan = async () => {
 if (!activeFolder || isPlanning) return;
 setIsPlanning(true);
 try {
 const generatedTasks = await generateProjectTasks(activeFolder.name, folderMemo, artifacts, profile);
 if (generatedTasks && generatedTasks.length > 0) {
 const mergedTasks = [...tasks, ...generatedTasks];
 setTasks(mergedTasks);
 await updateDossierFolder(activeFolder.id, { tasks: mergedTasks });
 setFolders(prev => prev.map(f => f.id === activeFolder.id ? { ...f, tasks: mergedTasks } : f));
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Strategy Manifested into Action.", icon: <Sparkles size={14} /> } }));
 }
 } catch (e) {
 console.error("Auto Plan Failed", e);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"The Strategist was obstructed.", type: 'error' } }));
 } finally {
 setIsPlanning(false);
 }
 };

 const handleGenerateTasks = async () => {
 if (!activeFolder || isPlanning) return;
 setIsPlanning(true);
 try {
 const generatedTasks = await generateFolderTasks(activeFolder.name, folderMemo, artifacts);
 if (generatedTasks && generatedTasks.length > 0) {
 const newTasks = generatedTasks.map(t => ({
 id: `task_${Date.now()}_${Math.random()}`,
 text: t.title + ': ' + t.description,
 completed: false,
 dueDate: t.dueDate,
 createdAt: Date.now()
 }));
 const mergedTasks = [...tasks, ...newTasks];
 setTasks(mergedTasks);
 await updateDossierFolder(activeFolder.id, { tasks: mergedTasks });
 setFolders(prev => prev.map(f => f.id === activeFolder.id ? { ...f, tasks: mergedTasks } : f));
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Tasks Manifested.", icon: <Sparkles size={14} /> } }));
 }
 } catch (e) {
 console.error("Task Generation Failed", e);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"The Strategist was obstructed.", type: 'error' } }));
 } finally {
 setIsPlanning(false);
 }
 };

 const handleVent = () => {
 window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'sanctuary' }));
 };

 const handleGenerateFinalZine = () => {
 if (!activeFolder) return;
 
 const textContext = artifacts
 .filter(a => a.type === 'text')
 .map(a => `[${a.title}]: ${a.content}`)
 .join('\n\n');
 
 const fullContext = `PROJECT: ${activeFolder.name}\nMEMO: ${folderMemo}\n\nARTIFACTS:\n${textContext}`;
 
 const initialMedia = artifacts
 .filter(a => a.type === 'image' && a.content)
 .map(a => ({
 type: 'image',
 data: a.content,
 mimeType: 'image/jpeg'
 }));

 window.dispatchEvent(new CustomEvent('mimi:change_view', { 
 detail: 'studio', 
 detail_data: { 
 context: fullContext, 
 initialMedia: initialMedia,
 isHighFidelity: true 
 } 
 }));
 };

 const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(folderSearchTerm.toLowerCase()));

 const handleExportFolder = () => {
 if (!activeFolder) return;
 const data = {
 folder: activeFolder,
 artifacts: artifacts,
 exportedAt: new Date().toISOString()
 };
 const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `mimi-dossier-${activeFolder.name.replace(/\s+/g, '-').toLowerCase()}.json`;
 a.click();
 URL.revokeObjectURL(url);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Dossier Exported.", icon: <Archive size={14} /> } }));
 };

 const handleOpenImport = async () => {
 setShowImportModal(true);
 setIsImporting(true);
 try {
 const items = await fetchPocketItems(user?.uid || 'ghost');
 setPocketItems(items || []);
 } catch (e) {
 console.error(e);
 } finally {
 setIsImporting(false);
 }
 };

 const handleImportItem = async (item: any) => {
 if (!activeFolder) return;
 try {
 const layout = {
 x: 100 + ((artifacts.length % 4) * 280),
 y: 400 + (Math.floor(artifacts.length / 4) * 280),
 w: 256,
 h: 256,
 zIndex: 30 + artifacts.length
 };
 if (item.type === 'image' || item.type === 'zine_card') {
 await createDossierArtifactFromImage(user?.uid || 'ghost', activeFolder.id, item.content.prompt || item.content.title || 'Imported Shard', item.content.imageUrl, layout);
 } else if (item.type === 'voicenote' || item.type === 'audio') {
 // For now, we'll just treat audio as a text artifact with the URL or similar if we don't have a specific audio artifact type yet
 await createDossierArtifactFromText(user?.uid || 'ghost', activeFolder.id, item.content.prompt || 'Sonic Shard', `Audio Source: ${item.content.audioUrl}`, layout);
 }
 await loadArtifacts(activeFolder.id);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Shard Imported.", icon: <Check size={14} /> } }));
 } catch (e) {
 console.error(e);
 }
 };
 
 const handleAddMemoBlock = async () => {
 if (!activeFolder) return;
 try {
 const computedX = -canvasX.get() + 500;
 const computedY = -canvasY.get() + 500;
 const layout = {
 x: computedX,
 y: computedY,
 w: 256,
 h: 256,
 zIndex: 30 + artifacts.length
 };
 await createDossierArtifactFromText(user?.uid || 'ghost', activeFolder.id, 'Text Memo', 'Double click to edit...', layout);
 await loadArtifacts(activeFolder.id);
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message:"Memo Added.", icon: <Check size={14} /> } }));
 } catch (e) {
 console.error(e);
 }
 };

 const handleSaveEditedTextArtifact = async () => {
 if (!editingTextArtifactId) return;
 try {
 await updateDossierArtifact(editingTextArtifactId, {
 elements: [{
 type: 'text',
 content: editingTextArtifactContent,
 }],
 title: editingTextArtifactTitle
 });
 await loadArtifacts(activeFolder!.id);
 setEditingTextArtifactId(null);
 } catch (e) {
 console.error(e);
 }
 };

 if (activeArtifact) {
 return <DossierArtifactView artifact={activeArtifact} onClose={() => setActiveArtifact(null)} />;
 }

 // Group tasks by date for calendar view
 const tasksByDate = React.useMemo(() => {
 const groups: Record<string, Task[]> = {};
 const sorted = [...tasks].sort((a,b) => {
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
 }, [tasks]);

 const handleFinalizeMoodboard = async (elements: any[], config: any) => {
 if (!user) return;
 setIsSavingMoodboard(true);
 try {
 const moodboardItem: any = {
 id: `mood_${Date.now()}`,
 userId: user.uid,
 title: moodboardTitle || 'Untitled Moodboard',
 source: 'Dossier Composer',
 timestamp: Date.now(),
 savedAt: Date.now(),
 type: 'moodboard',
 content: {
 title: moodboardTitle || 'Untitled Moodboard',
 artifactIds: selectedArtifactIds,
 pocketItemIds: selectedPocketItemIds,
 elements,
 config
 }
 };
 
 const { addToPocket } = await import('../services/firebase');
 await addToPocket(user.uid, 'moodboard', moodboardItem.content);
 
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Moodboard Manifested in Archive.", icon: <Check size={14} className="text-nous-subtle"/> } 
 }));
 
 setViewMode('grid');
 setIsSelectingForMoodboard(false);
 setIsSelectingFromPocketForMoodboard(false);
 setSelectedArtifactIds([]);
 setSelectedPocketItemIds([]);
 setMoodboardTitle('');
 } catch (e) {
 console.error("MIMI // Moodboard Manifestation Failed:", e);
 } finally {
 setIsSavingMoodboard(false);
 }
 };

 const toggleArtifactSelection = (id: string) => {
 setSelectedArtifactIds(prev => 
 prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
 );
 };

 const togglePocketItemSelection = (id: string) => {
 setSelectedPocketItemIds(prev => 
 prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
 );
 };

 const startMoodboardCreation = () => {
 if (selectedArtifactIds.length === 0 && selectedPocketItemIds.length === 0) {
 window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
 detail: { message:"Select fragments first.", icon: <X size={14} className="text-red-500"/> } 
 }));
 return;
 }
 setViewMode('moodboard');
 };

 const selectedArtifactsAsPocketItems = React.useMemo(() => {
 const targetIds = selectedArtifactIds.length > 0 ? selectedArtifactIds : artifacts.map(a => a.id);
 const fromArtifacts = artifacts
 .filter(a => targetIds.includes(a.id))
 .map(a => ({
 id: a.id,
 userId: a.userId,
 title: a.title,
 source: 'Dossier',
 timestamp: a.createdAt,
 savedAt: a.createdAt,
 type: a.elements[0]?.type === 'image' ? 'image' : 'text',
 content: a.elements[0]?.type === 'image' ? { imageUrl: a.elements[0].content } : { text: a.elements[0].content },
 notes: a.elements[0]?.notes
 }));

 const fromPocket = pocketItems
 .filter(p => selectedPocketItemIds.includes(p.id))
 .map(p => ({ ...p }));

 return [...fromArtifacts, ...fromPocket];
 }, [artifacts, selectedArtifactIds, pocketItems, selectedPocketItemIds]);

 const handleComposeMoodboardClick = () => {
 // Just start with all artifacts if they haven't explicitly selected
 setViewMode('moodboard');
 };

 return (
 <div className="w-full h-full flex flex-col bg-[#1C1917] text-nous-text font-mono transition-colors duration-1000 overflow-hidden relative">
 {viewMode === 'moodboard' && (
 <MoodboardComposer 
 selectedItems={selectedArtifactsAsPocketItems}
 onCancel={() => setViewMode('grid')}
 onFinalize={handleFinalizeMoodboard}
 />
 )}
 {/* Grid Background */}
 <div className="absolute inset-0 bg-[radial-gradient(#1C1917_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none"/>

 <AnimatePresence>
 {taskToDelete && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
 <div className="bg-[#1C1917] p-8 max-w-sm w-full space-y-6 border border-nous-border">
 <div className="space-y-2">
 <h3 className="font-serif italic text-xl text-nous-text">Purge Imperative?</h3>
 <p className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">This action cannot be undone.</p>
 </div>
 <div className="flex gap-4">
 <button onClick={() => setTaskToDelete(null)} className="flex-1 py-3 text-nous-subtle hover:text-nous-subtle font-mono text-[9px] uppercase tracking-widest font-bold border border-nous-border hover:border-nous-border transition-all">Cancel</button>
 <button onClick={confirmDeleteTask} className="flex-1 py-3 bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 font-mono text-[9px] uppercase tracking-widest font-bold transition-all">Confirm</button>
 </div>
 </div>
 </motion.div>
 )}
 {artifactToDelete && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
 <div className="bg-[#1C1917] p-8 max-w-sm w-full space-y-6 border border-nous-border">
 <div className="space-y-2">
 <h3 className="font-serif italic text-xl text-nous-text">Purge Artifact?</h3>
 <p className="font-mono text-[10px] text-nous-subtle uppercase tracking-widest">This action cannot be undone.</p>
 </div>
 <div className="flex gap-4">
 <button onClick={() => setArtifactToDelete(null)} className="flex-1 py-3 text-nous-subtle hover:text-nous-subtle font-mono text-[9px] uppercase tracking-widest font-bold border border-nous-border hover:border-nous-border transition-all">Cancel</button>
 <button onClick={confirmDeleteArtifact} className="flex-1 py-3 bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 font-mono text-[9px] uppercase tracking-widest font-bold transition-all">Confirm</button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 <div className="flex flex-1 overflow-hidden z-10">
 
 {/* SIDEBAR: FOLDERS */}
 <AnimatePresence initial={false}>
 {isSidebarOpen && !isPresentationMode && (
 <motion.aside 
 initial={{ width: 0, opacity: 0 }}
 animate={{ width: 288, opacity: 1 }}
 exit={{ width: 0, opacity: 0 }}
 className="border-r border-nous-border bg-[#1C1917] flex flex-col hidden md:flex shrink-0 print:hidden overflow-hidden"
 >
 <div className="p-6 border-b border-nous-border space-y-6 w-72">
 <div className="flex items-center justify-between text-nous-subtle">
 <div className="flex items-center gap-3">
 <Briefcase size={14} />
 <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold">Project Registry</span>
 </div>
 <button onClick={() => setIsSidebarOpen(false)} className="hover:text-nous-subtle transition-colors">
 <X size={14} />
 </button>
 </div>
 
 <div className="relative group">
 <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-nous-subtle group-focus-within:text-nous-subtle transition-colors"/>
 <input 
 type="text"
 value={folderSearchTerm}
 onChange={e => setFolderSearchTerm(e.target.value)}
 placeholder="Filter Dossiers..."
 className="w-full pl-9 pr-4 py-2.5 bg-nous-base/50 border border-nous-border font-mono text-[10px] focus:outline-none focus:border-nous-border dark:focus:border-nous-border/50 transition-all text-nous-subtle placeholder:text-nous-subtle"
 />
 </div>

 <button 
 onClick={() => setShowNewFolder(true)}
 className="w-full py-3 border border-dashed border-nous-border hover:border-nous-border /50 font-mono text-[9px] uppercase tracking-widest font-bold text-nous-subtle hover:text-nous-text transition-all flex items-center justify-center gap-2 group"
 >
 <Plus size={12} className="group-hover:rotate-90 transition-transform"/> Initialize Project
 </button>
 </div>
 
 <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
 {loadingFolders ? (
 <div className="p-8"><LoadingSkeleton lines={3} /></div>
 ) : (
 filteredFolders.map(folder => (
 <button
 key={folder.id}
 onClick={() => setActiveFolder(folder)}
 className={`w-full text-left px-4 py-3 border border-transparent transition-all group relative overflow-hidden ${activeFolder?.id === folder.id ? 'bg-nous-base0/5 border-nous-border/20 text-nous-subtle' : 'hover:bg-nous-base hover:border-nous-border text-nous-subtle'}`}
 >
 <div className="flex justify-between items-start relative z-10">
 <h4 className={`font-serif italic text-sm truncate pr-4 transition-colors ${activeFolder?.id === folder.id ? 'text-nous-subtle' : 'group-hover:text-nous-subtle'}`}>{folder.name}</h4>
 <span className="font-mono text-[8px] opacity-50">{new Date(folder.createdAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</span>
 </div>
 {activeFolder?.id === folder.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-nous-base0"/>}
 </button>
 ))
 )}
 {filteredFolders.length === 0 && folderSearchTerm && (
 <div className="p-8 text-center opacity-30 font-mono text-[9px] uppercase tracking-widest text-nous-subtle">No matches found.</div>
 )}
 </div>
 </motion.aside>
 )}
 </AnimatePresence>

 {/* MAIN CONTENT AREA */}
 <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F2F0E9]">
 
 {/* MOBILE FOLDER SELECTOR */}
 <div className="md:hidden p-4 border-b border-nous-border bg-nous-base flex gap-2 items-center print:hidden">
 <select 
 className="flex-1 bg-transparent font-serif italic text-lg outline-none text-nous-text"
 value={activeFolder?.id || ''}
 onChange={(e) => {
 if (e.target.value === 'new') {
 setShowNewFolder(true);
 } else {
 const folder = folders.find(f => f.id === e.target.value);
 if (folder) setActiveFolder(folder);
 }
 }}
 >
 <option value=""disabled>Select Dossier...</option>
 {folders.map(f => (
 <option key={f.id} value={f.id}>{f.name}</option>
 ))}
 <option value="new">+ New Dossier</option>
 </select>
 </div>

 {activeFolder ? (
 <div className={`flex-1 relative w-full h-full overflow-hidden transition-colors duration-1000 ${isPresentationMode ? 'bg-[#FDFBF7]' : 'bg-[#F2F0E9] text-[#1C1917]'}`} id="dossier-canvas">
 <motion.div 
 drag 
 dragConstraints={{ left: -2000, right: 2000, top: -2000, bottom: 2000 }}
 dragElastic={0.1}
 style={{ touchAction: 'none', x: canvasX, y: canvasY }}
 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[4000px] h-[4000px] cursor-grab active:cursor-grabbing"
 >
 {!isPresentationMode && (
 <div className="absolute inset-0 bg-[radial-gradient(#1C1917_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none"/>
 )}
 
 {/* Header */}
 {!isPresentationMode && (
 <div className="absolute top-8 left-8 z-50 pointer-events-none">
 <div className="flex items-center gap-3 text-[#1C1917] opacity-50 mb-2">
 <FolderOpen size={14} />
 <span className="font-mono text-[9px] uppercase tracking-[0.4em] font-bold">Active Dossier</span>
 </div>
 <h2 className="font-serif text-4xl md:text-6xl italic tracking-tighter text-[#1C1917] leading-none">{activeFolder.name}</h2>
 </div>
 )}

 {/* Memo Widget */}
 <AnimatePresence>
 {showMemoWidget && !isPresentationMode && (
 <motion.div
 drag
 dragMomentum={false}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9 }}
 className="absolute top-32 left-8 w-96 bg-white border border-[#1C1917] p-6 cursor-move group z-40 shadow-sm"
 style={{ touchAction: 'none' }}
 onPointerDownCapture={(e) => e.stopPropagation()}
 >
 {/* Tape */}
 <div className="tape-top z-10 border border-nous-border/50"/>
 
 <div className="flex justify-between items-start mb-4">
 <h3 className="font-serif italic text-2xl text-[#1C1917]">Strategic Memo</h3>
 <button onClick={() => setShowMemoWidget(false)} className="opacity-0 group-hover:opacity-100 text-[#1C1917] hover:text-red-600 transition-opacity print:hidden">
 <X size={14} />
 </button>
 </div>
 
 <textarea 
 value={folderMemo}
 onChange={(e) => setFolderMemo(e.target.value)}
 onBlur={handleSaveFolderMemo}
 className="w-full h-64 bg-transparent border-none resize-none font-sans text-sm leading-relaxed text-[#1C1917] focus:outline-none placeholder:text-nous-subtle"
 placeholder="Define the project intent, core pillars, and desired outcomes..."
 />
 </motion.div>
 )}
 </AnimatePresence>

 {/* Punchlist Widget */}
 <AnimatePresence>
 {showPunchlistWidget && !isPresentationMode && (
 <motion.div
 drag
 dragMomentum={false}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9 }}
 className="absolute top-32 right-8 w-80 bg-[#F2F0E9] border border-[#1C1917] p-6 cursor-move group z-40 shadow-sm"
 style={{ touchAction: 'none' }}
 onPointerDownCapture={(e) => e.stopPropagation()}
 >
 <div className="flex justify-between items-start mb-6 border-b border-[#1C1917] pb-2">
 <div className="flex items-center gap-2">
 <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#1C1917]">Micro-Log // Punchlist</h3>
 <button onClick={handleAutoPunchlist} disabled={isGeneratingPunchlist} className="text-[#1C1917] hover:text-nous-subtle transition-colors"title="Auto-Awesome Directives">
 {isGeneratingPunchlist ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />}
 </button>
 </div>
 <button onClick={() => setShowPunchlistWidget(false)} className="opacity-0 group-hover:opacity-100 text-[#1C1917] hover:text-red-600 transition-opacity print:hidden">
 <X size={14} />
 </button>
 </div>
 
 <div className="space-y-3">
 {tasks.map(task => (
 <div key={task.id} className="flex items-start gap-3">
 <button onClick={() => toggleTask(task.id)} className="mt-0.5 font-mono text-[12px] text-[#1C1917]">
 {task.completed ? '[X]' : '[ ]'}
 </button>
 <span className={`font-mono text-[11px] uppercase tracking-wider ${task.completed ? 'line-through opacity-50' : ''} text-[#1C1917]`}>
 {task.text}
 </span>
 </div>
 ))}
 <div className="flex items-center gap-3 pt-2 print:hidden">
 <span className="font-mono text-[12px] text-[#1C1917] opacity-50">[ ]</span>
 <input 
 value={newTaskText} 
 onChange={e => setNewTaskText(e.target.value)} 
 onKeyDown={e => e.key === 'Enter' && handleAddTask()}
 placeholder="ADD ITEM..."
 className="flex-1 bg-transparent border-none font-mono text-[11px] uppercase tracking-wider focus:outline-none text-[#1C1917] placeholder:text-nous-subtle"
 />
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Artifacts */}
 {artifacts.map((art, index) => {
 const defaultX = 100 + ((index % 4) * 440);
 const defaultY = 400 + (Math.floor(index / 4) * 440);
 return (
 <motion.div
 key={art.id}
 drag
 dragMomentum={false}
 initial={{ x: art.layout?.x ?? defaultX, y: art.layout?.y ?? defaultY }}
 animate={{ x: art.layout?.x ?? defaultX, y: art.layout?.y ?? defaultY }}
 onDragEnd={(e, info) => handleArtifactDragEnd(e, info, art)}
 className={`absolute w-80 cursor-move group ${isPresentationMode ? 'hover:z-50' : ''}`}
 style={{ touchAction: 'none', zIndex: art.layout?.zIndex || 30 }}
 onPointerDownCapture={(e) => e.stopPropagation()}
 >
 <div className={`relative ${isPresentationMode ? 'bg-[#FDFBF7] shadow-xl ring-1 ring-black/5 p-2' : 'border border-[#1C1917] bg-white shadow-sm p-1'} transition-all duration-300`}>
 {art.elements[0].type === 'image' ? (
 <div className="relative">
 <img src={art.elements[0].content} className="w-full h-auto object-cover grayscale hover:grayscale-0 transition-all duration-500" draggable={false} />
 {/* Optional Type Over */}
 {art.elements[0].notes && (
 <div className="absolute inset-0 flex items-center justify-center p-4 opacity-0 hover:opacity-100 transition-opacity bg-white/40 backdrop-blur-sm">
 <div className="bg-[#1C1917] text-[#F2F0E9] p-3 font-serif italic text-sm text-center">
 {art.elements[0].notes}
 </div>
 </div>
 )}
 </div>
 ) : (
 <div 
 onDoubleClick={() => {
 if (isPresentationMode) return;
 setEditingTextArtifactId(art.id);
 setEditingTextArtifactContent(art.elements[0].content || '');
 setEditingTextArtifactTitle(art.title || '');
 }}
 className="w-full aspect-square p-6 flex flex-col justify-center bg-nous-base cursor-text relative group/text"
 >
 {editingTextArtifactId === art.id ? (
 <div className="absolute inset-0 bg-nous-base z-50 p-6 flex flex-col">
 <input 
 value={editingTextArtifactTitle}
 onChange={(e) => setEditingTextArtifactTitle(e.target.value)}
 className="font-serif italic text-sm text-[#1C1917] bg-transparent border-b border-[#1C1917]/20 mb-2 focus:outline-none"
 placeholder="Memo Title"
 />
 <textarea 
 value={editingTextArtifactContent}
 onChange={(e) => setEditingTextArtifactContent(e.target.value)}
 autoFocus
 className="flex-1 font-serif italic text-lg text-[#1C1917] leading-relaxed bg-transparent border-none resize-none focus:outline-none"
 />
 <div className="flex justify-end gap-2 mt-2">
 <button onClick={() => setEditingTextArtifactId(null)} className="font-mono text-[9px] uppercase tracking-widest text-[#1C1917]/50 hover:text-[#1C1917]">Cancel</button>
 <button onClick={handleSaveEditedTextArtifact} className="font-mono text-[9px] uppercase tracking-widest text-[#1C1917] hover:underline">Save</button>
 </div>
 </div>
 ) : (
 <p className="font-serif italic text-lg text-[#1C1917] leading-relaxed whitespace-pre-wrap">"{art.elements[0].content}"</p>
 )}
 </div>
 )}
 </div>
 {/* Shout Out / Information Area Beneath Node */}
 <div className={`mt-4 px-2 ${isPresentationMode ? 'opacity-80' : ''}`}>
 <div className="font-mono text-[9px] uppercase tracking-widest text-[#1C1917]/50 mb-1 flex justify-between items-center">
 <span>REF_{String(index + 1).padStart(2, '0')}</span>
 {!isPresentationMode && (
 <button onClick={() => setArtifactToDelete(art.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity print:hidden">
 <X size={10} />
 </button>
 )}
 </div>
 <h4 className="font-serif italic text-sm text-[#1C1917] mb-2">{art.title}</h4>
 {art.description && (
 <p className="font-sans text-xs text-[#1C1917]/60 leading-relaxed border-l border-[#1C1917]/20 pl-2">
 {art.description}
 </p>
 )}
 </div>
 </motion.div>
 );
 })}
 </motion.div>

 {/* Presentation & Compass Minimap HUD */}
 <div className="absolute top-8 right-8 z-50 flex flex-col gap-4 items-end pointer-events-none print:hidden">
 {/* Presentation Toggle */}
 <button 
 onClick={() => setIsPresentationMode(!isPresentationMode)}
 className={`pointer-events-auto flex items-center gap-2 px-4 py-2 font-mono text-[9px] uppercase tracking-widest font-bold transition-all ${isPresentationMode ? 'bg-nous-text text-nous-base' : 'bg-transparent border border-nous-border text-nous-subtle hover:bg-nous-base'}`}
 >
 {isPresentationMode ? <LayoutGrid size={12} /> : <Eye size={12} />}
 {isPresentationMode ? 'Exit Presentation' : 'Studio Mode'}
 </button>

 {/* Minimap / Compass Widget */}
 {!isPresentationMode && (
 <div className="pointer-events-auto w-[120px] h-[120px] border border-nous-border bg-[#F2F0E9] relative overflow-hidden shadow-sm origin-top-right transition-all group">
 <div className="absolute inset-0 flex items-center justify-center opacity-10">
 <Compass size={64} className="text-nous-text" strokeWidth={1} />
 </div>
 {/* Representation of the 4000x4000 grid as 120x120 */}
 <div className="absolute inset-0 transform translate-x-1/2 translate-y-1/2">
 {artifacts.map((art, index) => {
 const defaultX = 100 + ((index % 4) * 440);
 const defaultY = 400 + (Math.floor(index / 4) * 440);
 const artX = art.layout?.x ?? defaultX;
 const artY = art.layout?.y ?? defaultY;
 
 // Map from [0, 4000] space relative to center, into [0, 120] relative to center
 // The canvas size is 4000. So we divide by 4000 and multiply by 120.
 const mappedX = (artX / 4000) * 120;
 const mappedY = (artY / 4000) * 120;

 return (
 <div 
 key={`mini-${art.id}`}
 className="absolute w-[4px] h-[4px] bg-nous-text rounded-none"
 style={{ 
 left: mappedX, 
 top: mappedY,
 transform: 'translate(-50%, -50%)'
 }}
 />
 )
 })}
 </div>
 {/* Viewport Box */}
 <motion.div 
 className="absolute border z-10 border-red-500/50 bg-red-500/10"
 style={{ 
 width: '30%', 
 height: '20%', 
 x: minimapX,
 y: minimapY,
 left: '50%',
 top: '50%',
 translateX: '-50%',
 translateY: '-50%'
 }}
 />
 </div>
 )}
 </div>

 {/* Pocket Strip */}
 {pocketItems.length > 0 && !isPresentationMode && (
 <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-8 print:hidden pointer-events-auto" onPointerDownCapture={(e) => e.stopPropagation()}>
 <div className="bg-white/80 backdrop-blur-md border border-[#1C1917] p-4 shadow-lg flex items-center gap-4 overflow-x-auto no-scrollbar">
 <div className="flex-shrink-0 flex items-center gap-2 pr-4 border-r border-[#1C1917]/20">
 <Archive size={14} className="text-[#1C1917]" />
 <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#1C1917]">Pocket</span>
 </div>
 {pocketItems.slice(0, 10).map(item => (
 <button 
 key={item.id}
 onClick={() => handleImportItem(item)}
 className="flex-shrink-0 w-16 h-16 border border-[#1C1917]/20 hover:border-[#1C1917] overflow-hidden group relative transition-colors bg-nous-base"
 >
 {item.type === 'image' || item.type === 'zine_card' ? (
 <img src={item.content.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
 ) : (
 <div className="w-full h-full flex items-center justify-center p-1">
 <span className="font-serif italic text-[8px] text-[#1C1917] line-clamp-3 text-left leading-tight">
 "{item.content.prompt || item.content.title || item.content.omenText || 'Text'}"
 </span>
 </div>
 )}
 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
 <Plus size={12} className="text-white" />
 </div>
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Floating Tool Palette */}
 {!isPresentationMode && (
 <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-8 px-10 py-4 bg-[#F2F0E9] border border-nous-border text-nous-subtle font-mono text-[10px] uppercase tracking-[0.2em] shadow-xl rounded-none print:hidden pointer-events-auto" onPointerDownCapture={(e) => e.stopPropagation()}>
 {!isSidebarOpen && (
 <button onClick={() => setIsSidebarOpen(true)} className="hover:text-nous-text transition-colors whitespace-nowrap">
 [ REGISTRY ]
 </button>
 )}
 <button onClick={handleOpenImport} className="hover:text-nous-text transition-colors whitespace-nowrap">
 [ IMPORT FROM ARCHIVE ]
 </button>
 <button onClick={handleComposeMoodboardClick} className="hover:text-nous-text transition-colors whitespace-nowrap text-[#1C1917] font-bold">
 [ COMPOSE MOODBOARD ]
 </button>
 <button onClick={() => fileInputRef.current?.click()} className="hover:text-nous-text transition-colors whitespace-nowrap">
 [ ADD ARTIFACT ]
 </button>
 <button onClick={handleAddMemoBlock} className="hover:text-nous-text transition-colors whitespace-nowrap text-[#1C1917] font-bold">
 [ ADD TEXT BLOCK ]
 </button>
 <button onClick={() => setShowMemoWidget(true)} className="hover:text-nous-text transition-colors whitespace-nowrap">
 [ EDIT STRATEGY ]
 </button>
 <button onClick={() => setShowPunchlistWidget(true)} className="hover:text-nous-text transition-colors whitespace-nowrap">
 [ PUNCHLIST ]
 </button>
 <div className="w-px h-4 bg-stone-300 mx-2"/>
 <button onClick={() => setShowExportModal(true)} className="hover:text-nous-text transition-colors whitespace-nowrap font-bold text-nous-text">
 [ EXPORT DOSSIER ]
 </button>
 </div>
 )}

 </div>
 ) : (
 <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 opacity-20">
 <Briefcase size={64} strokeWidth={1} className="text-nous-subtle"/>
 <div className="space-y-2">
 <h3 className="font-serif italic text-3xl text-nous-subtle">Select a Project Dossier.</h3>
 <p className="font-mono text-[9px] uppercase tracking-widest font-bold text-nous-subtle">Or initialize a new container from the registry.</p>
 </div>
 </div>
 )}
 </main>
 </div>

 {/* NEW FOLDER MODAL */}
 <AnimatePresence>
 {showNewFolder && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[7000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
 <div className="bg-[#1C1917] p-10 max-w-sm w-full space-y-8 border border-nous-border relative overflow-hidden">
 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-stone-500 to-transparent opacity-50"/>
 <div className="text-center space-y-2">
 <FolderPlus size={32} className="mx-auto text-nous-subtle"/>
 <h3 className="font-serif italic text-2xl text-nous-text">New Dossier.</h3>
 </div>
 <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Project Name..."className="w-full border-b border-nous-border bg-transparent py-2 text-center font-mono text-lg focus:outline-none focus:border-nous-border transition-colors text-nous-subtle placeholder:text-nous-subtle"autoFocus />
 <div className="flex gap-4">
 <button onClick={() => setShowNewFolder(false)} className="flex-1 py-3 text-nous-subtle hover:text-nous-subtle font-mono text-[9px] uppercase font-bold tracking-widest border border-nous-border hover:border-nous-border transition-all">Cancel</button>
 <button onClick={handleCreateFolder} className="flex-[2] py-3 bg-nous-base0 text-black font-mono text-[9px] uppercase font-bold tracking-widest hover:scale-105 transition-all">Initialize</button>
 </div>
 </div>
 </motion.div>
 )}
 
 {showNoteModal && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[7000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
 <div className="bg-[#1C1917] p-8 max-w-lg w-full space-y-6 border border-nous-border">
 <div className="flex justify-between items-center border-b border-nous-border pb-4">
 <h3 className="font-serif italic text-2xl text-nous-text">New Field Note.</h3>
 <button onClick={() => setShowNoteModal(false)}><X size={20} className="text-nous-subtle hover:text-nous-subtle"/></button>
 </div>
 <div className="space-y-4">
 <input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Note Title..."className="w-full bg-nous-base/50 border border-nous-border p-3 font-mono text-sm focus:outline-none focus:border-nous-border text-nous-subtle placeholder:text-nous-subtle"/>
 <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Capture thought..."className="w-full h-48 bg-nous-base/50 border border-nous-border p-4 font-serif italic text-base focus:outline-none focus:border-nous-border resize-none text-nous-subtle placeholder:text-nous-subtle"/>
 </div>
 <button onClick={handleSaveNote} disabled={isSavingNote || !noteContent.trim()} className="w-full py-4 bg-nous-base/20 border border-nous-border/50 text-nous-subtle font-mono text-[9px] uppercase font-bold tracking-widest flex items-center justify-center gap-2 hover:bg-nous-base/40 transition-colors disabled:opacity-50">
 {isSavingNote ? <Loader2 size={14} className="animate-spin"/> : <Save size={14} />} Anchor Note
 </button>
 </div>
 </motion.div>
 )}

 {showBlueprintModal && activeBlueprint && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[7000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
 <div className="bg-[#1C1917] p-8 max-w-2xl w-full space-y-6 border border-nous-border max-h-[80vh] overflow-y-auto">
 <div className="flex justify-between items-center border-b border-nous-border pb-4">
 <h3 className="font-serif italic text-2xl text-nous-subtle">Strategic Blueprint.</h3>
 <button onClick={() => setShowBlueprintModal(false)}><X size={20} className="text-nous-subtle hover:text-nous-subtle"/></button>
 </div>
 <div className="space-y-6 font-mono text-xs text-nous-subtle">
 <div><h4 className="text-nous-subtle uppercase tracking-widest mb-1">Inciting Debris</h4><p>{activeBlueprint.inciting_debris}</p></div>
 <div><h4 className="text-nous-subtle uppercase tracking-widest mb-1">Structural Pivot</h4><p>{activeBlueprint.structural_pivot}</p></div>
 <div><h4 className="text-nous-subtle uppercase tracking-widest mb-1">Climax Manifest</h4><p>{activeBlueprint.climax_manifest}</p></div>
 <div><h4 className="text-nous-subtle uppercase tracking-widest mb-1">End Product Spec</h4><p>{activeBlueprint.end_product_spec}</p></div>
 </div>
 <button onClick={() => setShowBlueprintModal(false)} className="w-full py-3 border border-nous-border text-nous-subtle hover:text-nous-subtle font-mono text-[9px] uppercase font-bold tracking-widest hover:border-nous-border transition-all">Close</button>
 </div>
 </motion.div>
 )}

 {showImportModal && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[7000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
 <div className="bg-[#1C1917] p-8 max-w-2xl w-full space-y-6 border border-nous-border flex flex-col max-h-[80vh]">
 <div className="flex justify-between items-center border-b border-nous-border pb-4">
 <div className="space-y-1">
 <h3 className="font-serif italic text-2xl text-nous-text">Import from Archival.</h3>
 <p className="font-mono text-[9px] uppercase tracking-widest font-bold text-nous-subtle">Select shards to manifest in this dossier.</p>
 </div>
 <button onClick={() => setShowImportModal(false)}><X size={20} className="text-nous-subtle hover:text-nous-subtle"/></button>
 </div>
 
 <div className="flex-1 overflow-y-auto no-scrollbar min-h-[300px]">
 {isImporting ? (
 <div className="h-full flex items-center justify-center p-8"><LoadingSkeleton lines={8} className="w-full max-w-lg"/></div>
 ) : (
 <div className="grid grid-cols-2 gap-4">
 {pocketItems.map(item => (
 <div 
 key={item.id} 
 onClick={() => handleImportItem(item)}
 className="group relative aspect-video bg-nous-base border border-nous-border overflow-hidden cursor-pointer hover:border-nous-border transition-all"
 >
 {item.type === 'image' || item.type === 'zine_card' ? (
 <img src={item.content.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all opacity-60 group-hover:opacity-100"/>
 ) : (
 <div className="w-full h-full p-4 flex flex-col justify-center">
 <span className="font-mono text-[8px] uppercase font-bold text-nous-subtle mb-1">{item.type}</span>
 <p className="font-serif italic text-xs line-clamp-3 text-nous-subtle">"{item.content.prompt || item.content.text || 'Sonic shard'}"</p>
 </div>
 )}
 <div className="absolute inset-0 bg-nous-base0/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
 <Plus size={24} className="text-white drop-"/>
 </div>
 </div>
 ))}
 {pocketItems.length === 0 && (
 <div className="col-span-full py-12 text-center opacity-30 font-serif italic text-nous-subtle">The Pocket is empty.</div>
 )}
 </div>
 )}
 </div>
 
 <button onClick={() => setShowImportModal(false)} className="w-full py-4 border border-nous-border font-mono text-[9px] uppercase font-bold tracking-widest hover:bg-nous-base transition-colors text-nous-subtle">
 Close Registry
 </button>
 </div>
 </motion.div>
 )}

 {showExportModal && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[7000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
 <div className="bg-[#1C1917] p-8 max-w-md w-full space-y-6 border border-nous-border relative overflow-hidden">
 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-stone-500 to-transparent opacity-50"/>
 <div className="flex justify-between items-center border-b border-nous-border pb-4">
 <h3 className="font-serif italic text-2xl text-nous-text">Export Dossier.</h3>
 <button onClick={() => setShowExportModal(false)}><X size={20} className="text-nous-subtle hover:text-white transition-colors" /></button>
 </div>
 
 <p className="font-sans text-xs text-nous-subtle leading-relaxed">
  Manifest this active project container into beautiful external Google Workspace integrations or render offline.
 </p>

 <div className="space-y-3 pt-2">
  <button 
   onClick={handleExportDossierToSlides} 
   disabled={isExportingSlides} 
   className="w-full p-4 border border-nous-border bg-transparent hover:bg-stone-900 text-left transition-colors flex items-center justify-between group disabled:opacity-50 cursor-pointer"
  >
   <div>
    <h4 className="font-serif italic text-base text-nous-text group-hover:text-white transition-colors">Export to Google Slides</h4>
    <p className="font-sans text-[10px] text-nous-subtle mt-0.5">Creates a stylized slide presentation deck of your artifacts</p>
   </div>
   {isExportingSlides ? <Loader2 size={16} className="animate-spin text-nous-subtle" /> : <Presentation size={16} className="text-nous-subtle group-hover:text-white transition-colors" />}
  </button>

  <button 
   onClick={handleExportDossierToDocs} 
   disabled={isExportingFolderDocs} 
   className="w-full p-4 border border-nous-border bg-transparent hover:bg-stone-900 text-left transition-colors flex items-center justify-between group disabled:opacity-50 cursor-pointer"
  >
   <div>
    <h4 className="font-serif italic text-base text-nous-text group-hover:text-white transition-colors">Export to Google Docs</h4>
    <p className="font-sans text-[10px] text-nous-subtle mt-0.5">Compiles the strategy memo and text block briefs into a written document</p>
   </div>
   {isExportingFolderDocs ? <Loader2 size={16} className="animate-spin text-nous-subtle" /> : <FileText size={16} className="text-nous-subtle group-hover:text-white transition-colors" />}
  </button>

  <button 
   onClick={() => {
    setShowExportModal(false);
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', { detail: { message: "Dossier Compiled to PDF.", icon: <Check size={14} /> } }));
    window.print();
   }} 
   className="w-full p-4 border border-nous-border bg-transparent hover:bg-stone-900 text-left transition-colors flex items-center justify-between group cursor-pointer"
  >
   <div>
    <h4 className="font-serif italic text-base text-nous-text group-hover:text-white transition-colors">Offline PDF Compile</h4>
    <p className="font-sans text-[10px] text-nous-subtle mt-0.5">Generates a standard clean print sheet of your studio canvas</p>
   </div>
   <Layout size={16} className="text-nous-subtle group-hover:text-white transition-colors" />
  </button>
 </div>

 <button onClick={() => setShowExportModal(false)} className="w-full py-3 border border-nous-border font-mono text-[9px] uppercase font-bold tracking-widest hover:bg-stone-900 transition-colors text-nous-subtle cursor-pointer">
  Cancel
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 <input type="file"ref={fileInputRef} className="hidden"accept="image/*"multiple onChange={handleManualUpload} />
 </div>
 );
};
