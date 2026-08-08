import { uploadBase64Image } from "../../services/firebaseUtils";

const DATA_URL_PATTERN = /^data:([^;]+);base64,(.+)$/;

export function isDataUrl(value: string | undefined | null): value is string {
  return Boolean(value && DATA_URL_PATTERN.test(value));
}

export async function uploadDollReferenceDataUrl(
  userId: string,
  dataUrl: string,
  pathSuffix: string,
): Promise<string> {
  if (!isDataUrl(dataUrl)) return dataUrl;
  const path = `users/${userId}/dolls/references/${pathSuffix}-${Date.now()}.jpg`;
  return uploadBase64Image(dataUrl, path);
}

export async function uploadDollReferenceBatch(
  userId: string,
  dataUrls: string[],
  prefix: string,
): Promise<string[]> {
  const uploads = dataUrls.map((url, index) =>
    uploadDollReferenceDataUrl(userId, url, `${prefix}-${index + 1}`),
  );
  return Promise.all(uploads);
}
