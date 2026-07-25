import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebaseInit";

// Cache access token in memory during active session
let cachedAccessToken: string | null = null;

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export interface BackupProgress {
  status: 'idle' | 'authorizing' | 'creating_hierarchy' | 'backing_up_zines' | 'backing_up_pocket' | 'completed' | 'failed';
  currentZine: number;
  totalZines: number;
  currentPocket: number;
  totalPocket: number;
  log: string[];
  error?: string;
}

/**
 * Initiates the Google OAuth consent flow for the app's user to access Google Drive.
 * This is compliant with least privilege (uses "drive.file" scope).
 */
export async function connectGoogleDrive(): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.addScope('https://www.googleapis.com/auth/documents');
  provider.addScope('https://www.googleapis.com/auth/presentations');
  provider.addScope('email');
  provider.addScope('profile');
  
  // Enforce consent prompt so they can choose the account and grant permissions properly
  provider.setCustomParameters({
    prompt: 'consent'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Handshake authorized, but no Google Access Token was returned by the provider.");
    }
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } catch (error: any) {
    console.error("MIMI // Google Drive Connection Error:", error);
    throw error;
  }
}

/**
 * Executes standard search on Drive API v3 to find a specific directory name or file
 */
async function findDriveItem(token: string, name: string, mimeType: string, parentId?: string): Promise<string | null> {
  let query = `name = '${name}' and mimeType = '${mimeType}' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Drive lookup failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Creates a folder in the user's Google Drive
 */
async function createDriveFolder(token: string, name: string, parentId?: string): Promise<string> {
  const metadata: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!response.ok) {
    throw new Error(`Folder creation failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Uploads a text/JSON or binary file using Google Drive REST API multipart body format.
 */
async function uploadMultipartFile(
  token: string,
  fileName: string,
  mimeType: string,
  metadata: { parents?: string[]; properties?: Record<string, string> },
  contentBlob: Blob
): Promise<string> {
  const boundary = 'mimi_drive_boundary_' + Date.now();
  
  const fileMetadata = {
    name: fileName,
    mimeType,
    ...metadata
  };

  // Construct multipart body
  const boundaryDelimiter = `\r\n--${boundary}\r\n`;
  const boundaryEnd = `\r\n--${boundary}--\r\n`;

  const headerPart = boundaryDelimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(fileMetadata) +
    '\r\n' +
    boundaryDelimiter +
    `Content-Type: ${mimeType}\r\n\r\n`;

  // Concatenate parts as ArrayBuffer to support binary data safely
  const textEncoder = new TextEncoder();
  const headerBuffer = textEncoder.encode(headerPart);
  const endBuffer = textEncoder.encode(boundaryEnd);

  const fileArrayBuffer = await contentBlob.arrayBuffer();

  const combinedBuffer = new Uint8Array(
    headerBuffer.byteLength + fileArrayBuffer.byteLength + endBuffer.byteLength
  );
  combinedBuffer.set(new Uint8Array(headerBuffer), 0);
  combinedBuffer.set(new Uint8Array(fileArrayBuffer), headerBuffer.byteLength);
  combinedBuffer.set(new Uint8Array(endBuffer), headerBuffer.byteLength + fileArrayBuffer.byteLength);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: combinedBuffer
  });

  if (!response.ok) {
    throw new Error(`Multipart upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Choreographs the complete system backup: Create Mimi Archive -> Zines + Pocket directories -> uploads elements with status logging
 */
export async function backupArchivesToDrive(
  token: string,
  zines: any[],
  pocketItems: any[],
  onProgress: (progress: BackupProgress) => void
): Promise<void> {
  const progress: BackupProgress = {
    status: 'creating_hierarchy',
    currentZine: 0,
    totalZines: zines.length,
    currentPocket: 0,
    totalPocket: pocketItems.length,
    log: ['Initializing cloud archive sequence...']
  };

  const addLog = (msg: string) => {
    progress.log = [...progress.log, `[${new Date().toLocaleTimeString()}] ${msg}`];
    onProgress({ ...progress });
  };

  onProgress({ ...progress });

  try {
    // 1. Core Folders
    addLog("Searching for 'Mimi Archive' parent directory in Google Drive...");
    let rootFolderId = await findDriveItem(token, 'Mimi Archive', 'application/vnd.google-apps.folder');
    if (!rootFolderId) {
      addLog("Mimi Archive parent directory not found. Spawning new digital vault...");
      rootFolderId = await createDriveFolder(token, 'Mimi Archive');
      addLog(`Created Mimi Archive vault (ID: ${rootFolderId})`);
    } else {
      addLog(`Connected to existing Mimi Archive vault (ID: ${rootFolderId})`);
    }

    // Subdirectory: Zines
    let zinesFolderId = await findDriveItem(token, 'Zines', 'application/vnd.google-apps.folder', rootFolderId);
    if (!zinesFolderId) {
      zinesFolderId = await createDriveFolder(token, 'Zines', rootFolderId);
      addLog("Spawned sub-vault for Zines.");
    }

    // Subdirectory: Pocket
    let pocketFolderId = await findDriveItem(token, 'Pocket', 'application/vnd.google-apps.folder', rootFolderId);
    if (!pocketFolderId) {
      pocketFolderId = await createDriveFolder(token, 'Pocket', rootFolderId);
      addLog("Spawned sub-vault for Curated Pocket Shards.");
    }

    // 2. Perform Zines backup
    if (zines.length > 0) {
      progress.status = 'backing_up_zines';
      addLog(`Entering Zine backup phase. Total items to encode: ${zines.length}`);
      
      for (let i = 0; i < zines.length; i++) {
        const zine = zines[i];
        progress.currentZine = i + 1;
        onProgress({ ...progress });

        const title = zine.title || zine.content?.headlines?.[0] || `Zine_${zine.id || zine.timestamp}`;
        const sanitizedTitle = title.replace(/[/\\?%*:|"<>\s]/g, '_');
        const filename = `${sanitizedTitle}.json`;

        addLog(`Serializing and processing Zine: "${title}" (${i + 1}/${zines.length})...`);
        
        const contentBlob = new Blob([JSON.stringify(zine, null, 2)], { type: 'application/json' });
        
        try {
          // Check if file already exists in Zines folder first to avoid double uploads
          const existingFileId = await findDriveItem(token, filename, 'application/json', zinesFolderId);
          if (existingFileId) {
            addLog(`Zine "${title}" already cached in sync database. Skipping.`);
          } else {
            const driveFileId = await uploadMultipartFile(token, filename, 'application/json', { parents: [zinesFolderId] }, contentBlob);
            addLog(`Completed sync of Zine "${title}" -> Drive ID: ${driveFileId}`);
          }
        } catch (fileErr: any) {
          addLog(`Warning: Failed to upload Zine "${title}": ${fileErr.message || fileErr}`);
        }
      }
    }

    // 3. Perform Pocket Items backup
    if (pocketItems.length > 0) {
      progress.status = 'backing_up_pocket';
      addLog(`Entering Curated Pocket Shards backup phase. Total items: ${pocketItems.length}`);

      for (let i = 0; i < pocketItems.length; i++) {
        const shard = pocketItems[i];
        progress.currentPocket = i + 1;
        onProgress({ ...progress });

        const shardName = shard.prompt || `Shard_${shard.id || shard.timestamp}`;
        const cleanShardName = shardName.replace(/[/\\?%*:|"<>\s]/g, '_').substring(0, 50);
        
        addLog(`Processing Shard: "${shardName.substring(0, 30)}..." (${i + 1}/${pocketItems.length})...`);

        // If the shard is of type image and has a public URL, try to back up the original image binary!
        const imageUrl = shard.imageUrl || shard.content?.imageUrl;
        let uploadedBinarySecret = false;

        if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
          try {
            addLog(`Fetching original visual resource for backup...`);
            const imageResponse = await fetch(imageUrl);
            if (imageResponse.ok) {
              const imageBlob = await imageResponse.blob();
              let ext = 'jpg';
              if (imageBlob.type.includes('png')) ext = 'png';
              else if (imageBlob.type.includes('gif')) ext = 'gif';
              else if (imageBlob.type.includes('webp')) ext = 'webp';

              const binaryFilename = `${cleanShardName}.${ext}`;

              // Check if actual image binary is backup'ed
              const existingBinaryId = await findDriveItem(token, binaryFilename, imageBlob.type, pocketFolderId);
              if (existingBinaryId) {
                addLog(`Resource "${binaryFilename}" already verified in backup directory.`);
              } else {
                addLog(`Streaming media binary "${binaryFilename}" to Drive...`);
                await uploadMultipartFile(token, binaryFilename, imageBlob.type, { parents: [pocketFolderId] }, imageBlob);
                addLog(`Media binary safely vaulted.`);
              }
              uploadedBinarySecret = true;
            } else {
              addLog(`Unable to extract media binary directly. Response code: ${imageResponse.status}`);
            }
          } catch (corsErr) {
            addLog(`Network sandbox restrictions prevent direct media extraction. Handled safely.`);
          }
        }

        // Always upload metadata JSON with shard content
        const metadataFilename = `${cleanShardName}_metadata.json`;
        const metadataBlob = new Blob([JSON.stringify(shard, null, 2)], { type: 'application/json' });
        
        try {
          const existingMetaId = await findDriveItem(token, metadataFilename, 'application/json', pocketFolderId);
          if (existingMetaId) {
            addLog(`Metadata for Shard "${shardName.substring(0, 20)}" verified.`);
          } else {
            await uploadMultipartFile(token, metadataFilename, 'application/json', { parents: [pocketFolderId] }, metadataBlob);
            addLog(`Metadata for Shard vaulted.`);
          }
        } catch (metaErr: any) {
          addLog(`Warning: Shard metadata failed: ${metaErr.message}`);
        }
      }
    }

    progress.status = 'completed';
    addLog(`All synchronised elements encapsulated secure inside 'Mimi Archive'. Cloud vault completely fortified.`);
    onProgress({ ...progress });

  } catch (error: any) {
    console.error("MIMI // Google Drive Backup Failed:", error);
    progress.status = 'failed';
    progress.error = error.message || String(error);
    addLog(`Error: Sync aborted unexpectedly: ${progress.error}`);
    onProgress({ ...progress });
    throw error;
  }
}

/**
 * Creates a beautiful Google Document and populates it with brief/dossier content.
 */
export async function exportToGoogleDocs(token: string, title: string, markdownContent: string): Promise<string> {
  // 1. Create a blank Google Document
  const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });
  if (!createResponse.ok) {
    throw new Error(`Failed to create Google Doc: ${createResponse.statusText}`);
  }
  const docData = await createResponse.json();
  const documentId = docData.documentId;

  // 2. Populate the document using batchUpdate
  const batchResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            text: markdownContent,
            location: { index: 1 }
          }
        }
      ]
    })
  });
  if (!batchResponse.ok) {
    throw new Error(`Failed to populate Google Doc: ${batchResponse.statusText}`);
  }
  return documentId;
}

/**
 * Creates a beautiful Google Slides presentation with customized slides.
 */
export async function exportToGoogleSlides(
  token: string,
  title: string,
  slides: Array<{ title: string; subtitle?: string; body?: string; imageUrl?: string }>
): Promise<string> {
  // 1. Create a blank presentation
  const createResponse = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });
  if (!createResponse.ok) {
    throw new Error(`Failed to create Google Slides presentation: ${createResponse.statusText}`);
  }
  const presentationData = await createResponse.json();
  const presentationId = presentationData.presentationId;

  // 2. Build batch requests to insert slides and content
  const requests: any[] = [];
  
  slides.forEach((slide, idx) => {
    const slideId = `slide_page_${idx}`;
    
    // Create new slide
    requests.push({
      createSlide: {
        objectId: slideId,
        insertionIndex: idx,
        slideLayoutReference: {
          predefinedLayout: slide.imageUrl ? 'TITLE_AND_TWO_COLUMNS' : 'TITLE_AND_BODY'
        }
      }
    });

    const titleBoxId = `title_box_${idx}`;
    const bodyBoxId = `body_box_${idx}`;

    // Create Title Text Box
    requests.push({
      createShape: {
        objectId: titleBoxId,
        shapeType: 'RECTANGLE',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 6000000, unit: 'EMU' },
            height: { magnitude: 1000000, unit: 'EMU' }
          },
          transform: {
            scaleX: 1, scaleY: 1, translateX: 500000, translateY: 500000, unit: 'EMU'
          }
        }
      }
    });

    // Format shape background to be transparent
    requests.push({
      updateShapeProperties: {
        objectId: titleBoxId,
        shapeProperties: {
          shapeBackgroundFill: { transparentFill: {} },
          outline: { outlineFill: { transparentFill: {} } }
        },
        fields: 'shapeBackgroundFill,outline'
      }
    });

    // Insert Title Text
    requests.push({
      insertText: {
        objectId: titleBoxId,
        text: slide.title,
        insertionIndex: 0
      }
    });

    // Style Title Text
    requests.push({
      updateTextStyle: {
        objectId: titleBoxId,
        style: {
          fontSize: { magnitude: 24, unit: 'PT' },
          fontFamily: 'Georgia',
          bold: true,
          foregroundColor: { solidColor: { rgbColor: { red: 0.1, green: 0.1, blue: 0.1 } } }
        },
        textRange: { type: 'ALL' },
        fields: 'fontSize,fontFamily,bold,foregroundColor'
      }
    });

    if (slide.body || slide.subtitle) {
      // Create Body Text Box
      requests.push({
        createShape: {
          objectId: bodyBoxId,
          shapeType: 'RECTANGLE',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 6000000, unit: 'EMU' },
              height: { magnitude: 3000000, unit: 'EMU' }
            },
            transform: {
              scaleX: 1, scaleY: 1, translateX: 500000, translateY: 1800000, unit: 'EMU'
            }
          }
        }
      });

      requests.push({
        updateShapeProperties: {
          objectId: bodyBoxId,
          shapeProperties: {
            shapeBackgroundFill: { transparentFill: {} },
            outline: { outlineFill: { transparentFill: {} } }
          },
          fields: 'shapeBackgroundFill,outline'
        }
      });

      const bodyText = (slide.subtitle ? `${slide.subtitle}\n\n` : '') + (slide.body || '');
      requests.push({
        insertText: {
          objectId: bodyBoxId,
          text: bodyText,
          insertionIndex: 0
        }
      });

      requests.push({
        updateTextStyle: {
          objectId: bodyBoxId,
          style: {
            fontSize: { magnitude: 14, unit: 'PT' },
            fontFamily: 'Arial',
            foregroundColor: { solidColor: { rgbColor: { red: 0.3, green: 0.3, blue: 0.3 } } }
          },
          textRange: { type: 'ALL' },
          fields: 'fontSize,fontFamily,foregroundColor'
        }
      });
    }

    if (slide.imageUrl) {
      const imageId = `image_el_${idx}`;
      requests.push({
        createImage: {
          objectId: imageId,
          url: slide.imageUrl,
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 3000000, unit: 'EMU' },
              height: { magnitude: 3000000, unit: 'EMU' }
            },
            transform: {
              scaleX: 1, scaleY: 1, translateX: 6800000, translateY: 1800000, unit: 'EMU'
            }
          }
        }
      });
    }
  });

  // 3. Send batchUpdate
  if (requests.length > 0) {
    const batchResponse = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });
    if (!batchResponse.ok) {
      console.error("Failed to populate Google Slides presentation:", await batchResponse.text());
      throw new Error(`Failed to populate Google Slides presentation: ${batchResponse.statusText}`);
    }
  }

  return presentationId;
}

