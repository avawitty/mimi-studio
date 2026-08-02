import type { Express, Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { searchMetMuseum, searchWikimedia, generateArtHistoryMatchesForProject } from '../services/artHistoryService';
import { stripUndefined } from '../lib/stripUndefined';
import {
  addEvidenceBodySchema,
  artHistoryBodySchema,
  createMarketingJobBodySchema,
  createProjectBodySchema,
  parseBody,
  patternPatchBodySchema,
  tailorIntentSchema,
} from '../services/tailorApiValidation';

async function verifyUser(req: Request): Promise<string | null> {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return null;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export function registerTailorRoutes(app: Express, db: Firestore | null) {
  app.post('/api/tailor/projects', async (req: Request, res: Response) => {
    const uid = await verifyUser(req);
    if (!uid || !db) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = parseBody(createProjectBodySchema, req.body);
    if (parsed.ok === false) return res.status(400).json({ error: parsed.error });

    const intentResult = tailorIntentSchema.safeParse(parsed.data.intent);
    if (!intentResult.success) {
      return res.status(400).json({ error: 'intent: invalid TailoringIntent' });
    }

    const intent = intentResult.data;
    const title = parsed.data.title;
    const id = crypto.randomUUID();
    const now = Date.now();
    const project = {
      id,
      userId: uid,
      title: title ?? `Tailor — ${intent}`,
      intent,
      evidenceCount: 0,
      readConfidence: 'initial',
      analysisStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const graphId = crypto.randomUUID();
    await db.doc(`users/${uid}/tailorProjects/${id}`).set(stripUndefined(project));
    await db.doc(`users/${uid}/tasteGraphs/${graphId}`).set(
      stripUndefined({
        id: graphId,
        userId: uid,
        projectId: id,
        evidenceNodeIds: [],
        observationIds: [],
        patternClusterIds: [],
        creativeLawIds: [],
        fieldNoteIds: [],
        dollIds: [],
        dossierIds: [],
        version: 1,
        createdAt: now,
        updatedAt: now,
      }),
    );
    await db.doc(`users/${uid}/tailorProjects/${id}`).update({ tasteGraphId: graphId });

    res.json({ ...project, tasteGraphId: graphId });
  });

  app.post('/api/tailor/:projectId/evidence', async (req: Request, res: Response) => {
    const uid = await verifyUser(req);
    if (!uid || !db) return res.status(401).json({ error: 'Unauthorized' });

    const { projectId } = req.params;
    const parsed = parseBody(addEvidenceBodySchema, req.body);
    if (parsed.ok === false) return res.status(400).json({ error: parsed.error });

    const body = parsed.data;
    const id = crypto.randomUUID();
    const now = Date.now();
    const node = stripUndefined({
      id,
      userId: uid,
      projectId,
      sourceType: body.sourceType ?? 'image',
      title: body.title ?? 'Reference',
      uploadedFileUrl: body.uploadedFileUrl,
      thumbnailUrl: body.thumbnailUrl ?? body.uploadedFileUrl,
      userCaption: body.userCaption,
      analysisStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    await db.doc(`users/${uid}/tailorProjects/${projectId}/evidenceNodes/${id}`).set(node);
    res.json(node);
  });

  app.post('/api/tailor/:projectId/analyze', async (req: Request, res: Response) => {
    const uid = await verifyUser(req);
    if (!uid || !db) return res.status(401).json({ error: 'Unauthorized' });

    const jobId = crypto.randomUUID();
    const now = Date.now();
    await db.doc(`users/${uid}/generationJobs/${jobId}`).set(
      stripUndefined({
        id: jobId,
        userId: uid,
        projectId: req.params.projectId,
        jobType: 'analyze',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      }),
    );

    res.json({ jobId, status: 'pending', message: 'Analysis queued. Run client-side for multimodal processing.' });
  });

  app.post('/api/tailor/:projectId/marketing-assets', async (req: Request, res: Response) => {
    const uid = await verifyUser(req);
    if (!uid || !db) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = parseBody(createMarketingJobBodySchema, req.body);
    if (parsed.ok === false) return res.status(400).json({ error: parsed.error });

    const projectId = req.params.projectId as string;
    const projectSnap = await db.doc(`users/${uid}/tailorProjects/${projectId}`).get();
    if (!projectSnap.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectSnap.data() as { tasteGraphId?: string };
    if (!project.tasteGraphId || project.tasteGraphId !== parsed.data.tasteGraphId) {
      return res.status(400).json({
        error: 'tasteGraphId must match the Tailor project binding',
        prerequisite: 'project_graph_mismatch',
        recoveryAction: 'Pass the project’s tasteGraphId explicitly.',
      });
    }

    const jobId = crypto.randomUUID();
    const now = Date.now();
    await db.doc(`users/${uid}/generationJobs/${jobId}`).set(
      stripUndefined({
        id: jobId,
        userId: uid,
        projectId,
        jobType: 'asset',
        status: 'pending',
        assetType: parsed.data.assetType,
        dollId: parsed.data.dollId,
        tasteGraphId: parsed.data.tasteGraphId,
        createdAt: now,
        updatedAt: now,
      }),
    );

    res.json({
      jobId,
      status: 'pending',
      assetType: parsed.data.assetType,
      tasteGraphId: parsed.data.tasteGraphId,
    });
  });

  app.patch('/api/tailor/:projectId/patterns/:patternId', async (req: Request, res: Response) => {
    const uid = await verifyUser(req);
    if (!uid || !db) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = parseBody(patternPatchBodySchema, req.body);
    if (parsed.ok === false) return res.status(400).json({ error: parsed.error });

    const { projectId, patternId } = req.params;
    await db.doc(`users/${uid}/tailorProjects/${projectId}/patternClusters/${patternId}`).update(
      stripUndefined({
        ...parsed.data,
        updatedAt: Date.now(),
      }),
    );
    res.json({ ok: true });
  });

  app.get('/api/art/met/search', async (req: Request, res: Response) => {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: 'q required' });
    const results = await searchMetMuseum(q, 10);
    res.json({ results });
  });

  app.get('/api/art/wikimedia/search', async (req: Request, res: Response) => {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: 'q required' });
    const results = await searchWikimedia(q, 10);
    res.json({ results });
  });

  app.post('/api/tailor/:projectId/art-history', async (req: Request, res: Response) => {
    const uid = await verifyUser(req);
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = parseBody(artHistoryBodySchema, req.body);
    if (parsed.ok === false) return res.status(400).json({ error: parsed.error });

    const { searchQueries, patternClusterIds, creativeLawIds } = parsed.data;

    const matches = await generateArtHistoryMatchesForProject(
      uid,
      req.params.projectId as string,
      searchQueries ?? ['symbolic composition'],
      patternClusterIds ?? [],
      creativeLawIds ?? [],
    );
    res.json({ matches });
  });
}
