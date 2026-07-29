# Mimi Studio

**A private AI editorial studio for taste, identity, research, and image-making.**

Mimi helps creators collect references, interpret visual and cultural signals, approve what feels true, and turn that knowledge into traceable creative direction.

It is not a generic chatbot or an automatic identity generator. Mimi is a creator operating system built around explicit, user-approved knowledge.

> **Capture → Interpret → Approve → Remember → Retrieve → Generate → Compose → Export**

## What Mimi does

Mimi turns scattered creative evidence—images, links, notes, garments, artworks, language, research, and reactions—into a living **Taste Graph**.

That graph can then support:

- creative dossiers and aesthetic reports
- editorial direction and zines
- brand systems and campaign concepts
- image treatments and visual prompts
- product and build briefs
- research memory with visible provenance
- symbolic projections such as Mimi Dolls and personal creative universes

The important part is not generation alone. The important part is that Mimi can show **what it used, why it used it, and what the creator approved**.

## Product principles

- **The creator remains the authority.** Mimi proposes; the creator accepts, rejects, edits, weights, or retires.
- **Evidence and inference stay separate.** What is visible in a source is not silently treated as what it means.
- **Memory requires approval.** Captured material does not become durable knowledge without an explicit decision.
- **Used Context is visible.** Outputs should expose the approved sources and memory that shaped them.
- **Artifacts are traceable.** Reports, zines, briefs, and generated assets preserve provenance.
- **Taste is operational.** Mimi turns aesthetic instinct into reusable creative laws without flattening it into a fixed label.

## Core workflow

A practical Mimi workflow looks like this:

1. **Collect** references, notes, files, links, questions, and visual evidence.
2. **Read** observations, patterns, tensions, and possible interpretations.
3. **Approve** what is accurate; reject, rename, merge, split, annotate, or reweight the rest.
4. **Remember** the approved knowledge inside the Taste Graph and memory registry.
5. **Retrieve** the right context for a declared task.
6. **Compose** a dossier, zine, brief, treatment, campaign, or other artifact.
7. **Export** the result with its context and provenance intact.

## Main product areas

| Area | Role |
| --- | --- |
| **Tailor** | Ingestion and evidence engine for reading references and building the Taste Graph. |
| **Taste Graph** | The evolving source of truth for accepted signals, rejected signals, patterns, and creative laws. |
| **Scribe** | Research and capture workspace for questions, notes, sources, highlights, and approved memory. |
| **Studio** | Composition environment for turning direction and context into creative artifacts. |
| **The Edit** | Editorial decision layer for shaping position, structure, selection, and tone. |
| **The Press** | Export and publishing layer for zines, reports, bundles, and provenance manifests. |
| **Darkroom** | Image-treatment system for describing, saving, and reapplying visual transformations. |
| **Mimi Dolls / mimi.u** | Symbolic and personal-universe projections generated from approved taste knowledge. |

## Architecture

Mimi is organized around durable, typed objects rather than hidden chat history.

Key objects include:

- Source Objects
- Evidence and Observations
- Approvals
- Memory Atoms
- Context Runs and Context Packets
- Taste Graphs, Pattern Clusters, and Creative Laws
- Creative Dossiers and Editorial Directions
- Build Briefs
- Zines, Reports, and published Artifacts
- Provenance records and Used Context manifests

The canonical architecture is documented in [`docs/mimi-system-architecture.md`](docs/mimi-system-architecture.md).

## Technology

- React 19
- TypeScript
- Vite
- Express
- Firebase Authentication, Firestore, Admin SDK, and Functions
- OpenAI and Google GenAI integrations
- Vercel AI Gateway compatibility
- Model Context Protocol (MCP)
- Stripe billing
- Framer Motion and Motion
- Three.js / React Three Fiber
- D3 and Recharts
- Playwright
- PDF, image, ZIP, and export tooling

## Run locally

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/avawitty/mimi-studio.git
cd mimi-studio
npm install
```

Create an `.env.local` file and add the environment variables needed for the services you are using.

For server-side AI, configure at least one supported provider or gateway credential, such as:

```bash
OPENAI_API_KEY=
GEMINI_API_KEY=
AI_GATEWAY_API_KEY=
```

Firebase, Stripe, Shopify, and other integrations require their own credentials. Keep service-account files and secrets outside the repository.

Start the development server:

```bash
npm run dev
```

The server uses `PORT` or `DEV_PORT` when provided and otherwise defaults to port `3000`.

## Useful commands

```bash
npm run dev                         # Run the application
npm run mcp                         # Run the MCP server
npm run build                       # Build the client and Node server
npm run build:vercel                # Build the Vite client for Vercel
npm run preview                     # Preview the production client build
npm run lint                        # Type-check the project
npm run test:e2e                    # Run Playwright end-to-end tests
npm run validate:canon              # Validate canonical routes
npm run verify:tailor-contract      # Verify Tailor profile contracts
npm run verify:used-context         # Verify the Used Context flow
npm run verify:zine-visual-policy   # Verify zine visual-policy rules
```

Additional integration checks are available for Shopify, Intel Hub, and Pinterest preview workflows.

## Repository status

Mimi Studio is an active, evolving product system. Product names and interfaces may change, while the deeper contracts remain steady:

- explicit approval before memory
- visible context before trust
- evidence before interpretation
- creator control before automation
- structured knowledge before generation

## Private repository

This repository is currently private and under active development. All rights reserved unless otherwise stated in the repository.
