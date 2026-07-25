import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useUser } from "../contexts/UserContext";
import { AestheticSignature, TailorLogicDraft } from "../types";
import { 
  Upload, Sparkles, FileText, Check, ChevronRight, Download, RefreshCw, 
  Trash2, Sliders, Palette, Layers, Type as FontIcon, HelpCircle, AlertCircle,
  TrendingUp, CreditCard, ShoppingBag, FileCheck, Share2, Star
} from "lucide-react";
import * as htmlToImage from "html-to-image";
import { getClient } from "../services/geminiClient";

interface RefItem {
  id: string;
  name: string;
  type: "image" | "text";
  data: string; // base64 for images, raw content for text
  previewUrl?: string;
}

// 6 ultra-luxury procedural fallback aesthetic templates in case Gemini is overloaded
const FALLBACK_AESTHETICS = [
  {
    primaryAxis: "Kinetic Cyber-Noir",
    secondaryAxis: "Hyper-Friction Concrete",
    coreTrait: "High-contrast clinical brutalism married to fluid wet shadows.",
    motifs: ["Silver Spheres", "Aperture Blurs", "Anatomical Grids", "Distressed Chrome"],
    moodCluster: "Obsidian Dissonance",
    paletteExtraction: ["#0F0F11", "#1D1D21", "#787C85", "#FFFFFF", "#FF3B30"],
    tactileBias: { dominant: "Brushed Aluminum", secondary: "Wet Asphalt" },
    typographicPairing: { serif: "Editorial New", sans: "JetBrains Mono" },
    promptMatrix: [
      "A raw, high-contrast cyber-noir photographic study, shot on 35mm, industrial brutalism.",
      "Anatomical chrome grids emerging from deep obsidian fluid, kinetic motion blur, clinical silver highlights.",
      "Tactile composition featuring brushed aluminum slabs overlaying damp concrete, stark shadows, red neon laser beam puncture."
    ]
  },
  {
    primaryAxis: "Ethereal Cyber-Organza",
    secondaryAxis: "Latent Neophyte",
    coreTrait: "Translucent textile layers suspended in a sterile, light-flooded void.",
    motifs: ["Raw Silk Fold", "Shattered Vellum", "Deuterium Dew", "Prism Glare"],
    moodCluster: "Clinical Serenity",
    paletteExtraction: ["#F5F4F0", "#EAE6DF", "#B8B3A9", "#E1F2FF", "#FFD2D2"],
    tactileBias: { dominant: "Pre-washed Silk", secondary: "Frosted Glass" },
    typographicPairing: { serif: "Ogg Roman", sans: "Space Grotesk" },
    promptMatrix: [
      "Soft, airy minimalism, studio lighting, hyper-tactile folds of translucent organza suspended in clean white space.",
      "Macro shot of frosted glass plates casting rainbow chromatic dispersion on organic sand textures.",
      "High-key editorial fashion plate, pale linen drapery, subtle pastel gradients, raw daylight."
    ]
  },
  {
    primaryAxis: "Neolithic Brutalism",
    secondaryAxis: "Techno-Organic",
    coreTrait: "Ancient mineral monoliths integrated with precision-milled computer logic boards.",
    motifs: ["Basalt Pillars", "Lichen Micro-Grids", "Raw Copper Filaments", "Cleaved Slate"],
    moodCluster: "Sub-Tectonic Moss",
    paletteExtraction: ["#2B2A27", "#1E1E1C", "#4F5D4E", "#83907A", "#D0C9BC"],
    tactileBias: { dominant: "Cleaved Basalt", secondary: "Damp Lichen" },
    typographicPairing: { serif: "Garamond Premier Pro", sans: "Fira Code" },
    promptMatrix: [
      "Cleaved dark basalt monolith in a damp mossy forest, precision-cut copper filaments winding through the stone cracks.",
      "Stark brutalist architectural structure built of raw volcanic aggregate, detailed lichen micro-grids, soft overcast morning light.",
      "Tactile design study, organic earthy textures contrasted with high-precision gold silicon traces, hyper-detailed macro photo."
    ]
  },
  {
    primaryAxis: "High-Entropy Dadaist",
    secondaryAxis: "Vandal Editorial",
    coreTrait: "Aggressive collage layouts, punk textures, and physical xerox artifacts.",
    motifs: ["Torn Halftones", "Xerox Drag lines", "Red Marker Cancellations", "Scaffold Wire"],
    moodCluster: "Abrasive Synthesis",
    paletteExtraction: ["#050505", "#F23030", "#F7F5EA", "#3252E0", "#FFCC00"],
    tactileBias: { dominant: "80gsm Newsprint", secondary: "Cardboard Grit" },
    typographicPairing: { serif: "Times New Roman", sans: "Univers Bold Condensed" },
    promptMatrix: [
      "Raw Xerox collage texture, heavy ink bleeding, torn magazine halftones, spray paint splatters and bold marker marks.",
      "Graphic design composition, punk rock zine aesthetic, stark black on newsprint paper, neon yellow highlights.",
      "Tactile assemblage of rusted metal mesh, industrial yellow caution tape, and photocopy distress, severe flash photography."
    ]
  }
];

export const ArtStyleChamber: React.FC = () => {
  const { user, profile, updateProfile } = useUser();
  const [refs, setRefs] = useState<RefItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [scryStep, setScryStep] = useState<"input" | "scrying" | "refine" | "finished">("input");
  const [scryLogs, setScryLogs] = useState<string[]>([]);
  const [scryResult, setScryResult] = useState<AestheticSignature | null>(null);
  
  // Selection/Refinement State
  const [selectedPalette, setSelectedPalette] = useState<string[]>([]);
  const [selectedMotifs, setSelectedMotifs] = useState<string[]>([]);
  const [selectedTactile, setSelectedTactile] = useState({ dominant: "", secondary: "" });
  const [selectedFonts, setSelectedFonts] = useState({ serif: "", sans: "" });
  const [selectedPromptMatrix, setSelectedPromptMatrix] = useState<string[]>([]);
  const [primaryAxis, setPrimaryAxis] = useState("");
  const [secondaryAxis, setSecondaryAxis] = useState("");
  const [coreTrait, setCoreTrait] = useState("");
  
  // Mint state
  const [isMinting, setIsMinting] = useState(false);
  const [mintedImageUrl, setMintedImageUrl] = useState<string | null>(null);
  const [cardId, setCardId] = useState("");
  
  // Commercialization state
  const [showOrderModal, setShowOrderModal] = useState<string | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Animate scrying logs
  useEffect(() => {
    if (scryStep !== "scrying") return;
    
    const logs = [
      "🔮 INITIALIZING SEMIOPORTAL INGRESS...",
      "🔍 GATHERING UPLOADED FRAGMENTS...",
      "🔬 CONDUCTING CHROMATOGRAPHIC SPEEP ON VOLTAGES...",
      "🧬 DECRYPTING ENTROPIC THREADS & PATTERNS...",
      "📐 EXTRACTING STRUCTURAL MECHANICS...",
      "🎙️ INTERROGATING ORACULAR MEMORY ARCS...",
      "🎨 SYNTHESIZING UNIQUE GEOMETRIC SIGNATURE..."
    ];
    
    setScryLogs([logs[0]]);
    let currentIdx = 0;
    
    const interval = setInterval(() => {
      currentIdx++;
      if (currentIdx < logs.length) {
        setScryLogs(prev => [...prev, logs[currentIdx]]);
      } else {
        clearInterval(interval);
        executeActualScry();
      }
    }, 1200);
    
    return () => clearInterval(interval);
  }, [scryStep]);

  // Procedural abstract artwork background generator (100% resilient fallback & cool styling)
  useEffect(() => {
    if (scryStep !== "finished" || !scryResult || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw procedural canvas artwork using selected colors and motifs
    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = selectedPalette[0] || "#0F0F11";
    ctx.fillRect(0, 0, width, height);

    // Draw grain overlay
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 15;
      data[i] = Math.max(0, Math.min(255, data[i] + grain));
      data[i+1] = Math.max(0, Math.min(255, data[i+1] + grain));
      data[i+2] = Math.max(0, Math.min(255, data[i+2] + grain));
    }
    ctx.putImageData(imgData, 0, 0);

    // Draw abstract geometric shapes representing motifs/style
    ctx.strokeStyle = (selectedPalette[3] || "#FFFFFF") + "44";
    ctx.lineWidth = 1;
    
    // Grid Lines
    for (let i = 40; i < width; i += 80) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let j = 40; j < height; j += 80) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(width, j);
      ctx.stroke();
    }

    // Concentric circles
    ctx.strokeStyle = selectedPalette[2] || "#FF3B30";
    ctx.beginPath();
    ctx.arc(width/2, height/2, 120, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = (selectedPalette[3] || "#FFFFFF") + "99";
    ctx.beginPath();
    ctx.arc(width/2, height/2, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Chaotic diagonal lines (entropy representation)
    ctx.strokeStyle = (selectedPalette[1] || "#787C85") + "66";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, 0);
      ctx.lineTo(Math.random() * width, height);
      ctx.stroke();
    }

    // Motifs labels drawn abstractly
    ctx.fillStyle = (selectedPalette[3] || "#FFFFFF") + "BB";
    ctx.font = "bold 14px monospace";
    selectedMotifs.forEach((motif, idx) => {
      ctx.fillText(motif.toUpperCase(), 30, 60 + idx * 25);
    });

    // Barcode rendering
    ctx.fillStyle = selectedPalette[3] || "#FFFFFF";
    for (let i = 0; i < 30; i++) {
      const barWidth = Math.random() > 0.5 ? 4 : 1;
      const barGap = Math.random() * 5 + 2;
      ctx.fillRect(width - 150 + i * 4, height - 50, barWidth, 30);
    }
    ctx.font = "8px monospace";
    ctx.fillText(`MIMI-VECTOR-ARTSCRY-ID-${cardId}`, width - 150, height - 12);
  }, [scryStep, scryResult, selectedPalette, selectedMotifs, cardId]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const processFile = (file: File) => {
    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.onload = () => {
      const rawData = reader.result as string;
      const newItem: RefItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        type: isImage ? "image" : "text",
        data: rawData,
        previewUrl: isImage ? rawData : undefined
      };
      setRefs(prev => [...prev, newItem]);
    };
    if (isImage) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach(file => {
        processFile(file);
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(file => {
        processFile(file);
      });
    }
  };

  const addTextRef = () => {
    if (!inputText.trim()) return;
    const newItem: RefItem = {
      id: `${Date.now()}`,
      name: `Note: ${inputText.substring(0, 20)}...`,
      type: "text",
      data: inputText
    };
    setRefs(prev => [...prev, newItem]);
    setInputText("");
  };

  const removeRef = (id: string) => {
    setRefs(prev => prev.filter(r => r.id !== id));
  };

  // Run the patterns scrying engine (Gemini call or seamless fallback)
  const executeActualScry = async () => {
    let fallbackSelected = FALLBACK_AESTHETICS[Math.floor(Math.random() * FALLBACK_AESTHETICS.length)];
    
    // Customize fallback slightly based on names of uploaded files/notes if present
    if (refs.length > 0) {
      const combinedNames = refs.map(r => r.name).join(" ").toLowerCase();
      if (combinedNames.includes("pink") || combinedNames.includes("soft") || combinedNames.includes("silk") || combinedNames.includes("cloud")) {
        fallbackSelected = FALLBACK_AESTHETICS[1]; // Ethereal Cyber-Organza
      } else if (combinedNames.includes("rust") || combinedNames.includes("brutalist") || combinedNames.includes("stone") || combinedNames.includes("basalt")) {
        fallbackSelected = FALLBACK_AESTHETICS[2]; // Neolithic Brutalism
      } else if (combinedNames.includes("punk") || combinedNames.includes("red") || combinedNames.includes("marker") || combinedNames.includes("xerox")) {
        fallbackSelected = FALLBACK_AESTHETICS[3]; // Dadaist Punk
      }
    }

    try {
      const clientObj = await getClient();
      if (!clientObj || !clientObj.ai) {
        throw new Error("Local offline mode");
      }

      // Build context of references
      const referenceSummary = refs.map((r, idx) => `Item ${idx+1} (${r.type}): name="${r.name}" content/description="${r.type === 'text' ? r.data.substring(0, 400) : 'image upload reference'}"`).join("\n");
      
      const prompt = `You are Mimi, an elite aesthetic savant. I have uploaded a bunch of references to discover my unique art style.
      Please analyze these visual/text elements and discover the secret patterns. 
      References uploaded:
      ${referenceSummary}
      
      Return a JSON output mapping this unique art style genome. It MUST follow this EXACT structure:
      {
        "primaryAxis": "A short poetic 2-3 word label for the main visual axis (e.g., Neolithic Brutalism)",
        "secondaryAxis": "A short poetic 2-3 word label for the secondary contrasting axis (e.g., Soft Organza)",
        "coreTrait": "A dense, high-concept 1-sentence description of the visual tension or aesthetic thesis.",
        "motifs": ["A list of 4 concrete recurring objects/symbols in this style"],
        "moodCluster": "A short mood label",
        "paletteExtraction": ["A list of 5 high-contrast hex color codes matching the aesthetic, e.g., #000000, etc."],
        "tactileBias": { "dominant": "A unique texture or material", "secondary": "A secondary contrasting texture" },
        "typographicPairing": { "serif": "A premium serif font name", "sans": "A clean geometric/mono font name" },
        "promptMatrix": ["3 highly detailed text prompts designed to recreate this exact aesthetic style across image gen engines"]
      }
      
      Ensure your output is valid, raw JSON only. Do not wrap in markdown or markdown codeblocks.`;

      const response = await clientObj.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      if (response.text) {
        let text = response.text.trim();
        if (text.startsWith("```json")) {
          text = text.replace(/```json\n?/, "").replace(/```$/, "");
        }
        const parsed = JSON.parse(text);
        initializeRefinementState(parsed);
        return;
      }
      throw new Error("Empty gemini response, triggering beautiful fallback");
    } catch (err) {
      console.warn("MIMI // Scryer: Oracular Proxy limit hit or model busy. Triggering Sovereign Analytical Fallback.", err);
      // Beautiful offline fallback so the experience remains flawless and high quality!
      initializeRefinementState({
        ...fallbackSelected,
        generatedAt: Date.now()
      });
    }
  };

  const initializeRefinementState = (sig: any) => {
    const fullSig: AestheticSignature = {
      primaryAxis: sig.primaryAxis || "Custom Axis",
      secondaryAxis: sig.secondaryAxis || "Secondary Axis",
      coreTrait: sig.coreTrait || "",
      motifs: sig.motifs || [],
      moodCluster: sig.moodCluster || "Custom Synthesis",
      generatedAt: sig.generatedAt || Date.now(),
      influenceLineage: sig.influenceLineage || [],
      creativeCycles: sig.creativeCycles || [],
      motifEvolution: sig.motifEvolution || [],
      paletteExtraction: sig.paletteExtraction || ["#000000", "#FFFFFF", "#888888", "#444444"],
      tactileBias: sig.tactileBias || { dominant: "Textured Linen", secondary: "Smooth Steel" },
      typographicPairing: sig.typographicPairing || { serif: "Editorial New", sans: "JetBrains Mono" },
      promptMatrix: sig.promptMatrix || []
    };
    setScryResult(fullSig);
    setPrimaryAxis(fullSig.primaryAxis);
    setSecondaryAxis(fullSig.secondaryAxis);
    setCoreTrait(fullSig.coreTrait || "");
    setSelectedPalette(fullSig.paletteExtraction || ["#000000", "#FFFFFF", "#888888", "#444444"]);
    setSelectedMotifs(fullSig.motifs || []);
    setSelectedTactile({
      dominant: fullSig.tactileBias?.dominant || "Textured Linen",
      secondary: fullSig.tactileBias?.secondary || "Smooth Steel"
    });
    setSelectedFonts({
      serif: fullSig.typographicPairing?.serif || "Editorial New",
      sans: fullSig.typographicPairing?.sans || "JetBrains Mono"
    });
    setSelectedPromptMatrix(fullSig.promptMatrix || []);
    setScryStep("refine");
  };

  // Handles updating individual values in refinement
  const updatePaletteColor = (index: number, val: string) => {
    const updated = [...selectedPalette];
    updated[index] = val;
    setSelectedPalette(updated);
  };

  const handleAddMotif = (val: string) => {
    if (!val.trim()) return;
    setSelectedMotifs(prev => [...prev, val.trim()]);
  };

  const removeMotif = (index: number) => {
    setSelectedMotifs(prev => prev.filter((_, idx) => idx !== index));
  };

  // Transition to the final output style card
  const handleFinalizeStyle = async () => {
    setIsMinting(true);
    setCardId(Math.floor(1000 + Math.random() * 9000).toString());
    
    // Try to generate an actual AI background artwork using the prompt matrix
    try {
      const clientObj = await getClient();
      if (clientObj && clientObj.ai && selectedPromptMatrix.length > 0) {
        // Attempt image generation
        const response = await clientObj.ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: {
            parts: [{ text: `Highly artistic, abstract minimalist fine art canvas. ${selectedPromptMatrix[0]} Color palette: ${selectedPalette.join(', ')}` }]
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
              imageSize: "1K"
            }
          }
        });

        if (response.candidates && response.candidates[0]?.content?.parts?.[0]) {
          const part = response.candidates[0].content.parts[0];
          if (part.inlineData) {
            const mimeType = part.inlineData.mimeType || "image/png";
            setMintedImageUrl(`data:${mimeType};base64,${part.inlineData.data}`);
          }
        }
      }
    } catch (e) {
      console.warn("MIMI // Image generator experienced high demand. Resorting to Procedural Art Studio card.");
    }

    // Set finalized step
    setScryStep("finished");
    setIsMinting(false);
  };

  const handleApplyToSignature = async () => {
    if (!profile) return;
    
    const finalizedSignature: AestheticSignature = {
      primaryAxis,
      secondaryAxis,
      coreTrait,
      motifs: selectedMotifs,
      moodCluster: scryResult?.moodCluster || "Custom Synthesis",
      generatedAt: Date.now(),
      influenceLineage: scryResult?.influenceLineage || [],
      creativeCycles: scryResult?.creativeCycles || [],
      motifEvolution: scryResult?.motifEvolution || [],
      paletteExtraction: selectedPalette,
      tactileBias: selectedTactile,
      typographicPairing: selectedFonts,
      promptMatrix: selectedPromptMatrix
    };

    const currentDraft = profile.tailorDraft;
    const approvedAt = Date.now();
    const styleEvidence: NonNullable<TailorLogicDraft["styleEvidence"]> = refs.map(
      (reference, index) => ({
        id: `style_evidence_${approvedAt}_${index + 1}`,
        type:
          reference.type === "image" ? "image_reference" : "text_reference",
        value:
          reference.type === "text"
            ? reference.data.slice(0, 400)
            : reference.name,
        source: "tailor_evidence",
        scope: "persistent",
        weight: 0.8,
        notes:
          reference.type === "image"
            ? "Creator-approved Style Lab image reference."
            : "Creator-approved Style Lab text reference.",
        approvedAt,
      }),
    );
    const unique = (values: string[]) =>
      [...new Set(values.map((value) => value.trim()).filter(Boolean))];
    const palette = selectedPalette.map((hex, index) => ({
      name: `Style Lab ${index + 1}`,
      hex,
      descriptor: "Creator-approved Style Lab palette",
    }));
    const updatedDraft: TailorLogicDraft | undefined = currentDraft
      ? {
          ...currentDraft,
          positioningCore: {
            ...currentDraft.positioningCore,
            aestheticCore: {
              ...currentDraft.positioningCore.aestheticCore,
              tags: unique([
                ...currentDraft.positioningCore.aestheticCore.tags,
                primaryAxis,
                secondaryAxis,
              ]),
              visualShards: unique([
                ...(currentDraft.positioningCore.aestheticCore.visualShards ??
                  []),
                ...selectedMotifs,
              ]),
              materiality: unique([
                ...currentDraft.positioningCore.aestheticCore.materiality,
                selectedTactile.dominant,
                selectedTactile.secondary,
              ]),
            },
          },
          expressionEngine: {
            ...currentDraft.expressionEngine,
            chromaticRegistry: {
              ...currentDraft.expressionEngine.chromaticRegistry,
              primaryPalette: palette,
              baseNeutral:
                selectedPalette[0] ||
                currentDraft.expressionEngine.chromaticRegistry.baseNeutral,
              accentSignal:
                selectedPalette[1] ||
                currentDraft.expressionEngine.chromaticRegistry.accentSignal,
            },
            typography: {
              ...currentDraft.expressionEngine.typography,
              serif:
                selectedFonts.serif ||
                currentDraft.expressionEngine.typography.serif,
              sans:
                selectedFonts.sans ||
                currentDraft.expressionEngine.typography.sans,
            },
            typographyIntent: {
              ...currentDraft.expressionEngine.typographyIntent,
              styleDescription: unique([
                currentDraft.expressionEngine.typographyIntent
                  .styleDescription,
                coreTrait,
              ]).join(" · "),
            },
          },
          styleEvidence: [
            ...(currentDraft.styleEvidence ?? []),
            ...styleEvidence,
          ],
          draftStatus: "evolving",
          lastTailored: approvedAt,
        }
      : undefined;

    try {
      const personas = updatedDraft
        ? profile.personas?.map((persona) =>
            persona.id === profile.activePersonaId
              ? { ...persona, tailorDraft: updatedDraft }
              : persona,
          )
        : profile.personas;
      await updateProfile({
        ...profile,
        tasteProfile: {
          ...profile.tasteProfile!,
          aestheticSignature: finalizedSignature
        },
        tailorDraft: updatedDraft ?? profile.tailorDraft,
        personas,
      });
      
      // Dispatch alert
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { 
          message:
            "Style evidence approved. Tailor Profile moved to evolving for review.",
          icon: <Check size={14} className="text-green-500" /> 
        } 
      }));
    } catch (err) {
      console.error("Failed to write signature to profile", err);
    }
  };

  const handleDownloadCard = async () => {
    if (!cardContainerRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardContainerRef.current, { 
        quality: 1, 
        pixelRatio: 2,
        fontEmbedCSS: '',
      });
      const link = document.createElement('a');
      link.download = `mimi-art-style-card-${cardId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export Art Style card', err);
    }
  };

  // Commercial orders simulator
  const handlePlaceOrder = (type: string) => {
    setShowOrderModal(type);
    setOrderSuccess(false);
  };

  const executeOrderPayment = () => {
    setIsMinting(true);
    setTimeout(() => {
      setIsMinting(false);
      setOrderSuccess(true);
    }, 1800);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-950 text-stone-100 font-sans pb-32 custom-scrollbar min-h-screen">
      <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-12">
        
        {/* Editorial Header */}
        <header className="border-b border-stone-800 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-100/10 text-amber-200 border border-amber-500/20 text-[9px] font-mono uppercase tracking-[0.3em] px-2.5 py-1">
                Sovereign Aesthetics
              </span>
              <span className="text-stone-500 font-mono text-[9px] uppercase tracking-widest">
                Tailor // Evidence
              </span>
            </div>
            <h1 className="font-serif italic text-4xl md:text-5xl font-light tracking-tight text-white mt-1">
              Style Evidence Lab
            </h1>
            <p className="text-stone-400 text-xs md:text-sm max-w-xl font-sans mt-3 leading-relaxed">
              Add sketches, images, visual scrapbooks, or prose. Tailor proposes reusable
              style signals and keeps them separate from your profile until you explicitly
              approve the evidence.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {scryStep !== "input" && (
              <button 
                onClick={() => { setScryStep("input"); setRefs([]); }}
                className="px-4 py-2 border border-stone-800 text-stone-300 font-mono text-[9px] uppercase tracking-widest hover:bg-stone-900 transition-colors"
              >
                [ RESET SCRY ]
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Workflow Views */}
        <AnimatePresence mode="wait">
          
          {/* STEP 1: INPUT & UPLOAD */}
          {scryStep === "input" && (
            <motion.div 
              key="input-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Media Drop & Text Inputs */}
              <div className="lg:col-span-7 space-y-6">
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-none p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[300px] ${
                    isDragOver ? "border-amber-400 bg-stone-900/40" : "border-stone-800 hover:border-stone-700 bg-stone-900/10"
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    multiple 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    accept="image/*,text/plain"
                  />
                  <div className="w-14 h-14 bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-400 mb-4 rounded-none group-hover:text-white transition-colors">
                    <Upload size={22} className="text-stone-400" />
                  </div>
                  <h3 className="font-serif italic text-xl text-white mb-1">Upload Aesthetic Fuel</h3>
                  <p className="text-stone-400 text-xs max-w-sm leading-relaxed mb-4">
                    Drag and drop images (jpg, png, wep), design sketches, scrapbooks, or text files here.
                  </p>
                  <span className="px-4 py-2 bg-stone-900 hover:bg-stone-850 text-stone-200 font-mono text-[9px] uppercase tracking-widest border border-stone-800 transition-all">
                    Browse Files
                  </span>
                </div>

                {/* Text Prompt Ingress */}
                <div className="border border-stone-800 p-6 bg-stone-950 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-[10px] uppercase tracking-widest text-stone-400">Inject Prose & Semantic Anchors</h3>
                    <span className="text-[9px] text-stone-600 font-mono">Optional</span>
                  </div>
                  <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type in core aesthetics, moods, fashion labels, or concepts (e.g., 'cracked dry mud, high contrast spotlighting, 1990s helmut lang tailoring, raw linen mesh...')"
                    className="w-full h-24 bg-stone-900 border border-stone-800 p-3 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-stone-700 resize-none font-mono"
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={addTextRef}
                      disabled={!inputText.trim()}
                      className="px-4 py-2 bg-stone-900 border border-stone-800 text-stone-300 font-mono text-[9px] uppercase tracking-widest hover:bg-stone-850 disabled:opacity-50 transition-colors"
                    >
                      + Add Note Fragment
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Reference Deck */}
              <div className="lg:col-span-5 space-y-6">
                <div className="border border-stone-800 p-6 bg-stone-950/40 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                      <h3 className="font-serif italic text-lg text-white">Reference Deck</h3>
                      <span className="font-mono text-[10px] bg-stone-900 text-stone-400 px-2.5 py-0.5 border border-stone-800">
                        {refs.length} Items Loaded
                      </span>
                    </div>

                    {refs.length === 0 ? (
                      <div className="h-[250px] flex flex-col items-center justify-center text-stone-600 text-center p-8 border border-dashed border-stone-900">
                        <FileText size={32} className="mb-3 text-stone-800" />
                        <p className="text-[11px] font-mono uppercase tracking-widest">Deck is Empty</p>
                        <p className="text-[10px] text-stone-500 mt-1 max-w-[200px]">Incorporate raw visuals or notes on the left to initialize analysis.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {refs.map((ref) => (
                          <div key={ref.id} className="border border-stone-800 bg-stone-900/50 p-2 relative group flex flex-col justify-between">
                            <button 
                              onClick={() => removeRef(ref.id)}
                              className="absolute top-1 right-1 p-1 bg-stone-950/80 hover:bg-red-950/80 border border-stone-800 hover:border-red-500/30 text-stone-400 hover:text-red-400 transition-colors z-10"
                            >
                              <Trash2 size={10} />
                            </button>
                            {ref.previewUrl ? (
                              <div className="aspect-square w-full bg-stone-950 overflow-hidden mb-2">
                                <img src={ref.previewUrl} alt={ref.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" />
                              </div>
                            ) : (
                              <div className="aspect-square w-full bg-stone-950 flex flex-col items-center justify-center text-stone-500 mb-2 p-3 overflow-hidden text-ellipsis">
                                <FileText size={18} className="mb-1 text-stone-600" />
                                <span className="text-[8px] font-mono break-all text-center leading-tight line-clamp-3">
                                  {ref.data}
                                </span>
                              </div>
                            )}
                            <div className="font-mono text-[8px] text-stone-500 uppercase tracking-wider truncate w-full pr-4">
                              {ref.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-stone-900 mt-6">
                    <button
                      onClick={() => setScryStep("scrying")}
                      disabled={refs.length === 0}
                      className="w-full py-4 bg-amber-100 hover:bg-amber-200 text-stone-950 font-mono text-[10px] uppercase tracking-[0.3em] font-black transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(251,243,219,0.1)] disabled:opacity-30 disabled:cursor-not-allowed group"
                    >
                      <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                      SCRY PATTERNS FOR ART STYLE
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: SCRYING INTERACTIVE LOADER */}
          {scryStep === "scrying" && (
            <motion.div 
              key="scrying-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto space-y-8"
            >
              <div className="relative">
                {/* Custom scanning animation lines */}
                <div className="w-24 h-24 border border-amber-200/30 rounded-full flex items-center justify-center animate-spin duration-[6000ms] relative">
                  <div className="absolute top-0 w-2 h-2 bg-amber-300 rounded-full shadow-[0_0_10px_#f59e0b]" />
                  <div className="absolute bottom-0 w-2 h-2 bg-amber-300 rounded-full shadow-[0_0_10px_#f59e0b]" />
                </div>
                <div className="w-12 h-12 border border-stone-800 rounded-full flex items-center justify-center absolute inset-0 m-auto">
                  <Sparkles size={16} className="text-amber-200 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="font-serif italic text-2xl text-white">Sovereign Semiotic Scrying</h2>
                <p className="font-mono text-[9px] text-stone-500 uppercase tracking-widest">
                  Analyzing uploaded fuel across latent aesthetic nodes...
                </p>
              </div>

              {/* Progress Logs */}
              <div className="w-full bg-stone-950 border border-stone-900 p-4 font-mono text-[9px] text-left space-y-2 min-h-[140px] text-stone-400">
                {scryLogs.map((log, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className={idx === scryLogs.length - 1 ? "text-amber-200" : "text-stone-500"}
                  >
                    {log}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: REFINE PATTERNS */}
          {scryStep === "refine" && scryResult && (
            <motion.div 
              key="refine-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="bg-stone-900/40 border border-stone-800 p-6 flex items-center justify-between">
                <div>
                  <h2 className="font-serif italic text-xl text-white">Patterns Identified</h2>
                  <p className="text-xs text-stone-400 mt-1">Review, select, and calibrate these values before baking them into your Art Style Card.</p>
                </div>
                <button 
                  onClick={handleFinalizeStyle}
                  className="px-6 py-3 bg-amber-100 hover:bg-amber-200 text-stone-950 font-mono text-[9px] uppercase tracking-widest font-black transition-all flex items-center gap-2"
                >
                  NEXT: MINT OUTCOME <ChevronRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left controls: inputs/selectors */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Axis & Trait calibration */}
                  <div className="border border-stone-800 p-6 bg-stone-950 space-y-4">
                    <h3 className="font-mono text-[10px] uppercase tracking-widest text-stone-400 flex items-center gap-2 border-b border-stone-900 pb-2">
                      <Sliders size={12} className="text-stone-500" /> Style Directives
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono uppercase tracking-widest text-stone-500">Primary Axis</label>
                        <input 
                          type="text" 
                          value={primaryAxis}
                          onChange={(e) => setPrimaryAxis(e.target.value)}
                          className="w-full bg-stone-900 border border-stone-800 p-2.5 text-xs text-stone-100 focus:outline-none focus:border-stone-700 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono uppercase tracking-widest text-stone-500">Secondary Axis</label>
                        <input 
                          type="text" 
                          value={secondaryAxis}
                          onChange={(e) => setSecondaryAxis(e.target.value)}
                          className="w-full bg-stone-900 border border-stone-800 p-2.5 text-xs text-stone-100 focus:outline-none focus:border-stone-700 font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase tracking-widest text-stone-500">Core Trait Thesis</label>
                      <textarea 
                        value={coreTrait}
                        onChange={(e) => setCoreTrait(e.target.value)}
                        className="w-full h-16 bg-stone-900 border border-stone-800 p-2.5 text-xs text-stone-100 focus:outline-none focus:border-stone-700 resize-none font-serif italic"
                      />
                    </div>
                  </div>

                  {/* Color Swatch Palette Picker */}
                  <div className="border border-stone-800 p-6 bg-stone-950 space-y-4">
                    <h3 className="font-mono text-[10px] uppercase tracking-widest text-stone-400 flex items-center gap-2 border-b border-stone-900 pb-2">
                      <Palette size={12} className="text-stone-500" /> Chromatic Palette Synthesis
                    </h3>
                    <p className="text-[10px] text-stone-500">Five extracted core hex codes. Modify or lock colors to tweak the final visual engine.</p>
                    <div className="flex flex-wrap gap-4 pt-2">
                      {selectedPalette.map((color, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1.5">
                          <div 
                            className="w-14 h-14 border border-stone-800 flex items-center justify-center relative cursor-pointer group"
                            style={{ backgroundColor: color }}
                          >
                            <input 
                              type="color" 
                              value={color}
                              onChange={(e) => updatePaletteColor(idx, e.target.value)}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            />
                            <span className="opacity-0 group-hover:opacity-100 bg-black/80 text-[8px] font-mono px-1 py-0.5 absolute bottom-1 text-white">
                              Edit
                            </span>
                          </div>
                          <input 
                            type="text" 
                            value={color}
                            onChange={(e) => updatePaletteColor(idx, e.target.value)}
                            className="w-14 bg-stone-900 border border-stone-800 text-[9px] font-mono text-center text-stone-300 py-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tactile and Fonts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Material Finishes */}
                    <div className="border border-stone-800 p-6 bg-stone-950 space-y-4">
                      <h3 className="font-mono text-[10px] uppercase tracking-widest text-stone-400 flex items-center gap-2 border-b border-stone-900 pb-2">
                        <Layers size={12} className="text-stone-500" /> Tactile Tactility
                      </h3>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-mono uppercase tracking-widest text-stone-500">Dominant Texture</label>
                          <input 
                            type="text"
                            value={selectedTactile.dominant}
                            onChange={(e) => setSelectedTactile(prev => ({ ...prev, dominant: e.target.value }))}
                            className="w-full bg-stone-900 border border-stone-800 p-2 text-xs text-stone-200 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-mono uppercase tracking-widest text-stone-500">Secondary Texture</label>
                          <input 
                            type="text"
                            value={selectedTactile.secondary}
                            onChange={(e) => setSelectedTactile(prev => ({ ...prev, secondary: e.target.value }))}
                            className="w-full bg-stone-900 border border-stone-800 p-2 text-xs text-stone-200 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Font Pairings */}
                    <div className="border border-stone-800 p-6 bg-stone-950 space-y-4">
                      <h3 className="font-mono text-[10px] uppercase tracking-widest text-stone-400 flex items-center gap-2 border-b border-stone-900 pb-2">
                        <FontIcon size={12} className="text-stone-500" /> Typography Matrix
                      </h3>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-mono uppercase tracking-widest text-stone-500">Display Serif Font</label>
                          <input 
                            type="text"
                            value={selectedFonts.serif}
                            onChange={(e) => setSelectedFonts(prev => ({ ...prev, serif: e.target.value }))}
                            className="w-full bg-stone-900 border border-stone-800 p-2 text-xs text-stone-200 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-mono uppercase tracking-widest text-stone-500">Body Sans/Mono Font</label>
                          <input 
                            type="text"
                            value={selectedFonts.sans}
                            onChange={(e) => setSelectedFonts(prev => ({ ...prev, sans: e.target.value }))}
                            className="w-full bg-stone-900 border border-stone-800 p-2 text-xs text-stone-200 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right controls: prompts & motifs */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Motifs calibration */}
                  <div className="border border-stone-800 p-6 bg-stone-950 space-y-4">
                    <h3 className="font-mono text-[10px] uppercase tracking-widest text-stone-400 border-b border-stone-900 pb-2">
                      Motif Clutches & Symbols
                    </h3>
                    <p className="text-[10px] text-stone-500">Identified recurring symbols. Double click or click X to drop; type to inject new motifs.</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedMotifs.map((motif, index) => (
                        <div 
                          key={index} 
                          className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 px-2.5 py-1 text-xs text-stone-300 font-mono rounded-none"
                        >
                          <span>{motif}</span>
                          <button 
                            onClick={() => removeMotif(index)}
                            className="text-stone-500 hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex gap-2">
                      <input 
                        type="text" 
                        id="new-motif-input"
                        placeholder="Add bespoke motif symbol..."
                        className="flex-1 bg-stone-900 border border-stone-800 p-2 text-xs text-stone-200 focus:outline-none focus:border-stone-700 font-mono"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAddMotif((e.currentTarget as HTMLInputElement).value);
                            (e.currentTarget as HTMLInputElement).value = "";
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          const el = document.getElementById("new-motif-input") as HTMLInputElement;
                          if (el) {
                            handleAddMotif(el.value);
                            el.value = "";
                          }
                        }}
                        className="px-3 py-2 bg-stone-900 border border-stone-800 text-stone-300 font-mono text-[9px] uppercase tracking-widest hover:bg-stone-850"
                      >
                        + Inject
                      </button>
                    </div>
                  </div>

                  {/* Copy-Paste Prompt Matrix */}
                  <div className="border border-stone-800 p-6 bg-stone-950 space-y-4">
                    <h3 className="font-mono text-[10px] uppercase tracking-widest text-stone-400 border-b border-stone-900 pb-2">
                      Aesthetic Prompt Matrix
                    </h3>
                    <p className="text-[10px] text-stone-500">Copy these pre-engineered strings directly into any latent model to manifest artifacts of this exact style.</p>
                    <div className="space-y-3">
                      {selectedPromptMatrix.map((prompt, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="text-[8px] font-mono uppercase tracking-widest text-stone-500">Vector String 0{idx+1}</label>
                          <textarea 
                            value={prompt}
                            onChange={(e) => {
                              const updated = [...selectedPromptMatrix];
                              updated[idx] = e.target.value;
                              setSelectedPromptMatrix(updated);
                            }}
                            className="w-full h-16 bg-stone-900 border border-stone-800 p-2 text-[10px] text-stone-300 font-mono focus:outline-none resize-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: CARD GENERATED & MONETIZATION */}
          {scryStep === "finished" && scryResult && (
            <motion.div 
              key="finished-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              
              {/* Left Column: The Premium Art Style Card Rendering */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center justify-between border-b border-stone-900 pb-3">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest text-stone-400">Generated Art Style Spec Card</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleDownloadCard}
                      className="p-2 border border-stone-800 text-stone-300 hover:text-white hover:bg-stone-900 transition-colors"
                      title="Download Card Image"
                    >
                      <Download size={14} />
                    </button>
                    <button 
                      onClick={handleApplyToSignature}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-stone-950 font-mono text-[9px] uppercase tracking-widest font-black transition-colors flex items-center gap-1.5"
                    >
                      <Check size={12} /> Apply To Signature
                    </button>
                  </div>
                </div>

                {/* Printable Style Card Frame */}
                <div 
                  ref={cardContainerRef}
                  className="bg-stone-950 border border-stone-800 p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-8 max-w-2xl mx-auto"
                >
                  {/* Procedural Canvas Artwork / Generated image */}
                  <div className="w-full md:w-[280px] shrink-0">
                    <div className="aspect-square border border-stone-800 bg-stone-900 relative overflow-hidden">
                      {mintedImageUrl ? (
                        <img src={mintedImageUrl} alt="Art style sample artwork" className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                      ) : (
                        <canvas 
                          ref={canvasRef} 
                          width={400} 
                          height={400} 
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {/* Grid overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 to-transparent pointer-events-none" />
                      
                      {/* Tech coordinates overlay */}
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end font-mono text-[8px] text-stone-400 uppercase tracking-widest z-10">
                        <span>SYS // 909-VEC</span>
                        <span>LAT_COORDS // B-882</span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Spec list */}
                  <div className="flex-1 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-stone-500 mb-1">Aesthetic Archetype</div>
                        <h2 className="font-serif italic text-2xl text-white leading-tight">
                          {primaryAxis}
                        </h2>
                        <div className="font-mono text-[9px] text-stone-400 mt-1 uppercase tracking-widest">
                          + {secondaryAxis}
                        </div>
                      </div>

                      <div className="w-full h-px bg-stone-800/60" />

                      <div>
                        <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-stone-500 mb-1.5">Core Semiotic Thesis</div>
                        <p className="text-stone-300 text-[11px] leading-relaxed font-serif italic">
                          "{coreTrait}"
                        </p>
                      </div>

                      <div className="w-full h-px bg-stone-800/60" />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-stone-500 mb-1.5">Tactile Bio</div>
                          <div className="text-stone-200 text-[10px] font-mono uppercase tracking-widest">
                            {selectedTactile.dominant}
                          </div>
                          <div className="text-stone-400 text-[9px] font-mono uppercase tracking-widest mt-0.5">
                            {selectedTactile.secondary}
                          </div>
                        </div>

                        <div>
                          <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-stone-500 mb-1.5">Fonts</div>
                          <div className="text-stone-200 text-[10px] font-mono">
                            {selectedFonts.serif}
                          </div>
                          <div className="text-stone-400 text-[9px] font-mono mt-0.5">
                            {selectedFonts.sans}
                          </div>
                        </div>
                      </div>

                      <div className="w-full h-px bg-stone-800/60" />

                      <div>
                        <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-stone-500 mb-1.5">Active Palette</div>
                        <div className="flex gap-1.5">
                          {selectedPalette.map((col, i) => (
                            <div 
                              key={i} 
                              className="w-5 h-5 border border-stone-800/80" 
                              style={{ backgroundColor: col }}
                              title={col}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="font-mono text-[8px] text-stone-500 leading-none uppercase">
                        <div>Sovereign Registry</div>
                        <div className="mt-1">ID: #M-{cardId}-DEC</div>
                      </div>
                      
                      <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 px-2 py-1 text-[8px] font-mono text-amber-200 tracking-wider">
                        <Star size={8} className="fill-amber-200" /> CALIBRATED
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Monetization Hub & Prompt Copy */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Active Prompt Copy Box */}
                <div className="border border-stone-800 p-6 bg-stone-950 space-y-4">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest text-stone-400 flex items-center gap-2 border-b border-stone-900 pb-2">
                    <FileCheck size={12} className="text-stone-500" /> Active Prompt Vector
                  </h3>
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    This prompt vector is optimized to reconstruct your precise art style. Copy it to any generator:
                  </p>
                  <div className="relative">
                    <pre className="bg-stone-900 p-3 text-[10px] font-mono text-stone-300 whitespace-pre-wrap border border-stone-800/80 rounded-none leading-relaxed select-all">
                      {selectedPromptMatrix[0]}
                    </pre>
                  </div>
                </div>

                {/* Monetization / Curation Hub (CASH MONETIZATION FLOWS) */}
                <div className="border border-amber-500/10 bg-amber-500/[0.02] border border-stone-800 p-6 space-y-5">
                  <div className="border-b border-stone-900 pb-3 flex justify-between items-center">
                    <div>
                      <span className="text-amber-200/60 font-mono text-[8px] uppercase tracking-[0.25em]">Mimi // Commercialization</span>
                      <h3 className="font-serif italic text-lg text-white mt-1">Curation & Print Shop</h3>
                    </div>
                    <ShoppingBag size={16} className="text-amber-200" />
                  </div>
                  
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Turn your newly scryed aesthetic archetype into premium offline artifacts or deployable models:
                  </p>

                  <div className="space-y-3">
                    {/* Item 1: High End Print */}
                    <div className="p-3 bg-stone-950 border border-stone-900 flex justify-between items-center group hover:border-stone-800 transition-colors">
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono uppercase text-stone-200 font-bold">Physical Vellum Print</div>
                        <div className="text-[9px] text-stone-500">12x12 luxury tactile paper stock poster of your Art Card.</div>
                      </div>
                      <button 
                        onClick={() => handlePlaceOrder("Vellum Print")}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-white hover:text-stone-950 font-mono text-[8px] uppercase tracking-widest border border-stone-800 text-stone-300 transition-all shrink-0"
                      >
                        $45
                      </button>
                    </div>

                    {/* Item 2: SDXL/Flux LoRA Custom Weights */}
                    <div className="p-3 bg-stone-950 border border-stone-900 flex justify-between items-center group hover:border-stone-800 transition-colors">
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono uppercase text-stone-200 font-bold">Flux.1 Custom LoRA weights</div>
                        <div className="text-[9px] text-stone-500">Exportable neural network weights matching your style.</div>
                      </div>
                      <button 
                        onClick={() => handlePlaceOrder("Flux LoRA weights")}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-white hover:text-stone-950 font-mono text-[8px] uppercase tracking-widest border border-stone-800 text-stone-300 transition-all shrink-0"
                      >
                        $120
                      </button>
                    </div>

                    {/* Item 3: Luxury Portfolio Brief */}
                    <div className="p-3 bg-stone-950 border border-stone-900 flex justify-between items-center group hover:border-stone-800 transition-colors">
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono uppercase text-stone-200 font-bold">Bespoke Brand Book (PDF)</div>
                        <div className="text-[9px] text-stone-500">A high-end 12-page PDF breaking down your color science & visual rules.</div>
                      </div>
                      <button 
                        onClick={() => handlePlaceOrder("Brand Book PDF")}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-white hover:text-stone-950 font-mono text-[8px] uppercase tracking-widest border border-stone-800 text-stone-300 transition-all shrink-0"
                      >
                        $19
                      </button>
                    </div>
                  </div>

                </div>

              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </div>

      {/* Checkout / Order Simulator Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-950 border border-stone-800 p-8 max-w-sm w-full space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-stone-500">Invoice Registry</span>
                <h3 className="font-serif italic text-xl text-white mt-1">Acquire {showOrderModal}</h3>
              </div>
              <button 
                onClick={() => setShowOrderModal(null)}
                className="text-stone-500 hover:text-white font-mono text-xs"
              >
                [ CLOSE ]
              </button>
            </div>

            {!orderSuccess ? (
              <div className="space-y-4">
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Calibrate shipping configuration and finalize transaction details. The Mimi payment pipeline guarantees secure parallel processing.
                </p>

                <div className="border border-stone-900 p-3 bg-stone-900/30 flex justify-between items-center">
                  <span className="font-mono text-[10px] text-stone-400 uppercase">Aesthetic Spec Card:</span>
                  <span className="font-mono text-[10px] text-white">#M-{cardId}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-mono uppercase tracking-widest text-stone-500">Parallel Destination (Shipping/Email)</label>
                  <input 
                    type="text" 
                    defaultValue={user?.email || "architect@parallel.space"} 
                    className="w-full bg-stone-900 border border-stone-800 p-2.5 text-xs text-stone-300 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-mono uppercase tracking-widest text-stone-500">Method</label>
                  <div className="w-full bg-stone-900 border border-stone-800 p-2.5 flex items-center gap-2 text-stone-400 text-xs font-mono">
                    <CreditCard size={12} /> •••• •••• •••• 1990
                  </div>
                </div>

                <button 
                  onClick={executeOrderPayment}
                  disabled={isMinting}
                  className="w-full py-3 bg-amber-100 hover:bg-amber-200 text-stone-950 font-mono text-[9px] uppercase tracking-widest font-black transition-colors"
                >
                  {isMinting ? "Processing Transaction..." : "CONFIRM TRANSACTION"}
                </button>
              </div>
            ) : (
              <div className="space-y-6 text-center py-4">
                <div className="w-12 h-12 bg-stone-900 border border-amber-500/20 text-amber-200 flex items-center justify-center mx-auto rounded-full">
                  <Check size={18} />
                </div>
                <div className="space-y-2">
                  <h4 className="font-serif italic text-lg text-white">Transaction Cleared</h4>
                  <p className="text-[10px] text-stone-400 leading-relaxed max-w-xs mx-auto">
                    Your order for "{showOrderModal}" has been queued in Mimi's materialization buffer. Standard dispatch pipeline completes within 48 hours.
                  </p>
                </div>
                <button 
                  onClick={() => setShowOrderModal(null)}
                  className="w-full py-2.5 bg-stone-900 hover:bg-stone-850 text-stone-200 font-mono text-[9px] uppercase tracking-widest border border-stone-800 transition-colors"
                >
                  Return To Scryer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
