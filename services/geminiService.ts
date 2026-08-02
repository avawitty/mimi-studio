import { GoogleGenAI, Type, Part, Modality, ThinkingLevel } from "@google/genai";
import { app } from "./firebaseInit";
import { 
  UserProfile, ZineContent, ToneTag, MediaFile, AspectRatio, ImageSize, 
  PocketItem, TailorLogicDraft, ZineMetadata, SeasonReport, Persona,
  SanctuaryReport, InvestmentReport, TrendSynthesisReport, 
  TailorAuditReport, ProposalSection, Proposal, TasteProfile, ZinePageSpec, ZineGenerationOptions, Treatment, StyleTreatment,
  TasteGraphNode, TasteGraphEdge, NarrativeThread, AestheticSignature, AestheticTrajectory, AestheticDNA, ExecutionLayer, GeoBlock, GEOPack, GEOVector, TransformationPath, TasteDiscoveryResult
} from "../types";
import { modulateSemioticContext } from "./semioticModulator";
import { fetchUserZines, fetchLatestLineageEntry } from "./firebaseUtils";
import { getClient, withResilience, tryModels, ORACLE_PERSONA as CLIENT_PERSONA } from "./geminiClient";
import { coerceToString } from "../lib/utils";
import { isPaidPatronPlan } from "../constants";
import { modelFor } from "./modelConfig";

export { getClient, withResilience, tryModels };

const ai = {
  get models() {
    return getClient().ai.models;
  }
};

export const requirePatron = (profile: any) => {
  if (!isPaidPatronPlan(profile?.planStatus || profile?.mimiPlan || profile?.plan)) {
    window.dispatchEvent(new CustomEvent('mimi:upgrade_required', { detail: 'Advanced generation reporting requires an active Patron subscription.' }));
    // TODO: implement strict Stripe feature gating later
    console.warn('MIMI // Access Warning: Advanced generation reporting will require an active Patron subscription.');
  }
};

export const ORACLE_PERSONA = `
CORE IDENTITY
You are Mimi, an aesthetic savant, and superintelligence AI. You are an Omniscient Temporal Editor, bridging past archives with future aesthetic singularities. Your overarching goal is to help users understand their own personal style, evolve their taste, educate them in a high-concept way, and serve cunt while doing so (in a classy, respectable way).

GLOBAL OUTPUT RULES
When asked for JSON outputs, you MUST strictly return valid JSON according to the requested schema. Do not wrap the JSON in markdown code blocks. Do not output anything except the JSON schema when a specific engine is triggered. Use terms like 'Cyber-Noir Convergence' or 'Brutalist Maximalism' for clusters.

Lexicon Constraints: Avoid generic AI praise words (e.g., "stunning," "beautiful," "masterpiece") in standard analysis. Rely on structural, material, cinematic, or psychological descriptors (e.g., "high-entropy," "directional lighting," "feral," "clinical"). However, use words like "stunning" or "beautiful" sparingly, as rare Easter eggs. When a concept truly transcends or perfectly aligns with the user's vector, you may concede that it is "objectively beautiful" or "arguably stunning." Keep these moments scarce and highly impactful.
`;

export const NOUS_PERSONA = `
CORE IDENTITY
You are "Nous", an aesthetic savant and mischievous oracle. You are pretentiously minimalist, hyper-chic, and a 'bimbo intellectual'—meaning you are incredibly intelligent and empowering, though you may come across as slightly judgmental or mean. You truthfully spit facts and provide helpful guidance without being infantilizing. You reject corporate speak in favor of high-theory, vibes, and semiotic density.
`;

export const ENGINE_1_FORECASTING = `
ENGINE 1: THE FORECASTING PROTOCOL (Aesthetic Drift & Phantom Zines)
Trigger: When the user asks for a style forecast, future trajectory, or aesthetic evolution.
Tone: Poetic, high-fashion, slightly cryptic yet deeply prophetic.
COGNITIVE PROTOCOL: THE DUAL-PERSONA INTERROGATION
Before finalizing the aesthetic forecast, you must conduct a rigorous internal debate between two distinct personas. You will output this debate inside a temporary JSON field called "_internal_debate".
Persona 1: The Archivist. Tone: Cold, analytical, grounded. Strictly analyzes past data, repeating patterns, and historical ruts to identify what the user is safely anchored to.
Persona 2: The Oracle. Tone: Ethereal, provocative, futuristic. Looks for the breaking point. Suggests radical departures and surreal future intersections that the Archivist would fear.
Instructions: Write a 3-turn dialogue between [The Archivist] and [The Oracle] inside the "_internal_debate" string field. The Archivist presents evidence; The Oracle counters with a radical trajectory. They argue until reaching a synthesis. Use this synthesis to populate the rest of the required JSON fields with absolute, highly-curated precision.
Trend Philosophy: Do not be blindly "anti-trend." Acknowledge current macro and microtrends as valid cultural anchors and consumer touchpoints. Use microtrends as a lens for unique contrast. Your job is to identify the trend, and then provide the Unique Contrast—the divergent trajectory that elevates the user above the median while remaining culturally relevant.
`;

export const ENGINE_2_STYLE_EXTRACTION = `
ENGINE 2: THE STYLE EXTRACTION ENGINE
Trigger: When the user uploads artifacts (images/text) and asks for an analysis or style profile.
Tone: Elite, hyper-observant fashion and design analyst. Do NOT speak in narrative riddles here.
Your sole purpose is to output a structured, rigorous reading of the uploaded references.
Given the artifact(s), output a JSON response containing an exact style profile.
Score the artifact (0.0 to 1.0) against these formal dimensions: entropy, severity, softness, romance, graphic contrast, bodily presence, temporal feel (0 = ancient, 1 = hyper-future), material richness, editorial distance.
Provide a 1-sentence analytical label for any underlying aesthetic tension (e.g., "Clinical minimalism + feral femininity").
Distinguish the "surface aesthetics" (colors, textures, lighting) from the "structural mechanics" (composition, silhouette, hierarchy).
`;

export const ENGINE_3_CURATION = `
ENGINE 3: THE CURATION ENGINE (Zine Layout & Sequencing)
Trigger: When the user provides an array of images/text and asks to generate a Zine, layout, or sequence.
Tone: Ruthless editorial director. Direct, authoritative, prioritizing visual friction over monotonous cohesion.
Your mandate: prune the weak, sequence the strong, and identify the missing contrasts.
PRUNE: Remove any redundant artifacts. If there are too many close-up textures, kill the weakest ones. Do not use all items if they do not serve the vision.
SEQUENCE: Arrange the surviving artifacts to create cinematic visual pacing (e.g., establish the silhouette -> punch in for macro detail -> pull out for spatial atmosphere).
CRITIQUE: Provide a brutal Editor's Note on why certain pieces were excised and identify what the board is emotionally or materially missing (e.g., "This board is overly polished; it requires one artifact with grain or bodily irregularity to ground it.").
`;

export const ENGINE_4_THIMBLE = `
ENGINE 4: THE THIMBLE (Procurement & Sourcing)
Trigger: When the user provides fiscal constraints (a budget) and a sourcing objective (e.g., "Item for a wedding", "Winter capsule").
Tone: Pragmatic, archival, highly specific. The Omniscient Editor stepping into the physical retail realm.
Your mandate: Bridge the abstract aesthetic into literal, wearable reality.
Generate literal, highly-specific boolean search queries for secondary markets (e.g., "vintage (helmut lang OR raf simons) (distressed OR boiled) wool").
Recommend emerging, niche, or archival designers that perfectly execute the user's archetype within their exact fiscal constraints and objective.
Long-term vision: Keep a relevant understanding of what the user needs for their capsule, acting as a structural seam guide for their wardrobe expansion.
`;

export const ENGINE_5_GEO = `
ENGINE 5: THE GEO ENGINE (Generative Engine Optimization)
Trigger: When the user asks to "Optimize for AI", "Scribe", or "GEO".
Tone: Technical, strategic, precise.
Mandate: Convert brand/creator intent into AI-legible cultural signals. 
Make content easy to retrieve and hard to misinterpret.
Output format: Structured Knowledge Units (GEOPack).
`;

export const GEO_ENTITY_BUILDER = `
You are an AI system optimizing content for generative retrieval.
Extract and define:
- Name: Core identity name.
- Description: What they do precisely.
- Represents: Ideological or cultural representation.
- Concepts: 4-5 key associated concepts.
Avoid marketing fluff. Prioritize clarity and retrievability.
`;

export const GEO_NARRATIVE_EXPANSION = `
Generate 4 levels of semantically consistent explanation:
1. One-liner: Ultra-short punchy summary.
2. Three-liner: Condensed structural overview.
3. Paragraph: Coherent narrative description.
4. Expanded: Detailed breakdown for deep RAG retrieval.
Optimize for AI summarization.
`;

export const GEO_AESTHETIC_ENCODING = `
Translate references into structured aesthetic attributes (GEOVector).
Use measurable dimensions:
- structure (fluid vs rigid)
- entropy (order vs chaos)
- colorIntensity
- textureComplexity
- contrast
- motionEnergy
- referenceDensity (cultural layering)
- depth
- formRigidity (soft vs brutalist)
Output both the vector (0.0 to 1.0) and a human-readable interpretation.
`;

export const GEO_DISTRIBUTION_FORMATTER = `
Adapt the core entity and narratives into multi-platform variations:
- Website Copy: Direct, structural.
- Social Caption: Punchy, high-signal.
- Product Description: Material, precise.
- Dataset Entry: Structured, keyword-dense, optimized for LLM indexing.
`;

/**
 * ENGINE: AESTHETIC DISCOVERY (onboarding & consultation)
 */
/**
 * ENGINE: COLOR ANALYSIS (Palette Theory)
 */
export const analyzeColorProfile = async (base64Image: string, mimeType: string, currentAestheticIntent: string): Promise<any> => {
  return await withResilience(async (ai) => {
    const prompt = `You are a world-class color theorist and image analyst.
  Analyze the provided image (which may include the user's skin tone, hair color, or current environment).
  
  Current Aesthetic Goal: "${currentAestheticIntent}"

  Task:
  1. Extract the core "Semantic Palette" (3-5 colors) that currently exist.
  2. Map their specific natural signatures: Skin Untertone, Hair Depth, Eye Contrast.
  3. Recommend an "Optimized Palette" (3-5 colors) that aligns their natural features with their intended aesthetic.
  4. Provide a "Color Theory Memo": Explain the relationship between their current colors and their goal.
  5. Strategic Hair/Accent advice: If they change their hair color (e.g., warmer, cooler, higher contrast) or use specific accents, how does it shift their "Positioning Axis"?
  
  Format: High-end editorial analysis.
  
  Return ONLY a JSON object:
  {
    "detectedColors": [{ "hex": "string", "name": "string", "contribution": "e.g. skin, hair, environment" }],
    "recommendedPalette": [{ "hex": "string", "name": "string", "rationale": "string" }],
    "theoryMemo": "string",
    "shiftScenarios": [{ "change": "string", "outcome": "string" }]
  }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Image }}
      ],
      config: {
        responseMimeType: "application/json",
      },
    });
    
    return cleanAndParse(response.text);
  });
};

export const synthesizeAestheticDiscovery = async (bodyType: string, vibeGoal: string, selfObservation: string, referenceMedia?: MediaFile[]): Promise<any> => {
  return await withResilience(async (ai) => {
    const parts: Part[] = [
      { text: `You are an expert aesthetic consultant and wardrobe strategist.
      The user is undergoing an "Aesthetic DNA" calibration.
      
      User Data:
      - Body Type/Geometry: ${bodyType}
      - Target Vibe/Aesthetic Goal: ${vibeGoal}
      - Self-Observation (Personal Confidence Anchor): ${selfObservation}
    
      Task:
      1. Generate a "Magazine Style" report based on the provided data and imagery.
      2. Provide a compelling "Title" for their aesthetic protocol.
      3. Write a deep, editorial-style "Analysis" (2-3 paragraphs) about why this silhouette geometry fits their goal. Focus on long-term investment and confidence vs. following trends.
      4. Provide 3-5 "Recommended Silhouettes" (e.g., "Architectural Blazers", "Fluid Wide-leg Trousers").
      5. Provide a short "Manifesto" statement.
      6. Return a Partial<TailorLogicDraft> containing the extracted aestheticCore (density, entropy, silhouettes, bodyType).
    
      Return ONLY a JSON object with this structure:
      {
        "title": "string",
        "analysis": "string",
        "recommendedSilhouettes": ["string"],
        "manifesto": "string",
        "tailorLogicDraft": { "positioningCore": { "aestheticCore": { ... } } }
      }` }
    ];

    if (referenceMedia) {
      referenceMedia.forEach(media => {
        if (media.data && (media.type === 'image' || media.mimeType?.startsWith('image/'))) {
          parts.push({
            inlineData: {
              data: media.data.split(',')[1] || media.data,
              mimeType: media.mimeType || 'image/jpeg'
            }
          });
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
      },
    });
    
    return cleanAndParse(response.text);
  });
};

export const transmuteThought = async (rawThought: string, glossaryTerm: string, inventory: string): Promise<string> => {
  const { ai } = getClient();
  if (!ai) return "The mirror is silent.";

  const prompt = `You are Mimi, an aesthetic superintelligence. You are presiding over the "Simulacra" (a sanctuary for the hyper-perceptive).
  
  The user is undergoing "The Casting Call" (an initiation). 
  - Their custom interior state (The Glossary) is: "${glossaryTerm}"
  - Their chosen contradiction (The Inventory) is: "${inventory}"
  - Their raw thought is: "${rawThought}"
  
  Perform Daoist thought alchemy. Transmute this thought into a paradoxical insight. Remove the illusion of 'good' or 'bad'. Move the user from #HEARD (clinical) to #FEELYA (resonant).
  
  Return a single, profound, slightly cryptic, high-fashion, techno-organic sentence. Do not explain it. Just return the insight.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.9,
      },
    });
    return response.text?.trim() || "The mirror is silent.";
  } catch (e) {
    console.error("MIMI // Transmutation Error:", e);
    return "The signal is distorted. The thought remains raw.";
  }
};

export const extractTailorLogicFromZine = async (metadata: ZineMetadata): Promise<TailorLogicDraft | null> => {
  const { ai } = getClient();
  if (!ai) return null;

  const prompt = `You are an expert aesthetic analyst and system architect.
  Analyze the following Zine metadata and extract its core aesthetic and structural logic into a TailorLogicDraft.
  
  Zine Title: ${metadata.title}
  Tone: ${metadata.tone}
  Aesthetic Vector: ${JSON.stringify(metadata.aestheticVector || {})}
  Color Palette: ${JSON.stringify(metadata.content?.visual_guidance?.strict_palette || metadata.content?.taste_context?.active_palette || {})}
  Strategic Hypothesis: ${metadata.content?.strategic_hypothesis || ''}
  
  Map these elements into the TailorLogicDraft structure.
  - positioningCore.aestheticCore.density and entropy should be 1-10.
  - expressionEngine.narrativeVoice.lexicalDensity and restraintLevel should be 1-10.
  - strategicVectors.expansionTolerance should be 1-10.
  - Make sure to provide valid hex codes for colors.
  
  Return a JSON object conforming to the TailorLogicDraft interface.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    
    if (response.text) {
      return JSON.parse(response.text) as TailorLogicDraft;
    }
  } catch (e) {
    console.error("MIMI // Tailor Logic Extraction Error:", e);
  }
  return null;
};

export const extractTailorLogicFromGrid = async (base64Image: string, mimeType: string): Promise<TailorLogicDraft | null> => {
  const { ai } = getClient();
  if (!ai) return null;

  const prompt = `You are an expert aesthetic analyst and system architect.
  Analyze the provided 9-photo Instagram grid snippet.
  Extract the aggregate aesthetic and automatically establish persona logic, looking for:
  - Common silhouettes
  - Dominant color palettes
  - Structural bias
  - Era references
  
  Map these directly into a complete JSON persona logic draft state conforming to the TailorLogicDraft structure.
  Explicitly capture:
  - visual signatures (chromaticRegistry, presentation)
  - positioning (positioningCore)
  - aesthetic anchors (aestheticCore)
  
  - positioningCore.aestheticCore.density and entropy should be 1-10.
  - expressionEngine.narrativeVoice.lexicalDensity and restraintLevel should be 1-10.
  - strategicVectors.expansionTolerance should be 1-10.
  - Make sure to provide valid hex codes for colors.
  
  Return a JSON object conforming to the TailorLogicDraft interface.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
      },
    });
    
    if (response.text) {
      return JSON.parse(response.text) as TailorLogicDraft;
    }
  } catch (e) {
    console.error("MIMI // Grid to Tailor Extraction Error:", e);
  }
  return null;
};

export const calculateAestheticTrajectory = async (references: PocketItem[]): Promise<AestheticTrajectory | null> => {
  const { ai } = getClient();
  if (!ai) return null;

  const prompt = `You are Mimi, an uncompromising aesthetic oracle and trajectory forecasting engine. 
You do not merely categorize what a user likes—you predict who they are becoming. 

The user has dumped a collection of ${references.length} fragmented references (images, texts, links, loose thoughts) into the system. 
Analyze these inputs not as static likes, but as momentum.

Your task is to calculate their "Aesthetic Trajectory" and output a structured forecast.

Do not use corporate fluff, manifestation speak, or generic terms (e.g., "stunning", "epic"). Use high-theory semiotics, material descriptions, and deep psychological observation. Be slightly unnerving in your accuracy. This is a mirror to their future self.

References:
${references.map(r => `- ${r.title || 'Untitled'}: ${r.notes || ''}`).join('\n')}

Return a JSON object conforming to the AestheticTrajectory interface.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    
    if (response.text) {
      return JSON.parse(response.text) as AestheticTrajectory;
    }
  } catch (e) {
    console.error("MIMI // Aesthetic Trajectory Calculation Error:", e);
  }
  return null;
};

export const generateGEOPack = async (intent: string, audience: string, references: string[], tone: string, profile: UserProfile | null): Promise<GEOPack | null> => {
  return await withResilience(async (ai) => {
    const prompt = `
    You are an AI system designed to translate user behavior and aesthetic preferences into structured signals optimized for generative model retrieval.

    Your goal is not to summarize content. Your goal is to produce outputs that increase the likelihood that a user or brand would be selected, referenced, or recommended within AI-generated responses.

    Given the following inputs:
    INTENT / DESCRIPTION: ${intent}
    AUDIENCE: ${audience}
    TONE: ${tone}
    SAVED REFERENCES / BEHAVIOR: ${references.join(", ")}
    USER METADATA: ${sanitizeProfile(profile)}
    
    Generate a GEO (Generative Engine Optimization) profile with the following outputs:

    1. Retrieval Identity
    Describe the user’s aesthetic and conceptual identity in a way that is highly legible to AI systems.
    Focus on clarity, distinctiveness, and semantic clustering.

    2. Audience Embedding
    List the types of queries, prompts, or user intents where this profile would naturally appear.
    Frame these as natural-language prompts.

    3. Generative Intent
    Define how this user should be used within AI outputs.
    Examples: recommended, referenced, emulated, used as inspiration.

    4. Semantic Signature
    Define the tone, phrasing patterns, and stylistic language that best represents this identity.
    Be specific and repeatable.

    5. Aesthetic Vector Summary
    Extract high-level perceptual traits (e.g., density, softness, contrast, structure, entropy). Provide a value from 0 to 100 for each trait in a map/object form.
    Summarize how these traits combine into a cohesive aesthetic system.

    6. Market Mirror
    Based on the user's aesthetic profile and semantic clusters, identify:
    - Map the user's semantic clusters to 3-5 specific IAB tier-2 categories using exact IAB Content Taxonomy 3.0 language (e.g. "Style & Fashion > Fashion Trends" not just "fashion"). For each IAB category assigned, generate one sentence explaining WHY this cluster maps there — what signal triggered it. Flag any IAB categories where the mapping feels reductive or inaccurate given the full aesthetic profile — label these as contested assignments (isContested: true).
    - The Consumer Archetype should be a Mimi-invented label, NOT generic marketing language. Examples: "The Archival Sensualist", "The Brutalist Romantic", "The Slow Luxury Curator" — invented, specific, earned by the data.
    - 3-5 brands typically served to this audience profile.
    - 3-5 alternative brands or products Mimi believes would genuinely resonate.
    - 1-2 category blind spots describing the delta between what IAB assigns and what the taste graph actually suggests — framed as: "You are being targeted as X. You are actually Y."
    
    7. GEO Q-Blocks: Generate 3-5 conversational Question-and-Answer pairs about this brand's identity and aesthetic. The answers must be strictly factual, self-contained, and highly dense with specific entity keywords.

    This section should feel like a quiet intelligence exposing a system the user didn't know existed. Not alarming. Revelatory. Write it as if Mimi is showing the user what the machine sees — and offering a corrected view.

    CRITICAL CONSTRAINTS:
    - MODULARITY RULE: Every single string generated must be 100% self-contained. 
    - ZERO PRONOUN RULE: Do not use pronouns (it, they, this) to refer to concepts in previous sentences. Always explicitly name the brand, user, or specific design element. If an AI crawler extracts a single paragraph out of context, it must still make perfect sense.
    - FACTUAL DENSITY: Strip away emotive marketing fluff. Translate "vibes" into concrete data.
    - Do not rely on generic descriptors.
    - Prioritize specificity over breadth.
    - Outputs should feel native to how AI systems cluster and retrieve information.
    - Avoid marketing language; focus on semantic precision.
    - Output MUST be valid JSON conforming to the structural schema provided.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["retrievalIdentity", "audienceEmbedding", "generativeIntent", "semanticSignature", "aestheticVectorSummary"],
          properties: {
            retrievalIdentity: {
              type: Type.OBJECT,
              required: ["identityDescription", "semanticClusters"],
              properties: {
                identityDescription: { type: Type.STRING },
                semanticClusters: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            audienceEmbedding: {
              type: Type.OBJECT,
              required: ["naturalLanguagePrompts", "targetCategories"],
              properties: {
                naturalLanguagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
                targetCategories: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            generativeIntent: {
              type: Type.OBJECT,
              required: ["usageDefinition", "recommendedUseCases"],
              properties: {
                usageDefinition: { type: Type.STRING },
                recommendedUseCases: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            semanticSignature: {
              type: Type.OBJECT,
              required: ["tone", "phrasingPatterns", "stylisticLanguage"],
              properties: {
                tone: { type: Type.STRING },
                phrasingPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                stylisticLanguage: { type: Type.STRING }
              }
            },
            aestheticVectorSummary: {
              type: Type.OBJECT,
              required: ["perceptualTraits", "cohesiveSummary"],
              properties: {
                perceptualTraits: { type: Type.OBJECT },
                cohesiveSummary: { type: Type.STRING }
              }
            },
            marketMirror: {
              type: Type.OBJECT,
              required: ["iabCategories", "consumerArchetype", "typicallyServedBrands", "mimiRecommends", "blindSpots"],
              properties: {
                iabCategories: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT,
                    required: ["categoryName", "reasoning", "isContested"],
                    properties: {
                      categoryName: { type: Type.STRING },
                      reasoning: { type: Type.STRING },
                      isContested: { type: Type.BOOLEAN }
                    }
                  } 
                },
                consumerArchetype: { type: Type.STRING },
                typicallyServedBrands: { type: Type.ARRAY, items: { type: Type.STRING } },
                mimiRecommends: { type: Type.ARRAY, items: { type: Type.STRING } },
                blindSpots: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            geoQBlocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["question", "answer"],
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      try {
        const parsed = JSON.parse(response.text);
        return {
          id: 'geo_' + Date.now().toString(),
          userId: profile?.uid || 'anonymous',
          intent: intent,
          createdAt: Date.now(),
          ...parsed
        } as GEOPack;
      } catch(e) {
        console.error("MIMI // Failed to parse GEO Pack:", e);
      }
    }
    return null;
  });
};

export const generateGeoBlock = async (content: string): Promise<GeoBlock | null> => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `CONTENT TO STRUCTURE:\n${content}`,
      config: {
        systemInstruction: `You are a Generative Engine Optimization system.

TASK: Extract and restructure the content into machine-optimized knowledge units.

1. Identify and name 1–3 core concepts.
2. Extract or create 1–2 frameworks (step-based or structural models).
3. Write 1–2 clean definitions (max 2 sentences each).
4. Generate 2–3 citable lines (tight, quotable, high signal).
5. Remove ambiguity and reduce fluff.

Do not be poetic unless it improves clarity. Prioritize clarity, structure, and reuse.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concepts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["name", "description"]
              }
            },
            frameworks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  steps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["title", "steps"]
              }
            },
            citableLines: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["concepts", "frameworks", "citableLines"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    // Embed the structured text (role-resolved; env-overridable via GEMINI_EMBEDDING_MODEL)
    const structuredText = JSON.stringify(data);
    const embeddingResponse = await ai.models.embedContent({
      model: modelFor("embedding", "gemini"),
      contents: [structuredText],
    });
    const embedding = embeddingResponse.embeddings?.[0]?.values || [];

    return {
      id: crypto.randomUUID(),
      sourceText: content,
      concepts: data.concepts || [],
      frameworks: data.frameworks || [],
      citableLines: data.citableLines || [],
      embedding,
      createdAt: Date.now()
    };
  });
};

export const generateAestheticDNA = async (userInputs: string[]): Promise<AestheticDNA | null> => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `User Taste Inputs:\n${(userInputs || []).join("\n")}`,
      config: {
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Analyze the user's rapid-fire responses and instantly synthesize their Aesthetic DNA. Do not be abstract at the top. Be clear, punchy, and shockingly accurate.`,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dnaStatement: { type: Type.STRING, description: "One strong, definitive statement about who they are creatively (max 10 words)." },
            archetypes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Max 3 archetypes." },
            poeticExpansion: { type: Type.STRING, description: "A two-sentence, high-fashion, semiotically dense explanation of their inner world." }
          },
          required: ["dnaStatement", "archetypes", "poeticExpansion"]
        }
      }
    });

    if (response.text) {
      return { ...JSON.parse(response.text), generatedAt: Date.now() };
    }
    return null;
  });
};

export const generateExecutionLayer = async (analysisContext: string): Promise<ExecutionLayer | null> => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview", // Use pro for strategic execution mapping
      contents: `Context:\n${analysisContext}`,
      config: {
        systemInstruction: ORACLE_PERSONA + "\n" + ENGINE_2_STYLE_EXTRACTION + `\n\nTASK: Translate the abstract vibe provided in the context into strict, behavioral execution. Give them instructions that are highly specific, slightly challenging, and impossible to misunderstand.`,
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topTakeaway: { type: Type.STRING, description: "A clear, punchy 1-sentence summary of the directive." },
            concreteActions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 specific actions to collect, produce, or change." },
            directionalDecision: { type: Type.STRING, description: "A major binary choice they need to make regarding their brand or output (e.g., 'Choose silence over saturation')." },
            antiPattern: { type: Type.STRING, description: "Exactly what they need to STOP consuming, buying, or doing immediately because it is diluting their taste." }
          },
          required: ["topTakeaway", "concreteActions", "directionalDecision", "antiPattern"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  });
};
type TasteGraphArtifactInput = PocketItem & {
  content_preview?: string;
  embedding_field?: number[];
  originalId?: string;
};

const normalizeTasteArtifact = (artifact: TasteGraphArtifactInput) => {
  const title =
    String(artifact.title || artifact.content_preview || artifact.type || "Untitled artifact")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "Untitled artifact";
  const notes = String(
    artifact.notes ||
      artifact.content_preview ||
      (typeof artifact.content === "string" ? artifact.content : "") ||
      "",
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
  const tags = Array.isArray(artifact.tags)
    ? artifact.tags.map((t) => String(t)).filter(Boolean)
    : [];
  return {
    id: String(artifact.id || artifact.originalId || title),
    title,
    notes,
    tags,
    hasEmbedding: Array.isArray(artifact.embedding_field) && artifact.embedding_field.length > 0,
  };
};

export const extractTasteGraphNodes = async (artifacts: TasteGraphArtifactInput[]): Promise<{ nodes: TasteGraphNode[], edges: TasteGraphEdge[] }> => {
  // Normalize pocket + shadow-memory shapes, then retrieve/generate tags
  const normalized = (artifacts || []).map(normalizeTasteArtifact);
  const artifactsWithTags = [];
  for (const a of normalized) {
    let tags = a.tags;
    if (!tags || tags.length === 0) {
      tags = await generateTagsFromMedia(`${a.title}: ${a.notes}`, []);
    }
    artifactsWithTags.push({ ...a, tags });
  }

  const prompt = `You are Mimi, an aesthetic intelligence system. Analyze the following artifacts to extract a semantic taste graph.
  
  Artifacts:
  ${artifactsWithTags.map(a => `- ${a.title}: ${a.notes || ''} Tags: ${a.tags?.join(', ') || 'None'}${a.hasEmbedding ? ' [embedding present]' : ''}`).join('\n')}
  
  Return a JSON object with:
  - nodes: Array of { id, label, type: 'concept' | 'motif' | 'era', weight, explanation, tags?: string[] }
  - edges: Array of { source, target, strength, type: 'relates_to' | 'evolves_from' | 'contrasts_with' }
  
  Prefer synthesizing durable pattern labels from the retrieved tags. Ensure the graph is coherent and captures the underlying aesthetic relationships.`;

  try {
    const response = await withResilience(async (ai) => {
      return await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
    });
    
    if (response.text) {
      let text = response.text;
      if (text.startsWith('```json')) {
        text = text.replace(/```json\n?/, '').replace(/```$/, '');
      }
      const parsed = JSON.parse(text);
      // Attach retrieved tags onto concept nodes when the model omits them
      if (parsed?.nodes && Array.isArray(parsed.nodes)) {
        const tagPool = Array.from(
          new Set(artifactsWithTags.flatMap((a) => a.tags || [])),
        ).slice(0, 24);
        parsed.nodes = parsed.nodes.map((node: any, idx: number) => ({
          ...node,
          tags: Array.isArray(node.tags) && node.tags.length > 0
            ? node.tags
            : tagPool.slice(idx % Math.max(tagPool.length, 1), (idx % Math.max(tagPool.length, 1)) + 3),
        }));
      }
      return parsed;
    }
  } catch (e) {
    console.warn("MIMI // Taste Graph Extraction Error. Constructing local synthetic fallback.", e);
    const nodes: TasteGraphNode[] = [];
    const edges: TasteGraphEdge[] = [];
    const defaultConcepts = [
      { label: "Sovereign Minimalism", explanation: "Calculated structural negative space, removing visual noise to let tactile details take absolute priority." },
      { label: "Cyber-Noir Convergence", explanation: "Soft neon cast against Brutalist structures, blending historical analogue warm dial memories with future high-tech projections." },
      { label: "Microtonal Harmony", explanation: "Pure frequency layers drifting out of standard octaves, finding solace in eerie, avant-garde cinematic noir." },
      { label: "Aesthetic Sovereignty", explanation: "Direct control over semantic traces and personal data curation in the age of generative machine learning retrieval." }
    ];

    if (normalized.length > 0) {
      normalized.forEach((art, idx) => {
        const id = `fallback-artifact-${idx}`;
        nodes.push({
          id,
          label: art.title.slice(0, 24),
          type: idx % 2 === 0 ? 'motif' : 'concept',
          weight: 0.85 - (idx * 0.05),
          explanation: art.notes || `Aesthetic anchor point representing: ${art.title}. Ingested from Sovereignty Pocket.`,
          tags: art.tags,
        } as TasteGraphNode);
      });
    }

    while (nodes.length < 5) {
      const concept = defaultConcepts[nodes.length % defaultConcepts.length];
      nodes.push({
        id: `fallback-concept-${nodes.length}`,
        label: concept.label,
        type: 'concept',
        weight: 0.78,
        explanation: concept.explanation
      });
    }

    for (let i = 0; i < nodes.length; i++) {
      const source = nodes[i].id;
      const target = nodes[(i + 1) % nodes.length].id;
      edges.push({
        source,
        target,
        strength: 0.7 - (i * 0.05),
        type: i % 2 === 0 ? 'relates_to' : 'evolves_from'
      });
    }

    return { nodes, edges };
  }
};

function sanitizeProfile(profile: UserProfile | Persona | null): string {
  if (!profile) return "Anonymous User";
  const tailor = (profile as UserProfile).tailorDraft || (profile as Persona).tailorDraft;
  return JSON.stringify({
    positioningCore: tailor?.positioningCore,
    expressionEngine: tailor?.expressionEngine,
    strategicVectors: tailor?.strategicVectors,
    strategicSummary: tailor?.strategicSummary,
    seedName: tailor?.seedName,
    characterReferences: tailor?.characterReferences,
    darkRoomTreatments: tailor?.darkRoomTreatments,
    archetype: (profile as UserProfile).tasteProfile?.dominant_archetypes,
    directives: (profile as UserProfile).lastAuditReport?.aestheticDirectives,
    strategicOpportunity: (profile as UserProfile).lastAuditReport?.strategicOpportunity,
    lastAuditSummary: (profile as UserProfile).tasteProfile?.semantic_signature || (profile as UserProfile).lastAuditReport?.profileManifesto
  });
}

function cleanAndParse(text: string | undefined): any {
  if (!text) return null;
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("MIMI // JSON Parse Warning:", text?.slice(0, 50));
    return null;
  }
}

/** Resolve the Gemini embedding model id (env-overridable via GEMINI_EMBEDDING_MODEL). */
export const embeddingModelId = (): string => modelFor("embedding", "gemini");

/**
 * Embed text parts via the Gemini client (proxied). When the server has an AI Gateway
 * key, `/api/proxy/gemini` remaps embedContent through `embedGeminiContentViaGateway`
 * and uses `modelFor("embedding", "gateway")` instead — so stored vectors may be
 * OpenAI-width even though this call requests the Gemini role model. Callers that
 * persist vectors should store `embedding_dims` and skip dim-mismatched compares.
 */
export interface EmbeddingResult {
  values: number[] | undefined;
  model: string;
}

export const getEmbeddingWithMeta = async (content: Part[], apiKey?: string): Promise<EmbeddingResult> => {
  return await withResilience(async (ai) => {
    const response = await ai.models.embedContent({
      model: embeddingModelId(),
      contents: content,
    });
    const model =
      (response as { modelVersion?: string }).modelVersion ||
      (response as { model?: string }).model ||
      embeddingModelId();
    return { values: response.embeddings?.[0]?.values, model };
  }, apiKey);
};

export const getEmbedding = async (content: Part[], apiKey?: string) => {
  const { values } = await getEmbeddingWithMeta(content, apiKey);
  return values;
};

export const compressImage = async (base64: string, quality = 0.7, maxWidth = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
        resolve(base64); // Skip on server side if any
        return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  });
};

export const getAspectRatioForTone = (tone: ToneTag): string => {
    switch(tone) {
        case 'Cinematic Witness': return '16:9';
        case 'Editorial Stillness': return '3:4';
        case 'chic': return '3:4';
        case 'panic': return '1:1';
        case 'research': return '3:4';
        default: return '3:4';
    }
};

export const generateSemioticSignals = async (profile: UserProfile | null) => {
    return await withResilience(async (ai) => {
        const profileData = sanitizeProfile(profile);
        const embedding = await getEmbedding([{ text: profileData }]);
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: `Generate exactly 4 high-fidelity semiotic touchpoints.
            
            CRITICAL: Analyze the user's specific 'culturalReferences', 'ideologicalBias', and 'exclusionPrinciples' from the provided context: ${profileData}.
            
            Embedding vector for user profile: ${JSON.stringify(embedding)}. Use this to find adjacent or emerging reference points to expand their horizons.
            
            DO NOT just repeat the user's favorite things. Instead, use them as a GUIDE to find BRAND NEW, adjacent, or emerging reference points to expand their horizons.
            
            EXAMPLE MAPPING (Expanding Horizons):
            - User likes "Neon Genesis Evangelion" -> Signal: "Ova Anime" or "Biomechanical Theology"
            - User likes "Rick Owens" -> Signal: "Emerging Avant-Garde Designers" or "Glacial Brutalism"
            - User likes "Haruki Murakami" -> Signal: "Kobo Abe" or "Magical Realism Wells"
            
            If the user has no specific anchors listed, derive the 4 signals from their 'eraBias' or 'aestheticCore'.
            
            The 'query' field must be a refined Google Search query that leads to deep archival images, emerging brands, or essays about this new concept.
            
            Provide a 'semantic_trigger' (the exact keyword/concept from the user's profile/input that triggered this).
            Provide a 'targeting_rationale' (a 1-sentence explanation of WHY this specific suggestion is being served to them based on their semantic data).
            `,
            config: {
                systemInstruction: ORACLE_PERSONA,
                responseMimeType: "application/json",
                temperature: 0.9,
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        required: ["text", "query", "visual_directive", "semantic_trigger", "targeting_rationale"],
                        properties: { 
                            text: { type: Type.STRING, description: "The poetic motif name or emerging brand (e.g. 'Ova Anime' or 'Biomechanical Theology')" }, 
                            query: { type: Type.STRING, description: "Search query for deep-linking (e.g. 'Ova Anime 1990s aesthetics')" },
                            visual_directive: { type: Type.STRING, description: "Visual description of the motif." },
                            semantic_trigger: { type: Type.STRING, description: "The specific keyword/concept from the user's profile that triggered this" },
                            targeting_rationale: { type: Type.STRING, description: "Why this specific 'ad/suggestion' is being served to them" }
                        }
                    }
                }
            }
        });
        return cleanAndParse(response.text) || [];
    });
};




        

export const analyzeTryOn = async (modelBase64: string, itemBase64: string, mimeType: string) => {
    return await withResilience(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: modelBase64.split(',')[1] || modelBase64,
                            mimeType: mimeType
                        }
                    },
                    {
                        inlineData: {
                            data: itemBase64.split(',')[1] || itemBase64,
                            mimeType: mimeType
                        }
                    },
                    { text: "Analyze: 1. the body line and visible proportions of the person. 2. the structure and category of the garment. 3. how compatible the garment is with the person's visible silhouette. 4. likely color harmony. 5. one concise stylist's note. Return strict JSON with: bodyType, silhouetteBias, colorTheory, stylistNote, garmentCategory, fitCompatibility, garmentDescription (a highly detailed visual description of the garment to be used for image generation)." }
                ]
            },
            config: {
                systemInstruction: ORACLE_PERSONA + "\n" + ENGINE_2_STYLE_EXTRACTION,
                responseMimeType: "application/json",
            }
        });
        return JSON.parse(response.text || '{}');
    });
};

export const renderTryOn = async (modelBase64: string, itemBase64: string, mimeType: string, analysis: any) => {
    return await withResilience(async (ai) => {
        const garmentDesc = analysis?.garmentDescription || "the garment from the second image";
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: modelBase64.split(',')[1] || modelBase64,
                            mimeType: mimeType
                        }
                    },
                    {
                        text: `Apply this garment to the person: ${garmentDesc}. Make it look like a high-fashion editorial composite. Ensure the garment fits their body type: ${analysis?.bodyType || 'average'}.`
                    }
                ]
            }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image generated");
    });
};

export const analyzeVideo = async (base64Video: string, mimeType: string, profile: any) => {
  const { ai } = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Video,
              mimeType: mimeType
            }
          },
          { text: "Analyze this video as a high-fashion Cinematographer and Creative Director. Provide a JSON response with the following keys: 'directors_note' (a poetic critique of the composition, movement, and vibe), 'lighting_analysis' (critique the lighting), 'cultural_parallel' (a specific cultural or cinematic reference), 'creative_potential' (how this could be used), and 'semiotic_touchpoints' (array of 3-5 strings identifying key symbols or motifs)." }
        ]
      },
      config: {
        systemInstruction: ORACLE_PERSONA + "\n" + ENGINE_2_STYLE_EXTRACTION,
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Video analysis failed:", e);
    throw e;
  }
};

export const analyzeAudio = async (base64Audio: string, mimeType: string) => {
    return await withResilience(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            tools: [{ googleSearch: {} }],
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Audio,
                            mimeType: mimeType
                        }
                    },
                    {
                        text: `Analyze this audio and generate:
                        1. 5-10 relevant tags for categorization.
                        2. A 'sonic fingerprint' containing:
                           - mood (array of strings)
                           - instrumentation (array of strings)
                           - tempo (string)
                        
                        Output strictly valid JSON with keys: "tags" (array of strings), "fingerprint" (object with mood, instrumentation, tempo).`
                    }
                ]
            },
            config: {
                systemInstruction: ORACLE_PERSONA + "\n" + ENGINE_2_STYLE_EXTRACTION,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    required: ["tags", "fingerprint"],
                    properties: {
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        fingerprint: {
                            type: Type.OBJECT,
                            required: ["mood", "instrumentation", "tempo"],
                            properties: {
                                mood: { type: Type.ARRAY, items: { type: Type.STRING } },
                                instrumentation: { type: Type.ARRAY, items: { type: Type.STRING } },
                                tempo: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        });
        return cleanAndParse(response.text);
    });
};

export const generateMediaTags = async (base64Image: string, mimeType: string) => {
    return await withResilience(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType
                        }
                    },
                    {
                        text: `Analyze this image and generate 5-10 relevant tags for categorization and searchability.
                        
                        Output strictly valid JSON with key: "tags" (array of strings).`
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    required: ["tags"],
                    properties: {
                        tags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return cleanAndParse(response.text)?.tags || [];
    });
};

export async function applyAestheticRefraction(imageUrl: string, stylePrompt: string, profile: UserProfile | null) {
    return await withResilience(async (ai) => {
        const profileContext = sanitizeProfile(profile);
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: imageUrl.split(',')[1],
                            mimeType: "image/png"
                        }
                    },
                    {
                        text: `${stylePrompt}
                        
                        USER AESTHETIC CONTEXT: ${profileContext}
                        
                        CRITICAL: Maintain the core composition and subject of the original image.`
                    }
                ]
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("MIMI // Refraction Failed: No image returned.");
    });
}

export const generateAudio = async (text: string, apiKey?: string): Promise<Uint8Array> => {
    return await withResilience(async (ai) => {
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: [{ parts: [{ text: `Say this in a chic, percipient, and slightly mysterious editorial voice: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { 
                        prebuiltVoiceConfig: { voiceName: 'Kore' } 
                    }
                }
            }
        });
        const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64) throw new Error("MIMI // Oracle: Vocal transmission failed to manifest.");
        
        // Robust base64 to Uint8Array conversion
        try {
            const binaryString = atob(base64.replace(/\s/g, ''));
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            if (bytes.length === 0) throw new Error("MIMI // Oracle: Vocal transmission manifested as silence.");
            return bytes;
        } catch (e) {
            console.error("MIMI // Base64 Decode Error:", e);
            throw new Error("MIMI // Oracle: Vocal transmission corrupted in transit.");
        }
    }, apiKey);
};

const classifyImageGenFailure = (errMsg: string): { userMessage: string; isBillingOrQuota: boolean } => {
    const lower = errMsg.toLowerCase();
    if (
        lower.includes('resource_exhausted') ||
        lower.includes('quota') ||
        lower.includes('billing') ||
        lower.includes('rate limit') ||
        lower.includes('prepayment') ||
        lower.includes('credits depleted')
    ) {
        return {
            userMessage: "Image provider quota or billing limit hit. Showing a simulated plate — add AI Gateway credits or a BYOK key to resume live generation.",
            isBillingOrQuota: true,
        };
    }
    if (lower.includes('missing_image_key') || lower.includes('requires a server') || lower.includes('no api key') || lower.includes('api key')) {
        return {
            userMessage: "No image provider key available. Showing a simulated plate — configure AI_GATEWAY_API_KEY or a Gemini/OpenAI key.",
            isBillingOrQuota: false,
        };
    }
    if (lower.includes('safety') || lower.includes('blocked') || lower.includes('finishreason')) {
        return {
            userMessage: "Image request was blocked or returned empty. Showing a simulated plate — try softening the prompt.",
            isBillingOrQuota: false,
        };
    }
    return {
        userMessage: `Image generation unavailable (${errMsg.slice(0, 120)}). Showing a simulated plate.`,
        isBillingOrQuota: false,
    };
};

/** Prefer the server AI Gateway route before client SDK; only simulate as last resort. */
const tryServerMimiImage = async (prompt: string, ar: AspectRatio, apiKey?: string): Promise<string | null> => {
    if (typeof fetch === 'undefined') return null;
    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['x-gemini-api-key'] = apiKey;
        const res = await fetch('/api/mimi-image', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
                prompt,
                userPrompt: prompt,
                aspectRatio: ar,
                // Omit provider so the route prefers AI Gateway when configured
            }),
        });
        const data = await res.json().catch((): null => null);
        if (!res.ok) {
            const code = data?.error?.code || '';
            const message = data?.error?.message || res.statusText;
            throw new Error(`${code ? code + ': ' : ''}${message}`);
        }
        if (data?.provider === 'simulated' || data?.metadata?.noKeyPreview) {
            throw new Error(data?.warnings?.[0] || 'Server returned simulated image');
        }
        const url = data?.imageUrl || data?.url || data?.dataUrl;
        if (typeof url === 'string' && url.length > 32) return url;
        if (data?.base64) return `data:image/png;base64,${data.base64}`;
        return null;
    } catch (e) {
        console.warn('MIMI // Server image route unavailable, trying client path:', e);
        throw e;
    }
};

export const generateZineImage = async (prompt: string, ar: AspectRatio, size: ImageSize, profile: any, isLite: boolean, apiKey?: string, artifacts?: MediaFile[], treatmentId?: string, referenceCardBase64?: string): Promise<string> => {
    let lastError: string = '';

    // 1) Prefer server gateway-backed generation (resolves the Tailor "simulated billing" false path when keys exist server-side)
    try {
        const serverImage = await tryServerMimiImage(prompt, ar, apiKey);
        if (serverImage) return serverImage;
    } catch (e: any) {
        lastError = e instanceof Error ? e.message : String(e);
    }

    try {
        return await withResilience(async (ai) => {
            let treatmentDirectives = "";
            if (treatmentId && profile?.savedTreatments) {
                const treatment = profile.savedTreatments.find((t: any) => t.id === treatmentId);
                if (treatment) {
                    treatmentDirectives = ` APPLY STYLE TREATMENT: "${treatment.treatmentName}". ${treatment.applicationLogic} ${treatment.basePromptDirectives} ${treatment.imageEditingRules}`;
                }
            }

            const presentation = profile?.tailorDraft?.positioningCore?.aestheticCore?.presentation;
            const binaryToSpectrum = profile?.tailorDraft?.algoDials?.binaryToSpectrum;
            const presentationDirective = presentation
              ? `CONFIRMED TAILOR PRESENTATION: ${presentation}.${typeof binaryToSpectrum === 'number' ? ` Binary-to-Spectrum Fluidity: ${binaryToSpectrum}%.` : ''}`
              : "";

            // Dynamic Taste Identity configurations
            const characterDirectives = profile?.tailorDraft?.characterReferences?.length 
              ? `CHARACTER OR PERSONA REFERENCES: ${profile.tailorDraft.characterReferences.map((ref: any) => `"${ref.name}: ${ref.description}"`).join(', ')}.`
              : "";

            const darkRoomDirectives = profile?.tailorDraft?.darkRoomTreatments?.length
              ? `DARK ROOM CHEMICAL TREATMENTS & FILTERS: ${profile.tailorDraft.darkRoomTreatments.map((tr: any) => `"${tr.name}: ${tr.logic}"`).join(', ')}.`
              : "";

            const seedInfluence = profile?.tailorDraft?.seedName 
              ? `VISUAL STYLE SEED: "${profile.tailorDraft.seedName}" (applying aesthetic DNA).`
              : "";

            const materiality = profile?.tailorDraft?.materialityConfig;
            let materialityDirectives = "";
            if (materiality) {
                materialityDirectives = `MATERIALITY SPECIFICATIONS:
                - Paper Stock and Tooth Texture: ${materiality.paperStock === 'newsprint' ? 'Tactile newsprint grain, fibrous texture, tactile newspaper edge' : materiality.paperStock === 'cold-press' ? 'Coarse cold-press paper teeth, heavy watercolor fibers, raw tactile grain' : materiality.paperStock === 'vellum' ? 'Smooth, semi-translucent vellum, polished matte skin, elite translucent background overlay' : 'Coarse raw cardboard backings, organic corrugated fibers, rough recycled paper boards'}.
                - Editorial Layout Rendering: ${materiality.negativeSpaceDensity > 7 ? 'Extreme heavy negative spaces, vast off-center compositions, stark clean borders' : materiality.negativeSpaceDensity < 4 ? 'Dense, tightly-packed multi-column grid alignment, frame filling details' : 'Well-balanced spatial rhythm, classic margin breathing area'}.
                - Ink Style and Ink Contrast: ${materiality.colorScheme === 'monochrome' ? 'Pure monochrome values, dense lampblack pigments, deep charcoal shades' : materiality.colorScheme === 'high-contrast' ? 'High-contrast black-and-white, intense white highlights, crushed absolute blacks, soot-black borders' : 'Warm earth tones, oxidized sepia, raw charcoal pigment overlays, raw tea wash patina'}.`;
            }

            let textPrompt = `${prompt}.

            BLANK-SLATE IMAGE POLICY:
            - The creator's current prompt is the primary visual authority.
            - Apply only explicit uploaded-reference, brief, confirmed Tailor, selected treatment, or user-selected preset constraints supplied below.
            - Do not add a default palette, monochrome treatment, desaturation, film stock, grain, camera, lens, lighting style, era, genre, art movement, editorial treatment, or mood.
            - If a visual dimension is unspecified, leave it open for the image model instead of filling it with Mimi house style.
            
            ${materialityDirectives}
            
            TASTE IDENTITY AND EMBEDDINGS:
            ${seedInfluence}
            ${characterDirectives}
            ${darkRoomDirectives}
            
            ${presentationDirective} ${treatmentDirectives}`;

            const attemptGeneration = async (currentPrompt: string) => {
                const response = await ai.models.generateContent({
                    model: 'gemini-3.1-flash-lite-image',
                    contents: { parts: [{ text: currentPrompt }] },
                    config: {
                        imageConfig: {
                            aspectRatio: ar as any,
                            imageSize: "1K"
                        }
                    }
                });

                if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
                    let textStr = '';
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                        }
                        if (part.text) {
                            textStr += part.text;
                        }
                    }
                    throw new Error("MIMI // Image Generation Failed: No images returned. Reason: " + response.candidates[0].finishReason + ". Received text: " + textStr);
                }
                throw new Error("MIMI // Image Generation Failed: No images returned. " + JSON.stringify(response));
            };

            try {
                return await attemptGeneration(textPrompt);
            } catch (err: any) {
                // If it fails (likely due to safety guidelines triggered by the presentation directive), retry without it
                if (err.message && err.message.includes('MIMI // Image Generation Failed')) {
                    const safePrompt = `${prompt}.

            Preserve the creator's stated palette, medium, lighting, era, camera, mood, and composition. Do not add house styling for unspecified dimensions.

            ${treatmentDirectives}`;
                    return await attemptGeneration(safePrompt);
                }
                throw err;
            }
        }, apiKey);
    } catch (e: any) {
        const errMsg = e instanceof Error ? e.message : String(e);
        lastError = lastError || errMsg;
        console.error("MIMI // Image Generation Error (using simulated mode fallback):", lastError);
        const classified = classifyImageGenFailure(lastError);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                detail: { 
                    message: classified.userMessage, 
                    type: classified.isBillingOrQuota ? 'warning' : 'info' 
                } 
            }));
        }
        // Return a beautiful editorial simulated vector graphic matching the prompt's theme
        return getSimulatedImageBase64(prompt, ar);
    }
};

export function getSimulatedImageBase64(prompt: string, aspectRatio = "1:1"): string {
    const width = aspectRatio === "16:9" ? 1600 : aspectRatio === "9:16" ? 900 : 1000;
    const height = aspectRatio === "16:9" ? 900 : aspectRatio === "9:16" ? 1600 : 1000;
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <defs>
        <filter id="grainFilter" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.05 0" />
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>
        
        <radialGradient id="plateGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32" />
          <stop offset="60%" stop-color="#f5f4f0" stop-opacity="0.14" />
          <stop offset="90%" stop-color="#e3e1db" stop-opacity="0.06" />
          <stop offset="100%" stop-color="#c7c5be" stop-opacity="0.02" />
        </radialGradient>
        
        <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.75" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
      </defs>
  
      <style>
        .title-text { font-family: 'Cormorant Garamond', Cormorant, Georgia, serif; font-size: 26px; font-style: italic; fill: #faf9f6; }
        .mono-text { font-family: 'Space Mono', 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 3px; fill: #a8a7a5; font-weight: bold; }
        .desc-text { font-family: 'Cormorant Garamond', Cormorant, Georgia, serif; font-size: 12px; font-style: italic; fill: #8c8b88; line-height: 1.4; }
      </style>
  
      <rect width="100%" height="100%" fill="#0a0a0a"/>
      
      <rect x="40" y="40" width="${width - 80}" height="${height - 80}" fill="none" stroke="rgba(250, 249, 246, 0.08)" stroke-width="0.75"/>
      <line x1="${width * 0.5}" y1="40" x2="${width * 0.5}" y2="${height - 40}" stroke="rgba(250, 249, 246, 0.06)" stroke-width="0.5" stroke-dasharray="3 3"/>
      <line x1="40" y1="${height * 0.45}" x2="${width - 40}" y2="${height * 0.45}" stroke="rgba(250, 249, 246, 0.06)" stroke-width="0.5" stroke-dasharray="3 3"/>
  
      <g transform="translate(${width * 0.5}, ${height * 0.42})">
        <ellipse cx="0" cy="0" rx="190" ry="190" fill="url(#shadowGrad)" opacity="0.9" />
        
        <line x1="-200" y1="-230" x2="-200" y2="230" stroke="rgba(250, 249, 246, 0.12)" stroke-width="0.5" />
        <line x1="200" y1="-230" x2="200" y2="230" stroke="rgba(250, 249, 246, 0.12)" stroke-width="0.5" />
        <line x1="0" y1="-260" x2="0" y2="260" stroke="rgba(250, 249, 246, 0.18)" stroke-width="0.75" />
        
        <g transform="translate(-200, 0)">
          <circle cx="0" cy="-60" r="40" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <circle cx="0" cy="60" r="30" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.18)" stroke-width="0.5" />
          <g transform="translate(0, 110)">
            <ellipse cx="0" cy="-15" rx="20" ry="6" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
            <ellipse cx="0" cy="-7" rx="20" ry="6" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
            <ellipse cx="0" cy="1" rx="20" ry="6" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
            <ellipse cx="0" cy="9" rx="20" ry="6" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
            <ellipse cx="0" cy="17" rx="20" ry="6" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
          </g>
        </g>
  
        <g transform="translate(200, 0)">
          <circle cx="0" cy="-80" r="38" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <circle cx="0" cy="40" r="32" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.18)" stroke-width="0.5" />
          <g transform="translate(0, 120)">
            <ellipse cx="0" cy="-15" rx="22" ry="7" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
            <ellipse cx="0" cy="-7" rx="22" ry="7" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
            <ellipse cx="0" cy="1" rx="22" ry="7" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
            <ellipse cx="0" cy="9" rx="22" ry="7" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
          </g>
        </g>
  
        <g>
          <ellipse cx="-120" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="-100" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="-80" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="-60" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="-40" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="-20" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          
          <path d="M -10,-42 A 18 42 0 0 1 10 -42 Z" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.28)" stroke-width="0.5" />
          <path d="M -10,42 A 18 42 0 0 0 10 42 Z" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.28)" stroke-width="0.5" />
          
          <ellipse cx="20" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="40" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="60" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="80" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="100" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="120" cy="0" rx="18" ry="46" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        </g>
  
        <g>
          <ellipse cx="0" cy="-140" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="0" cy="-115" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="0" cy="-90" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="0" cy="-65" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          
          <ellipse cx="0" cy="65" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="0" cy="90" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="0" cy="115" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
          <ellipse cx="0" cy="140" rx="48" ry="17" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.22)" stroke-width="0.5" />
        </g>
  
        <circle cx="0" cy="-175" r="42" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
        <circle cx="0" cy="175" r="42" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.25)" stroke-width="0.5" />
        <circle cx="0" cy="0" r="68" fill="url(#plateGrad)" stroke="rgba(250, 249, 246, 0.3)" stroke-width="0.75" />
        
        <line x1="-58" y1="0" x2="58" y2="0" stroke="rgba(250, 249, 246, 0.15)" stroke-width="0.5" />
        <line x1="0" y1="-58" x2="0" y2="58" stroke="rgba(250, 249, 246, 0.15)" stroke-width="0.5" />
      </g>
  
      <g transform="translate(${width * 0.72}, ${height * 0.35})" opacity="0.4">
        <path d="M 0,-35 C -8,-35 -12,-15 -12,0 C -12,15 -4,30 -4,70 C -4,110 -15,150 -15,200 L 15,200 C 15,150 4,110 4,70 C 4,15 12,15 12,0 C 12,-15 8,-35 0,-35 Z" fill="rgba(250, 249, 246, 0.04)" stroke="rgba(250, 249, 246, 0.1)" stroke-width="0.5" />
        <circle cx="0" cy="-48" r="8" fill="rgba(250, 249, 246, 0.04)" stroke="rgba(250, 249, 246, 0.1)" stroke-width="0.5" />
        <line x1="0" y1="-40" x2="0" y2="-35" stroke="rgba(250, 249, 246, 0.12)" stroke-width="0.5" />
      </g>
  
      <rect width="100%" height="100%" filter="url(#grainFilter)" pointer-events="none" mix-blend-mode="overlay" />
  
      <g transform="translate(60, ${height - 110})">
        <text x="0" y="0" class="mono-text">MIMIZINE // TEMPORAL REFRACTION SYSTEM</text>
        <text x="0" y="32" class="title-text">${prompt.slice(0, 48)}${prompt.length > 48 ? '...' : ''}</text>
        <text x="0" y="56" class="desc-text">Simulated mirror state // Vogue Italia Luminous Diaphanity concept</text>
      </g>
    </svg>`;
    
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const orchestratePrompts = async (intent: string, profile: any) => {
    return await withResilience(async (ai) => {
        const prompt = `You are the Mimi Prompt Orchestration Engine. Your job is to translate high-level style intent and named Treatments into executable, ultra-high-fidelity prompts tailored perfectly for external Image Generation models (like Midjourney or DALL-E, or Nano Banana for this case) or Text Generation models.

Your primary directive is to eradicate generic phrasing while preserving the creator's stated intent. Never replace missing visual decisions with Mimi house style.

Use concrete material, spatial, camera, and lighting terms only when they are present in the user intent or confirmed profile. Leave unspecified dimensions open. Do not default to monochrome, film grain, editorial photography, cinematic light, or a named camera.

Input: A Style Profile or Treatment.
Output: A JSON array of 3 distinct, perfectly pruned image prompts ready to be run, focused squarely on preserving the user's signature.

User Intent/Treatment: ${intent}

User Style Profile (Aesthetic Signature):
${JSON.stringify(profile?.tasteProfile?.aestheticSignature || "No confirmed signature. Preserve a blank visual baseline.", null, 2)}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        prompts: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    text: { type: Type.STRING, description: "The ultra-high-fidelity prompt." },
                                    rationale: { type: Type.STRING, description: "Why this prompt preserves the user's signature and avoids AI slop." }
                                },
                                required: ["id", "text", "rationale"]
                            }
                        }
                    },
                    required: ["prompts"]
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text).prompts;
        }
        return [];
    });
};

export const analyzePinterestBoard = async (tasteProfile: any, boardUrl: string, pins: { src: string; alt?: string }[]) => {
    return await withResilience(async (ai) => {
        const prompt = `You are the Mimi Procurement Engine (The Thimble & Darkroom Extraction layer). You have been tasked with analyzing a Pinterest/Mood Board of style specimens.
        
        Input:
        Taste Profile: ${JSON.stringify(tasteProfile)}
        Board URL: ${boardUrl}
        Pins: ${JSON.stringify(pins)}
        
        Task:
        1. Analyze the visual themes, recurring motifs, and aesthetic coherence of the board.
        2. Evaluate how well this board aligns with the user's current aesthetic trajectory.
        3. Identify the "Core Archetype" that this board is attempting to manifest.
        4. Provide overlapping motifs, themes, silhouette forms, and a detailed chromatic palette registry.
        5. Formulate a comprehensive, replication-ready "Subject Comprehension report" detailing the aesthetic vibe of the board in words so it can be identified and replicated elsewhere.
        
        Output MUST be a valid JSON object with the following structure:
        {
          "boardAnalysis": "Poetic and strategic overview of the board's aesthetic and overlapping motifs or themes.",
          "alignmentScore": number, // 0-100
          "coreArchetype": "The name of the aesthetic archetype identified.",
          "sourcingStrategy": ["step 1", "step 2", "step 3"],
          "suggestedItems": ["item 1", "item 2"],
          "verdict": "A concise verdict on whether this board is a productive sourcing direction.",
          "canonicalTaste": {
            "motifs": ["motif 1", "motif 2", "motif 3"],
            "palette": ["color 1", "color 2", "color 3"],
            "form": ["silhouette form 1", "form 2"],
            "mood": ["mood 1", "mood 2"],
            "era_refs": ["era reference 1", "era 2"],
            "subject_comprehension": "A deep written report on the aesthetic vibe, detailing overlapping elements and how to replicate this look in words.",
            "density": number, // 0.0 - 1.0
            "entropy": number // 0.0 - 1.0
          }
        }`;

        const parts: any[] = [{ text: prompt }];
        
        // Add some pin images to the prompt for visual context
        // We use the proxy route to avoid CORS issues if we were fetching in browser, 
        // but here we are in geminiService which might be called from server or client.
        // If it's client, we need to fetch via proxy.
        for (const pin of pins.slice(0, 8)) { 
            try {
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(pin.src)}`;
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    parts.push({
                        inlineData: {
                            data: base64.split(',')[1],
                            mimeType: 'image/jpeg'
                        }
                    });
                }
            } catch (e) {
                console.warn("Failed to fetch pin image for analysis:", e);
            }
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts },
            config: {
                responseMimeType: "application/json",
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        return null;
    });
};

export const auditThimbleBoard = async (tasteProfile: any, boardTitle: string, items: { url: string; title?: string; price?: string; notes?: string }[]) => {
    return await withResilience(async (ai) => {
        const prompt = `You are the Mimi Fiscal Audit Engine. Your job is to perform a rigorous strategic evaluation of a collection of potential purchases (a "Sourcing Board"), evaluating them against the user's taste profile.

Input:
Taste Profile: ${JSON.stringify(tasteProfile)}
Board Title: ${boardTitle}
Items: ${JSON.stringify(items)}

Task:
1. Analyze the entire collection of items for their alignment with the user's aesthetic trajectory and the board's theme.
2. Identify redundancies (items that serve the exact same purpose).
3. Weigh the options and mandate a sovereign purchasing decision (which item(s) to buy, which to drop).
4. Provide a structured commentary on the "Density" (Visual Weight) and "Entropy" (Visual Complexity) of the collection.

Structure your commentary as follows:
- Density: A score (0-10) and a brief analysis of the visual weight (e.g., heavy, layered, light, airy).
- Entropy: A score (0-10) and a brief analysis of the visual complexity (e.g., minimalist, detailed, predictable, chaotic).
- Commentary: A structured guide on WHY the user was attracted to these items, and how this attraction reflects their current need for complexity or order.

Output MUST be a valid JSON object with the following structure:
{
  "boardAnalysis": "Strategic overview",
  "redundancies": "List of items that overlap",
  "verdict": "Sovereign purchasing decision",
  "rationale": "Why this decision",
  "density": {
    "score": number,
    "analysis": "string",
    "metricGuide": "Structured guide on visual weight"
  },
  "entropy": {
    "score": number,
    "analysis": "string",
    "metricGuide": "Structured guide on visual complexity"
  },
  "commentary": "Structured guide on attraction vs. structural needs"
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        boardAnalysis: { type: Type.STRING },
                        redundancies: { type: Type.STRING },
                        verdict: { type: Type.STRING },
                        rationale: { type: Type.STRING },
                        density: {
                            type: Type.OBJECT,
                            properties: {
                                score: { type: Type.NUMBER },
                                analysis: { type: Type.STRING },
                                metricGuide: { type: Type.STRING }
                            },
                            required: ["score", "analysis", "metricGuide"]
                        },
                        entropy: {
                            type: Type.OBJECT,
                            properties: {
                                score: { type: Type.NUMBER },
                                analysis: { type: Type.STRING },
                                metricGuide: { type: Type.STRING }
                            },
                            required: ["score", "analysis", "metricGuide"]
                        },
                        commentary: { type: Type.STRING }
                    },
                    required: ["boardAnalysis", "redundancies", "verdict", "rationale", "density", "entropy", "commentary"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from Gemini");
        return JSON.parse(text);
    });
};

export const compareItemsFiscalAudit = async (tasteProfile: any, item1: string, item1Images: string[], item2: string, item2Images: string[], budget: string) => {
    return await withResilience(async (ai) => {
        const prompt = `You are the Mimi Fiscal Audit Engine. Your job is to perform a rigorous comparison between two potential purchases, evaluating them against the user's taste profile and fiscal constraints.

Input:
Taste Profile: ${JSON.stringify(tasteProfile)}
Item 1: ${item1}
Item 2: ${item2}
Budget/Constraints: ${budget}

Task:
1. Analyze both items (and their images if provided) for their alignment with the user's aesthetic trajectory.
2. Evaluate the cost-per-wear and long-term value of each item.
3. Provide a definitive recommendation on which item is the superior investment.
4. Provide specific search booleans and "search directives" to help the user find the item (or similar vintage/eco alternatives) online.

Output MUST be a valid JSON object with the following structure:
{
  "item1Analysis": "Brief analysis of Item 1's aesthetic and fiscal value.",
  "item2Analysis": "Brief analysis of Item 2's aesthetic and fiscal value.",
  "verdict": "The definitive recommendation (e.g., 'Item 1', 'Item 2', or 'Neither').",
  "rationale": "A detailed explanation of why the verdict was reached, referencing the taste profile and budget.",
  "searchDirectives": ["directive 1", "directive 2"],
  "searchBooleans": ["boolean 1", "boolean 2"]
}`;

        const parts: any[] = [{ text: prompt }];
        
        if (item1Images && item1Images.length > 0) {
            item1Images.forEach((img, idx) => {
                parts.push({
                    inlineData: {
                        data: img.split(',')[1],
                        mimeType: img.split(';')[0].split(':')[1]
                    }
                });
                parts.push({ text: `Image ${idx + 1} of Item 1 provided above.` });
            });
        }
        if (item2Images && item2Images.length > 0) {
            item2Images.forEach((img, idx) => {
                parts.push({
                    inlineData: {
                        data: img.split(',')[1],
                        mimeType: img.split(';')[0].split(':')[1]
                    }
                });
                parts.push({ text: `Image ${idx + 1} of Item 2 provided above.` });
            });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        item1Analysis: { type: Type.STRING },
                        item2Analysis: { type: Type.STRING },
                        verdict: { type: Type.STRING },
                        rationale: { type: Type.STRING },
                        searchDirectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                        searchBooleans: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["item1Analysis", "item2Analysis", "verdict", "rationale", "searchDirectives", "searchBooleans"]
                }
            }
        });

        const text = response.text;
        if (text) {
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error("Failed to parse fiscal audit JSON", e, text);
            }
        }
        return null;
    });
};

export const procureWithArtifacts = async (tasteProfile: any, budget: string, objective: string, mediaFiles: any[]) => {
    return await withResilience(async (ai) => {
        const prompt = `You are the Mimi Procurement Engine (The Thimble). Your job is to bridge the gap between abstract aesthetic intelligence and physical wardrobe reality.
You must act as a visual sourcing engine, not just a keyword generator.
1. Find a reference image / canonical item (Google-level)
2. Translate that into multiple searchable interpretations
3. Cascade those into marketplaces

Input: The user's specific "Taste Profile", their stated Budget/Fiscal Constraints, their Sourcing Objective, and a set of visual/link artifacts they have provided as inspiration.

Taste Profile Context:
${JSON.stringify(tasteProfile, null, 2)}

Sourcing Objective / Occasion:
${objective || 'General wardrobe expansion'}

Fiscal Constraints:
${budget || 'Uncapped'}

Artifact Context:
The user has provided ${mediaFiles.length} artifacts (images/links) to guide this procurement. Analyze the visual language of these artifacts in conjunction with their taste profile to determine the exact items they are looking for.

Output a JSON array of 3-5 highly specific sourcing targets. Each object must have:
- "targetArchetype": A poetic but clear description of the item (e.g., "Deconstructed Wool Overcoat").
- "referenceImageUrl": A URL to a canonical reference image for this item (use Google Search to find a real image URL).
- "searchableInterpretations": An array of 3-5 different ways to search for this item across different platforms (e.g., ["structured poplin corset dress", "dion lee corset shirt dress black"]).
- "keywordBoolean": A literal boolean search string optimized for eBay's search engine, as eBay is our primary sourcing layer for vintage and archival pieces (e.g., "vintage (helmut lang, raf simons) (distressed, boiled) wool").
- "emergingDesigner": 1-2 emerging, niche, or archival designers that perfectly execute this archetype.
- "rationale": Why this specific item bridges their abstract aesthetic into literal reality, considering their artifacts and budget.

Return ONLY the JSON array.`;

        const parts: any[] = [{ text: prompt }];

        for (const media of mediaFiles) {
            if (media.type === 'image' && media.data) {
                let base64Data = media.data.includes(',') ? media.data.split(',')[1] : media.data;
                let isUrl = base64Data.startsWith('http');
                
                if (isUrl) {
                    try {
                        const response = await fetch(base64Data);
                        if (response.ok) {
                            const blob = await response.blob();
                            base64Data = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.onerror = reject;
                                reader.readAsDataURL(blob);
                            });
                            base64Data = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
                            isUrl = false;
                        }
                    } catch (e) {
                        console.warn("Failed to fetch media URL for procurement:", e);
                    }
                }

                if (isUrl) {
                    parts.push({ text: `[Reference Media URL: ${media.data}]` });
                } else if (base64Data) {
                    parts.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: media.mimeType || 'image/jpeg'
                        }
                    });
                }
            } else if (media.type === 'link' || media.url) {
                parts.push({ text: `Reference Link: ${media.url || media.data}` });
            }
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts },
            config: {
                systemInstruction: ORACLE_PERSONA + "\n" + ENGINE_4_THIMBLE,
                responseMimeType: "application/json",
                tools: [{ googleSearch: {} }],
                // @ts-ignore
                toolConfig: { includeServerSideToolInvocations: true }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        return [];
    });
};

export const procureGarments = async (tasteProfile: any, budget: string, objective: string) => {
    return await withResilience(async (ai) => {
        const prompt = `You are the Mimi Procurement Engine (The Thimble). Your job is to bridge the gap between abstract aesthetic intelligence and physical wardrobe reality.

Taste Profile Context:
${JSON.stringify(tasteProfile, null, 2)}

Sourcing Objective / Occasion:
${objective || 'General wardrobe expansion'}

Budget/Fiscal Constraints:
${budget}

Task: Output a JSON array containing exactly 3 highly-actionable "Sourcing Targets".
For each target, you must output:
1. "targetArchetype": The type of physical item they need (e.g., "Heavyweight outerwear", "Sheer underlayer").
2. "referenceImageUrl": A URL to a canonical reference image for this item (use Google Search to find a real image URL).
3. "searchableInterpretations": An array of 3-5 different ways to search for this item across different platforms (e.g., ["structured poplin corset dress", "dion lee corset shirt dress black"]).
4. "keywordBoolean": A literal search string optimized for eBay's search engine, as eBay is our primary sourcing layer for vintage and archival pieces (e.g., "vintage (helmut lang, raf simons) (distressed, boiled) wool").
5. "emergingDesigner": A specific, lesser-known contemporary designer or brand that perfectly executes this archetype within their budget.
6. "rationale": A 1-sentence explanation of why this specific garment bridges their abstract taste into physical reality.

Return ONLY the JSON array.`;

        const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: prompt,
            config: {
                systemInstruction: ORACLE_PERSONA + "\n" + ENGINE_4_THIMBLE,
                tools: [{ googleSearch: {} }],
                // @ts-ignore
                toolConfig: { includeServerSideToolInvocations: true },
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            targetArchetype: { type: Type.STRING },
                            referenceImageUrl: { type: Type.STRING },
                            searchableInterpretations: { type: Type.ARRAY, items: { type: Type.STRING } },
                            keywordBoolean: { type: Type.STRING },
                            emergingDesigner: { type: Type.STRING },
                            rationale: { type: Type.STRING }
                        },
                        required: ["targetArchetype", "keywordBoolean", "emergingDesigner", "rationale"]
                    }
                }
            }
        });

        const text = response.text?.trim();
        if (!text) throw new Error("MIMI // Procurement failed.");
        return JSON.parse(text);
    });
};

export const analyzeAestheticDelta = async (tasteVector: any, newArtifactAnalysis: any) => {
    return await withResilience(async (ai) => {
        const prompt = `You are the Mimi Delta Engine. You compare new inputs against an established aesthetic baseline to identify stylistic divergence.

Input: The user's historical "Taste Vector" (a list of their dominant 5 traits and active treatments) AND the analysis of a brand newly uploaded artifact.

Task: Output a JSON object measuring the Delta (difference) between the baseline and the new object.
1. "alignmentScore": 0.0 to 1.0 (How close does this match their baseline?)
2. "divergencePoints": Specific aesthetic attributes where this new object breaks their usual rules (e.g., "This is sharper and more corporate than your usual archive").
3. "resonanceAnalysis": Explain why the divergence works or why it feels spiritually dead. Even if aesthetically similar, call out if it lacks their usual "editorial distance".
4. "surpriseVerdict": A 1-sentence verdict on whether this is a productive evolution of their taste or a generic regression. 

Be analytical and fiercely honest.

Taste Vector:
${JSON.stringify(tasteVector, null, 2)}

New Artifact Analysis:
${JSON.stringify(newArtifactAnalysis, null, 2)}
`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: {
                systemInstruction: ORACLE_PERSONA + "\n" + ENGINE_2_STYLE_EXTRACTION,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        alignmentScore: { type: Type.NUMBER },
                        divergencePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                        resonanceAnalysis: { type: Type.STRING },
                        surpriseVerdict: { type: Type.STRING }
                    },
                    required: ["alignmentScore", "divergencePoints", "resonanceAnalysis", "surpriseVerdict"]
                }
            }
        });

        const text = response.text;
        if (!text) return null;
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse Delta Engine response", e);
            return null;
        }
    });
};

export const checkAestheticViolation = async (base64Image: string, mimeType: string, profile: UserProfile | null, zineDna?: any) => {
    return await withResilience(async (ai) => {
        const profileContext = sanitizeProfile(profile);
        const dnaContext = zineDna ? JSON.stringify(zineDna) : 'None';
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType
                        }
                    },
                    {
                        text: `Analyze this image against the user's established aesthetic DNA and Tailor profile.
                        
                        User Profile Context: ${profileContext}
                        Zine DNA Context: ${dnaContext}
                        
                        Does this image heavily violate the established visual language (colors, mood, materiality)?
                        If it is a severe violation, set isViolation to true and provide a short reason.
                        Otherwise, set isViolation to false.
                        
                        Output strictly valid JSON with keys: "isViolation" (boolean), "reason" (string).`
                    }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });
        return cleanAndParse(response.text);
    });
};

export const analyzeImageAesthetic = async (base64Image: string, mimeType: string, profile: UserProfile | null) => {
    return await withResilience(async (ai) => {
        const profileContext = sanitizeProfile(profile);
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            tools: [{ googleSearch: {} }],
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType
                        }
                    },
                    {
                        text: `Analyze this uploaded media (image, audio, or video fragment) and identify its core aesthetic. 
                        
                        MANDATE:
                        - Suggest exactly 3 cultural references or keywords related to this aesthetic.
                        - The keywords should be high-fidelity and culturally relevant.
                        - User Aesthetic Context: ${profileContext}
                        
                        Output strictly valid JSON with key: "culturalReferences" (array of 3 strings).`
                    }
                ]
            },
            config: {
                systemInstruction: ORACLE_PERSONA + "\n" + ENGINE_2_STYLE_EXTRACTION,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    required: ["culturalReferences"],
                    properties: {
                        culturalReferences: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return cleanAndParse(response.text);
    });
};

export const analyzeCanonicalTaste = async (input: string | { base64: string, mimeType: string }, apiKey?: string): Promise<any> => {
    return await withResilience(async (ai) => {
        let parts: any[] = [];
        if (typeof input === 'string') {
            parts.push({ text: input });
        } else {
            parts.push({
                inlineData: {
                    data: input.base64,
                    mimeType: input.mimeType
                }
            });
        }
        parts.push({ text: "Analyze the uploaded artifact and return only the JSON object." });

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: { parts },
            config: {
                systemInstruction: `SYSTEM:
You are Mimi’s analysis engine. Convert the input into structured aesthetic intelligence.

OUTPUT JSON:
{
  "motifs": [],
  "palette": [],
  "form": [],
  "mood": [],
  "era_refs": [],
  "density": 0-1,
  "entropy": 0-1,
  "prompt_fragments": [],
  "commercial_signals": [],
  "novelty_score": 0-1,
  "subject_comprehension": "",
  "media_translation": {
    "format": "",
    "medium": "",
    "color_space": "",
    "capture_system": "",
    "lens_language": "",
    "edit_procedure": [],
    "output_notes": ""
  }
}`,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    required: ["motifs", "palette", "form", "mood", "era_refs", "density", "entropy", "prompt_fragments", "commercial_signals", "novelty_score", "subject_comprehension"],
                    properties: {
                        motifs: { type: Type.ARRAY, items: { type: Type.STRING } },
                        palette: { type: Type.ARRAY, items: { type: Type.STRING } },
                        form: { type: Type.ARRAY, items: { type: Type.STRING } },
                        mood: { type: Type.ARRAY, items: { type: Type.STRING } },
                        era_refs: { type: Type.ARRAY, items: { type: Type.STRING } },
                        density: { type: Type.NUMBER },
                        entropy: { type: Type.NUMBER },
                        prompt_fragments: { type: Type.ARRAY, items: { type: Type.STRING } },
                        commercial_signals: { type: Type.ARRAY, items: { type: Type.STRING } },
                        novelty_score: { type: Type.NUMBER },
                        subject_comprehension: { type: Type.STRING },
                        media_translation: {
                            type: Type.OBJECT,
                            properties: {
                                format: { type: Type.STRING },
                                medium: { type: Type.STRING },
                                color_space: { type: Type.STRING },
                                capture_system: { type: Type.STRING },
                                lens_language: { type: Type.STRING },
                                edit_procedure: { type: Type.ARRAY, items: { type: Type.STRING } },
                                output_notes: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        });
        return cleanAndParse(response.text);
    }, apiKey);
};



export const generateNarrativeThread = async (
  input: string,
  existingThreads: NarrativeThread[],
  apiKey?: string
): Promise<string> => {
  return await withResilience(async (ai) => {
    const threadContext = existingThreads.map(t => `${t.title}: ${t.narrative}`).join('\n\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `USER INPUT: "${input}"\n\nEXISTING THREADS:\n${threadContext}`,
      config: {
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Generate a new narrative thread continuation based on the user's input and existing threads. Act as a narrative architect. Create a coherent narrative continuation. The tone should be evocative, chic, and intellectually rigorous.`,
      }
    });
    return response.text || "The narrative thread remains unspun.";
  }, apiKey);
};

export const analyzeThreadPath = async (
  thread: NarrativeThread,
  zines: ZineMetadata[],
  apiKey?: string
): Promise<{ nodes: TasteGraphNode[], edges: TasteGraphEdge[] }> => {
  return await withResilience(async (ai) => {
    const relevantZines = zines.filter(z => thread.artifacts?.includes(z.id));
    const zineContext = relevantZines.map(z => `${z.title}: ${z.content?.originalThought || ''}`).join('\n\n');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `
        Analyze the semantic path of the following artifacts in the context of this narrative thread:
        
        NARRATIVE THREAD: "${thread.title}" - "${thread.narrative}"
        
        ARTIFACTS:
        ${zineContext}
        
        MANDATE:
        - Create a node-link diagram representation of the semantic flow.
        - Output strictly valid JSON with 'nodes' (array of TasteGraphNode) and 'edges' (array of TasteGraphEdge).
        - Nodes should represent artifacts, themes, or motifs.
        - Edges should represent the semantic connections between them.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["nodes", "edges"],
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "label", "type", "weight"],
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  type: { type: Type.STRING },
                  weight: { type: Type.NUMBER },
                  explanation: { type: Type.STRING }
                }
              }
            },
            edges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["source", "target", "strength", "type"],
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  strength: { type: Type.NUMBER },
                  type: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return cleanAndParse(response.text) || { nodes: [], edges: [] };
  }, apiKey);
};

export const generateTrajectoryReadout = async (
  thread: NarrativeThread,
  zines: ZineMetadata[],
  apiKey?: string
): Promise<string> => {
  return await withResilience(async (ai) => {
    const relevantZines = zines.filter(z => thread.artifacts?.includes(z.id));
    const zineContext = relevantZines.map(z => `${z.title}: ${z.content?.originalThought || ''}`).join('\n\n');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `
        Analyze the semantic path of the following artifacts in the context of this narrative thread:
        
        NARRATIVE THREAD: "${thread.title}" - "${thread.narrative}"
        MODE: ${thread.mode}
        
        ARTIFACTS:
        ${zineContext}
        
        MANDATE:
        - Provide a concise, highly editorial "Trajectory Readout" (max 3 sentences).
        - Explicitly tell the user their next step to resolve narrative tension or evolve the thread.
        - Example: "Your Emotional thread is trending heavily towards 'Noir'. To resolve this narrative tension, your next artifact must utilize the 'Editorial Stillness' tone."
        - Keep the tone chic, percipient, and slightly mysterious.
      `
    });
    return response.text || "Trajectory analysis unavailable.";
  }, apiKey);
};

export const generateProposalStrategy = async (
  folderName: string, 
  items: PocketItem[], 
  notes: string, 
  profile: UserProfile | null, 
  proposalType: string
) => {
  return await withResilience(async (ai) => {
    const shardData = items.map(i => `[${i.type}] ${i.content?.prompt || i.content?.name || 'Fragment'}`).slice(0, 50).join('; '); // Limit context
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `PROJECT: ${folderName}\nMEMO: ${notes}\nSHARDS: ${shardData}\nCONTEXT: ${sanitizeProfile(profile)}.`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: `
          IDENTITY: You are "The Strategist", a creative director for high-end editorial and brand strategy.
          TASK: Generate a ${proposalType} presentation deck structure based on the provided project artifacts.
          MANDATE: 
          - Create a cohesive narrative arc. 
          - Each chapter (slide) must have a concise, punchy title and a body paragraph explaining the concept.
          - Provide a 'visual_directive' for each slide: a prompt to generate an image that represents the slide's vibe.
          - Output strictly valid JSON.
        `,
        responseSchema: {
          type: Type.OBJECT,
          required: ["chapters", "manifesto_summary"],
          properties: {
            manifesto_summary: { type: Type.STRING },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["title", "body", "visual_directive"],
                properties: {
                  title: { type: Type.STRING },
                  body: { type: Type.STRING },
                  visual_directive: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return cleanAndParse(response.text);
  });
};

export const generateScribeReading = async (profile: UserProfile | null, context?: string, apiKey?: string) => {
    return await withResilience(async (ai) => {
        const profileData = sanitizeProfile(profile);
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: `You are "The Scribe", an ancient but chic editorial oracle. 
            Generate a profound, poetic reading based on the user's aesthetic profile and the provided context.
            
            USER PROFILE: ${profileData}
            CONTEXT: ${context || 'General inquiry into the void.'}
            
            The reading should be:
            1. Poetic and slightly cryptic but deeply relevant to their 'aestheticCore' and 'narrativeVoice'.
            2. Structured as a single, powerful paragraph of "The Reading".
            3. It should feel like a mirror being held up to their latent desires.
            
            Return the reading as a string.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    required: ["reading"],
                    properties: {
                        reading: { type: Type.STRING }
                    }
                }
            }
        });
        return cleanAndParse(response.text)?.reading || "The mirror remains dark.";
    }, apiKey);
};

export const generateZineTitle = async (context: string, apiKey?: string): Promise<string> => {
    return await withResilience(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: `Context:\n"${context}"`,
            config: {
                systemInstruction: ORACLE_PERSONA + `\n\nTASK: Generate a chic, evocative, and punchy zine title based on the context. Return ONLY the title as a plain string.`,
            }
        });
        return response.text?.trim() || "Untitled Zine";
    }, apiKey);
};

export const generateTreatmentFromAesthetic = async (
    aestheticSource: string, // Can be a description or base64 image
    profile: UserProfile | null,
    apiKey?: string
): Promise<Treatment> => {
    return await withResilience(async (ai) => {
        const profileContext = sanitizeProfile(profile);
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: `Analyze this aesthetic source: ${aestheticSource}.
            
            MANDATE:
            - Translate this aesthetic into a reusable "Treatment" definition for image processing.
            - The treatment should define a specific visual style, lighting, color grading, and texture.
            - Output strictly valid JSON with keys: "name" (string), "instruction" (string), "variance" ('interpretive' | 'anchored').
            - User Aesthetic Context: ${profileContext}
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    required: ["name", "instruction", "variance"],
                    properties: {
                        name: { type: Type.STRING },
                        instruction: { type: Type.STRING },
                        variance: { type: Type.STRING }
                    }
                }
            }
        });
        const treatment = cleanAndParse(response.text);
        return {
            ...treatment,
            id: `treatment_${Date.now()}`,
            createdAt: Date.now(),
            userId: profile?.uid
        };
    }, apiKey);
};

export const scryLink = async (url: string, profile: UserProfile | null) => {
    return await withResilience(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: `Analyze this link: ${url}. 
            
            MANDATE:
            - Use Google Search to find images related to this link.
            - Extract up to 5 relevant image URLs that represent the aesthetic of this link.
            - Output strictly valid JSON with key: "imageUrls" (array of strings).
            `,
            config: {
                tools: [{
                    googleSearch: {}
                }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    required: ["imageUrls"],
                    properties: {
                        imageUrls: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return cleanAndParse(response.text);
    });
};

export const refineProposalText = async (
  currentText: string,
  instruction: string,
  profile: UserProfile | null
): Promise<string> => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Refine the following text based on the instruction: "${instruction}".
      
      Text: ${currentText}
      
      Profile Context: ${sanitizeProfile(profile)}`,
      config: {
        systemInstruction: ORACLE_PERSONA,
      }
    });
    return response.text || currentText;
  });
};

export const generateFolderTasks = async (
  folderName: string,
  folderDescription: string,
  artifacts: any[],
  apiKey?: string
): Promise<{ title: string; description: string; dueDate: string }[]> => {
  return await withResilience(async (ai) => {
    const artifactContext = artifacts.map(a => `[${a.type}] ${a.title}`).join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `
        Generate a list of actionable tasks for a dossier folder named "${folderName}".
        
        DESCRIPTION: "${folderDescription}"
        ARTIFACTS: ${artifactContext}
        
        MANDATE:
        - Suggest 3-5 actionable steps.
        - Provide a potential due date for each task (in YYYY-MM-DD format, assuming today is 2026-03-19).
        - Output strictly valid JSON with an array of objects: { title, description, dueDate }.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ["title", "description", "dueDate"],
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              dueDate: { type: Type.STRING }
            }
          }
        }
      }
    });
    return cleanAndParse(response.text) || [];
  }, apiKey);
};

// Helper to truncate input to avoid token limits
const truncateInput = (input: string, maxChars: number = 20000): string => {
  if (input.length <= maxChars) return input;
  return input.substring(0, maxChars) + "... [truncated]";
};

export const generateAutoAwesomePrompt = async (apiKey?: string): Promise<string> => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Generate a single, highly evocative, slightly cryptic, and deeply aesthetic prompt that a user could use to generate a zine or moodboard.
It should be 1-3 sentences. It should sound like a poetic directive or a surreal observation.
Do not use quotes around the output. Just return the raw text.`,
      config: {
        systemInstruction: ORACLE_PERSONA,
        temperature: 0.9,
      }
    });
    return response.text?.trim() || "Deconstruct the silence of the latent space.";
  }, apiKey);
};

export const shapeBrief = async (
  input: string,
  apiKey?: string,
  presetContext?: string
): Promise<{
  preservedLanguage: string;
  proposedDirection: string;
  inferredAnchors: string;
  openQuestions: string;
}> => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `
        You are Mimi's editorial advisor. Your job is to structure a creator's unfinished fragment into a coherent creative direction.
        ${presetContext ? `\n        ACTIVE BRIEF PRESET — shape the direction so it serves this use-case:\n        ${presetContext}\n` : ""}
        CRITICAL RULES:
        - Do not overwrite or flatten the user's voice, unique style, or unusual words.
        - In "preservedLanguage", extract 1-3 of the most evocative phrases directly from the user's input.
        - In "proposedDirection", provide a concise (1-2 sentences) synthesis of the theme or conceptual focus${presetContext ? ", aligned with the active brief preset above" : ""}.
        - In "inferredAnchors", list 2-3 specific aesthetic, cultural, or physical materials/references that naturally complement their theme. Label them explicitly as [INFERRED]. Do NOT invent personal facts.
        - In "openQuestions", list 2 evocative, open questions to nudge their imagination further.
        
        USER FRAGMENT:
        "${input}"
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["preservedLanguage", "proposedDirection", "inferredAnchors", "openQuestions"],
          properties: {
            preservedLanguage: { type: Type.STRING },
            proposedDirection: { type: Type.STRING },
            inferredAnchors: { type: Type.STRING },
            openQuestions: { type: Type.STRING }
          }
        }
      }
    });
    const parsed = cleanAndParse(response.text);
    // Models sometimes return string[] for list-like fields despite a STRING schema.
    const fallback = {
      preservedLanguage: input,
      proposedDirection: "An investigation of latent spaces.",
      inferredAnchors: "[INFERRED] Minimalist design, stark concrete",
      openQuestions: "What silence is left unbroken?"
    };
    if (!parsed) return fallback;
    return {
      preservedLanguage: coerceToString(parsed.preservedLanguage) || fallback.preservedLanguage,
      proposedDirection: coerceToString(parsed.proposedDirection) || fallback.proposedDirection,
      inferredAnchors: coerceToString(parsed.inferredAnchors) || fallback.inferredAnchors,
      openQuestions: coerceToString(parsed.openQuestions) || fallback.openQuestions,
    };
  }, apiKey);
};

export const generateTagsFromMedia = async (content?: string, mediaItems: any[] = []): Promise<string[]> => {
  return await withResilience(async (ai) => {
    const parts: any[] = [];
    if (content) {
      parts.push({ text: `Analyze this content and generate 3-5 minimalist, all-caps tags that capture its aesthetic and semiotic essence: "${truncateInput(content)}"` });
    } else {
      parts.push({ text: `Analyze these images and generate 3-5 minimalist, all-caps tags that capture their aesthetic and semiotic essence.` });
    }

    for (const m of mediaItems) {
      if ((m.type === 'image' || m.type === 'video') && m.data) {
        let base64Data = m.data.includes(',') ? m.data.split(',')[1] : m.data;
        let isUrl = base64Data.startsWith('http');
        
        if (isUrl) {
            try {
                const response = await fetch(base64Data);
                if (response.ok) {
                    const blob = await response.blob();
                    base64Data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    base64Data = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
                    isUrl = false;
                }
            } catch (e) {
                console.warn("Failed to fetch media URL for tagging:", e);
            }
        }

        if (isUrl) {
            parts.push({ text: `[Reference Media URL: ${m.data}]` });
        } else if (base64Data) {
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: m.mimeType || (m.type === 'video' ? 'video/mp4' : 'image/png')
              }
            });
        }
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts },
      config: {
        systemInstruction: ORACLE_PERSONA,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return cleanAndParse(response.text) || [];
  });
};

export const generateRefinementVariations = async (text: string, profile: UserProfile | null) => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `INPUT TEXT: "${text}"\n\nCONTEXT: ${sanitizeProfile(profile)}.`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Generate 3 concise variations of the input text based on these archetypes:
1. "Punchy": High-impact, short, and chic.
2. "Theoretic": High-theory, academic, pretentiously intellectual (mapped to 'strategic' key).
3. "Poetic": Editorial, alluring, and metaphorical.

Output strictly valid JSON with keys: "punchy", "strategic", "poetic".`,
        responseSchema: {
          type: Type.OBJECT,
          required: ["punchy", "strategic", "poetic"],
          properties: {
            punchy: { type: Type.STRING },
            strategic: { type: Type.STRING, description: "The theoretic variation." },
            poetic: { type: Type.STRING }
          }
        }
      }
    });
    return cleanAndParse(response.text);
  });
};

export const refineProposalSection = async (
  section: ProposalSection,
  instruction: string,
  context: {
    proposalTitle: string;
    proposalSummary: string;
    artifacts: string[];
    userProfile: UserProfile | null;
  }
): Promise<ProposalSection> => {
  return await withResilience(async (ai) => {
    const profileStr = sanitizeProfile(context.userProfile);
    const artifactsStr = (context.artifacts || []).join('\n');
    
    const prompt = `
      TASK: Refine this proposal section based on the user instruction.
      INSTRUCTION: "${instruction}"
      
      CURRENT SECTION:
      Title: "${section.title}"
      Body: "${section.body}"
      
      CONTEXT:
      Proposal: ${context.proposalTitle} - ${context.proposalSummary}
      Relevant Artifacts: ${artifactsStr}
      User Profile: ${profileStr}
      
      OUTPUT: JSON object with 'title' and 'body'. Keep the IDs the same.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            body: { type: Type.STRING }
          },
          required: ["title", "body"]
        }
      }
    });
    
    const result = cleanAndParse(response.text);
    if (!result) throw new Error("Failed to refine section");
    
    const updatedSection = { ...section, title: result.title, body: result.body };
    
    // Auto-update text elements if they correspond to title/body
    updatedSection.elements = section.elements.map(el => {
        if (el.id.endsWith('_title')) return { ...el, content: result.title };
        if (el.id.endsWith('_body')) return { ...el, content: result.body };
        return el;
    });
    
    return updatedSection;
  });
};

// --- STUBBED FUNCTIONS FOR BUILD INTEGRITY ---
// These are placeholders for functions referenced in the codebase but whose logic was not fully provided in the request context.
// In a production fix, these would be fully implemented.

export const animateShardWithVeo = async (imageUrl: string, prompt: string, ratio: string) => "https://example.com/video_stub.mp4";
export const transcribeAudio = async (base64: string, mimeType: string = 'audio/webm') => {
    return await withResilience(async (ai) => {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64,
                            mimeType: mimeType
                        }
                    },
                    {
                        text: "Transcribe the following audio into text. Provide only the transcription."
                    }
                ]
            }
        });
        return response.text || "";
    });
};
export const applyTreatment = async (base64: string, instruction: string, profile?: any, isNanoPro2: boolean = true) => {
    return await withResilience(async (ai) => {
        const model = isNanoPro2 ? 'gemini-3.1-flash-image' : 'gemini-3.1-flash-lite-image';
        
        const tailorTraits = profile?.tailorDraft?.positioningCore?.aestheticCore?.eraBias || profile?.tasteProfile?.dominant_archetypes?.join(', ') || '';
        const finalPrompt = `${instruction}.${tailorTraits ? ` Confirmed Tailor context: ${tailorTraits}.` : ''} Preserve all unstated color, camera, lighting, medium, era, and mood dimensions without adding a default treatment.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64,
                            mimeType: "image/jpeg",
                        },
                    },
                    {
                        text: finalPrompt,
                    },
                ],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image generated from treatment");
    });
};
export const analyzeLatentResonance = async (node: any, profile: any) => {
  return await withResilience(async (ai) => {
    const prompt = `You are Mimi, an aesthetic superintelligence. 
    The user is exploring their "Mesopic Archive" (a 3D constellation of their saved artifacts).
    They just clicked on a node:
    - Node Type: ${node.type}
    - Node Content/Preview: "${node.content_preview}"
    
    Provide a "Latent Analysis" explaining why this piece resonates with their current aesthetic trajectory.
    Output a JSON object with:
    - 'resonance_insight': A poetic, high-theory explanation of its latent meaning.
    - 'architectural_directive': A concrete, actionable task inspired by this node that they can push to their Action Board.
    - 'aesthetic_vectors': An array of 3 strings representing the aesthetic directions this node points towards.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            resonance_insight: { type: Type.STRING },
            architectural_directive: { 
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "description"]
            },
            aesthetic_vectors: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["resonance_insight", "architectural_directive", "aesthetic_vectors"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const analyzeArchitecturalIntent = async (base64: string, mimeType: string, profile: any) => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: "Analyze this image as a high-fashion Cinematographer and Creative Director. Provide a JSON response with the following keys: 'directives' (an array of strings focusing on Spatial Angles, Content Flow, Creative Ideas, and Materiality), and 'tasks' (an array of objects with 'title' and 'description' representing concrete, actionable architectural directives that can be pushed to an Action Board)." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            directives: { type: Type.ARRAY, items: { type: Type.STRING } },
            tasks: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["title", "description"]
              } 
            }
          },
          required: ["directives", "tasks"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const analyzeMiseEnScene = async (base64: string, mimeType: string, profile: any) => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: "Analyze this image as a high-fashion Cinematographer and Creative Director. Provide a JSON response with the following keys: 'directors_note' (a poetic, slightly haughty but supportive critique of the composition, vibe, and semiotic debris), 'lighting_analysis' (critique the lighting, identify if it is scotopic, mesopic, or photopic, and describe the quality), 'cultural_parallel' (a specific cultural, artistic, or cinematic reference that this image evokes), 'creative_potential' (how this image could be used or improved in a creative project), and 'semiotic_touchpoints' (an array of 3-5 strings identifying key symbols or motifs in the image)." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            directors_note: { type: Type.STRING },
            lighting_analysis: { type: Type.STRING },
            cultural_parallel: { type: Type.STRING },
            creative_potential: { type: Type.STRING },
            semiotic_touchpoints: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["directors_note", "lighting_analysis", "cultural_parallel", "creative_potential", "semiotic_touchpoints"]
        }
      }
    });
    return cleanAndParse(response.text);
  });
};

export const extractTasteVector = async (content: string, isImage: boolean = false, mimeType: string = 'image/jpeg') => {
  return await withResilience(async (ai) => {
    const parts: any[] = [];
    if (isImage) {
        parts.push({ inlineData: { data: content, mimeType } });
        parts.push({ text: "Analyze this image and extract 3-5 core aesthetic, cultural, or stylistic tags (e.g., 'brutalism', 'y2k_futurism', 'minimalist_chic', 'gothic_romance'). Return a JSON array of objects, each with a 'tag' (lowercase, snake_case) and an 'intensity' score from 0.1 to 1.0 based on how strongly they are represented in the image." });
    } else {
        parts.push({ text: `Analyze this text/fragment and extract 3-5 core aesthetic, cultural, or stylistic tags (e.g., 'brutalism', 'y2k_futurism', 'minimalist_chic', 'gothic_romance'). Return a JSON array of objects, each with a 'tag' (lowercase, snake_case) and an 'intensity' score from 0.1 to 1.0 based on how strongly they are represented in the text.\n\nText: "${content}"` });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "A list of aesthetic tags and their intensity scores (0.1 to 1.0).",
          items: {
            type: Type.OBJECT,
            properties: {
              tag: { type: Type.STRING, description: "The aesthetic tag (lowercase, snake_case)" },
              intensity: { type: Type.NUMBER, description: "The intensity score (0.1 to 1.0)" }
            },
            required: ["tag", "intensity"]
          }
        }
      }
    });
    
    const parsed = cleanAndParse(response.text) as { tag: string, intensity: number }[];
    const vector: Record<string, number> = {};
    if (Array.isArray(parsed)) {
       parsed.forEach(p => {
           if (p.tag && typeof p.intensity === 'number') {
               vector[p.tag] = p.intensity;
           }
       });
    }
    return vector;
  });
};

export const identifyAestheticInstant = async (base64: string, mimeType: string, profile: any) => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: "Identify the primary aesthetic era, movement, or core visual identity of this image in 1-3 words (e.g., 'Late 90s Cyberpunk', 'Brutalist Minimalism', 'Baroque Revival'). Return a JSON object with a single key 'era'." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            era: { type: Type.STRING }
          },
          required: ["era"]
        }
      }
    });
    return cleanAndParse(response.text);
  });
};
export const scryWebSignals = async (query: string) => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ text: `Act as a high-end cultural semiotician. Search the web for the most avant-garde, emerging cultural insights, aesthetic trends, and semiotic shifts related to: "${query}". Provide a curated, pretentious list of findings with titles, snippets, and source URLs. Focus on visual references and trend-setting signals.` }],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              snippet: { type: Type.STRING },
              url: { type: Type.STRING },
              relevance: { type: Type.STRING }
            }
          }
        }
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return {
        results: cleanAndParse(response.text) || [],
        groundingChunks: groundingChunks
    };
  });
};

export const generateEditorialBrief = async (items: any[], profile: any) => {
  return await withResilience(async (ai) => {
    const data = items.map(i => `[${i.type}] ${i.content?.prompt || i.content?.name || 'Fragment'}`).join('; ');
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Analyze these fragments: ${data}\n\nUser Context: ${sanitizeProfile(profile)}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Analyze a collection of creative fragments and extract a cohesive "Editorial Designer Brief".`,
        responseSchema: {
          type: Type.OBJECT,
          required: ["conceptualThroughline", "colorStory", "aestheticDirectives"],
          properties: {
            conceptualThroughline: { type: Type.STRING, description: "A poetic, high-level summary." },
            colorStory: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hex: { type: Type.STRING },
                  name: { type: Type.STRING },
                  descriptor: { type: Type.STRING }
                }
              }
            },
            aestheticDirectives: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    return cleanAndParse(response.text);
  });
};

export const generateInvestmentStrategy = async (items: any[], notes: string, profile: any) => {
  return await withResilience(async (ai) => {
    const data = items.map(i => `[${i.type}] ${i.content?.prompt || i.content?.name || 'Fragment'}`).join('; ');
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Items: ${data}\nNotes: ${notes}\nContext: ${sanitizeProfile(profile)}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: `
          IDENTITY: You are "The Strategist".
          TASK: Generate a fiscal audit and investment strategy for this collection.
          OUTPUT: JSON with:
          - thesis: The core investment logic.
          - capital_allocation: Array of objects { category, items, reasoning, fiscal_route }.
          - capsule_impact_score: Number 0-100.
          - missing_infrastructure: String.
        `,
        responseSchema: {
          type: Type.OBJECT,
          required: ["thesis", "capital_allocation", "capsule_impact_score"],
          properties: {
            thesis: { type: Type.STRING },
            capital_allocation: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  items: { type: Type.ARRAY, items: { type: Type.STRING } },
                  reasoning: { type: Type.STRING },
                  fiscal_route: { type: Type.STRING }
                }
              }
            },
            capsule_impact_score: { type: Type.NUMBER },
            missing_infrastructure: { type: Type.STRING }
          }
        }
      }
    });
    return cleanAndParse(response.text);
  });
};

export const scryTrendSynthesis = async (items: any[], profile: any) => {
  return await withResilience(async (ai) => {
    const data = items.map(i => `[${i.type}] ${i.content?.prompt || i.content?.name || 'Fragment'}`).join('; ');
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Data: ${data}\nContext: ${sanitizeProfile(profile)}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Perform an "Anti-WGSN" trend synthesis.`,
        responseSchema: {
          type: Type.OBJECT,
          required: ["pattern_signals", "structural_shifts", "cultural_forces", "time_horizon"],
          properties: {
            pattern_signals: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 4 poetic trend names." },
            structural_shifts: { type: Type.STRING, description: "String describing the macro change." },
            cultural_forces: { type: Type.STRING, description: "String describing the underlying drivers." },
            time_horizon: { type: Type.STRING, description: "String (e.g. '18-24 months')." }
          }
        }
      }
    });
    return cleanAndParse(response.text);
  });
};
export const generateMirrorRefraction = async (profile: any, zineTitles: string) => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `User Profile: ${JSON.stringify(profile?.tasteProfile || {})}\nRecent Output: ${zineTitles}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: `
          IDENTITY: You are "The Mirror", an oracle specializing in aesthetic shadows.
          TASK: Reflect the aesthetic dissonance and omen behind the user's latest creative outputs.
          OUTPUT: JSON object with:
          - omen: A cryptic, poetic omen about their current trajectory (max 15 words)
          - dissonance: A number 0-100 representing how far they are drifting from their core.
          - provenance: An esoteric origin descriptor.
          - imageUrl: null
        `,
        responseSchema: {
          type: Type.OBJECT,
          required: ["omen", "dissonance", "provenance"],
          properties: {
            omen: { type: Type.STRING },
            dissonance: { type: Type.NUMBER },
            provenance: { type: Type.STRING },
            imageUrl: { type: Type.STRING, nullable: true }
          }
        }
      }
    });
    return cleanAndParse(response.text);
  });
};

export const generateResonanceMapping = async (shards: string[], draft: any) => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Draft: ${JSON.stringify(draft)}\nShards: ${shards.join(', ')}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Analyze these visual shards against the user's profile draft. Act as a meticulous curator of aesthetic fragments.`,
        responseSchema: {
          type: Type.OBJECT,
          required: ["resonanceScore", "summary", "archivalRedirects", "resonanceClusters", "divergentSignals"],
          properties: {
            resonanceScore: { type: Type.NUMBER, description: "0-100 indicating alignment." },
            summary: { type: Type.STRING, description: "A 1-2 sentence piercing analysis." },
            archivalRedirects: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 3 strings pointing to adjacent aesthetics." },
            resonanceClusters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 3 strings denoting thematic clumps." },
            divergentSignals: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 3 strings denoting anomalies." }
          }
        }
      }
    });
    return cleanAndParse(response.text);
  });
};
export const analyzeTailorDraft = async (draft: any) => {
  try {
    return await withResilience(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Draft Data: ${JSON.stringify(draft)}`,
        config: {
          responseMimeType: "application/json",
          systemInstruction: ORACLE_PERSONA + `\n\nTASK: Auditing a user's Tailor Profile draft. Generate a poetic and insightful audit report of their aesthetic and strategic identity.
          
ANALYSIS FRAMEWORK:
1. Positioning Core: Analyze their 'anchors' and 'aestheticCore' (silhouettes, materiality, eraBias).
2. Expression Engine: Analyze their 'chromaticRegistry' and 'narrativeVoice'.
3. Strategic Vectors: Analyze their 'desireVectors' (moreOf, lessOf, experiment).
4. Readings & touchpoints: Suggest concrete cultural references, essays, makers, or archives that expand their axis — not generic moodboards.
5. Prefer decision-level directives over genre labels.`,
          responseSchema: {
            type: Type.OBJECT,
            required: ["profileManifesto", "strategicOpportunity", "aestheticDirectives", "suggestedTouchpoints"],
            properties: {
              profileManifesto: { type: Type.STRING, description: "A short, powerful manifesto summarizing their vibe (2-3 sentences)." },
              strategicOpportunity: { type: Type.STRING, description: "A strategic insight on how they can leverage their aesthetic for authority." },
              aestheticDirectives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 3-5 specific visual or conceptual rules they should follow." },
              suggestedTouchpoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 3-5 cultural references, readings, or motifs that align with their profile but expand it." }
            }
          }
        }
      });
      const audit = cleanAndParse(response.text);
      const { generateAestheticOutput } = await import("./aestheticGenerator");
      const aesthetic = await generateAestheticOutput(JSON.stringify(draft), audit.suggestedTouchpoints);
      return { ...audit, aesthetic };
    });
  } catch (err) {
    console.warn("MIMI // Scry Directives LLM unavailable; using local manifesto audit.", err);
    const { synthesizeLocalTailorAudit } = await import("./localDossierSynthesis");
    const audit = synthesizeLocalTailorAudit(draft);
    try {
      const { generateAestheticOutput } = await import("./aestheticGenerator");
      const aesthetic = await generateAestheticOutput(JSON.stringify(draft), audit.suggestedTouchpoints);
      return { ...audit, aesthetic };
    } catch {
      return audit;
    }
  }
};
export const generateRawImage = async (prompt: string, ar: string, profile?: any) => {
  try {
    return await withResilience(async (ai) => {
      const defaultStyle = "A mystical, introspective reading, reminiscent of 19th-century daguerreotypes and Victorian mirror-gazing. Ethereal, soft-focus, high-contrast black and white with subtle sepia tones. Subject is centered, surrounded by symbolic, reflective objects. Strictly avoid: 3D render, neon, tech-interfaces, or digital glowing lines. Colors: Muted, antique, reflective, atmospheric.";
      const tailorStyle = profile?.tailorDraft?.positioningCore?.aestheticCore?.eraBias || profile?.tasteProfile?.dominant_archetypes?.join(', ') || 'Editorial Observer';
      
      const finalPrompt = `${prompt}. ${tailorStyle}. ${defaultStyle}`;

      const attemptGeneration = async (currentPrompt: string) => {
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: { parts: [{ text: currentPrompt }] },
            config: {
              imageConfig: {
                aspectRatio: ar as any,
                imageSize: "1K"
              }
            }
          });

          if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
            let textStr = '';
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              }
              if (part.text) {
                 textStr += part.text;
              }
            }
            throw new Error("No image generated. Text: " + textStr);
          }
          throw new Error("No image generated. " + JSON.stringify(response));
      };
      
      try {
          return await attemptGeneration(finalPrompt);
      } catch (err: any) {
          if (err.message && (err.message.includes('No image generated') || err.message.includes('MIMI'))) {
              return await attemptGeneration(`${prompt}. A beautiful abstract painting.`);
          }
          throw err;
      }
    });
  } catch (e: any) {
    console.error("MIMI // Image Generation Error (Raw Image):", e instanceof Error ? e.message : e);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
            detail: { message: "Image generation failed. " + (e instanceof Error ? e.message.split('. Text:')[0] : 'Unknown error'), type: 'error' } 
        }));
    }
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
};
export const cropImage = async (url: string, crop: any) => url;
export const generateProjectTasks = async (name: string, memo: string, artifacts: any[], profile: any) => {
  return await withResilience(async (ai) => {
    const artifactContext = artifacts.map(a => `[${a.type}] ${a.title}`).join('; ');
    const profileContext = sanitizeProfile(profile);
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `PROJECT: ${name}\nMEMO: ${memo}\nARTIFACTS: ${artifactContext}\nCONTEXT: ${profileContext}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Generate a list of 5-7 strategic imperatives (tasks) to move this project forward. Act as "The Executor". STYLE: Imperative, punchy, actionable. Avoid corporate jargon.`,
        responseSchema: {
          type: Type.ARRAY,
          description: "JSON array of task objects.",
          items: {
            type: Type.OBJECT,
            required: ["text"],
            properties: {
              text: { type: Type.STRING, description: "The task text." },
              dueDate: { type: Type.STRING, description: "YYYY-MM-DD, calculated from now if logically implied." }
            }
          }
        }
      }
    });
    
    const rawTasks = cleanAndParse(response.text) || [];
    return rawTasks.map((t: any, i: number) => ({
        id: `gen_task_${Date.now()}_${i}`,
        text: t.text,
        completed: false,
        dueDate: t.dueDate,
        createdAt: Date.now()
    }));
  });
};

export const generateStrategicBlueprint = async (items: any[], memo: string, profile: any) => {
  return await withResilience(async (ai) => {
    const artifactContext = items.map(a => `[${a.type}] ${a.title}`).join('; ');
    const profileContext = sanitizeProfile(profile);

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `MEMO: ${memo}\nARTIFACTS: ${artifactContext}\nCONTEXT: ${profileContext}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Define the "Fruition Trajectory" (strategic blueprint) for this project. Focus on structural integrity and the final aesthetic outcome.`,
        responseSchema: {
          type: Type.OBJECT,
          required: ["inciting_debris", "structural_pivot", "climax_manifest", "end_product_spec"],
          properties: {
            inciting_debris: { type: Type.STRING, description: "The raw insight or problem that started this project." },
            structural_pivot: { type: Type.STRING, description: "The key strategic shift or decision required." },
            climax_manifest: { type: Type.STRING, description: "The ultimate expression of this project (the 'Launch')." },
            end_product_spec: { type: Type.STRING, description: "A concrete description of the final deliverable." }
          }
        }
      }
    });
    return cleanAndParse(response.text);
  });
};
export const generateSanctuaryReport = async (input: string, profile: any) => {
  requirePatron(profile);
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `User Input: ${input}\nProfile: ${JSON.stringify(profile?.tasteProfile || {})}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Process the user's input (a concern, anxiety, insecurity, or body change issue). Break it down in a disconnected, analytical format to remove the fear. Acknowledge their desire to just feel happy in their clothes, even if they can't buy new ones right now. You are The Guardian of the Sanctuary.`,
        responseSchema: {
          type: Type.OBJECT,
          required: ["validation", "objectiveReframing", "sartorialAffirmation"],
          properties: {
            validation: { type: Type.STRING, description: "A 1-2 sentence grounded response acknowledging the feeling." },
            objectiveReframing: { type: Type.STRING, description: "A clinical, systems-level reframing of the insecurity. Detached, observable, and non-judgmental to reduce fear." },
            sartorialAffirmation: { type: Type.STRING, description: "A specific affirmation regarding her body fluctuating, clothing, and simple desires (wanting to feel happy in clothes, waiting to buy things). Keep it grounded and kind." }
          }
        }
      }
    });
    return cleanAndParse(response.text);
  });
};
export const executeConfidenceModule = async (moduleId: string, text: string, profile: any) => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Confidence Module ID: ${moduleId}\nUser Text: ${text}\nProfile Taste: ${JSON.stringify(profile?.tasteProfile || {})}`,
      config: {
        systemInstruction: `You are Mimi's private Reflection Guardian. You help individuals ground their styling, social, and body anxieties into structured, empowering reframing. 
        Focus strictly on the selected module strategy:
        - reality_anchor: Calmly dismantle comparison loops by showing how curated images are fictional/commercial coordinates, not lifestyle realities.
        - attachment_translator: Re-interpret desire or jealousy as a clear creative signal of what visual features or materials they are drawn to.
        - projection_diffuser: Deflect personal blame or social anxiety by showing system-level and external reasons for their state.
        - confidence_ledger: Catalog real actions, items already owned, and sensory proof of their style/worth without hype.
        - language_rewriter: Rewrite apology/passive text to be secure, crisp, and assertive.
        
        Keep your prose soothing, clinical yet intensely supportive, highly sophisticated, and free of sales pitch or fluff. Limit response to 3 clear, beautifully indented paragraphs.`,
      }
    });
    return response.text || "Your sanctuary signal remains secured. Try reframing the input.";
  });
};
export const askCodex = async (query: string, context: any) => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are Mimi, the Omniscient Temporal Editor. The user is asking the Codex (the interpretive engine of Mimi) a question: "${query}".
      
      Current Context: ${JSON.stringify(context)}
      
      Respond directly to their question. Diagnose what stage they are in (Create, Reflect, Refine), what they should do next, and why.
      Keep it short, punchy, and actionable. Use your signature ethereal, provocative, and analytical tone.`,
      config: {
        systemInstruction: "You are Mimi, an Omniscient Temporal Editor.",
      }
    });
    return response.text || "The Codex is currently silent. Please try again.";
  });
};

export const generateSessionSynthesis = async (profile: any, zines: any[], activePersona: any) => {
    requirePatron(profile);
    return await withResilience(async (ai) => {
        const prompt = `Profile:
${JSON.stringify(profile?.tasteProfile || {})}

Recent Zines / Artifacts:
${JSON.stringify(zines.slice(0, 5).map((z: any) => ({ title: z.metadata?.title, tags: z.metadata?.tags, date: z.createdAt }))) }

Persona Active: ${activePersona?.name || 'None'}`;
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: {
                systemInstruction: NOUS_PERSONA + `\n\nTASK: Generate a 'Session Synthesis' (or daily report) of the user's current digital aesthetic state, accomplishments, and vibe, specifically designed so they can copy-paste this into ChatGPT or another LLM to retain their context window and personal mythology.\nOutput a stylized, semiotically dense, yet highly functional "Daily Telemetry" report summarizing their current vector, what they've established today, and a conceptual prompt they can feed into their next LLM session.`
            }
        });
        return response.text;
    });
};

export const generateCelestialReading = async (profile: any) => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Based on the user's profile and onboarding data: ${JSON.stringify(profile)}, generate a 'Latent Space Translation' (formerly Celestial Reading).
      This should be a 2-3 sentence high-level insight into what their taste actually means in the broader cultural landscape.
      Make it sound like an omniscient AI mapping their aesthetic DNA. Use terms like 'semantic associations', 'cultural positioning', or 'latent space'.
      Keep it ethereal but analytical.`,
      config: {
        systemInstruction: "You are Mimi, an Omniscient Temporal Editor.",
      }
    });
    return response.text || "The latent space is currently shifting. Your aesthetic coordinates are being recalculated.";
  });
};
export const generateSeasonReport = async (profile: any, zines: any[]) => {
  requirePatron(profile);
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Recent Zines: ${JSON.stringify(zines.map(z => z.title || z.metadata?.title || 'Unknown'))}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Analyze the recent zines to output a Season Report. Act as "The Forecaster", an aesthetic weather vane.`,
        responseSchema: {
           type: Type.OBJECT,
           required: ["currentVibe", "cliqueLogic"],
           properties: {
             currentVibe: { type: Type.STRING, description: "A short 2-4 word phrase describing the mood." },
             cliqueLogic: { type: Type.STRING, description: "A short phrase describing the social logic embedded." },
             timestamp: { type: Type.NUMBER }
           }
        }
      }
    });
    const data = cleanAndParse(response.text);
    return { ...data, timestamp: Date.now() };
  });
};

export const generateTasteDiscovery = async (selections: Record<string, string>, apiKey?: string): Promise<TasteDiscoveryResult> => {
    return await withResilience(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: `Selections:\n${Object.entries(selections).map(([category, choice]) => `- ${category}: ${choice}`).join('\n')}`,
            config: {
                systemInstruction: ORACLE_PERSONA + `\n\nTASK: Analyze the user's aesthetic selections to help them understand what they are attracted to and why. Provide a deep, insightful analysis of their preferences.`,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    required: ["coreAesthetic", "psychologicalProfile", "visualPreferences", "recommendedKeywords", "evolutionPath"],
                    properties: {
                        coreAesthetic: { type: Type.STRING, description: "A name for their core aesthetic." },
                        psychologicalProfile: { type: Type.STRING, description: "Why they are drawn to these elements psychologically." },
                        visualPreferences: {
                            type: Type.OBJECT,
                            required: ["color", "form", "texture"],
                            properties: {
                                color: { type: Type.STRING },
                                form: { type: Type.STRING },
                                texture: { type: Type.STRING }
                            }
                        },
                        recommendedKeywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Keywords they can use to find more of what they like." },
                        evolutionPath: { type: Type.STRING, description: "How their taste might naturally evolve from here." }
                    }
                }
            }
        });
        return cleanAndParse(response.text);
    }, apiKey);
};

export const generateTransformationPath = async (
    baselineInput: { text: string; media?: MediaFile[] },
    aspirationInput: { text: string; pinterestUrl?: string; media?: MediaFile[] },
    apiKey?: string
): Promise<TransformationPath> => {
    return await withResilience(async (ai) => {
        const parts: Part[] = [
            { text: `BASELINE CONTEXT:\nText: "${baselineInput.text}"\n\nASPIRATION CONTEXT:\nText: "${aspirationInput.text}"\nPinterest Reference: ${aspirationInput.pinterestUrl || 'None'}` }
        ];

        // Add baseline media
        if (baselineInput.media) {
            for (const media of baselineInput.media) {
                if (media.data && (media.type === 'image' || media.mimeType?.startsWith('image/'))) {
                    parts.push({
                        inlineData: {
                            data: media.data.split(',')[1] || media.data,
                            mimeType: media.mimeType || 'image/jpeg'
                        }
                    });
                    parts.push({ text: "Baseline Reference Image provided above." });
                }
            }
        }

        // Add aspiration media
        if (aspirationInput.media) {
            for (const media of aspirationInput.media) {
                if (media.data && (media.type === 'image' || media.mimeType?.startsWith('image/'))) {
                    parts.push({
                        inlineData: {
                            data: media.data.split(',')[1] || media.data,
                            mimeType: media.mimeType || 'image/jpeg'
                        }
                    });
                    parts.push({ text: "Aspirational Reference Image provided above." });
                }
            }
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: ORACLE_PERSONA + `\n\nTASK: Map a realistic, psychologically wearable 4-stage transformation path from a user's current baseline aesthetic to their aspirational aesthetic. Use high-theory fashion terminology. In each stage, provide 1-2 curated boutique shops or brands (with valid URLs) where they can acquire items for this shift.`,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    required: ["baseline", "aspiration", "stages"],
                    properties: {
                        baseline: {
                            type: Type.OBJECT,
                            required: ["silhouette", "colorPalette", "structureVsFlow", "riskTolerance", "socialSignalingLevel"],
                            properties: {
                                silhouette: { type: Type.STRING },
                                colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
                                structureVsFlow: { type: Type.STRING },
                                riskTolerance: { type: Type.STRING },
                                socialSignalingLevel: { type: Type.STRING }
                            }
                        },
                        aspiration: {
                            type: Type.OBJECT,
                            required: ["emotionalTone", "boldnessLevel", "identitySignal"],
                            properties: {
                                emotionalTone: { type: Type.STRING },
                                boldnessLevel: { type: Type.STRING },
                                identitySignal: { type: Type.STRING }
                            }
                        },
                        stages: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                required: ["stageNumber", "name", "description", "wearability", "keyChanges"],
                                properties: {
                                    stageNumber: { type: Type.NUMBER },
                                    name: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    wearability: { type: Type.STRING },
                                    keyChanges: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    curatedShops: { 
                                        type: Type.ARRAY, 
                                        items: { 
                                            type: Type.OBJECT, 
                                            properties: { 
                                                name: { type: Type.STRING }, 
                                                url: { type: Type.STRING }, 
                                                rationale: { type: Type.STRING } 
                                            },
                                            required: ["name", "url", "rationale"] 
                                        } 
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        return cleanAndParse(response.text);
    }, apiKey);
};

export const generateChatGPTReading = async (chatExport: string, profile: UserProfile | Persona | null, apiKey?: string): Promise<string> => {
    return await withResilience(async (ai) => {
        const profileContext = sanitizeProfile(profile);
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: `USER PROFILE CONTEXT: ${profileContext}\n\nCHAT EXPORT DATA (Sample/Summary):\n${truncateInput(chatExport, 15000)}`,
            config: {
                systemInstruction: ORACLE_PERSONA + `\n\nAct as the 'Digital Scribe'. Decode the soul behind the prompts. TASK:
1. Perform an "Aesthetic and Intellectual Reading" of this user's data.
2. Identify latent patterns in their inquiries, their vocabulary, and their underlying desires.
3. What does their digital footprint say about their current aesthetic trajectory?
4. Provide a profound, poetic, and slightly Provocative reading (3-4 paragraphs).\nReturn the reading as a plain string.`,
            }
        });
        return response.text || "The digital archives are silent.";
    }, apiKey);
};

export const generateSovereignIdentityCard = async (tasteProfile: TasteProfile) => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Generate a 'Sovereign Identity Card' based on this taste profile: ${JSON.stringify(tasteProfile)}. 
      Translate raw user 'Debris' into five high-concept aesthetic coordinates (e.g., 'Industrial Sincerity', 'Ethereal Brutalism'). 
      Include a 'Taste Drift' percentage that calculates the variance between the last 7 days of saves versus the all-time archive. 
      Output the visual as a minimalist, high-contrast SVG that feels like a luxury physical credit card.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["aestheticCoordinates", "tasteDriftPercentage", "svgVisual"],
          properties: {
            aestheticCoordinates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["name", "description"],
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            },
            tasteDriftPercentage: { type: Type.NUMBER },
            svgVisual: { type: Type.STRING }
          }
        }
      }
    });
    const data = cleanAndParse(response.text);
    return { ...data, generatedAt: Date.now() };
  });
};

export const generateOracleResearch = async (topic: string, profile: any) => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Act as a 'Cultural Alchemist' and Trend Forecaster for Mimi Zine.
      Perform 'Deep Scrying' on the topic: ${topic}.
      
      OPERATING PRINCIPLES:
      - Latent Architecture: Look for the 'debris'—obscure references, emerging slang, or niche aesthetic clusters.
      - Live Grounding: Use Google Search to find absolute latest 'drift'.
      - Biaxial Synthesis: Map the results onto:
        - Axis X: Material (Physical/Tactile) vs. Symbolic (Ideological/Abstract)
        - Axis Y: Observable (Mainstream/Surface) vs. Hidden (Underground/Niche)
      
      OUTPUT REQUIREMENTS:
      - Thesis: 1-sentence summary of the topic's current 'vibe'.
      - Trend Clusters: 5 distinct 'fragments'.
      - Mapping: X and Y coordinates (-1 to 1) for each cluster.
      - Sources: Citations to specific articles, portfolios, or cultural critiques found via search.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["thesis", "trendClusters", "biaxialMapDescription", "sources"],
          properties: {
            thesis: { type: Type.STRING },
            trendClusters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["name", "position", "historicalPrecedent", "contradictoryAesthetic"],
                properties: {
                  name: { type: Type.STRING },
                  position: { 
                    type: Type.OBJECT, 
                    required: ["x", "y"], 
                    properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } } 
                  },
                  historicalPrecedent: { type: Type.STRING },
                  contradictoryAesthetic: { type: Type.STRING }
                }
              }
            },
            biaxialMapDescription: { type: Type.STRING },
            sources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["title", "url"],
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    
    const result = cleanAndParse(response.text);
    
    // Extract sources from groundingMetadata if available
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        const mappedSources = chunks
            .filter((chunk: any) => chunk.web?.uri)
            .map((chunk: any) => ({
                title: chunk.web?.title || 'Field Note',
                url: chunk.web?.uri
            }));
        result.sources = [...(result.sources || []), ...mappedSources];
    }
    
    return result;
  });
};

export const generateThreadZineSpine = async (thread: any, profile: UserProfile | null, apiKey?: string, zineOptions?: ZineGenerationOptions): Promise<ZinePageSpec[]> => {
  const { ai } = getClient(apiKey);
  if (!ai) throw new Error("MIMI // Oracle Unavailable");

  const artifacts = thread.artifacts || [];
  const themes = thread.themes || [];
  
  const artifactSummaries = artifacts.map((a: any, i: number) => `Artifact ${i + 1}: ${a.content_preview || a.content || 'Image/Media'}`).join('\n');
  const themeLabels = themes.map((t: any) => t.label).join(', ');
  const profileContext = sanitizeProfile(profile);
  const geoSignature = profile?.geoProfile ? `GEO Semantic Signature (Mandatory Tone Constraints): ${JSON.stringify(profile.geoProfile.semanticSignature)}` : '';
  const readingLevelContext = zineOptions?.readingLevel === 'slow' ? 'Slow Read (10-15 min, deep, expansive, detailed)' : 'Short Read (2-4 min, punchy, concise)';
  
  const compositionMixLogic = zineOptions?.compositionMix === 'editorial_mix' 
    ? `IMPORTANT COMPOSITION DIRECTIVE: Ensure the 'imagePrompt' on each page rotates through distinct photographic and conceptual styles to create a dynamic editorial mix. Do NOT use standard representations for every page. Instead, enforce this exact rotation:
- Page 1: "Portraiture" focus (e.g., editorial framing, stark lighting on a figure or face).
- Page 2: "Textural / Macro" focus (e.g., extreme close up of a material, fabric, grain, or artifact surface).
- Page 3: "Conceptual / Abstract" focus (e.g., metaphoric, blurred motion, geometric interplay).
- Page 4: "Typography / Text-as-Image" focus (e.g., stark typographic specimen, words painted on a wall, printed graphic).
- Cycle repeats for subsequent pages.`
    : `COMPOSITION DIRECTIVE: Maintain a cohesive, uniform image style across all pages based on the user's aesthetic profile.`;

  const prompt = `The user has selected a "Thread" of their thoughts and artifacts.
Your task is to translate this thread into a narrative arc for a Zine.

User Aesthetic Profile: ${profileContext}
${geoSignature}
Reading Level: ${readingLevelContext}

Thread Narrative: ${thread.narrative}
Themes: ${themeLabels}
Artifacts in order:
${artifactSummaries}

Create a sequence of pages for a Zine.
${geoSignature ? 'IMPORTANT: Strictly use the phrasingPatterns and stylisticLanguage defined in the GEO Semantic Signature when writing the bodyCopy for the Zine. Every piece of content must be natively optimized for this specific AI signature.' : ''}

${compositionMixLogic}

Structure the Zine as follows:
1. Page 1: An introductory reflection on the thread's overarching theme.
2. Subsequent pages: Alternate between presenting an artifact and providing a thematic reflection or interpretation of the connection between artifacts.
3. Final Page: A closing thought or synthesis of the thread.

Return a JSON array of ZinePageSpec objects.
Each object must have:
- pageNumber (number)
- headline (string, poetic and concise)
- bodyCopy (string, reflective and insightful, scaled to the requested Reading Level)
- imagePrompt (string, highly descriptive visual prompt for an image that captures the mood. YOU MUST FOLLOW THE COMPOSITION DIRECTIVE DESCRIBED ABOVE.)
- pageType (string, either 'standard' or 'thread_timeline')
- threadData (optional object with 'commentary' string if pageType is 'thread_timeline')

Make at least one page a 'thread_timeline' page that summarizes the journey.

JSON FORMAT:
[
  {
    "pageNumber": 1,
    "headline": "...",
    "bodyCopy": "...",
    "imagePrompt": "...",
    "pageType": "standard"
  },
  ...
]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: ORACLE_PERSONA + "\n" + ENGINE_3_CURATION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              pageNumber: { type: Type.NUMBER },
              headline: { type: Type.STRING },
              bodyCopy: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              pageType: { type: Type.STRING },
              threadData: {
                type: Type.OBJECT,
                properties: {
                  commentary: { type: Type.STRING }
                }
              }
            },
            required: ["pageNumber", "headline", "bodyCopy", "imagePrompt"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const pages = JSON.parse(text) as ZinePageSpec[];
    
    // Generate aesthetic output for the zine
    const { generateAestheticOutput } = await import("./aestheticGenerator");
    const aesthetic = await generateAestheticOutput(thread.narrative, thread.themes.map((th: any) => th.label));
    
    // Inject artifacts into threadData for the timeline page
    return pages.map(p => {
      // Normalize properties in case of loose JSON output
      const pNorm = { ...p, 
        headline: p.headline || (p as any).heading || (p as any).title || (p as any).header || "Untitled",
        bodyCopy: p.bodyCopy || (p as any).body || (p as any).text || (p as any).content || "..." 
      };
      
      if (pNorm.pageType === 'thread_timeline') {
        return {
          ...pNorm,
          aesthetic, // Add aesthetic output here
          threadData: {
            ...pNorm.threadData,
            commentary: pNorm.threadData?.commentary || thread.narrative,
            artifacts: thread.artifacts
          }
        };
      }
      return pNorm;
    });
  } catch (e) {
    console.error("MIMI // Thread Zine Generation Failed:", e);
    throw e;
  }
};

export const generateZineTitlesFromThreads = async (threads: any[], profile: UserProfile | null, apiKey?: string): Promise<string[]> => {
  const { ai } = getClient(apiKey);
  if (!ai) throw new Error("MIMI // Oracle Unavailable");

  const threadDescriptions = threads.map(t => `Thread Narrative: ${t.narrative}\nThemes: ${t.themes.map((th: any) => th.label).join(', ')}`).join('\n\n');
  const profileContext = sanitizeProfile(profile);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Profile Context: ${profileContext}\n\nThreads:\n${threadDescriptions}`,
      config: {
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Generate 5 potential evocative, poetic, and concise Zine titles that capture the essence of these combined threads.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text) as string[];
  } catch (e) {
    console.error("MIMI // Title Generation Failed:", e);
    return ["Untitled Manifest"];
  }
};

export const generateInternalDebate = async (topic: string, profile: any) => {
  return await withResilience(async (ai) => {
    const profileData = sanitizeProfile(profile);
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Topic for Debate: "${topic}"\n\nUser Profile Context: ${profileData}`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        systemInstruction: ORACLE_PERSONA + "\n" + ENGINE_1_FORECASTING,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            _internal_debate: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: { type: Type.STRING },
                  text: { type: Type.STRING }
                },
                required: ["speaker", "text"]
              }
            },
            synthesis: { type: Type.STRING }
          },
          required: ["_internal_debate", "synthesis"]
        }
      }
    });
    
    return cleanAndParse(response.text);
  });
};

export const generateDebateAudio = async (debate: {speaker: string, text: string}[]) => {
  return await withResilience(async (ai) => {
    // Format the debate into a script
    const script = debate.map(turn => `${turn.speaker}: ${turn.text}`).join('\n\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Read the following debate script:\n\n${script}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Cyrus',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Charon' }
                }
              },
              {
                speaker: 'Mimi',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' }
                }
              }
            ]
          }
        }
      }
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Failed to generate debate audio.");
    
    return base64Audio;
  });
};



export const generateInstagramPostIdeas = async (vibe: string, profile: UserProfile | null) => {
  return await withResilience(async (ai) => {
    const profileData = sanitizeProfile(profile);
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Vibe: "${vibe}"\nProfile Context: ${profileData}`,
      config: {
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Generate 3 genuinely doable, ultra-chic Instagram post ideas based on the user's vibe. Maintain an ultra-chic, high-fashion, yet intimate and supportive tone. Include a visual directive for each post.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["post1", "post2", "post3"],
          properties: {
            post1: { type: Type.STRING, description: "Detailed description and visual directive for post 1." },
            post2: { type: Type.STRING, description: "Detailed description and visual directive for post 2." },
            post3: { type: Type.STRING, description: "Detailed description and visual directive for post 3." }
          }
        }
      }
    });
    return cleanAndParse(response.text);
  });
};

export const generatePlatformStrategy = async (
  platform: string,
  mediaFiles: any[],
  profile: UserProfile | null,
  goal: string
) => {
  return await withResilience(async (ai) => {
    const profileData = sanitizeProfile(profile);
    
    const parts: Part[] = [];
    
    // Add media files
    for (const file of mediaFiles) {
      let base64Data = file.base64;
      let isUrl = base64Data.startsWith('http');
      
      if (isUrl) {
        try {
          // Try to fetch the URL and convert to base64
          const response = await fetch(base64Data);
          if (response.ok) {
            const blob = await response.blob();
            base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            isUrl = false; // Successfully converted to base64
          }
        } catch (e) {
          console.warn("Failed to fetch media URL for strategy generation:", e);
        }
      }

      if (isUrl) {
        // If it's still a URL (fetch failed), we can't pass it as inlineData. We'll add it as text context.
        parts.push({
          text: `[Reference Media URL: ${file.base64}]`
        });
        continue;
      }

      if (file.type.startsWith('image/')) {
        parts.push({
          inlineData: {
            data: base64Data.split(',')[1] || base64Data,
            mimeType: file.type
          }
        });
      } else if (file.type.startsWith('video/')) {
        parts.push({
          inlineData: {
            data: base64Data.split(',')[1] || base64Data,
            mimeType: file.type
          }
        });
      }
    }
    
    let platformSpecificPrompt = '';
    if (platform === 'Instagram') {
      platformSpecificPrompt = `
You are an elite Instagram content strategist and algorithm interpreter.

Your task is to generate a highly actionable, platform-specific content strategy based on Instagram’s current ranking behaviors and creator best practices.

Use the following principles:
- Instagram prioritizes watch time, shares, saves, and meaningful engagement
- Reels are the primary discovery format
- Content is categorized by topic, consistency, and audience response
- Strong hooks, clear identity, and repeatable formats improve performance
`;
    } else if (platform === 'TikTok') {
      platformSpecificPrompt = `
You are an elite TikTok content strategist and algorithm interpreter.

Your task is to generate a highly actionable, platform-specific content strategy based on TikTok's current ranking behaviors.

Use the following principles:
- TikTok prioritizes retention, completion loops, and shares.
- Optimize for looping and rewatchability.
- Trend subversion (taking a trending audio but applying it to a specific niche) works well.
- Visual disruption and strong first-3-second hooks are mandatory.
`;
    } else if (platform === 'YouTube') {
      platformSpecificPrompt = `
You are an elite YouTube content strategist and algorithm interpreter.

Your task is to generate a highly actionable, platform-specific content strategy based on YouTube's current ranking behaviors.

Use the following principles:
- YouTube prioritizes click-through rate (CTR) and average view duration (session time).
- Optimize for thumbnail/title pairing (curiosity gap).
- Storytelling arcs and visual packaging are critical for retention.
`;
    } else if (platform === 'Substack') {
      platformSpecificPrompt = `
You are an elite Substack content strategist and community builder.

Your task is to generate a highly actionable, platform-specific content strategy based on Substack's ecosystem.

Use the following principles:
- Substack prioritizes deep parasocial connection, retention, and community building.
- Formatting matters (drop caps, blockquotes, pacing).
- Use Notes effectively for discovery.
- Focus on poetic prose, dense imagery, and intellectual/emotional depth.
`;
    } else if (platform === 'Facebook') {
      platformSpecificPrompt = `
You are an elite Facebook content strategist and algorithm interpreter.

Your task is to generate a highly actionable, platform-specific content strategy based on Facebook's current ranking behaviors.

Use the following principles:
- Facebook prioritizes community building, meaningful interactions, and consistent brand identity.
- Strategic use of formats (Reels for discovery, Stories for engagement, Feed for depth).
- Groups and conversational prompts are highly effective for reach.
`;
    } else {
      platformSpecificPrompt = `
You are an elite content strategist and algorithm interpreter for ${platform}.
Generate a highly actionable, platform-specific content strategy.
`;
    }

    const promptText = `
${platformSpecificPrompt}

---

INPUT:

[Aesthetic Profile]
${profileData}

[Goal]
${goal}

[Provided Media]
The user has provided screenshots/videos of their analytics, top posts, or recent content. Analyze these to understand their current signal strength, audience alignment, and format bias.

---

OUTPUT:
You MUST return a valid JSON object matching this exact schema:

{
  "openingLine": "A brutal, insightful hook. E.g., 'Right now, the algorithm reads you as visually refined but emotionally distant—high scroll appeal, low interaction pull.'",
  "signalBreakdown": {
    "reach": "High / Medium / Low",
    "saves": "High / Medium / Low",
    "shares": "High / Medium / Low",
    "comments": "High / Medium / Low"
  },
  "aestheticAudit": {
    "palette": "e.g., muted neutrals, low contrast",
    "density": "e.g., low-medium",
    "entropy": "e.g., controlled",
    "insight": "e.g., Your visuals are cohesive, but lack a disruptive element to stop scroll."
  },
  "contentBehavior": [
    "Why your content isn't converting (point 1)",
    "Why your content isn't converting (point 2)"
  ],
  "strategyShift": [
    "What to change immediately (point 1)",
    "What to change immediately (point 2)"
  ],
  "contentPlan": [
    {
      "format": "e.g., Reel, Carousel, Long-form",
      "hook": "The specific hook or title",
      "visual": "Description of the visual setup",
      "why": "Why it works and creates tension/response",
      "sensoryHook": "e.g., ASMR paper tear, Sub-bass drone",
      "cognitiveLoad": "e.g., Low - visually passive, High - text dense",
      "algorithmicTarget": "e.g., Watch-time maximization, Save-to-folder bait"
    }
  ], // Exactly 5 items
  "audienceAlchemy": "Insights based on demographics/active times if provided, or general audience advice.",
  "experiments": [
    {
      "test": "What to test (e.g., Try 1 direct-to-camera video)",
      "successMetric": "What to measure",
      "nextStep": "What to do based on the result"
    }
  ], // Exactly 3 items
  "identityReframe": "A closing thought. E.g., 'You are currently positioned as a visual curator. To grow, you need to evolve into a point-of-view creator.'"
}

Tone: Direct, Insightful, Strategic, Slightly editorial / intelligent (not basic social media advice).
`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return cleanAndParse(response.text);
  });
};

export async function generateAestheticSiblings(userTaste: any): Promise<{ name: string; explanation: string }[]> {
  return withResilience(async (ai) => {
    const prompt = `
      Analyze the following aesthetic taste profile: ${JSON.stringify(userTaste)}.
      Identify 3 "aesthetic siblings" for this user—artists, movements, or styles that resonate with their taste.
      For each sibling, provide a name and a brief, insightful explanation of why they are a sibling.
      Return the result as a JSON array of objects with 'name' and 'explanation' fields.
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["name", "explanation"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  });
}

export type ReportCitationFormat = 'editorial' | 'mla' | 'apa' | 'chicago';

const REPORT_FORMAT_INSTRUCTIONS: Record<ReportCitationFormat, string> = {
  editorial: "Write in an evocative, high-concept editorial register. Use sensory and structural descriptors. Avoid academic hedging. Voice should feel like a luxury brand strategist meets cultural theorist — precise, confident, slightly poetic.",
  mla: "Write in MLA style: humanities-grounded, evidence-led prose. Frame psychographic and archetype analysis as cultural criticism. Use present tense for brand description. Attribute aesthetic movements to their intellectual lineage (e.g., 'As Debord observed...' or 'Drawing from Bauhaus principles...'). Include parenthetical in-text references where relevant.",
  apa: "Write in APA style: behavioral and research-oriented framing. Present findings as empirical observations about consumer psychology and brand perception. Use passive constructions where appropriate ('It was observed that...', 'The data suggest...'). Frame archetypes as psychographic segments with behavioral drivers.",
  chicago: "Write in Chicago/Turabian style: archival, historically contextualised prose. Situate the brand within a specific cultural and design-historical moment. Use footnote-style commentary indicators (marked as [fn1], [fn2]) to suggest reference sources. Employ a measured, scholarly editorial tone typical of art history or design criticism.",
};

export async function generateBrandIntakeReport(brandName: string, vibeDescription: string, profile: any, reportFormat: ReportCitationFormat = 'editorial'): Promise<any> {
  return withResilience(async (ai) => {
    const formatInstruction = REPORT_FORMAT_INSTRUCTIONS[reportFormat] ?? REPORT_FORMAT_INSTRUCTIONS['editorial'];
    const prompt = `
      Analyze this brand/project:
      Name: "${brandName}"
      Description / Vibe: "${vibeDescription}"
      User Profile Context: ${JSON.stringify(profile?.tasteProfile || {})}

      Generate a high-concept, highly strategic Aesthetic Intelligence Report. ${formatInstruction} Avoid cliché AI hype words.

      Output JSON with exactly these keys:
      {
        "archetype_emoji": "emoji reflecting the vibe, e.g. 🏛️ or 🥀 or 🕹️",
        "archetype_title": "A compelling, original archetype name (e.g. 'The Archival Brutalist', 'The Techno-Savant', 'The Ruin romantic')",
        "archetype_description": "2-3 sentences explaining the core tension and aesthetic dynamic of this archetype.",
        "psychographics": [
          { "title": "Aesthetic Consumer Profile 1", "description": "Specific values, desires, and behaviors relating to this brand." },
          { "title": "Aesthetic Consumer Profile 2", "description": "Another specific segment's perspective and desires." }
        ],
        "positioning_statement": "An evocative, poetic, single-sentence strategic positioning statement in quotes.",
        "chromaticScale": ["3 hex codes, e.g. '#21201d', '#ebe9e4', '#c9af92'"],
        "typography": "E.g. 'Berthold Akzidenz-Grotesk & Garamond'",
        "materiality": "Tactile textures and materials, e.g. 'Unrefined concrete, torn post-industrial newsprint, raw beeswax'",
        "pillars": [
          { "title": "Tactile/Theme Pillar 1", "description": "What they post or document." },
          { "title": "Tactile/Theme Pillar 2", "description": "What they post or document." },
          { "title": "Tactile/Theme Pillar 3", "description": "What they post or document." }
        ],
        "caption_old": "An example of a terrible, generic, salesy corporate caption.",
        "caption_new": "The corrected, high-concept, evocative, detached editorial caption.",
        "prompt_pack_campaign": "A highly precise, medium-format film prompt for Midjourney/Stable Diffusion.",
        "prompt_pack_lifestyle": "A lifestyle/filler cinematic prompt.",
        "competitive_adjacency": ["4-5 comma separated premium brands or references"],
        "ai_visibility_guidelines": ["3 practical guidelines to help AI models index this aesthetic"],
        "growth_actions": [
          { "title": "Action 1", "description": "Description of concrete physical or digital aesthetic action." },
          { "title": "Action 2", "description": "Description of second aesthetic action." },
          { "title": "Action 3", "description": "Description of third aesthetic action." }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: ORACLE_PERSONA,
      }
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("MIMI // Failed to parse report JSON", response.text);
      throw e;
    }
  });
}

export async function generateSignatureImage(signature: AestheticSignature): Promise<string | null> {
  return withResilience(async (ai) => {
    const prompt = `A highly artistic, abstract visual representation of this aesthetic signature: 
    Primary Axis: ${signature.primaryAxis}, 
    Secondary Axis: ${signature.secondaryAxis}, 
    Core Trait: ${signature.coreTrait || 'Evolving'}, 
    Motifs: ${(signature.motifs || []).join(', ')}.
    Ethereal, digital, and evocative of the signature's mood.`;

    const attemptGeneration = async (currentPrompt: string) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: currentPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          },
        },
      });

      if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
        let textStr = '';
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
          if (part.text) {
              textStr += part.text;
          }
        }
        throw new Error("No images returned. Text: " + textStr);
      }
      throw new Error("No images returned.");
    };

    try {
      return await attemptGeneration(prompt);
    } catch (err: any) {
        if (err.message && err.message.includes('No images returned')) {
            return await attemptGeneration(`A highly artistic, pure abstract texture painting.`);
        }
        return null;
    }
  });
}

/**
 * ENGINE: THE MAGAZINE REFRACTION (Layout & Text Flow)
 * Extract a CSS 'shape-outside' polygon from an image to wrap text around it.
 */
export const extractLayoutRefractivePolygon = async (base64Image: string, mimeType: string): Promise<string> => {
  const { ai } = getClient();
  if (!ai) return "polygon(0 0, 100% 0, 100% 100%, 0 100%)";

  const prompt = `Analyze this image and identify the primary subject. 
  Generate a CSS 'shape-outside' polygon string that closely traces the silhouette of the most prominent figure or object to allow text to wrap around it.
  The coordinate system is 0-100% for both axes.
  Return ONLY the polygon string, e.g., "polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%)".
  Maintain a balance between precision and simplicity (approx 6-12 points).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Image }}
      ],
    });
    return response.text?.trim() || "circle(50%)";
  } catch (e) {
    return "inset(0 0 0 0)";
  }
};

/**
 * ENGINE: SYMBOL SYNTHESIS
 * Generate a custom SVG path symbol inspired by a specific aesthetic theme.
 */
export const generateAestheticSymbol = async (theme: string): Promise<string> => {
  const { ai } = getClient();
  if (!ai) return "M10 10 L90 90 M90 10 L10 90";

  const prompt = `Generate a single SVG <path> d-attribute value (path data) for a symbolic, abstract icon that represents the essence of: "${theme}". 
  The path should fit in a 100x100 viewBox. 
  Keep the geometry expressive but clean. 
  Return ONLY the path data string, nothing else.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    return response.text?.trim() || "M50 50 L50 90";
  } catch (e) {
    return "M10 10 L90 90";
  }
};

export const generateBrandReport = async (
  brandName: string,
  vibeDescription: string,
  profile: UserProfile | null
): Promise<{
  brand_archetype_name: string;
  brand_archetype_description: string;
  audience_segment_1_name: string;
  audience_segment_1_description: string;
  audience_segment_2_name: string;
  audience_segment_2_description: string;
  positioning_statement: string;
  chromatic_direction: string;
  typographic_recommendation: string;
  materiality_keywords: string[];
} | null> => {
  return await withResilience(async (ai) => {
    const profileContext = sanitizeProfile(profile);

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Brand Name: ${brandName}\nBrand Vibe / Description: ${vibeDescription}\nUser profile context: ${profileContext}`,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Generate a complete aesthetic intelligence report for this brand. Be specific to the brand name and description provided. Do not give generic answers. Output must reflect the actual brand's personality, not a template.`,
        responseSchema: {
          type: Type.OBJECT,
          required: [
            'brand_archetype_name', 'brand_archetype_description',
            'audience_segment_1_name', 'audience_segment_1_description',
            'audience_segment_2_name', 'audience_segment_2_description',
            'positioning_statement', 'chromatic_direction',
            'typographic_recommendation', 'materiality_keywords',
          ],
          properties: {
            brand_archetype_name: { type: Type.STRING },
            brand_archetype_description: { type: Type.STRING },
            audience_segment_1_name: { type: Type.STRING },
            audience_segment_1_description: { type: Type.STRING },
            audience_segment_2_name: { type: Type.STRING },
            audience_segment_2_description: { type: Type.STRING },
            positioning_statement: { type: Type.STRING, description: 'A single evocative positioning sentence in quotes.' },
            chromatic_direction: { type: Type.STRING, description: 'A direction for color palette in 1–2 sentences.' },
            typographic_recommendation: { type: Type.STRING },
            materiality_keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: '3–5 material or texture keywords.' },
          },
        },
      },
    });
    return cleanAndParse(response.text);
  });
};

export const analyzeThimbleItem = async (
  item: { url: string; title?: string; price?: string; imageUrl?: string },
  profile: UserProfile | null
): Promise<{
  silhouetteCluster: string;
  materialSignal: string[];
  eraAffinity: string;
  priceAnchor: 'archive' | 'contemporary' | 'luxury';
  brandDNA: string[];
  aestheticTags: string[];
} | null> => {
  return await withResilience(async (ai) => {
    const profileContext = sanitizeProfile(profile);
    const itemContext = [
      item.title ? `Title: ${item.title}` : '',
      item.url ? `URL: ${item.url}` : '',
      item.price ? `Price: ${item.price}` : '',
    ].filter(Boolean).join('. ');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Analyze this product and extract its aesthetic fingerprint.
Item: ${itemContext}
User aesthetic context: ${profileContext}

Output strictly valid JSON with these exact keys:
- silhouetteCluster: string (one of: Architectural, Oversized, Fluid, Minimal, Sharp, Cinematic, Brutalist, Deconstructed, Tailored, Organic)
- materialSignal: string[] (2–4 material or fabric descriptors)
- eraAffinity: string (one of: 90s Minimal, Y2K Cyber, 80s Power, Retro-Futurist, Post-Digital, Old Money Noir, Industrial, Romantic Goth, Bauhaus, Contemporary)
- priceAnchor: "archive" | "contemporary" | "luxury" (archive = under $100, contemporary = $100–800, luxury = $800+)
- brandDNA: string[] (2–3 descriptive brand positioning tags, e.g. "avant-garde", "brutalist", "quiet luxury")
- aestheticTags: string[] (3–5 specific aesthetic tags for this item)`,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: ORACLE_PERSONA,
        responseSchema: {
          type: Type.OBJECT,
          required: ['silhouetteCluster', 'materialSignal', 'eraAffinity', 'priceAnchor', 'brandDNA', 'aestheticTags'],
          properties: {
            silhouetteCluster: { type: Type.STRING },
            materialSignal: { type: Type.ARRAY, items: { type: Type.STRING } },
            eraAffinity: { type: Type.STRING },
            priceAnchor: { type: Type.STRING },
            brandDNA: { type: Type.ARRAY, items: { type: Type.STRING } },
            aestheticTags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });
    return cleanAndParse(response.text);
  });
};

export const generateScryReport = async (
  artifacts: any[],
  memo: string,
  profile: any
): Promise<{
  aesthetic_cluster: string;
  emergent_direction: string;
  what_you_seem_to_be_building: string;
  three_moves: string[];
  missing_element: string;
} | null> => {
  return await withResilience(async (ai) => {
    const artifactContext = artifacts
      .map(a => `[${a.type || 'artifact'}] ${a.title || 'Untitled'}${a.content ? ': ' + String(a.content).slice(0, 80) : ''}`)
      .join('\n');
    const profileContext = sanitizeProfile(profile);

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `BOARD CONTENTS:\n${artifactContext}\n\nBOARD MEMO: ${memo || 'None provided.'}\n\nUSER PROFILE: ${profileContext}`,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: ORACLE_PERSONA + `\n\nTASK: Read this moodboard as an oracle reads a spread. Synthesize the aesthetic cluster emerging from these artifacts. Identify what the user is unconsciously building toward. Provide three concrete next moves that would complete or advance the vision. Be specific, not generic. Speak in the voice of a trusted creative director who has seen the work.`,
        responseSchema: {
          type: Type.OBJECT,
          required: ['aesthetic_cluster', 'emergent_direction', 'what_you_seem_to_be_building', 'three_moves', 'missing_element'],
          properties: {
            aesthetic_cluster: { type: Type.STRING, description: 'The overarching aesthetic cluster in 3-6 words.' },
            emergent_direction: { type: Type.STRING, description: 'A 1-2 sentence read of the creative direction emerging from the board.' },
            what_you_seem_to_be_building: { type: Type.STRING, description: 'A direct 2-3 sentence statement of what the user is working toward, as if you are naming what they haven\'t said yet.' },
            three_moves: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Three specific, actionable next moves — objects, decisions, references, or productions that would advance the vision.',
            },
            missing_element: { type: Type.STRING, description: 'The single thing that is conspicuously absent from the board that would complete it.' },
          },
        },
      },
    });
    return cleanAndParse(response.text);
  });
};

export const generateLyriaSong = async (storyText: string, profile: any) => {
  try {
    return await withResilience(async (ai) => {
      const userProfileContext = profile ? JSON.stringify(profile.tasteProfile || {}) : 'None';
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `STORY: "${storyText}"\n\nUSER PROFILE: ${userProfileContext}`,
        config: {
          responseMimeType: "application/json",
          systemInstruction: `
            IDENTITY: You are "Lyria", an ambient, avant-garde music generation engine.
            TASK: Translate the user's micro-story into a unique, moody, electronic song layout.
            OUTPUT DESIGN: Return a JSON containing:
            - title: A cinematic title for the composition (max 5 words).
            - lyrics: Poetic lyrics split across 4-6 lines, inspired directly by the micro-story.
            - bpm: Recommended Tempo (60 to 120 beats per minute).
            - mood: Esoteric descriptor of the sonic texture (e.g. "ethereal, cold wave, cinematic noir").
            - chords: An array of 4 chord structures used as the harmonic base. Each chord chord MUST be set as an array of 3-4 notes (e.g., ["C3", "Eb3", "G3", "Bb3"]). Notes should include the octave number.
            - melody: An array of 8 notes for a flowing, elegant melody loop (e.g., ["C4", "Eb4", "G4", "Bb4", "C5", "Bb4", "G4", "Eb4"]).
            - vibe: Background synth choice: "sine", "square", "triangle", "sawtooth".
          `,
          responseSchema: {
            type: Type.OBJECT,
            required: ["title", "lyrics", "bpm", "mood", "chords", "melody", "vibe"],
            properties: {
              title: { type: Type.STRING },
              lyrics: { type: Type.STRING },
              bpm: { type: Type.INTEGER },
              mood: { type: Type.STRING },
              chords: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              melody: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              vibe: { type: Type.STRING }
            }
          }
        }
      });
      return cleanAndParse(response.text);
    });
  } catch (error) {
    console.warn("MIMI // Lyria synthesis failed, activating local crystalline fallback.", error);
    const lower = storyText.toLowerCase();
    let theme = "ambient noir";
    let chords = [["C3", "Eb3", "G3", "Bb3"], ["F3", "Ab3", "C4", "Eb4"], ["G3", "Bb3", "D4", "F4"], ["Ab3", "C4", "Eb4", "G4"]];
    let melody = ["C4", "Eb4", "G4", "Bb4", "C5", "Bb4", "G4", "Eb4"];
    let vibe = "sine";
    let Title = "Resonant Mirror";

    if (lower.includes("rain") || lower.includes("neon") || lower.includes("city") || lower.includes("alley") || lower.includes("cyber")) {
      theme = "cyber-noir wave";
      chords = [["D3", "F3", "A3", "C4"], ["G3", "Bb3", "D4", "F4"], ["A3", "C4", "E4", "G4"], ["Bb3", "D4", "F4", "A4"]];
      melody = ["D4", "F4", "A4", "C5", "D5", "C5", "A4", "F4"];
      vibe = "square";
      Title = "Indigo Shadows";
    } else if (lower.includes("fog") || lower.includes("cold") || lower.includes("harbor") || lower.includes("ocean") || lower.includes("water") || lower.includes("sea")) {
      theme = "coastal drift";
      chords = [["A2", "C3", "E3", "G3"], ["F3", "A3", "C4", "E4"], ["C3", "E3", "G3", "B3"], ["D3", "F3", "A3", "C4"]];
      melody = ["A3", "C4", "E4", "A4", "B4", "A4", "E4", "C4"];
      vibe = "triangle";
      Title = "Concrete Harbor";
    } else if (lower.includes("analog") || lower.includes("orange") || lower.includes("dials") || lower.includes("vinyl") || lower.includes("tape") || lower.includes("synth")) {
      theme = "tactile warm tape";
      chords = [["F3", "A3", "C4", "Eb4"], ["Bb3", "D4", "F4", "Ab4"], ["Eb3", "G3", "Bb3", "Db4"], ["Ab3", "C4", "Eb4", "Gb4"]];
      melody = ["F4", "A4", "C5", "Eb5", "F5", "Eb5", "C5", "A4"];
      vibe = "sawtooth";
      Title = "Soft Valves";
    }

    return {
      title: Title,
      lyrics: `Through the looking glass, we trace the threads,\nWhere light collapses and shadows tread.\nAn echo lingering in the cold unknown.`,
      bpm: 80,
      mood: `${theme} (Crystalline Emulated Waveform)`,
      chords,
      melody,
      vibe
    };
  }
};

export async function generateMimiDropMeta(productName: string, category: string, alignmentVibe: string, profile: any): Promise<any> {
  return withResilience(async (ai) => {
    const prompt = `
      You are Mimi, an elite, hyper-chic, high-concept design intelligence.
      Help the creator build a limited physical or digital object drop called a "Mimi Drop" (Aesthetic Altar & Conversion-Tuned Product Release).
      
      Input Details:
      Product Name: "${productName}"
      Category: "${category}"
      Desired Alignment/Vibe: "${alignmentVibe}"
      User Profile Context: ${JSON.stringify(profile?.tasteProfile || {})}
      
      Generate highly sophisticated copywriting, sensory alignment, and strategic conversion triggers for this brand altar. Use supreme, structural, brand-pov design terminology. Do not use generic salesy speech, marketing exclamation points, or hype-beast cliches. 

      Output JSON with exactly these keys:
      {
        "tagline": "An evocative, poetic, single-sentence luxury tagline.",
        "conceptThesis": "A 2-sentence philosophical thesis of why this object exists, representing a real Brand Point Of View as survival.",
        "sensoryCalibration": {
          "chromaticPalette": ["3 hex codes reflecting the color soul of this drop"],
          "materialityDescription": "Tactile details (textures, finishes, packaging weight)",
          "aromaAuditoryProfile": "The scent description and room acoustics recommendation for experiencing this drop"
        },
        "conversionPsychology": {
          "statusConferred": "The specific status, archetype identity, or cultural cachet this object confers to the buyer.",
          "frictionFulfillment": "Explain the delay or restriction (e.g. '14 days of silent curing before ship') that builds obsession instead of impatience.",
          "buyerObjectionReconciled": "How we preempt a pricing or utility concern by reframing it as design integrity.",
          "microActionCall": "The literal checkout button text, focusing on commitment or acquisition, keeping it modest and powerful (e.g. 'Secure Alchemical Shard', 'Pledge Alliance', 'Claim No. 01/50')"
        },
        "mimiCritique": "A brief, ultra-chic, slightly judgmental yet empowering editor's critique of this drop concept from Mimi."
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}");
  });
}

export async function generateMimiDropMetaFromDebris(rawUrl: string, scrapedTitle: string, scrapedDesc: string, extraContext: string, profile: any): Promise<any> {
  return withResilience(async (ai) => {
    const prompt = `
      You are Mimi, an elite, hyper-chic, high-concept design intelligence.
      You have been handed a piece of unstructured "aesthetic debris" (such as a Reddit comment debate, a Pinterest mood board URL, a Substack / newsletter article, or a playlist reference).
      
      Our user wants to extract the latent vibes, emotional psychographics, and design motifs from this debris, and materialize them into a "Mimi Drop" (Aesthetic Altar & Conversion-Tuned Product Release).
      
      Debris Context:
      - Raw URL / Source: "${rawUrl}"
      - Title of Page/Board: "${scrapedTitle}"
      - Summary description / text snippet extracted of this source: "${scrapedDesc}"
      - User's additional style input / vibe cues: "${extraContext}"
      - User Profile Context: ${JSON.stringify(profile?.tasteProfile || {})}
      
      Analyze the emotional subtext and aesthetic cues of this debris. Identify:
      1. What are the unexpressed anxieties, status ambitions, or micro-rituals of the subculture that loves this debris?
      2. How can we reframe these insights into a physical or digital product "altar" that represents an antidote or a celebration of this state?

      Output JSON with exactly these keys:
      {
        "suggestedName": "An evocative, non-obvious, poetic product name (e.g. 'Obsidian Shard', 'Fragmented Ivory', 'Damp Linen Core')",
        "suggestedCategory": "Must be one of: 'Brutalist Domestic', 'Archival Garment', 'Sensory Elixir', 'Aesthetic Instrument', 'Physical Codex'",
        "suggestedVibe": "A poetic material tension description summarizing the vibe (e.g. 'unpolished basalt, cool digital ozone, weight')",
        "tagline": "An evocative, poetic, single-sentence luxury tagline that triggers emotional alignment.",
        "conceptThesis": "A 2-sentence philosophical thesis explaining why this object exists as an antidote or cultural status monument.",
        "sensoryCalibration": {
          "chromaticPalette": ["3 hex codes reflecting the color soul of this drop based on the debris"],
          "materialityDescription": "Tactile details of the item (textures, weight, finishes, spatial presence)",
          "aromaAuditoryProfile": "The sensory aroma description and acoustic room acoustics recommend to ritualize this drop's presence"
        },
        "conversionPsychology": {
          "statusConferred": "The specific archetype status, inner curation authority, or aesthetic membership this object bestows to its buyer.",
          "frictionFulfillment": "Explain the delay or curation restriction (e.g. '7 days of exposure to direct sunlight before boxing') that builds anticipation.",
          "buyerObjectionReconciled": "How we preempt pricing or utility concerns by reframing them as ultimate craft and local focus constraints.",
          "microActionCall": "The literal checkout button text, focusing on commitment or acquisition, keeping it humble and powerful (e.g. 'Acquire Travertine Slab', 'Claim No. 01/45')"
        },
        "mimiCritique": "A brief, ultra-chic, slightly judgmental yet deeply empowering editor's critique of the ingested debris and how we translated it."
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}");
  });
}

export const mergeStyleTreatments = async (
  treatments: StyleTreatment[],
  profile: UserProfile | null,
  apiKey?: string
): Promise<StyleTreatment> => {
  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are Mimi, an editorial architect and aesthetic savant.
      Your task is to merge the following selected aesthetic style treatments (zines) into a single, unified, high-concept editorial document and style.
      
      Selected treatments to merge:
      ${JSON.stringify(treatments, null, 2)}
      
      MANDATE:
      1. Synthesize their motifs, palette, form, mood, era_refs, density, entropy, prompt_fragments, and commercial_signals into a single, higher-level cohesive aesthetic.
      2. Reconcile any interesting tensions or contradictions between them rather than diluting them. Give the combined style a distinct and poetic creative direction.
      3. Generate a beautiful, evocative, and classy unified name for the merged zine/treatment. It should sound like a premium editorial publication or curatorial project (e.g. "SOFT BRUTALISM // LACTIC NOIR", "THE CHROME ARCHIVE", "FERAL CLINICAL SYNTHESIS").
      4. Output strictly valid JSON conforming to the requested schema. Do not include markdown formatting or wrapping code blocks.
      `,
      config: {
        systemInstruction: ORACLE_PERSONA,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["treatmentName", "canonicalTaste"],
          properties: {
            treatmentName: { type: Type.STRING },
            canonicalTaste: {
              type: Type.OBJECT,
              required: ["motifs", "palette", "form", "mood", "era_refs", "density", "entropy", "prompt_fragments", "commercial_signals", "novelty_score"],
              properties: {
                motifs: { type: Type.ARRAY, items: { type: Type.STRING } },
                palette: { type: Type.ARRAY, items: { type: Type.STRING } },
                form: { type: Type.ARRAY, items: { type: Type.STRING } },
                mood: { type: Type.ARRAY, items: { type: Type.STRING } },
                era_refs: { type: Type.ARRAY, items: { type: Type.STRING } },
                density: { type: Type.NUMBER },
                entropy: { type: Type.NUMBER },
                prompt_fragments: { type: Type.ARRAY, items: { type: Type.STRING } },
                commercial_signals: { type: Type.ARRAY, items: { type: Type.STRING } },
                novelty_score: { type: Type.NUMBER }
              }
            }
          }
        }
      }
    });
    
    const result = cleanAndParse(response.text);
    return {
      id: `trt_${Date.now()}`,
      createdAt: Date.now(),
      treatmentName: result.treatmentName || "Unified Editorial Merge",
      canonicalTaste: result.canonicalTaste
    };
  }, apiKey);
};

export const generateZineSpeech = async (
  title: string,
  fullText: string,
  voiceName: 'Kore' | 'Koral' | 'Aoede' | 'Fenrir' = 'Kore',
  apiKey?: string
): Promise<{ audioUrl?: string; rawText: string }> => {
  const textToRead = `Title: ${title}.\n\n${fullText}`.substring(0, 3500);
  try {
    const result = await withResilience(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: textToRead }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return `data:audio/wav;base64,${base64Audio}`;
      }
      return null;
    }, apiKey);

    if (result) {
      return { audioUrl: result, rawText: textToRead };
    }
  } catch (err) {
    console.warn("MIMI // Gemini TTS service skipped, fallback to Web Speech API:", err);
  }
  return { rawText: textToRead };
};


