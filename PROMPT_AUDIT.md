# Prompt Audit & Hierarchy (Phase 1 & 2)

## Phase 1: Prompt Audit Table

| Prompt Name | Purpose | Input | Output | Used Where? | Status / Action |
|---|---|---|---|---|---|
| `generateAestheticDNA` | Dynamic generative aesthetic parsing | Dynamic text | Structured DNA | Tailor/Onboarding | **Rewrite** (Standardize system prompt, not dynamic) |
| `generateExecutionLayer` | Dynamic structured extraction | Context | Structured JSON | Strategy | **Rewrite** (Use ENGINE_2 instead of dynamic prompt) |
| `generateGeoBlock` | Generate visual geo-block representations | Text content | GEO JSON | GEO Engine | **Keep** |
| `generateNarrativeThread` | Connect fragmented ideas into threads | Multiple ideas | Thread object | Studio/Threads | **Keep** (Uses ENGINE_2) |
| `generateTrajectoryReadout` | Predict the aesthetic trajectory | Profile data | Trajectory JSON | Tailor | **Keep** (Uses ENGINE_2) |
| `generateProposalStrategy` | Format a pitch or strategic proposal | Context / Text | Proposal JSON | Studio/Proposals | **Keep** (Uses ENGINE_2) |
| `generateProjectTasks` / Blueprint | Create actionable tasks from fragments | Memo/Artifacts | Task List JSON | Action Board | **Merge** (with The Executor/Architect) |
| `generateTasteDiscovery` | Provide user insight onto their taste | Raw selections | Discovery JSON | Intake/Onboarding | **Merge** (Move to Layer 2 concept) |
| `generateScribeReading` | Read the subtext of a user's input | Input text/Image | Poetic text | Live / Scribe | **Keep** (Core poetic identity) |
| `generatePlatformStrategy` | Recommend specific digital strategy/platforms | Brand artifacts | Strategy JSON | Dossier / Studio | **Merge** (Overlaps with Proposal Strategy) |
| `generateZineTitle` | Title a generated collection | Context / Tags | Short String | Zine Engine | **Keep** (Simple, effective) |
| `generateAutoAwesomePrompt` | Auto-enhance image gen prompts | User input | Enhanced prompt | Darkroom | **Keep** |
| `generateTagsFromMedia` | Extract aesthetic tags from visual media | Image | Array of Strings | Thimble/Ingestion | **Keep** (Core utility) |
| `generateRefinementVariations` | Suggest alternative ways to say something | User phrase | Array of strings | Studio/Editor | **Keep** (Uses "Nous" persona) |
| `analyzeVisualShards` (The Curator) | Create a cohesive brief from loose shards | Shards | Brief JSON | Studio/Moodboards | **Keep / Rename** (Call it `generateEditorialBrief`) |
| `generateInvestmentStrategy` | Suggest a structural/fiscal investment plan | Collection items | Strategy JSON | Strategy Studio | **Cut / Rename** (Too specific unless for commerce features) |
| `generateTrendSynthesis` | Anti-WGSN trend reading | Assorted items | Synthesis JSON | Oracle/Studio | **Keep** (Strong "mimi" branding) |
| `generateMirrorRefraction` | Analyze dissonance in recent outputs | Profile + titles | Omen JSON | Sanctuary / Oracle | **Keep** |
| `analyzeVisualShards` (The Archivist) | Measure visual alignment with profile | Shards + Draft | Alignment JSON | Tailor | **Merge** (Overlap with The Curator) |
| `analyzeTailorDraft` | Poetic audit of user's strategic identity | Draft profile | Audit JSON | Tailor | **Keep** (Premium reporting feature) |
| `generateTasks` (The Executor) | Generate 5-7 strategic imperatives | Project Context | Tasks JSON | Action Board | **Merge** (with ProjectTasks/Blueprint) |
| `generateFruitionTrajectory` | High-level roadmap for a project | Project Context | Trajectory JSON | Dossier / Strategy | **Rewrite** (Formalize schema) |
| `generateSanctuaryReport` | Validate user anxiety/concerns | stray thoughts | Validation JSON | Sanctuary | **Keep** (Strong user engagement) |
| `generateSessionSynthesis` | Create report to feed into ChatGPT sessions | Zines + profile | Markdown string | Oracle | **Keep** (High utility tool) |
| `generateSeasonReport` | Identify user's current seasonal vibe | Recent zines | Season JSON | Radar/Shelf | **Keep** (Good retention hook) |
| `generateTransformationPath` | A to B aesthetic mapping | Baseline aesthetic | Path JSON | Tailor/Oracle | **Keep** (Premium feature candidate) |
| `generateChatGPTReading` | Audit a chat export file | Chat dump | Poetic text | Scribe | **Keep** |
| `generateInstagramPostIdeas` | Extrapolate social posting strategy | Vibe / context | Post Ideas JSON | Studio | **Cut** (A bit too generic) |
| `liveAestheticService` | Realtime Scribe readings for video stream | Video frames | Scribe strings | Live Lens | **Keep** |


## Phase 2: Refactored Prompt Hierarchy

Based on the audit, here is the new canonical architecture for Mimi's prompts.

### Layer 1: Core Identity Prompts
*These define Mimi's worldview and must be attached to most inferences.*
- `ORACLE_PERSONA`: The master "Omniscient Temporal Editor" system prompt. (Mimi)
- `NOUS_PERSONA`: The "mischievous oracle, pretentiously minimalist" system prompt. (The Editor)
- `ENGINE_1_FORECASTING`: Core framework for predicting aesthetic futures.
- `ENGINE_2_STYLE_EXTRACTION`: Core framework for pulling exact style definitions.
- `ENGINE_3_CURATION`: Core framework for structuring collections.
- `ENGINE_4_THIMBLE`: Core framework for data ingestion/tagging.

### Layer 2: Analysis Prompts
*These interpret the user's raw inputs (intake).*
- `generateTasteDiscovery`: Evaluates initial onboarding choices.
- `analyzeVisualShards` (The Archivist): Measures input shards against profile.
- `generateTagsFromMedia`: Pure visual ingestion and tagging.
- `generateMirrorRefraction`: Compares actions vs. stated intent to find dissonance.

### Layer 3: Generation Prompts
*These transform processed input into assets (output).*
- `generateNarrativeThread`: Strings items together.
- `generateZineTitle`: Automatic titling.
- `generateEditorialBrief` (The Curator): Builds a creative brief.
- `generateRefinementVariations` (Nous): Rewrites ad-copy.
- `generateAutoAwesomePrompt`: Boosts image generation prompts.
- `generateGeoBlock`: Generates the internal JSON representation.

### Layer 4: Reporting & Premium Prompts (Stripe / Subscription)
*These provide deep insights and heavy processing, perfect for Patron/Lab status limits.*
- `analyzeTailorDraft`: Complete audit of aesthetic identity.
- `generateTransformationPath`: The long-term aesthetic progression map.
- `generateSessionSynthesis`: LLM bridging (ChatGPT copy-paste report).
- `generateTrendSynthesis`: Macro Anti-WGSN report.
- `generateSanctuaryReport`: Personalized emotional/aesthetic validation.
- `generateFruitionTrajectory`: High-level strategic roadmap.
