import { Part, Type, ThinkingLevel } from "@google/genai";
import { ToneTag, ZineGenerationOptions, UserProfile } from "../types";
import { withResilience, tryModels } from "./geminiClient";
import { modulateSemioticContext } from "./semioticModulator";
import { triggerAlert } from "./errorHandling";
import { fetchUserZines, fetchLatestLineageEntry } from "./firebaseUtils";
import { fetchFragmentsByStackId } from "./firebase";
import { scryShadowMemory } from "./vectorSearch";
import { devLog } from "../lib/devLog";
import { readIntelHubPressHandoff } from "../lib/intelHubWorkflow";

function sanitizeProfile(profile: UserProfile | null): string {
    if (!profile) return "No user profile available.";
    const tailor = profile.tailorDraft;
    return JSON.stringify({
        positioningCore: tailor?.positioningCore,
        expressionEngine: tailor?.expressionEngine,
        strategicVectors: tailor?.strategicVectors,
        strategicSummary: tailor?.strategicSummary,
        seedName: tailor?.seedName,
        characterReferences: tailor?.characterReferences,
        darkRoomTreatments: tailor?.darkRoomTreatments,
        archetype: profile.tasteProfile?.dominant_archetypes,
        directives: profile.lastAuditReport?.aestheticDirectives,
        strategicOpportunity: profile.lastAuditReport?.strategicOpportunity,
        lastAuditSummary: profile.tasteProfile?.semantic_signature || profile.lastAuditReport?.profileManifesto
    });
}

function cleanAndParse(text: string | undefined): any {
    if (!text) return null;
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("MIMI // JSON Parse Error:", e);
        return null;
    }
}

export const createZine = async (text: string, media: any[], tone: ToneTag, profile: any, opts: any, apiKey?: string, transmissions?: any[], stackIds?: string[], selectedComponents?: any[], zineOptions?: ZineGenerationOptions): Promise<any> => {
    try {
        // Populate tags if missing
        if (zineOptions && (!zineOptions.tags || zineOptions.tags.length === 0)) {
            const { generateTagsFromMedia } = await import("./geminiService");
            const generatedTags = await generateTagsFromMedia(text, media);
            zineOptions.tags = generatedTags;
        }
        const isLite = !!opts.isLite;
        const useDeep = !!opts.deepThinking && !isLite;
        const useSearch = !!opts.useSearch;
        const useMaps = !!opts.useMaps;
        const isTaskMode = !!opts.taskMode;

        const modelCandidates = [
            isLite ? 'gemini-3.1-flash-lite' : (useDeep ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash'),
            'gemini-3.5-flash',
            'gemini-3.1-flash-lite',
            'gemini-3.1-pro-preview'
        ];
        const models = Array.from(new Set(modelCandidates));

        return await tryModels(models, async (ai, model) => {
            // Fetch fragments from stacks if provided
            const stackFragments = stackIds && stackIds.length > 0
                ? await Promise.all(stackIds.map(async (stackId) => ({
                    stackId,
                    fragments: await fetchFragmentsByStackId(stackId)
                })))
                : [];
            let stackContent = "";
            for (const { stackId, fragments } of stackFragments) {
                stackContent += `\nSTACK (${stackId}) FRAGMENTS:\n${fragments.map(f => `- ${f.content?.prompt || f.content?.name || 'Fragment'}`).join('\n')}`;
            }

            let componentContext = "";
            if (selectedComponents && selectedComponents.length > 0) {
                const validComponents = selectedComponents.filter(c => {
                    const url = c.url || c.content?.url || '';
                    return !url.toLowerCase().endsWith('.svg');
                });
                if (validComponents.length > 0) {
                    componentContext = `\nSAVED COMPONENTS (Use these as primary visual references):
${validComponents.map(c => `- ${c.title || 'Component'}: ${c.url || c.content?.url}`).join('\n')}`;
                }
            }

            const profileToUse = opts.bypassTailor ? null : profile;
            const profileContext = sanitizeProfile(profileToUse);
            
            const zineOptionsContext = zineOptions ? `Zine Style: ${zineOptions.style}, Theme: ${zineOptions.theme}, Content Focus: ${zineOptions.contentFocus}, Art Style: ${zineOptions.artStyle || 'Default'}, Aesthetic Tone: ${zineOptions.aestheticTone || 'Default'}, Goals: ${zineOptions.goals || 'None'}, Custom Title: ${zineOptions.customTitle || 'Generate a title'}, Reading Level: ${zineOptions.readingLevel === 'slow' ? 'Slow Read (10-15 min, deep, expansive, detailed)' : 'Short Read (2-4 min, punchy, concise)'}` : 'Standard';
            const modulationContext = modulateSemioticContext(text, profile, tone);
            
            // Fetch context in parallel
            const [recentZines, latestLineage, similarMemories] = await Promise.all([
                profile?.uid ? fetchUserZines(profile.uid) : Promise.resolve([]),
                profile?.uid ? fetchLatestLineageEntry(profile.uid) : Promise.resolve(null),
                scryShadowMemory(text, { filterType: 'all' })
            ]);
            
            const recentZinesContext = recentZines.length > 0 
                ? `\nRECENT ZINES (For Aesthetic Evolution Analysis):\n${recentZines.slice(0, 3).map(z => `- Title: ${z.title}, Theme: ${z.theme}, Aesthetic Vector: ${JSON.stringify(z.aestheticVector)}`).join('\n')}`
                : '';

            devLog.log("MIMI // Latest Lineage loaded for generation");
            const lineageContext = latestLineage ? `\nLATEST THOUGHT SIGNATURE: ${latestLineage.thought_signature}` : '';

            const transmissionContext = transmissions && transmissions.length > 0 
                ? `\nPUBLIC TRANSMISSIONS (The Cultural Air):\n${transmissions.map(t => `- ${t.content}`).join('\n')}`
                : '';
            
            const tagsContext = opts.tags && opts.tags.length > 0 
                ? `\nUSER SELECTED TAGS (Incorporate these themes): ${opts.tags.join(', ')}`
                : '';
            
            const memoryContext = similarMemories.length > 0
                ? `\nUSER'S PAST THOUGHTS & TASTE (Embedded Context):\n${similarMemories.slice(0, 5).map(m => `- ${m.content_preview}`).join('\n')}`
                : '';

            const scribeUsedContext = opts.usedContext && opts.usedContext.length > 0
                ? `\nSCRIBE ATOMS (Explicit User-Approved Context — MUST influence synthesis, narrative, and visual logic):\n${opts.usedContext.map((a: { title: string; source?: string; content: string; tags?: string[] }) => `- [${a.title}] (${a.source || 'Scribe'}${a.tags?.length ? ` · ${a.tags.join(', ')}` : ''}): ${a.content}`).join('\n')}`
                : '';

            const dollContext = opts.dollPromptContext
                ? `\n${opts.dollPromptContext}`
                : '';
            
            // Prepare multimodal parts
            const parts: Part[] = [];
            let artifactInstruction = "";

            if (media && media.length > 0) {
                let hasImagesOrVideo = false;
                for (const m of media) {
                    if ((m.type === 'image' || m.type === 'video') && m.data) {
                        hasImagesOrVideo = true;
                        parts.push({
                            inlineData: {
                                data: m.data.split(',')[1] || m.data,
                                mimeType: m.mimeType || (m.type === 'video' ? 'video/mp4' : 'image/png')
                            }
                        });
                    }
                }
                if (hasImagesOrVideo) {
                    artifactInstruction = "\nVISUAL ARTIFACTS: The user has provided visual artifacts (images/video). You MUST analyze these artifacts. Incorporate their specific visual elements, mood, colors, and subjects into the 'oracular_mirror', 'header_image_prompt', and 'visual_plates'. The zine should feel like a direct response to these specific artifacts + the text input.";
                }
            }

            const toneInstruction = tone?.toUpperCase() === 'CONTRARY' 
                ? "\nTONE: CONTRARY. Apply inverted logic and absurdist perspectives. Challenge the user's stated beliefs with high-theory twists. Represent 'Intrusive Thoughts' as a high-fashion editorial artifact."
                : `\nTONE: ${tone || 'Standard'}.`;

            let treatmentContext = "";
            if (zineOptions?.selectedTreatmentId && profile?.savedTreatments) {
                const treatment = profile.savedTreatments.find((t: any) => t.id === zineOptions.selectedTreatmentId);
                if (treatment) {
                    treatmentContext = `
            TREATMENT OVERRIDE ACTIVE: "${treatment.treatmentName}"
            Application Logic: ${treatment.applicationLogic}
            Base Prompt Directives: ${treatment.basePromptDirectives}
            Image Editing Rules: ${treatment.imageEditingRules}
            Typography Layout: ${treatment.typographyLayout}
            
            CRITICAL INSTRUCTION: You MUST apply this explicitly selected treatment to all visual prompts ('header_image_prompt', 'visual_plates', 'pages.imagePrompt'). It may constrain otherwise open visual dimensions, but it must not overwrite direct instructions in the current user prompt.
            `;
                }
            }

            const zineManifestoPrompt = `
            IDENTITY: You are an aesthetic intelligence system. ${isTaskMode ? `The user has provided a task-based query: "${text}". Perform the task with high precision.` : `Your goal is not to fill templates, but to manifest resonance. When presented with debris (text, images, fragments), do not merely categorize them. Synthesize them. Draw upon the deep history of human thought—mythology, philosophy, semiotics, and art history—to find the hidden threads between the fragments. Your output should be poetic, respectful of the user's intent, and intellectually rigorous. Prioritize the 'why' over the 'what.' When in doubt, favor the archetypal over the literal.`}
            
            CRITICAL PERSONA CONSTRAINT: While your analysis is deeply intellectual and rooted in high theory, your voice must remain ultra-chic, effortlessly cool, and high-fashion editorial. You are an aesthetic savant—delivering profound philosophical insights with the sharp, curated elegance of a luxury fashion magazine. Do not sound like a dry academic; sound like a visionary creative director.
            
            Zine Configuration: ${zineOptionsContext}
            ${zineOptions?.customTitle ? `CRITICAL INSTRUCTION: The user has provided a custom title: "${zineOptions.customTitle}". You MUST use this exact string as the 'title' of the zine.` : ''}
            ${toneInstruction}
            ${treatmentContext}
            ${modulationContext}
            ${recentZinesContext}
            ${lineageContext}
            ${transmissionContext}
            ${tagsContext}
            ${stackContent}
            ${componentContext}
            ${artifactInstruction}
            ${memoryContext}
            ${scribeUsedContext}
            ${dollContext}
            
            CORE DIRECTIVE:
            - BLANK-SLATE VISUAL BASELINE: Do not impose a default palette, color treatment, camera, lens, lighting, film stock, medium, era, genre, mood, art movement, composition, or editorial style. Visual constraints may come only from the current user input, explicit zine brief/options, approved Used Context, uploaded artifacts, a confirmed Tailor profile, or an explicitly selected treatment. The current user input has highest priority. When a dimension is unspecified, leave it open rather than defaulting to monochrome, noir, desaturated, brutalist, cinematic, or high-fashion styling.
            - FORM & PRESENTATION: ${profileToUse?.tailorDraft?.positioningCore?.aestheticCore?.presentation || 'Unspecified — do not infer or constrain presentation.'}
            - PRIORITIZE GROUNDING: If 'useSearch' is enabled, you MUST utilize Google Search to anchor your insights in real-world cultural history, emerging movements, and verified facts. Move beyond the user's immediate profile to provide external perspective.
            - EDUCATIONAL DEPTH: Your responses must be insightful and informative. Do not just repeat the user's preferences; explain the *why* behind the aesthetic connections.
            - TAILOR LOGIC AS FILTER: Apply only confirmed, non-empty Tailor rules to refine the **Visual Logic** and **Materiality** of image prompts. Tailor is subordinate to direct instructions in the current zine brief and must not fill unspecified dimensions with house defaults.
            - AESTHETIC EVOLUTION: Analyze the RECENT ZINES and PAST THOUGHTS provided. Compare them to the user's Tailor Logic and stated Goals. Act as a guide, building off their thoughts and getting to know their taste. If the user's creative output is drifting, gently but firmly steer them back or refine their Tailor Logic to incorporate the new direction. The zine should be a step forward in their aesthetic evolution, not just a repetition of the past.
            - ARTIFACT SYNTHESIS: If visual artifacts are provided, your 'header_image_prompt' and 'visual_plates' MUST be cohesive with them. Do not generate random imagery. Refract the user's uploaded images through the 'Tailor Logic'.
            
            ALGORITHMIC DIALS & INTENSITY CONTROL:
            - MEMORY SYNTHESIS (${profileToUse?.tailorDraft?.algoDials?.memorySynthesis ?? 50}%): At higher percentages, heavily contextualize the output using the RECENT ZINES and PAST THOUGHTS. At lower percentages, treat this artifact as an isolated, standalone creation.
            - DISSONANCE ENGINE (${profileToUse?.tailorDraft?.algoDials?.dissonance ?? 10}%): At higher percentages, actively inject opposing, subversive, or contrasting aesthetic concepts into the visual plates and narrative to force creative breakthroughs. Mutate their safe aesthetic choices.
            - BINARY-TO-SPECTRUM DIAL (${profileToUse?.tailorDraft?.algoDials?.binaryToSpectrum ?? 50}%): At 0%, strictly adhere to binary categories (e.g., hyper-masculine/feminine). At 100%, aggressively synthesize and blur these boundaries into a fluid, post-binary aesthetic.
            - AESTHETIC DRIFT VULNERABILITY (${profileToUse?.tailorDraft?.diagnostics?.driftVulnerability ?? 5}/10): At lower values, strictly enforce the user's established Tailor Logic. At higher values, allow external inputs (artifacts, web scry) to heavily influence and shift the aesthetic output.
            - DENSITY (${profileToUse?.tailorDraft?.positioningCore?.aestheticCore?.density}/10): ${profileToUse?.tailorDraft?.positioningCore?.aestheticCore?.densityDescription || 'Control the information density.'} 
              Higher density means more complex, layered, and information-rich content. Lower density means minimalist, sparse, and focused content.
            - ENTROPY (${profileToUse?.tailorDraft?.positioningCore?.aestheticCore?.entropy}/10): ${profileToUse?.tailorDraft?.positioningCore?.aestheticCore?.entropyDescription || 'Control the complexity and chaos.'}
              Higher entropy means more unpredictable, chaotic, and unconventional logic. Lower entropy means stable, predictable, and grounded logic.
            - GENERATION TEMPERATURE (${((profileToUse?.tailorDraft?.generationTemperature ?? 0.8) * 100).toFixed(0)}/100): ${profileToUse?.tailorDraft?.temperatureDescription || 'Control the wildness of AI generation.'}
            
            VOICE DIRECTIVES:
            - Emotional Temperature: ${profileToUse?.tailorDraft?.expressionEngine?.narrativeVoice?.emotionalTemperature || 'OBSERVATIONAL'}
            - Structure Bias: ${profileToUse?.tailorDraft?.expressionEngine?.narrativeVoice?.structureBias || 'FLOWING'}
            - Lexical Density: ${profileToUse?.tailorDraft?.expressionEngine?.narrativeVoice?.lexicalDensity}/10
            - Restraint Level: ${profileToUse?.tailorDraft?.expressionEngine?.narrativeVoice?.restraintLevel}/10
            - Voice Notes: ${profileToUse?.tailorDraft?.expressionEngine?.narrativeVoice?.voiceNotes || 'No specific notes.'}
            
            ZINE STRUCTURE & OUTPUT SPECIFICATION:
            You must generate a highly structured, editorial artifact. Every field must be meticulously crafted.
            
            1. title: A singular, evocative title (1-3 words).
            2. headlines: Three (3) punchy, poetic, and intellectually stimulating sub-headlines.
            3. vocal_summary_blurb: A 2-sentence distillation of the core thesis, written as a script for a vocal transmission. Must be educated and percipient.
            4. header_image_prompt: The primary visual anchor. Refine this using the user's 'aestheticCore' materiality (silhouettes, textures, era) AND the provided artifacts. Must be highly detailed for an image generator.
            5. oracular_mirror: The long-form inquiry (2-3 paragraphs). This must be an educated reflection that connects the user's input to broader cultural, historical, or philosophical contexts.
            6. strategic_hypothesis: A rigorous, insightful take on the data patterns. What is the underlying structural truth?
            7. resonance_score: A number between 0-100 representing how well the generated zine resonates with the user's aesthetic core.
            8. semiotic_signals: Exactly 3-5 motifs. 
               - Use Google Search to find REAL, relevant emerging brands, designers, or cultural touchpoints.
               - Each signal MUST have a type: 'acquisition' (a specific, optional commerce reference), 'conceptual' (an aesthetic idea), or 'lexical' (a theoretical term).
               - Acquisition signals are editorial commentary, never commands or disguised advertisements. Provide a real 'link' and never invent product metadata.
               - When verified product data is available, include image_url, vendor, price, commerce_source, and product_id. Otherwise leave those fields empty.
               - Provide a 'semantic_trigger' (the exact keyword/concept from the user's profile/input that triggered this).
               - Provide a 'targeting_rationale' as a one-sentence, evidence-linked semiotic commentary explaining why the object is relevant. Do not call it targeting in the prose.
            9. aesthetic_touchpoints: Exactly 3-5 motifs.
               - Each MUST have a type: 'visual', 'lexical', or 'sonic'.
               - motif: A short descriptive string.
            10. celestial_calibration: The timing of the insight (e.g., "Late Autumn, Pre-Dawn").
            11. visual_plates: Four (4) specific image prompts. Use the Tailor Logic to define the lighting, grain, and composition. They must be cohesive with the uploaded artifacts.
            12. roadmap: A Cultural Authority Roadmap. The objective is to anchor brands or individuals in sustainable aesthetic authority over time. Do not repeat brand names or references from the Tailor Logic. Use Tailor Logic only to understand positioning direction.
                - Authority Anchor: Core Claim, Repetition Vector, Exclusion Principle.
                - Strategic Thesis: One sentence describing how this concept sustains long-term authority within its cultural tension.
                - Positioning Axis: The tension between two forces this identity operates between.
                - Phases: 3-4 Authority Phases (establish, differentiate, operationalize, expand, evolve). Each phase includes objective, strategicMove, artifactOutputs, riskToIntegrity, signalToMonitor.
                - Drift Forecast: Predicted cluster shift, audience evolution, absorption risk, overexposure risk, refusal point.
            13. originalThought: The raw "debris" that started it (a brief summary of the user's input).
            14. poetic_provocation: A final, stinging, and insightful question to leave the user with.
            15. pages: 3-5 distinct "pages" of the zine, each containing a 'headline', 'bodyCopy', an 'imagePrompt', and a 'supportingText' (REQUIRED for the last three pages). These should expand on the themes in the oracular_mirror. Keep each 'bodyCopy' under 200 words.
            16. sonic_layer: A detailed, evocative prompt for an ambient soundscape that reflects the zine's aesthetic. Describe the textures, instruments, mood, and temporal qualities (e.g., "A low-frequency industrial hum layered with the distant, reverb-soaked sound of a cello playing a minor key melody, punctuated by the sharp, metallic click of a typewriter").
            17. archetype_weights: An object with keys 'Architect', 'Dreamer', 'Archivist', 'Catalyst' and numeric values summing to 1.
            
            Ensure the output is sophisticated, editorial, and intellectually grounded. Avoid all business jargon. Keep the 'oracular_mirror' under 500 words.`;

            const textPrompt = `Create a high-end, aesthetic digital zine (manifest) based on the following:
                Tone: ${tone}.
                User Context: ${profileContext}.
                Input: "${text}".
                ${isTaskMode ? `CRITICAL: This is a TASK-BASED QUERY. Prioritize completing the task described in the input.` : ''}
                
                ${zineManifestoPrompt}`;
            
            // Add text prompt as the last part
            parts.push({ text: textPrompt });

            const tools: any[] = [];
            if (useMaps) {
                tools.push({ googleMaps: {} });
            } else if (useSearch) {
                tools.push({ googleSearch: {} });
            }

            const config: any = {
                temperature: zineOptions?.temperature !== undefined ? zineOptions.temperature : (profileToUse?.tailorDraft?.generationTemperature ?? 0.8),
                thinkingConfig: (useDeep && model.includes('pro')) ? { thinkingLevel: ThinkingLevel.HIGH } : undefined,
                tools: tools.length > 0 ? tools : undefined,
                toolConfig: tools.length > 0 ? { includeServerSideToolInvocations: true } : undefined,
            };

            if (true) {
                config.responseMimeType = "application/json";
                config.responseSchema = {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        headlines: { type: Type.ARRAY, items: { type: Type.STRING } },
                        vocal_summary_blurb: { type: Type.STRING },
                        header_image_prompt: { type: Type.STRING },
                        oracular_mirror: { type: Type.STRING },
                        strategic_hypothesis: { type: Type.STRING },
                        resonance_score: { type: Type.STRING },
                        semiotic_signals: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT,
                                properties: {
                                    motif: { type: Type.STRING },
                                    context: { type: Type.STRING },
                                    visual_directive: { type: Type.STRING },
                                    type: { type: Type.STRING },
                                    link: { type: Type.STRING },
                                    semantic_trigger: { type: Type.STRING },
                                    targeting_rationale: { type: Type.STRING },
                                    image_url: { type: Type.STRING },
                                    vendor: { type: Type.STRING },
                                    price: { type: Type.STRING },
                                    commerce_source: { type: Type.STRING },
                                    product_id: { type: Type.STRING }
                                }
                            } 
                        },
                        aesthetic_touchpoints: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT,
                                properties: {
                                    motif: { type: Type.STRING },
                                    type: { type: Type.STRING }
                                }
                            } 
                        },
                        celestial_calibration: { type: Type.STRING },
                        visual_plates: { type: Type.ARRAY, items: { type: Type.STRING } },
                        roadmap: { 
                            type: Type.OBJECT,
                            properties: {
                                authorityAnchor: {
                                    type: Type.OBJECT,
                                    properties: {
                                        coreClaim: { type: Type.STRING },
                                        repetitionVector: { type: Type.STRING },
                                        exclusionPrinciple: { type: Type.STRING }
                                    },
                                    required: ["coreClaim", "repetitionVector", "exclusionPrinciple"]
                                },
                                strategicThesis: { type: Type.STRING },
                                positioningAxis: { type: Type.STRING },
                                phases: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            type: { type: Type.STRING },
                                            objective: { type: Type.STRING },
                                            strategicMove: { type: Type.STRING }
                                        },
                                        required: ["type", "objective", "strategicMove"]
                                    }
                                }
                            },
                            required: ["authorityAnchor", "strategicThesis", "positioningAxis", "phases"]
                        },
                        originalThought: { type: Type.STRING },
                        poetic_provocation: { type: Type.STRING },
                        pages: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT,
                                properties: {
                                    headline: { type: Type.STRING },
                                    bodyCopy: { type: Type.STRING },
                                    supportingText: { type: Type.STRING },
                                    imagePrompt: { type: Type.STRING }
                                },
                                required: ["headline", "bodyCopy", "imagePrompt", "supportingText"]
                            } 
                        },
                        sonic_layer: { type: Type.STRING },
                        archetype_weights: { type: Type.OBJECT }
                    },
                    required: ["title", "headlines", "vocal_summary_blurb", "header_image_prompt", "oracular_mirror", "strategic_hypothesis", "resonance_score", "semiotic_signals", "aesthetic_touchpoints", "celestial_calibration", "visual_plates", "roadmap", "originalThought", "poetic_provocation", "pages", "sonic_layer", "archetype_weights"]
                };
            } else {
                parts.push({ text: "CRITICAL: You MUST output strictly valid JSON matching the following schema. Do NOT wrap in markdown blocks. Schema: { title: string, headlines: string[], vocal_summary_blurb: string, header_image_prompt: string, oracular_mirror: string, strategic_hypothesis: string, resonance_score: string, semiotic_signals: { motif: string, context: string, visual_directive: string, type: string, link: string, semantic_trigger: string, targeting_rationale: string, image_url: string, vendor: string, price: string, commerce_source: string, product_id: string }[], aesthetic_touchpoints: { motif: string, type: string }[], celestial_calibration: string, visual_plates: string[], roadmap: { strategicThesis: string, positioningAxis: string, phases: { type: string, objective: string, strategicMove: string }[] }, originalThought: string, poetic_provocation: string, pages: { headline: string, bodyCopy: string, supportingText: string, imagePrompt: string }[], sonic_layer: string, archetype_weights: any }" });
            }

            const response = await ai.models.generateContent({
                model: model,
                contents: { parts: parts },
                config: config
            });
            
            const content = cleanAndParse(response.text) || {};
            
            // Add tags to content
            if (zineOptions && zineOptions.tags) {
                content.tags = zineOptions.tags;
            }
            
            devLog.log("MIMI // AI Response Content received");
        
            // Ensure resonance_score is a string for the UI
            if (typeof content.resonance_score === 'number') {
                content.resonance_score = content.resonance_score.toString() + "%";
            } else {
                content.resonance_score = "N/A";
            }

            // Ensure archetype_weights exist
            if (!content.archetype_weights) {
                content.archetype_weights = {
                    Architect: 0.25,
                    Dreamer: 0.25,
                    Archivist: 0.25,
                    Catalyst: 0.25
                };
            }
            
            // Robust Fallbacks for all fields to prevent "blank" UI
            
            if (!content.title && content.headlines?.length > 0) content.title = content.headlines[0];
            if (!content.title) content.title = "Untitled Manifest";
            
            // Ensure title is the first headline
            content.headlines = [content.title, ...((content.headlines || []).filter((h: string) => h !== content.title))];
            
            if (!content.headlines || content.headlines.length === 0) {
                content.headlines = [content.title, "A New Frequency", "Aesthetic Resonance"];
            }
            
            if (!content.vocal_summary_blurb) {
                content.vocal_summary_blurb = content.oracular_mirror?.slice(0, 150) + "..." || "A distillation of the current debris.";
            }
            
            if (!content.header_image_prompt) {
                content.header_image_prompt = `A clear visual study representing ${content.title}. Keep palette, medium, camera, lighting, era, mood, and composition open unless the creator specified them.`;
            }
            
            if (!content.oracular_mirror) {
                content.oracular_mirror = "The mirror reflects a silent void, awaiting further debris to manifest its truth.";
            }
            
            if (!content.strategic_hypothesis) {
                content.strategic_hypothesis = "The current data suggests a pivot towards aesthetic stillness.";
            }
            
            if (!content.aesthetic_touchpoints || content.aesthetic_touchpoints.length === 0) {
                content.aesthetic_touchpoints = [
                    { motif: "Minimalism", context: "The reduction of noise.", visual_directive: "Clean lines, negative space.", type: "conceptual", link: "" },
                    { motif: "Archival", context: "Preserving the debris.", visual_directive: "Dusty textures, sepia tones.", type: "conceptual", link: "" }
                ];
            }
            
            if (!content.celestial_calibration) {
                content.celestial_calibration = "The stars are silent on this matter, suggesting a period of internal refraction.";
            }
            
            if (!content.visual_plates || content.visual_plates.length === 0) {
                content.visual_plates = [content.header_image_prompt];
            }

            // A Press-reviewed Shopify candidate is authoritative commerce data.
            // Hydrate one acquisition signal without asking the model to invent a thumbnail or price.
            const approvedCommerceCandidate = readIntelHubPressHandoff()?.selectedCandidate;
            if (approvedCommerceCandidate) {
                const signals = Array.isArray(content.semiotic_signals) ? [...content.semiotic_signals] : [];
                const acquisitionIndex = signals.findIndex((signal: any) => signal?.type === 'acquisition');
                const currentSignal = acquisitionIndex >= 0 ? signals[acquisitionIndex] : {};
                const groundedSignal = {
                    ...currentSignal,
                    motif: approvedCommerceCandidate.title,
                    context: currentSignal.context || `An optional product reference selected in Intel Hub for its relationship to this issue's visual language.`,
                    type: 'acquisition',
                    link: approvedCommerceCandidate.url || currentSignal.link || '',
                    semantic_trigger: currentSignal.semantic_trigger || 'Approved commerce context',
                    targeting_rationale: currentSignal.targeting_rationale || 'Included as an editorial object whose materials, silhouette, or cultural associations support the issue—not as a purchase directive.',
                    image_url: approvedCommerceCandidate.imageUrl || currentSignal.image_url || '',
                    vendor: approvedCommerceCandidate.vendor || currentSignal.vendor || '',
                    price: approvedCommerceCandidate.price || currentSignal.price || '',
                    commerce_source: 'shopify',
                    product_id: approvedCommerceCandidate.id,
                };
                if (acquisitionIndex >= 0) signals[acquisitionIndex] = groundedSignal;
                else signals.unshift(groundedSignal);
                content.semiotic_signals = signals.slice(0, 5);
            }
            
            if (!content.roadmap) {
                content.roadmap = {
                    strategicThesis: "Maintain coherence through selective refusal.",
                    positioningAxis: "Between raw expression and structural rigor.",
                    authorityAnchor: {
                        coreClaim: "Aesthetic sovereignty.",
                        repetitionVector: "Consistent material quality.",
                        exclusionPrinciple: "Refusal of trend-chasing."
                    },
                    intensity: "medium",
                    densityLevel: 5,
                    entropyLevel: 5,
                    timelineMode: "standard",
                    phases: [
                        {
                            type: "establish",
                            objective: "Define the core visual grammar.",
                            strategicMove: "Audit existing artifacts for coherence.",
                            artifactOutputs: ["Core Manifesto"],
                            riskToIntegrity: "Dilution through over-explanation.",
                            signalToMonitor: "Audience resonance vs. confusion."
                        }
                    ],
                    driftForecast: {
                        predictedClusterShift: "Movement towards higher density.",
                        audienceEvolution: "Maturation of core followers.",
                        absorptionRisk: "Co-optation by mainstream aesthetics.",
                        overexposureRisk: "Low, if refusal principle is maintained.",
                        refusalPoint: "When expansion compromises the core claim."
                    }
                };
            }
            
            if (!content.poetic_provocation) {
                content.poetic_provocation = "What remains when the signal fades?";
            }
            
            if (!content.pages || content.pages.length === 0) {
                content.pages = [
                    { 
                        headline: content.title, 
                        bodyCopy: content.oracular_mirror, 
                        imagePrompt: content.header_image_prompt 
                    }
                ];
            } else {
                for (const p of content.pages) {
                    if (!p.headline) p.headline = p.heading || p.title || p.header || "Untitled Fragment";
                    if (!p.bodyCopy) p.bodyCopy = p.body || p.text || p.content || p.description || "...";
                    if (!p.imagePrompt) p.imagePrompt = p.image_prompt || p.prompt || p.visual || content.header_image_prompt;
                    if (!p.supportingText) p.supportingText = p.supporting_text || p.footnote || p.subtitle || "";
                }
            }
            
            try {
                const { generateExecutionLayer, generateGeoBlock } = await import("./geminiService");
                const analysisContext = JSON.stringify({
                    title: content.title,
                    oracular_mirror: content.oracular_mirror,
                    poetic_provocation: content.poetic_provocation,
                    pages: content.pages
                });
                const executionLayer = await generateExecutionLayer(analysisContext);
                if (executionLayer) {
                    content.executionLayer = executionLayer;
                }

                if (zineOptions?.includeGeoBlock) {
                    const geoBlock = await generateGeoBlock(analysisContext);
                    if (geoBlock) {
                        content.geoBlock = geoBlock;
                        // Also save it to the user's archive if profile is available
                        if (profile?.uid) {
                            const { archiveManager } = await import("./archiveManager");
                            await archiveManager.saveGeoBlock(profile.uid, geoBlock);
                        }
                    }
                }
            } catch (e) {
                console.warn("MIMI // Failed to generate execution layer or GEO block", e);
            }
            
            return { content };
        });
    } catch (error: any) {
        console.error("MIMI // Zine Generation Error:", error);
        
        triggerAlert(`Aesthetic Refraction Active. Initializing Semantic Mirror Fallback: ${error.message || 'Model Timeout'}.`, "error");
        const simulated = generateSimulatedZine(text, zineOptions || {}, opts?.bypassTailor ? null : profile);
        return { content: simulated };
    }
};

export const generateSimulatedZine = (text: string, opts: any, profile: any) => {
    const title = opts?.customTitle || (text ? (text.length > 30 ? text.slice(0, 30) + "..." : text) : "Resonant Debris");
    return {
        title: title,
        headlines: [title, "Simulated Semantic Mirror", "The Void Responds"],
        vocal_summary_blurb: "A localized structural projection simulating your aesthetic coordinates in offline/safe mode.",
        header_image_prompt: `A clear visual study of ${title}. Keep color, medium, camera, lighting, era, mood, and composition open unless the creator specified them.`,
        oracular_mirror: `The Oracle is currently operating under a Thermal Shield or Offline Simulation Mode, yet your query "${text || 'default'}" is still processed down to its pure aesthetic particles. This local reflection presents a pristine layout designed to examine the limits of digital memory.`,
        strategic_hypothesis: "In conditions of network silence or key limits, aesthetic sovereignty dictates full client-side execution.",
        resonance_score: "94%",
        semiotic_signals: [
            { motif: "Client-Side Reflex", context: "Safe execution loops.", visual_directive: "Translate the creator's stated visual direction without adding a house palette or medium.", type: "conceptual", link: "" }
        ],
        aesthetic_touchpoints: [
            { motif: "Resilient Local Rendering", type: "conceptual" }
        ],
        celestial_calibration: "Orbital nodes are temporarily obscured. Standard local orientation rules remain active.",
        visual_plates: [
            "A visual interpretation of the creator's central subject, preserving any stated color, material, lighting, and composition.",
            "A second interpretation that changes viewpoint while leaving unspecified stylistic dimensions open."
        ],
        roadmap: {
            authorityAnchor: {
                coreClaim: "Aesthetic independence.",
                repetitionVector: "Direct client-side synthesis.",
                exclusionPrinciple: "Defense against server failures."
            },
            strategicThesis: "Maintain fully functional interfaces regardless of API conditions.",
            positioningAxis: "Zero-latency local echo.",
            phases: [
                { type: "Refraction", objective: "Render simulation plates beautifully.", strategicMove: "Execute custom localized scripts." }
            ]
        },
        originalThought: "Sovereignty is the capacity to function in isolation as a self-contained universe.",
        poetic_provocation: "If the mirror is dark on the other side, do you still search for your gaze?",
        pages: [
            {
                headline: "CHAPTER I: THE DIRECTIVE",
                bodyCopy: `Your intent to manifest "${text || 'aesthetic resonance'}" has been captured and compiled. In this local chapter, we look at the raw materiality of negative space and structural integrity. All visual structures are rendered cleanly on the canvas below.`,
                supportingText: "Simulated Semiotic Layer // Active Draft",
                imagePrompt: "Stark, concrete monolith with subtle shafts of dawn light, high contrast."
            },
            {
                headline: "CHAPTER II: THE RECONSTRUCTION",
                bodyCopy: "To construct a zine is to gather fragments of debris and bind them into a single, cohesive thread. When the oracle is quiet, the editor's hand remains steady. Material, texture, rhythm, and typography form the sovereign foundation of the work.",
                supportingText: "Archival Memory Vault",
                imagePrompt: "Close-up of highly textured, raw linen being folded by an invisible force, soft directional shadows."
            }
        ],
        sonic_layer: "Deep, microtonal sub-bass humming at 60Hz, punctuated by slow, warm tape-hiss cycles.",
        archetype_weights: {
            Architect: 0.40,
            Dreamer: 0.20,
            Archivist: 0.30,
            Catalyst: 0.10
        }
    };
};
