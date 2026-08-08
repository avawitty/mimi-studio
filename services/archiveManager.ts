import { uploadBlob, uploadBase64Image, addToPocket } from './firebaseUtils';
import { db, storage } from './firebaseInit';
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { PocketItem } from '../types';
import {
  attachProvenanceToPayload,
  carryProvenanceOnTransfer,
  recordProvenanceOrigin,
} from '../lib/provenance';
import { mirrorPocketItemToEvidenceAtom } from './taste/mirrorPocketToEvidenceAtom';

export const archiveManager = {
  async uploadMedia(
    userId: string,
    fileOrBase64: File | Blob | string,
    pathPrefix: string,
    options?: { allowStorageFallback?: boolean },
  ): Promise<string> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const path = `users/${userId}/${pathPrefix}/${timestamp}_${randomId}`;
    const allowStorageFallback = options?.allowStorageFallback ?? true;
    
    if (typeof fileOrBase64 === 'string') {
      if (fileOrBase64.startsWith('data:')) {
        try {
            return await uploadBase64Image(fileOrBase64, path);
        } catch (e) {
            if (!allowStorageFallback) throw e;
            console.warn("Storage upload failed, falling back to raw data URI", e);
            return fileOrBase64;
        }
      }
      return fileOrBase64; // Already a URL
    } else {
      try {
        return await uploadBlob(fileOrBase64, path);
      } catch (e) {
          if (!allowStorageFallback) throw e;
          console.warn("Storage blob upload failed, falling back to object URL", e);
          return URL.createObjectURL(fileOrBase64);
      }
    }
  },

  async saveToPocket(userId: string, type: PocketItem['type'], content: any, media?: (File | Blob | string)[], embedding?: number[], deltaVerdict?: any): Promise<string | undefined> {
    try {
      let processedContent = { ...content };
      
      if (media && media.length > 0) {
        const uploadPromises = media.map((m, i) => this.uploadMedia(userId, m, `artifacts/pocket_${i}`));
        const mediaUrls = await Promise.all(uploadPromises);
        processedContent.mediaUrls = [...(processedContent.mediaUrls || []), ...mediaUrls];
      }

      // Ensure no base64 is saved
      if (processedContent.image && processedContent.image.startsWith('data:')) {
         processedContent.image = await this.uploadMedia(userId, processedContent.image, 'artifacts/pocket_main');
      }
      if (processedContent.imageUrl && processedContent.imageUrl.startsWith('data:')) {
         processedContent.imageUrl = await this.uploadMedia(userId, processedContent.imageUrl, 'artifacts/pocket_main');
      }

      const itemId = await addToPocket(userId, type, processedContent, embedding, deltaVerdict, content);

      if (itemId) {
        void mirrorPocketItemToEvidenceAtom(
          userId,
          itemId,
          type,
          processedContent as Record<string, unknown>,
          processedContent.title as string | undefined,
        ).catch((err) => {
          console.warn("MIMI // Pocket → EvidenceAtom mirror failed:", err);
        });

        await recordProvenanceOrigin(userId, {
          artifactId: itemId,
          originChamber: 'pocket',
          originMetadata: {
            type,
            title: processedContent.title ?? processedContent.prompt ?? null,
            sourceModule: processedContent.origin ?? 'archiveManager',
          },
          creatorTags: processedContent.tags ?? [],
        });

        if (content.provenanceArtifactId) {
          await carryProvenanceOnTransfer(
            userId,
            content.provenanceArtifactId,
            itemId,
            { from: content.provenanceFrom ?? 'darkroom', to: 'pocket', note: 'Archived to Pocket' },
            { type },
          );
        }
      }
      
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "Artifact Archived in Firebase.", type: 'success' } 
      }));
      
      return itemId;
    } catch (error) {
      console.error("Failed to save to Pocket:", error);
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "Failed to archive artifact.", type: 'error' } 
      }));
      throw error;
    }
  },

  async saveToBoard(userId: string, boardId: string, item: any): Promise<void> {
    try {
      const boardRef = doc(db, 'users', userId, 'boards', boardId);
      const boardSnap = await getDoc(boardRef);
      
      if (!boardSnap.exists()) {
        throw new Error("Board does not exist.");
      }

      await updateDoc(boardRef, {
        items: arrayUnion(item),
        updatedAt: Date.now()
      });

      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "Artifact Archived in Firebase.", type: 'success' } 
      }));
    } catch (error) {
      console.error("Failed to save to Board:", error);
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "Failed to archive artifact.", type: 'error' } 
      }));
      throw error;
    }
  },

  async saveZine(userId: string, zineData: any, coverImage?: File | Blob | string): Promise<void> {
    try {
      let processedZine = { ...zineData };
      
      if (coverImage) {
        const coverUrl = await this.uploadMedia(userId, coverImage, 'zines/covers');
        processedZine.coverUrl = coverUrl;
      }

      const zineId = `zine_${Date.now()}`;
      const provenanceRecord = await recordProvenanceOrigin(userId, {
        artifactId: zineId,
        originChamber: 'studio',
        originMetadata: {
          title: processedZine.title ?? null,
          tone: processedZine.tone ?? null,
        },
        creatorTags: processedZine.tags ?? [],
      });

      await setDoc(doc(db, 'users', userId, 'zines', zineId), attachProvenanceToPayload({
        ...processedZine,
        createdAt: Date.now()
      }, provenanceRecord));

      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "Artifact Archived in Firebase.", type: 'success' } 
      }));
    } catch (error) {
      console.error("Failed to save Zine:", error);
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "Failed to archive artifact.", type: 'error' } 
      }));
      throw error;
    }
  },

  async saveGeoBlock(userId: string, geoBlock: any): Promise<void> {
    try {
      const blockRef = doc(db, `users/${userId}/geo_blocks`, geoBlock.id);
      await setDoc(blockRef, geoBlock);
      
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "GEO Block Indexed in Archive.", type: 'success' } 
      }));
    } catch (e) {
      console.error("MIMI // Failed to save GEO block:", e);
      throw e;
    }
  },

  async saveStrategyAudit(userId: string, audit: any): Promise<void> {
    try {
      let processedAudit = { ...audit };
      
      if (processedAudit.media && processedAudit.media.length > 0) {
        const uploadPromises = processedAudit.media.map(async (m: any, i: number) => {
          if (m.data && m.data.startsWith('data:')) {
            const url = await this.uploadMedia(userId, m.data, `audits/${audit.id}_${i}`);
            return { ...m, data: url };
          }
          return m;
        });
        processedAudit.media = await Promise.all(uploadPromises);
      }

      const auditRef = doc(db, `users/${userId}/reads`, audit.id);
      await setDoc(auditRef, processedAudit);

      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "Artifact Archived in Firebase.", type: 'success' } 
      }));
    } catch (error) {
      console.error("Failed to save Strategy Audit:", error);
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "Failed to archive artifact.", type: 'error' } 
      }));
      throw error;
    }
  },

  async saveToDarkroom(userId: string, item: any): Promise<void> {
    try {
      const darkroomId = `item_${Date.now()}`;
      const darkroomRef = doc(db, 'users', userId, 'darkroom', darkroomId);
      const provenanceRecord = await recordProvenanceOrigin(userId, {
        artifactId: darkroomId,
        originChamber: 'darkroom',
        originMetadata: {
          type: item.type ?? 'fragment',
          source: item.source ?? 'darkroom',
        },
        creatorTags: item.tags ?? [],
      });

      await setDoc(darkroomRef, attachProvenanceToPayload({
        ...item,
        id: darkroomId,
        createdAt: Date.now()
      }, provenanceRecord));

      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "Artifact saved to Darkroom.", type: 'success' } 
      }));
    } catch (error) {
      console.error("Failed to save to Darkroom:", error);
      window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
        detail: { message: "Failed to save to Darkroom.", type: 'error' } 
      }));
      throw error;
    }
  }
};
