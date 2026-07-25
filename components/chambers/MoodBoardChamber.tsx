import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Calendar,
  FileText,
  FolderOpen,
  Globe,
  LayoutGrid,
  List,
  ListChecks,
  Loader2,
  Monitor,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
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
  updateDossierFolder,
} from "../../services/firebase";
import type { DossierArtifact, DossierFolder, Task } from "../../types";
import { generateFolderTasks } from "../../services/geminiService";

type EvidenceView = "grid" | "list";

export const MoodBoardChamber: React.FC = () => {
  const { user, profile } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folders, setFolders] = useState<DossierFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<DossierFolder | null>(null);
  const [artifacts, setArtifacts] = useState<DossierArtifact[]>([]);
  const [folderSearchTerm, setFolderSearchTerm] = useState("");
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    try {
      const next = await fetchDossierFolders(user?.uid || "ghost");
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
  }, [user?.uid]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    if (!activeFolder) {
      setArtifacts([]);
      setFolderMemo("");
      setTasks([]);
      return;
    }

    setFolderMemo(activeFolder.notes || "");
    setTasks(activeFolder.tasks || []);
    setLoadingArtifacts(true);

    let cancelled = false;
    void fetchDossierArtifacts(activeFolder.id)
      .then((next) => {
        if (!cancelled) setArtifacts(next);
      })
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
  }, [activeFolder]);

  const filteredFolders = useMemo(() => {
    const query = folderSearchTerm.trim().toLowerCase();
    if (!query) return folders;
    return folders.filter((folder) => folder.name.toLowerCase().includes(query));
  }, [folderSearchTerm, folders]);

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
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Could not save execution plan.", type: "error" },
        }),
      );
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
      const id = await createDossierFolder(user?.uid || "ghost", newFolderName.trim());
      setNewFolderName("");
      setShowNewFolder(false);
      await loadFolders();
      setActiveFolder((prev) => {
        const match = folders.find((folder) => folder.id === id);
        return match || prev;
      });
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Project space initialized.", type: "success" },
        }),
      );
      // Reload to select the new folder by name if id lookup races
      const refreshed = await fetchDossierFolders(user?.uid || "ghost");
      setFolders(refreshed);
      const created = refreshed.find((folder) => folder.id === id) || refreshed[0] || null;
      setActiveFolder(created);
    } catch (error) {
      console.error(error);
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
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Strategic memo saved.", type: "success" },
        }),
      );
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
    const next = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task,
    );
    await persistTasks(next);
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
      if (mapped.length === 0) {
        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: { message: "No mandates generated.", type: "warning" },
          }),
        );
        return;
      }
      await persistTasks([...mapped, ...tasks]);
    } catch (error) {
      console.error(error);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Could not generate execution plan.", type: "error" },
        }),
      );
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const handleAddTextArtifact = async () => {
    if (!activeFolder) return;
    try {
      await createDossierArtifactFromText(
        user?.uid || "ghost",
        activeFolder.id,
        "Untitled Note",
        "Double-click intent or paste a reference note here.",
      );
      const next = await fetchDossierArtifacts(activeFolder.id);
      setArtifacts(next);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUploadArtifacts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length || !activeFolder) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await createDossierArtifactFromImage(
          user?.uid || "ghost",
          activeFolder.id,
          file.name.replace(/\.[^.]+$/, "") || "Untitled Plate",
          dataUrl,
        );
      }
      const next = await fetchDossierArtifacts(activeFolder.id);
      setArtifacts(next);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Artifact added to visual evidence.", type: "success" },
        }),
      );
    } catch (error) {
      console.error(error);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Artifact upload failed.", type: "error" },
        }),
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteArtifact = async (artifactId: string) => {
    if (!activeFolder) return;
    try {
      await deleteDossierArtifact(artifactId);
      setArtifacts((prev) => prev.filter((artifact) => artifact.id !== artifactId));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteFolder = async () => {
    if (!activeFolder) return;
    // Soft-clear local selection; full folder delete may not exist — clear memo/tasks and leave entry
    setActiveFolder(null);
  };

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#0B0B0A] text-stone-200">
      {/* PROJECT REGISTRY */}
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

      {/* ACTIVE DOSSIER */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#F2F0E9] text-[#1C1917]">
        {!activeFolder ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <FolderOpen size={36} className="text-stone-400" strokeWidth={1.25} />
            <div>
              <h2 className="font-serif text-3xl italic">No active dossier</h2>
              <p className="mt-2 max-w-md font-sans text-sm text-stone-500">
                Initialize a project in the registry to open Strategic Memo, Execution Plan, and
                Visual Evidence.
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
          <>
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
                  {[
                    { icon: Trash2, title: "Clear selection", onClick: handleDeleteFolder },
                    {
                      icon: Upload,
                      title: "Upload artifact",
                      onClick: () => fileInputRef.current?.click(),
                    },
                    { icon: Monitor, title: "Presentation view", onClick: () => undefined },
                    {
                      icon: Globe,
                      title: "Send context to Studio",
                      onClick: () => {
                        window.dispatchEvent(
                          new CustomEvent("mimi:change_view", { detail: "studio" }),
                        );
                      },
                    },
                    {
                      icon: FileText,
                      title: "Add text note",
                      onClick: () => void handleAddTextArtifact(),
                    },
                  ].map(({ icon: Icon, title, onClick }) => (
                    <button
                      key={title}
                      type="button"
                      title={title}
                      onClick={onClick}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-400/70 text-stone-600 transition-colors hover:border-stone-800 hover:text-stone-900"
                    >
                      <Icon size={14} />
                    </button>
                  ))}
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

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-2">
              {/* Left column */}
              <section className="flex min-h-0 flex-col overflow-y-auto border-b border-stone-300/80 no-scrollbar lg:border-b-0 lg:border-r">
                <div className="space-y-8 p-6 md:p-8">
                  {/* Strategic Memo */}
                  <div className="space-y-3">
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
                        className="flex items-center gap-1.5 text-stone-500 transition-colors hover:text-stone-900 disabled:opacity-50"
                        title="Save memo"
                      >
                        {isSavingMemo ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Save size={13} />
                        )}
                      </button>
                    </div>
                    <textarea
                      value={folderMemo}
                      onChange={(e) => setFolderMemo(e.target.value)}
                      onBlur={() => void handleSaveMemo()}
                      placeholder="Define the project intent, core pillars, and desired outcomes..."
                      className="min-h-[160px] w-full resize-none border border-stone-300 bg-white/70 p-4 font-sans text-sm leading-relaxed text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-500"
                    />
                  </div>

                  {/* Execution Plan */}
                  <div className="space-y-3">
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
                      <p className="py-6 text-center font-serif text-sm italic text-stone-400">
                        No active mandates.
                      </p>
                    ) : (
                      <ul className="space-y-2">
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
                </div>
              </section>

              {/* Right column — Visual Evidence */}
              <section className="flex min-h-0 flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-stone-300/80 px-6 py-4 md:px-8">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-stone-500">
                    Visual Evidence ({artifacts.length})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEvidenceView("grid")}
                      className={`p-1.5 ${
                        evidenceView === "grid" ? "text-stone-900" : "text-stone-400"
                      }`}
                      title="Grid view"
                    >
                      <LayoutGrid size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvidenceView("list")}
                      className={`p-1.5 ${
                        evidenceView === "list" ? "text-stone-900" : "text-stone-400"
                      }`}
                      title="List view"
                    >
                      <List size={14} />
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-6 no-scrollbar md:p-8">
                  {loadingArtifacts ? (
                    <div className="flex h-full items-center justify-center gap-2 text-stone-400">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="font-mono text-[8px] uppercase tracking-widest">
                        Loading evidence
                      </span>
                    </div>
                  ) : artifacts.length === 0 ? (
                    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-stone-400">
                      <LayoutGrid size={48} strokeWidth={1} className="opacity-30" />
                      <p className="font-serif text-sm italic">No artifacts found</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 border border-stone-400 px-4 py-2 font-mono text-[8px] uppercase tracking-widest text-stone-600 hover:border-stone-800 hover:text-stone-900"
                      >
                        Add first plate
                      </button>
                    </div>
                  ) : evidenceView === "grid" ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {artifacts.map((artifact) => {
                        const element = artifact.elements?.[0];
                        return (
                          <div
                            key={artifact.id}
                            className="group relative border border-stone-300 bg-white"
                          >
                            <button
                              type="button"
                              onClick={() => void handleDeleteArtifact(artifact.id)}
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
                                <p className="line-clamp-6 text-center font-serif text-sm italic text-stone-700">
                                  {element?.content || artifact.title}
                                </p>
                              </div>
                            )}
                            <div className="border-t border-stone-200 px-2 py-2">
                              <p className="truncate font-mono text-[8px] uppercase tracking-widest text-stone-400">
                                Plate
                              </p>
                              <p className="truncate font-serif text-sm italic">{artifact.title}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {artifacts.map((artifact) => {
                        const element = artifact.elements?.[0];
                        return (
                          <div
                            key={artifact.id}
                            className="flex items-center gap-3 border border-stone-300 bg-white p-2"
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
                                {element?.type || "artifact"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleDeleteArtifact(artifact.id)}
                              className="p-2 text-stone-400 hover:text-red-600"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
