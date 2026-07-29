/**
 * useMediaUpload — hook that isolates the file-upload concern in InputStudio.
 *
 * Encapsulates:
 *  • handleFileChange  — reads files from an input-change or drop event, compresses
 *                         images, and prepends them to the mediaFiles list.
 *  • handleOverlayLogoUpload — reads a single File, converts it to a data-URL, and
 *                               pushes a new image layer onto the cover overlay stack.
 *
 * No state is owned here; callers pass in the relevant setter functions so that React
 * batching behaviour in the parent component is preserved exactly.
 */

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { MediaFile } from "../types";
import type { StudioCoverOverlayLayer } from "../components/studio/studioCoverTypes";
import { createImageLayer } from "../components/studio/studioCoverTypes";

interface UseMediaUploadParams {
  setMediaFiles: Dispatch<SetStateAction<MediaFile[]>>;
  setCoverOverlayLayers: Dispatch<SetStateAction<StudioCoverOverlayLayer[]>>;
  setCoverOverlay: Dispatch<SetStateAction<boolean>>;
}

export function useMediaUpload({
  setMediaFiles,
  setCoverOverlayLayers,
  setCoverOverlay,
}: UseMediaUploadParams) {
  /**
   * Process files from an <input type="file"> change event or a drop event.
   * Images are compressed via imageUtils; all other types are read as data-URLs.
   * The resulting MediaFile objects are prepended to the mediaFiles list,
   * displacing any previously composed cover frame.
   */
  const handleFileChange = useCallback(
    async (e: { target: { files: FileList | null } }) => {
      if (!e.target.files) return;
      try {
        const files = Array.from(e.target.files);
        const newMedia = await Promise.all(
          files.map(async (f) => {
            let data: string;
            if (f.type.startsWith("image/")) {
              const { compressImage } = await import("../services/imageUtils");
              data = await compressImage(f, 800, 800, 0.7);
            } else {
              data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(f);
              });
            }
            return {
              file: f,
              type: (f.type.startsWith("image/")
                ? "image"
                : f.type.startsWith("audio/")
                  ? "audio"
                  : f.type.startsWith("video/")
                    ? "video"
                    : "file") as "image" | "audio" | "video" | "file",
              url: URL.createObjectURL(f),
              data,
              mimeType: f.type.startsWith("image/") ? "image/jpeg" : f.type,
              name: f.name,
            };
          }),
        );
        setMediaFiles((prev) => {
          const cleanPrev = prev.filter((item) => item.name !== "composed-cover");
          return [...newMedia, ...cleanPrev];
        });
      } catch (err) {
        console.error("MIMI // Error reading files:", err);
      }
    },
    [setMediaFiles],
  );

  /**
   * Read a logo file as a data-URL and push it onto the cover overlay layer stack,
   * opening the overlay panel at the same time.
   */
  const handleOverlayLogoUpload = useCallback(
    async (file: File) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setCoverOverlayLayers((prev) => [...prev, createImageLayer(dataUrl, file.name, 24)]);
      setCoverOverlay(true);
    },
    [setCoverOverlayLayers, setCoverOverlay],
  );

  return { handleFileChange, handleOverlayLogoUpload };
}
