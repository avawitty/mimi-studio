import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Briefcase,
  Calendar,
  Eye,
  FileText,
  FolderOpen,
  Globe,
  LayoutGrid,
  List,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { hasAccess } from "../../constants";
import {
  createDossierArtifactFromImage,
  createDossierArtifactFromText,
  createDossierFolder,
  deleteDossierArtifact,
  fetchDossierArtifacts,
  fetchDossierFolders,
  fetchPocketItems,
  updateDossierFolder,
} from "../../services/firebase";
import type { DossierArtifact, DossierFolder, PocketItem, Task } from "../../types";
import {
  generateFolderTasks,
  generateStrategicBlueprint,
} from "../../services/geminiService";

type EvidenceView = "grid" | "list";

export const MoodBoardChamber: React.FC = () => {
  const { user, profile } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evidenceRef = useRef<HTMLElement | null>(null);

  const [folders, setFolders] = useState<DossierFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<DossierFolder | null>(null);
  const [artifacts, setArtifacts] = useState<DossierArtifact[]>([]);
  const [folderSearchTerm, setFolderSearchTerm] = useState("");
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderMemo, setFolderMemo] = useState("");
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [isSavingTasks, setIsSavingTasks] = useState(false);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [evidenceView, setEvidenceView] = useState<EvidenceView>("grid");
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState("Intake Note");
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pocketItems, setPocketItems] = useState<PocketItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const uid = user?.uid || "ghost";

  const scrollToEvidence = () => {
    window.requestAnimationFrame(() => {
      evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const reloadArtifacts = useCallback(async (folderId: string) => {
    const next = await fetchDossierArtifacts(folderId);
    setArtifacts(next);
    return next;
  }, []);

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    try {
      const next = await fetchDossierFolders(uid);
      setFolders(next);
      setActiveFolder((prev) => {
        if (!prev) return next[0] || null;
        return next.find((folder) => folder.id === prev.id) || next[0] || null;
      });
    } catch (error) {
      console.error("Failed to load dossiers", error);
    } finally {
      setLoadingFolders(false);
    }
  }, [uid]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    if (!activeFolder) {
      setArtifacts([]);
      setFolderMemo("");
      setTasks([]);
      setSelectedArtifactId(null);
      return;
    }

    setFolderMemo(activeFolder.notes || "");
    setTasks(activeFolder.tasks || []);
    setLoadingArtifacts(true);
    setSelectedArtifactId(null);

    let cancelled = false;
    void reloadArtifacts(activeFolder.id)
      .catch((error) => {
        console.error("Failed to load artifacts", error);
        if (!cancelled) setArtifacts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingArtifacts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFolder, reloadArtifacts]);

  const filteredFolders = useMemo(() => {
    const query = folderSearchTerm.trim().toLowerCase();
    if (!query) return folders;
    return folders.filter((folder) => folder.name.toLowerCase().includes(query));
  }, [folderSearchTerm, folders]);

  const alert = (message: string, type: "success" | "error" | "warning" = "success") => {
    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", { detail: { message, type } }),
    );
  };

  const persistTasks = async (nextTasks: Task[]) => {
    if (!activeFolder) return;
    setIsSavingTasks(true);
    try {
      await updateDossierFolder(activeFolder.id, { tasks: nextTasks });
      setTasks(nextTasks);
      setActiveFolder((prev) => (prev ? { ...prev, tasks: nextTasks } : null));
      setFolders((prev) =>
        prev.map((folder) =>
          folder.id === activeFolder.id ? { ...folder, tasks: nextTasks } : folder,
        ),
      );
    } catch (error) {
      console.error(error);
      alert("Could not save execution plan.", "error");
    } finally {
      setIsSavingTasks(false);
    }
  };

  const handleInitializeProject = async () => {
    if (!newFolderName.trim()) return;
    if (!hasAccess(profile?.plan, "pro") && folders.length >= 1) {
      window.dispatchEvent(new CustomEvent("mimi:open_patron_modal"));
      return;
    }
    try {
      const id = await createDossierFolder(uid, newFolderName.trim());
      setNewFolderName("");
      setShowNewFolder(false);
      const refreshed = await fetchDossierFolders(uid);
      setFolders(refreshed);
      setActiveFolder(refreshed.find((folder) => folder.id === id) || refreshed[0] || null);
      alert("Project space initialized.");
    } catch (error) {
      console.error(error);
      alert("Could not initialize project.", "error");
    }
  };

  const handleSaveMemo = async () => {
    if (!activeFolder) return;
    setIsSavingMemo(true);
    try {
      await updateDossierFolder(activeFolder.id, { notes: folderMemo });
      setActiveFolder((prev) => (prev ? { ...prev, notes: folderMemo } : null));
      setFolders((prev) =>
        prev.map((folder) =>
          folder.id === activeFolder.id ? { ...folder, notes: folderMemo } : folder,
        ),
      );
      alert("Strategic memo saved.");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingMemo(false);
    }
  };

  const handleAddTask = async () => {
    const text = newTaskText.trim();
    if (!text || !activeFolder) return;
    const next: Task = {
      id: `task_${Date.now()}`,
      text,
      completed: false,
      dueDate: newTaskDate || undefined,
      createdAt: Date.now(),
    };
    setNewTaskText("");
    setNewTaskDate("");
    await persistTasks([next, ...tasks]);
  };

  const toggleTask = async (taskId: string) => {
    await persistTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const handleGenerateTasks = async () => {
    if (!activeFolder) return;
    setIsGeneratingTasks(true);
    try {
      const generated = await generateFolderTasks(
        activeFolder.name,
        folderMemo || activeFolder.notes || "",
        artifacts,
      );
      const mapped: Task[] = (generated || []).map((item, index) => ({
        id: `gen_${Date.now()}_${index}`,
        text: item.title,
        description: item.description,
        dueDate: item.dueDate || undefined,
        completed: false,
        createdAt: Date.now(),
      }));
      if (!mapped.length) {
        alert("No mandates generated.", "warning");
        return;
      }
      await persistTasks([...mapped, ...tasks]);
      alert("Execution plan updated.");
    } catch (error) {
      console.error(error);
      alert("Could not generate execution plan.", "error");
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const handleAddTextArtifact = async (title?: string, content?: string) => {
    if (!activeFolder) return;
    const artifactId = await createDossierArtifactFromText(
      uid,
      activeFolder.id,
      title || "Untitled Note",
      content || "Double-click intent or paste a reference note here.",
    );
    if (!artifactId) {
      alert("Note could not be saved to the board.", "error");
      return null;
    }
    await reloadArtifacts(activeFolder.id);
    setSelectedArtifactId(artifactId);
    scrollToEvidence();
    return artifactId;
  };

  const handleSaveNoteModal = async () => {
    if (!noteContent.trim()) {
      alert("Write a note before saving.", "warning");
      return;
    }
    setIsSavingNote(true);
    try {
      await handleAddTextArtifact(noteTitle.trim() || "Intake Note", noteContent.trim());
      setShowNoteModal(false);
      setNoteTitle("Intake Note");
      setNoteContent("");
      alert("Note added to Visual Evidence.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleUploadArtifacts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length || !activeFolder) return;
    setIsUploading(true);
    try {
      let lastId = "";
      for (const file of Array.from(files)) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const title = file.name.replace(/\.[^.]+$/, "") || "Untitled Plate";
        lastId = await createDossierArtifactFromImage(uid, activeFolder.id, title, dataUrl);
        // Mirror into Pocket archive when possible
        try {
          const { archiveManager } = await import("../../services/archiveManager");
          await archiveManager.saveToPocket(uid, "image", {
            imageUrl: dataUrl,
            title,
            origin: "moodboard",
            folderId: activeFolder.id,
          });
        } catch (error) {
          console.warn("Pocket mirror skipped", error);
        }
      }
      await reloadArtifacts(activeFolder.id);
      if (lastId) setSelectedArtifactId(lastId);
      scrollToEvidence();
      alert("Artifact added to Visual Evidence.");
    } catch (error) {
      console.error(error);
      alert("Artifact upload failed.", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpenImport = async () => {
    if (!activeFolder) return;
    setShowImportModal(true);
    setIsImporting(true);
    try {
      const items = await fetchPocketItems(uid);
      setPocketItems(items || []);
    } catch (error) {
      console.error(error);
      setPocketItems([]);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportPocketItem = async (item: PocketItem) => {
    if (!activeFolder) return;
    try {
      let artifactId = "";
      if (item.type === "image" || item.type === "zine_card") {
        const imageUrl = item.content?.imageUrl || item.content?.image || "";
        if (!imageUrl) {
          alert("This pocket item has no image to import.", "warning");
          return;
        }
        artifactId = await createDossierArtifactFromImage(
          uid,
          activeFolder.id,
          item.content?.title || item.content?.prompt || "Imported Plate",
          imageUrl,
        );
      } else if (item.type === "analysis_report" || item.type === "text" || item.type === "script") {
        const body =
          item.content?.content ||
          item.content?.prompt ||
          item.content?.title ||
          "Imported analysis";
        artifactId = await createDossierArtifactFromText(
          uid,
          activeFolder.id,
          item.content?.title || "Imported Analysis",
          typeof body === "string" ? body : JSON.stringify(body, null, 2),
        );
      } else if (item.type === "voicenote") {
        artifactId = await createDossierArtifactFromText(
          uid,
          activeFolder.id,
          item.content?.title || "Voice Memo",
          `Audio source: ${item.content?.audioUrl || "local recording"}`,
        );
      } else {
        alert("This pocket type cannot be imported yet.", "warning");
        return;
      }

      if (!artifactId) {
        alert("Import failed.", "error");
        return;
      }
      await reloadArtifacts(activeFolder.id);
      setSelectedArtifactId(artifactId);
      setShowImportModal(false);
      scrollToEvidence();
      alert("Pocket item added to Visual Evidence.");
    } catch (error) {
      console.error(error);
      alert("Import failed.", "error");
    }
  };

  const handleAnalyzeBoard = async () => {
    if (!activeFolder) return;
    if (!artifacts.length && !folderMemo.trim()) {
      alert("Add memo or visual evidence before analyzing.", "warning");
      return;
    }
    setIsAnalyzing(true);
    try {
      const blueprint = await generateStrategicBlueprint(
        artifacts.map((artifact) => ({
          type: artifact.elements?.[0]?.type || artifact.type,
          title: artifact.title,
        })),
        folderMemo || activeFolder.notes || "",
        profile,
      );

      const analysisText = [
        `Board analysis for “${activeFolder.name}”`,
        "",
        `Inciting debris: ${blueprint?.inciting_debris || "—"}`,
        `Structural pivot: ${blueprint?.structural_pivot || "—"}`,
        `Climax manifest: ${blueprint?.climax_manifest || "—"}`,
        `End product: ${blueprint?.end_product_spec || "—"}`,
      ].join("\n");

      const artifactId = await createDossierArtifactFromText(
        uid,
        activeFolder.id,
        `Analysis · ${activeFolder.name}`,
        analysisText,
      );

      try {
        const { archiveManager } = await import("../../services/archiveManager");
        await archiveManager.saveToPocket(uid, "analysis_report", {
          title: `Mood Board Analysis · ${activeFolder.name}`,
          content: analysisText,
          folderId: activeFolder.id,
          origin: "moodboard_analysis",
          blueprint,
        });
      } catch (error) {
        console.warn("Archive analysis save skipped", error);
      }

      await reloadArtifacts(activeFolder.id);
      if (artifactId) setSelectedArtifactId(artifactId);
      scrollToEvidence();
      alert("Analysis saved to Visual Evidence and archive.");
    } catch (error) {
      console.error(error);
      alert("Board analysis failed.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendToStudio = () => {
    if (!activeFolder) return;
    const textContext = artifacts
      .filter((artifact) => artifact.elements?.[0]?.type === "text")
      .map((artifact) => `[${artifact.title}]: ${artifact.elements[0].content}`)
      .join("\n\n");
    const fullContext = `PROJECT: ${activeFolder.name}\nMEMO: ${folderMemo}\n\nARTIFACTS:\n${textContext}`;
    const initialMedia = artifacts
      .filter((artifact) => artifact.elements?.[0]?.type === "image" && artifact.elements[0].content)
      .map((artifact) => ({
        type: "image" as const,
        data: artifact.elements[0].content,
        mimeType: "image/jpeg",
        name: artifact.title,
      }));

    window.dispatchEvent(
      new CustomEvent("mimi:change_view", {
        detail: "studio",
        detail_data: {
          context: fullContext,
          initialMedia,
          isHighFidelity: true,
        },
      } as any),
    );
  };

  const handleDeleteSelected = async () => {
    if (!activeFolder) return;
    if (selectedArtifactId) {
      await deleteDossierArtifact(selectedArtifactId);
      setSelectedArtifactId(null);
      await reloadArtifacts(activeFolder.id);
      alert("Artifact removed.");
      return;
    }
    if (!artifacts.length) {
      alert("Select an artifact first, or add evidence to clear.", "warning");
      return;
    }
    const confirmed = window.confirm(
      `Remove all ${artifacts.length} Visual Evidence plates from “${activeFolder.name}”?`,
    );
    if (!confirmed) return;
    await Promise.all(artifacts.map((artifact) => deleteDossierArtifact(artifact.id)));
    await reloadArtifacts(activeFolder.id);
    alert("Visual Evidence cleared.");
  };

  const renderEvidenceCard = (artifact: DossierArtifact) => {
    const element = artifact.elements?.[0];
    const selected = selectedArtifactId === artifact.id;
    const isAnalysis =
      artifact.type === "strategy" ||
      /analysis/i.test(artifact.title) ||
      artifact.tags?.includes("audit");

    return (
      <div
        key={artifact.id}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedArtifactId(artifact.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setSelectedArtifactId(artifact.id);
        }}
        className={`group relative cursor-pointer border bg-white text-left transition-colors ${
          selected ? "border-emerald-600 ring-1 ring-emerald-600/30" : "border-stone-300"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void (async () => {
              await deleteDossierArtifact(artifact.id);
              if (selectedArtifactId === artifact.id) setSelectedArtifactId(null);
              if (activeFolder) await reloadArtifacts(activeFolder.id);
            })();
          }}
          className="absolute right-2 top-2 z-10 hidden rounded-full bg-white/90 p-1 text-stone-500 hover:text-red-600 group-hover:block"
          title="Remove artifact"
        >
          <Trash2 size={12} />
        </button>
        {element?.type === "image" ? (
          <div className="aspect-square overflow-hidden bg-stone-100">
            <img
              src={element.content}
              alt={artifact.title}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="flex aspect-square items-center justify-center bg-stone-50 p-4">
            <p className="line-clamp-8 text-center font-serif text-sm italic text-stone-700">
              {element?.content || artifact.title}
            </p>
          </div>
        )}
        <div className="border-t border-stone-200 px-2 py-2">
          <p className="truncate font-mono text-[8px] uppercase tracking-widest text-stone-400">
            {isAnalysis ? "Analysis" : element?.type === "image" ? "Plate" : "Note"}
          </p>
          <p className="truncate font-serif text-sm italic">{artifact.title}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#0B0B0A] text-stone-200">
      <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-emerald-500/20 bg-[#11110F]">
        <div className="space-y-5 border-b border-emerald-500/15 p-5">
          <div className="flex items-center gap-2 text-emerald-400">
            <Briefcase size={13} />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.28em]">
              Project Registry
            </span>
          </div>

          <div className="relative">
            <Search
              size={12}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"
            />
            <input
              type="text"
              value={folderSearchTerm}
              onChange={(e) => setFolderSearchTerm(e.target.value)}
              placeholder="Filter Dossiers..."
              className="w-full border border-stone-800 bg-[#0B0B0A] py-2.5 pl-9 pr-3 font-mono text-[10px] text-stone-300 outline-none placeholder:text-stone-600 focus:border-emerald-500/40"
            />
          </div>

          {showNewFolder ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleInitializeProject();
                  if (e.key === "Escape") setShowNewFolder(false);
                }}
                placeholder="Project name..."
                className="w-full border border-emerald-500/40 bg-[#0B0B0A] px-3 py-2 font-serif text-sm italic text-stone-100 outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleInitializeProject()}
                  className="flex-1 bg-emerald-400 py-2 font-mono text-[8px] font-bold uppercase tracking-widest text-black"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewFolder(false)}
                  className="flex-1 border border-stone-700 py-2 font-mono text-[8px] uppercase tracking-widest text-stone-400"
                >
                  Cancel
                </button>
              </div>
            </div>

          ) : (
            <button
              type="button"
              onClick={() => setShowNewFolder(true)}
              className="flex w-full items-center justify-center gap-2 border border-dashed border-emerald-500/35 py-3 font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-400 transition-colors hover:border-emerald-400 hover:bg-emerald-500/5"
            >
              <Plus size={12} /> Initialize Project
            </button>
          )}
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2 no-scrollbar">
          {loadingFolders ? (
            <div className="flex items-center justify-center gap-2 py-10 text-stone-500">
              <Loader2 size={14} className="animate-spin" />
              <span className="font-mono text-[8px] uppercase tracking-widest">Loading</span>
            </div>
          ) : filteredFolders.length === 0 ? (
            <p className="px-4 py-8 text-center font-mono text-[9px] uppercase tracking-widest text-stone-600">
              No dossiers yet
            </p>
          ) : (
            filteredFolders.map((folder) => {
              const active = activeFolder?.id === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setActiveFolder(folder)}
                  className={`relative w-full overflow-hidden px-4 py-3 text-left transition-colors ${
                    active
                      ? "bg-emerald-500/10 text-emerald-100"
                      : "text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                  }`}
                >
                  {active && (
                    <span className="absolute bottom-0 left-0 top-0 w-0.5 bg-emerald-400" />
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="truncate font-serif text-sm italic">{folder.name}</h4>
                    <span className="shrink-0 font-mono text-[8px] opacity-50">
                      {new Date(folder.createdAt).toLocaleDateString(undefined, {
                        month: "numeric",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#F2F0E9] text-[#1C1917]">
        {!activeFolder ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <FolderOpen size={36} className="text-stone-400" strokeWidth={1.25} />
            <div>
              <h2 className="font-serif text-3xl italic">No active dossier</h2>
              <p className="mt-2 max-w-md font-sans text-sm text-stone-500">
                Initialize a project to begin intake. Visual Evidence collects plates and analyses
                at the bottom of the board.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewFolder(true)}
              className="bg-[#1C1917] px-5 py-3 font-mono text-[9px] font-bold uppercase tracking-widest text-[#F2F0E9]"
            >
              + Initialize Project
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto no-scrollbar">
            <header className="flex flex-col gap-4 border-b border-stone-300/80 px-6 py-5 md:flex-row md:items-end md:justify-between md:px-8">
              <div>
                <div className="mb-2 flex items-center gap-2 text-emerald-700">
                  <FolderOpen size={13} />
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.32em]">
                    Active Dossier
                  </span>
                </div>
                <h1 className="font-serif text-4xl italic tracking-tight md:text-5xl">
                  {activeFolder.name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="Remove selected artifact (or clear all)"
                    onClick={() => void handleDeleteSelected()}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-400/70 text-stone-600 transition-colors hover:border-stone-800 hover:text-stone-900"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    type="button"
                    title="Upload image plate"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-400/70 text-stone-600 transition-colors hover:border-stone-800 hover:text-stone-900"
                  >
                    <Upload size={14} />
                  </button>
                  <button
                    type="button"
                    title="Analyze board → save to evidence + archive"
                    disabled={isAnalyzing}
                    onClick={() => void handleAnalyzeBoard()}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-400/70 text-stone-600 transition-colors hover:border-stone-800 hover:text-stone-900 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Eye size={14} />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Send board context into Studio"
                    onClick={handleSendToStudio}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-400/70 text-stone-600 transition-colors hover:border-stone-800 hover:text-stone-900"
                  >
                    <Globe size={14} />
                  </button>
                  <button
                    type="button"
                    title="Add text note to Visual Evidence"
                    onClick={() => setShowNoteModal(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-400/70 text-stone-600 transition-colors hover:border-stone-800 hover:text-stone-900"
                  >
                    <FileText size={14} />
                  </button>
                  <button
                    type="button"
                    title="Import from Pocket archive"
                    onClick={() => void handleOpenImport()}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-400/70 text-stone-600 transition-colors hover:border-stone-800 hover:text-stone-900"
                  >
                    <Archive size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-emerald-400 px-4 py-2.5 font-mono text-[9px] font-black uppercase tracking-widest text-black transition-colors hover:bg-emerald-300 disabled:opacity-60"
                >
                  {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Add Artifact
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleUploadArtifacts}
                />
              </div>
            </header>

            {/* Intake */}
            <section className="grid gap-0 border-b border-stone-300/80 lg:grid-cols-2">
              <div className="space-y-3 border-b border-stone-300/80 p-6 md:p-8 lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-stone-500" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-stone-500">
                      Strategic Memo
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveMemo()}
                    disabled={isSavingMemo}
                    className="text-stone-500 hover:text-stone-900 disabled:opacity-50"
                    title="Save memo"
                  >
                    {isSavingMemo ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  </button>
                </div>
                <textarea
                  value={folderMemo}
                  onChange={(e) => setFolderMemo(e.target.value)}
                  onBlur={() => void handleSaveMemo()}
                  placeholder="Define the project intent, core pillars, and desired outcomes..."
                  className="min-h-[140px] w-full resize-none border border-stone-300 bg-white/70 p-4 font-sans text-sm leading-relaxed text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-500"
                />
              </div>

              <div className="space-y-3 p-6 md:p-8">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ListChecks size={13} className="text-stone-500" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-stone-500">
                      Execution Plan
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void persistTasks(tasks)}
                      disabled={isSavingTasks}
                      className="text-stone-500 hover:text-stone-900 disabled:opacity-50"
                      title="Save plan"
                    >
                      {isSavingTasks ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Save size={13} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleGenerateTasks()}
                      disabled={isGeneratingTasks}
                      className="text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                      title="Generate mandates"
                    >
                      {isGeneratingTasks ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Sparkles size={13} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleAddTask();
                    }}
                    placeholder="Add imperative..."
                    className="min-w-0 flex-1 border border-stone-300 bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-wider outline-none focus:border-stone-500"
                  />
                  <div className="relative">
                    <Calendar
                      size={12}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="date"
                      value={newTaskDate}
                      onChange={(e) => setNewTaskDate(e.target.value)}
                      className="w-full border border-stone-300 bg-white py-2 pl-8 pr-3 font-mono text-[10px] outline-none focus:border-stone-500 sm:w-40"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAddTask()}
                    className="flex items-center justify-center border border-stone-800 bg-[#1C1917] px-3 py-2 text-[#F2F0E9]"
                    title="Add mandate"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <p className="py-4 text-center font-serif text-sm italic text-stone-400">
                    No active mandates.
                  </p>
                ) : (
                  <ul className="max-h-48 space-y-2 overflow-y-auto no-scrollbar">
                    {tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex items-start gap-3 border border-stone-300/80 bg-white/60 px-3 py-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => void toggleTask(task.id)}
                          className="mt-0.5 font-mono text-[11px] text-stone-700"
                        >
                          {task.completed ? "[x]" : "[ ]"}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-mono text-[11px] uppercase tracking-wider ${
                              task.completed ? "text-stone-400 line-through" : "text-stone-800"
                            }`}
                          >
                            {task.text}
                          </p>
                          {task.dueDate && (
                            <p className="mt-1 font-mono text-[8px] uppercase tracking-widest text-stone-400">
                              Due {task.dueDate}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Visual Evidence — bottom of intake */}
            <section ref={evidenceRef} className="flex min-h-[420px] flex-1 flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-stone-300/80 px-6 py-4 md:px-8">
                <div>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-stone-500">
                    Visual Evidence ({artifacts.length})
                  </span>
                  <p className="mt-1 font-serif text-sm italic text-stone-500">
                    Plates, notes, and analyses collect here from upload, Pocket, and board analysis.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEvidenceView("grid")}
                    className={`p-1.5 ${evidenceView === "grid" ? "text-stone-900" : "text-stone-400"}`}
                    title="Grid view"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceView("list")}
                    className={`p-1.5 ${evidenceView === "list" ? "text-stone-900" : "text-stone-400"}`}
                    title="List view"
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-6 md:p-8">
                {loadingArtifacts ? (
                  <div className="flex min-h-[240px] items-center justify-center gap-2 text-stone-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="font-mono text-[8px] uppercase tracking-widest">
                      Loading evidence
                    </span>
                  </div>
                ) : artifacts.length === 0 ? (
                  <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 border border-dashed border-stone-300 text-stone-400">
                    <LayoutGrid size={48} strokeWidth={1} className="opacity-30" />
                    <p className="font-serif text-sm italic">No artifacts found</p>
                    <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-stone-400 px-4 py-2 font-mono text-[8px] uppercase tracking-widest text-stone-600 hover:border-stone-800 hover:text-stone-900"
                      >
                        Upload plate
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNoteModal(true)}
                        className="border border-stone-400 px-4 py-2 font-mono text-[8px] uppercase tracking-widest text-stone-600 hover:border-stone-800 hover:text-stone-900"
                      >
                        Add note
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleOpenImport()}
                        className="border border-stone-400 px-4 py-2 font-mono text-[8px] uppercase tracking-widest text-stone-600 hover:border-stone-800 hover:text-stone-900"
                      >
                        Import pocket
                      </button>
                    </div>
                  </div>
                ) : evidenceView === "grid" ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                    {artifacts.map(renderEvidenceCard)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {artifacts.map((artifact) => {
                      const element = artifact.elements?.[0];
                      return (
                        <button
                          key={artifact.id}
                          type="button"
                          onClick={() => setSelectedArtifactId(artifact.id)}
                          className={`flex w-full items-center gap-3 border bg-white p-2 text-left ${
                            selectedArtifactId === artifact.id
                              ? "border-emerald-600"
                              : "border-stone-300"
                          }`}
                        >
                          <div className="h-14 w-14 shrink-0 overflow-hidden border border-stone-200 bg-stone-100">
                            {element?.type === "image" ? (
                              <img
                                src={element.content}
                                alt=""
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <FileText size={14} className="text-stone-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-serif italic">{artifact.title}</p>
                            <p className="font-mono text-[8px] uppercase tracking-widest text-stone-400">
                              {element?.type || artifact.type}
                            </p>
                          </div>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              void (async () => {
                                await deleteDossierArtifact(artifact.id);
                                if (selectedArtifactId === artifact.id) setSelectedArtifactId(null);
                                await reloadArtifacts(activeFolder.id);
                              })();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                void (async () => {
                                  await deleteDossierArtifact(artifact.id);
                                  if (selectedArtifactId === artifact.id) setSelectedArtifactId(null);
                                  await reloadArtifacts(activeFolder.id);
                                })();
                              }
                            }}
                            className="p-2 text-stone-400 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {showNoteModal && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg border border-stone-300 bg-[#F2F0E9] p-6 text-[#1C1917] shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-stone-500">
                  Visual Evidence
                </p>
                <h3 className="font-serif text-2xl italic">Add note</h3>
              </div>
              <button type="button" onClick={() => setShowNoteModal(false)} className="p-1 text-stone-500">
                <X size={16} />
              </button>
            </div>
            <input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="mb-3 w-full border border-stone-300 bg-white px-3 py-2 font-serif italic outline-none"
              placeholder="Note title"
            />
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={6}
              className="mb-4 w-full resize-none border border-stone-300 bg-white px-3 py-2 font-sans text-sm outline-none"
              placeholder="Observation, quote, or analysis fragment..."
            />
            <button
              type="button"
              disabled={isSavingNote}
              onClick={() => void handleSaveNoteModal()}
              className="w-full bg-emerald-400 py-3 font-mono text-[9px] font-black uppercase tracking-widest text-black disabled:opacity-60"
            >
              {isSavingNote ? "Saving…" : "Save to Visual Evidence"}
            </button>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col border border-stone-300 bg-[#F2F0E9] text-[#1C1917] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-stone-300 px-6 py-4">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-stone-500">
                  Pocket Archive
                </p>
                <h3 className="font-serif text-2xl italic">Import into evidence</h3>
              </div>
              <button type="button" onClick={() => setShowImportModal(false)} className="p-1 text-stone-500">
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {isImporting ? (
                <div className="flex items-center justify-center gap-2 py-16 text-stone-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="font-mono text-[8px] uppercase tracking-widest">Loading pocket</span>
                </div>
              ) : pocketItems.length === 0 ? (
                <p className="py-16 text-center font-serif italic text-stone-400">
                  No pocket items available to import.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {pocketItems.slice(0, 36).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void handleImportPocketItem(item)}
                      className="border border-stone-300 bg-white p-2 text-left hover:border-stone-800"
                    >
                      <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden bg-stone-100">
                        {item.content?.imageUrl || item.content?.image ? (
                          <img
                            src={item.content.imageUrl || item.content.image}
                            alt=""
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <FileText size={16} className="text-stone-400" />
                        )}
                      </div>
                      <p className="truncate font-mono text-[8px] uppercase tracking-widest text-stone-400">
                        {item.type}
                      </p>
                      <p className="truncate font-serif text-sm italic">
                        {item.content?.title || item.content?.prompt || "Untitled"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
