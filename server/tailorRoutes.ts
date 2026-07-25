import type { Express, Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { searchMetMuseum, searchWikimedia, generateArtHistoryMatchesForProject } from '../services/artHistoryService';

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

    const { intent, title } = req.body as { intent?: string; title?: string };
    if (!intent) return res.status(400).json({ error: 'intent required' });

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
    await db.doc(`users/${uid}/tailorProjects/${id}`).set(project);
    await db.doc(`users/${uid}/tasteGraphs/${graphId}`).set({
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
    });
    await db.doc(`users/${uid}/tailorProjects/${id}`).update({ tasteGraphId: graphId });

    res.json({ ...project, tasteGraphId: graphId });
  });

  app.post('/api/tailor/:projectId/evidence', async (req: Request, res: Response) => {
    const uid = await verifyUser(req);
    if (!uid || !db) return res.status(401).json({ error: 'Unauthorized' });

    const { projectId } = req.params;
    const body = req.body as {
      sourceType?: string;
      title?: string;
      uploadedFileUrl?: string;
      thumbnailUrl?: string;
      userCaption?: string;
    };

    const id = crypto.randomUUID();
    const now = Date.now();
    const node = {
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
    };

    await db.doc(`users/${uid}/tailorProjects/${projectId}/evidenceNodes/${id}`).set(node);
    res.json(node);
  });

  app.post('/api/tailor/:projectId/analyze', async (req: Request, res: Response) => {
    const uid = await verifyUser(req);
    if (!uid || !db) return res.status(401).json({ error: 'Unauthorized' });

    const jobId = crypto.randomUUID();
    const now = Date.now();
    await db.doc(`users/${uid}/generationJobs/${jobId}`).set({
      id: jobId,
      userId: uid,
      projectId: req.params.projectId,
      jobType: 'analyze',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    res.json({ jobId, status: 'pending', message: 'Analysis queued. Run client-side for multimodal processing.' });
  });

  app.patch('/api/tailor/:projectId/patterns/:patternId', async (req: Request, res: Response) => {
    const uid = await verifyUser(req);
    if (!uid || !db) return res.status(401).json({ error: 'Unauthorized' });

    const { projectId, patternId } = req.params;
    const patch = req.body as Record<string, unknown>;
    await db.doc(`users/${uid}/tailorProjects/${projectId}/patternClusters/${patternId}`).update({
      ...patch,
      updatedAt: Date.now(),
    });
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

    const { searchQueries, patternClusterIds, creativeLawIds } = req.body as {
      searchQueries?: string[];
      patternClusterIds?: string[];
      creativeLawIds?: string[];
    };

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
