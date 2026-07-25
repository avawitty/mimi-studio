import { archiveManager } from './archiveManager';

export interface PinterestPinPreview {
  externalId: string;
  imageUrl: string;
  description: string;
  pinterestUrl?: string;
  sourceUrl?: string;
  duplicate?: boolean;
}

export interface PinterestBoardPreview {
  title: string;
  boardUrl: string;
  pins: PinterestPinPreview[];
  limited?: boolean;
  warning?: string;
}

export async function previewPinterestBoard(boardUrl: string, existingExternalIds: string[] = []): Promise<PinterestBoardPreview> {
  const response = await fetch(`/api/pinterest?url=${encodeURIComponent(boardUrl)}`);
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Pinterest preview failed.');
  const data = await response.json();
  return {
    title: data.title || 'Pinterest board',
    boardUrl: data.url || boardUrl,
    limited: Boolean(data.limited),
    warning: data.warning,
    pins: (data.pins || []).map((pin: any, index: number) => {
      const externalId = pin.id || pin.src?.match(/\/([a-f0-9]{8,})\//i)?.[1] || `${btoa(pin.src || String(index)).replace(/=/g, '').slice(-18)}-${index}`;
      return {
        externalId,
        imageUrl: pin.src,
        description: pin.alt || `Pinterest specimen ${index + 1}`,
        pinterestUrl: pin.url,
        sourceUrl: pin.sourceUrl,
        duplicate: existingExternalIds.includes(externalId),
      };
    }),
  };
}

export async function importPinterestPins(userId: string, board: PinterestBoardPreview, externalIds: string[]) {
  const selected = board.pins.filter((pin) => externalIds.includes(pin.externalId) && !pin.duplicate);
  const importedIds: string[] = [];
  for (const pin of selected) {
    const id = await archiveManager.saveToPocket(userId, 'image', {
      imageUrl: pin.imageUrl,
      description: pin.description,
      approvalStatus: 'unapproved',
      provenance: {
        platform: 'pinterest', externalId: pin.externalId, boardUrl: board.boardUrl,
        pinterestUrl: pin.pinterestUrl, sourceUrl: pin.sourceUrl, importedAt: new Date().toISOString(),
      },
      metadata: { title: pin.description, source: 'Pinterest import preview' },
    });
    if (id) importedIds.push(id);
  }
  return importedIds;
}
