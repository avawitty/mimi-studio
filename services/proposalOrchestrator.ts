
import { Proposal, ProposalSection, EditorElement, UserProfile, PocketItem } from "../types";
import { generateProposalStrategy, refineProposalText } from "./geminiService";
import { saveProposal, fetchPocketItems } from "./firebaseUtils";

/**
 * PROPOSAL ORCHESTRATOR
 * The central brain for converting unstructured folder data into 
 * structured, first-class Proposal objects.
 */

interface ProposalGenerationConfig {
  userId: string;
  folderId?: string; // Optional if sourceItems provided
  sourceItems?: PocketItem[]; // New: Allow direct injection
  selectedPreset: string;
  selectedModules: string[];
  profile: UserProfile | null;
  folderName?: string; // Fallback name
  notes?: string; // Fallback notes
}

export const generateProposalFromFolder = async (
  config: ProposalGenerationConfig
): Promise<Proposal> => {
  
  let sourceItems: PocketItem[] = [];
  let folderName = config.folderName || "Untitled Strategy";
  let baseNotes = config.notes || "";

  // 1. FETCH ARTIFACTS
  if (config.sourceItems && config.sourceItems.length > 0) {
      // Manual Selection / Direct Folder Injection Path
      sourceItems = config.sourceItems;
  } else if (config.folderId) {
      // Folder Registry Path
      const allItems = await fetchPocketItems(config.userId);
      // We assume folders are stored as 'moodboard' items in the pocket for now, 
      // or we resolve the folder logic if using a separate collection.
      // Based on existing architecture, we look for the moodboard item.
      const folderItem = allItems.find(i => i.id === config.folderId && i.type === 'moodboard');
      
      if (!folderItem) {
          // Fallback: If folderId passed isn't a moodboard item but just a filter ID, we might need other logic.
          // For now, assume strict moodboard item ID.
          throw new Error("Source Folder Logic Corrupted.");
      }

      const folderItemIds = folderItem.content.itemIds || [];
      sourceItems = allItems.filter(i => folderItemIds.includes(i.id));
      folderName = folderItem.content.name || folderName;
      baseNotes = folderItem.notes || baseNotes;
  } else {
      throw new Error("No source data provided for proposal assembly.");
  }

  // 2. PRE-PROCESS ITEMS TO EXTRACT ZINE CONTEXT
  // If artifacts are Zines (zine_card), we extract their high-level strategy to inform the deck.
  let zineContext = "";
  
  sourceItems.forEach(item => {
      if (item.type === 'zine_card' && item.content?.analysis) {
          const zTitle = item.content.title;
          const zBrief = item.content.analysis.design_brief || item.content.analysis.strategic_hypothesis;
          const zProvocation = item.content.analysis.poetic_provocation;
          
          zineContext += `\n[REFERENCED ZINE: "${zTitle}"]\nSTRATEGIC HYPOTHESIS: ${zBrief}\nPROVOCATION: ${zProvocation}\n`;
      }
  });

  // Combine notes
  const fullNotes = `${baseNotes}\n\n${zineContext}`;

  const presetMap: Record<string, string> = {
    'creative_brief': 'Creative Brief',
    'market_analysis': 'Market Analysis',
    'product_proposal': 'Product Proposal',
    'campaign_strategy': 'Campaign Strategy',
    'portfolio_case': 'Portfolio Case Study',
    'reflection': 'Reflection Report'
  };
  
  const proposalType = presetMap[config.selectedPreset] || "Strategic Proposal";

  // 3. GENERATE RAW STRATEGY FROM ORACLE
  // This calls the Gemini Service to get a structured JSON of chapters/slides
  const strategyResponse = await generateProposalStrategy(
    folderName,
    sourceItems,
    fullNotes,
    config.profile,
    proposalType
  );

  // Fallback construction if chapters array is missing but summary exists (resilience)
  if ((!strategyResponse || !strategyResponse.chapters) && strategyResponse?.manifesto_summary) {
      console.warn("MIMI // Proposal Partial Fail: Reconstructing from Summary");
      strategyResponse.chapters = [
          {
              title: "Strategic Summary",
              body: strategyResponse.manifesto_summary,
              visual_directive: "Abstract minimal layout representing clarity"
          }
      ];
  } else if (!strategyResponse || !strategyResponse.chapters) {
      throw new Error("Oracle failed to structure the proposal.");
  }

  // 4. TRANSFORM RAW AI OUTPUT INTO EDITOR ELEMENTS
  const sections: ProposalSection[] = strategyResponse.chapters.map((chap: any, i: number) => {
    const slideId = `slide_${i}_${Date.now()}`;
    const elements: EditorElement[] = [];

    // Title Block
    elements.push({
      id: `${slideId}_title`,
      type: 'text',
      content: chap.title,
      style: { 
        top: 10, left: 8, width: 40, zIndex: 10, 
        fontSize: 3.5, 
        fontFamily: 'serif', 
        fontWeight: '900', 
        fontStyle: 'italic',
        color: 'inherit', 
        lineHeight: 0.9, 
        textAlign: 'left',
        opacity: 1
      }
    });

    // Body Block
    elements.push({
      id: `${slideId}_body`,
      type: 'text',
      content: chap.body,
      style: { 
        top: 35, left: 8, width: 40, zIndex: 9, 
        fontSize: 1.1, 
        fontFamily: 'serif', 
        fontWeight: '400', 
        color: 'inherit', 
        lineHeight: 1.4, 
        textAlign: 'left',
        opacity: 1
      }
    });

    // Visual Directive (Latent Image Prompt placeholder)
    // In the UI, this can be swapped for a real generated image or an uploaded artifact.
    if (chap.visual_directive) {
      elements.push({
        id: `${slideId}_visual`,
        type: 'image',
        content: chap.visual_directive, // The visualizer will render this prompt if it's text
        style: {
          top: 10, left: 55, width: 40, zIndex: 5,
          objectFit: 'cover', opacity: 1
        }
      });
    }

    return {
      id: slideId,
      title: chap.title,
      body: chap.body,
      visual_directive: chap.visual_directive,
      elements,
      order: i
    };
  });

  // 5. CONSTRUCT THE SOVEREIGN OBJECT
  const proposalId = `prop_${config.userId}_${Date.now()}`;
  
  // Resolve Layout from Tailor
  const tailor = config.profile?.tailorDraft;
  const primaryFont = tailor?.expressionEngine?.typographyIntent?.styleDescription?.includes('Sans') ? 'Space Grotesk' : 'Cormorant Garamond';
  const primaryColor = tailor?.expressionEngine?.chromaticRegistry?.baseNeutral || '#FDFBF7';
  const textColor = tailor?.expressionEngine?.chromaticRegistry?.accentSignal || '#1C1917';

  const proposal: Proposal = {
    id: proposalId,
    userId: config.userId,
    title: folderName,
    sourceFolderId: config.folderId || 'manual_selection',
    sourceArtifactIds: sourceItems.map(i => i.id),
    
    content: {
      summary: strategyResponse.manifesto_summary || "Strategic Synthesis",
      analysis: "Generated via Mimi Proposal Engine",
      sections: sections
    },
    
    layout: {
      template: 'editorial',
      fontSet: [primaryFont, 'Space Grotesk'],
      colorSet: [textColor, '#A8A29E'],
      spacingScale: 1.0,
      backgroundStyle: primaryColor,
      customStyles: {}
    },
    
    brandKitSnapshot: {
      primaryFont: primaryFont,
      secondaryFont: 'Space Grotesk',
      colorPalette: tailor?.expressionEngine?.chromaticRegistry?.primaryPalette?.map(c => c.hex) || []
    },

    version: 1,
    status: 'draft',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // 6. SAVE TO REGISTRY
  await saveProposal(proposal);

  return proposal;
};

// PHASE 3: REFINEMENT ASSISTANT
// Used when the user asks the assistant to "make this punchier" etc.
export const refineSectionContent = async (
  currentText: string,
  instruction: string,
  profile: UserProfile | null
): Promise<string> => {
  return await refineProposalText(currentText, instruction, profile);
};

export const saveProposalToRegistry = async (proposal: Proposal) => {
  await saveProposal(proposal);
  return proposal.id;
};
