import { createEngine } from "@editx/engine/konva";
import type { ImageSource } from "../../image-editor";
import { useImageEditorStore } from "../../store/image-editor-store";
import { correctOrientation } from "../../utils/correct-orientation";
import { downscaleIfNeeded } from "../../utils/downscale-image";
import { extractFilename } from "../../utils/extract-filename";
import { isSameSource } from "../../utils/is-same-source";
import { loadImage } from "../../utils/load-image";
import { validateImageDimensions, validateImageFile } from "../../utils/validate-image";
import { ensureImageReady, getSourceIdentity, resolveSourceToUrl } from "./source-utils";
import type { InitContext } from "./use-engine.types";

/**
 * The engine init pipeline. Loads/validates/normalises the source image, creates
 * the Konva engine, wires the initial scene, and pushes state through the
 * provided context. Extracted from the hook so `initEditor`'s dependency array
 * stays stable — all mutable dependencies arrive via `ctx`.
 */
export async function runInit(
  ctx: InitContext,
  source: ImageSource,
  signal?: { disposed: boolean },
): Promise<void> {
  const {
    containerRef,
    engineRef,
    blobUrlRef,
    loadedSourceRef,
    loadingSourceIdentityRef,
    prevZoomRef,
    setEngine,
    setSelectedShapeId,
    cleanupBlobUrl,
    setOriginalImage,
    setLoading,
    setEditableBlockId,
    setError,
    clearError,
    setShownImageDimensions,
    validation,
    keepZoomOnSourceChange,
  } = ctx;

  if (!containerRef.current) return;

  if (isSameSource(source, loadedSourceRef.current) && engineRef.current) {
    return;
  }

  const identity = getSourceIdentity(source);
  if (identity && identity === loadingSourceIdentityRef.current) {
    return;
  }
  loadingSourceIdentityRef.current = identity;

  if (keepZoomOnSourceChange && engineRef.current) {
    prevZoomRef.current = {
      zoom: engineRef.current.editor.getZoom(),
      pan: engineRef.current.editor.getPan(),
    };
  } else {
    prevZoomRef.current = null;
  }

  engineRef.current?.dispose();
  engineRef.current = null;
  setEngine(null);
  cleanupBlobUrl();
  loadedSourceRef.current = null;

  const prevOriginal = useImageEditorStore.getState().originalImage;
  const isSameUrl = prevOriginal && identity && prevOriginal.src === identity;
  if (!isSameUrl) {
    setLoading(true);
  }
  clearError();

  try {
    if (source instanceof File || source instanceof Blob) {
      const fileResult = validateImageFile(source, validation);
      if (!fileResult.valid) {
        throw new Error(fileResult.error);
      }
      for (const w of fileResult.warnings) {
        console.warn(`[editx] ${w}`);
      }
    }

    let processedSource: ImageSource = source;
    if (source instanceof File || source instanceof Blob) {
      try {
        const corrected = await correctOrientation(source);
        processedSource = corrected.canvas;
      } catch {
        processedSource = source;
      }
    }

    await ensureImageReady(processedSource);

    const imgUrl = resolveSourceToUrl(processedSource);
    if (imgUrl.startsWith("blob:")) {
      blobUrlRef.current = imgUrl;
    }
    if (signal?.disposed) return;

    const htmlImg = await loadImage(imgUrl);
    if (signal?.disposed) return;

    const dimResult = validateImageDimensions(
      htmlImg.naturalWidth,
      htmlImg.naturalHeight,
      validation,
    );
    if (!dimResult.valid) {
      throw new Error(dimResult.error);
    }
    for (const w of dimResult.warnings) {
      console.warn(`[editx] ${w}`);
    }

    const scaled = downscaleIfNeeded(htmlImg);
    let workingUrl = imgUrl;
    let workingWidth = htmlImg.naturalWidth;
    let workingHeight = htmlImg.naturalHeight;

    if (scaled.wasDownscaled) {
      workingUrl = scaled.dataUrl;
      workingWidth = scaled.workingWidth;
      workingHeight = scaled.workingHeight;
      await loadImage(workingUrl);
    }

    if (signal?.disposed) return;

    const name = extractFilename(source);

    setOriginalImage({
      src: imgUrl,
      width: htmlImg.naturalWidth,
      height: htmlImg.naturalHeight,
      name,
    });

    const ce = await createEngine({
      container: containerRef.current!,
    });

    if (signal?.disposed) return;

    engineRef.current = ce;

    await ce.scene.create({ width: workingWidth, height: workingHeight });

    const pageId = ce.scene.getCurrentPage();
    if (pageId === null) return;

    // Set image source silently so initial setup isn't undoable
    ce.beginSilent();
    ce.block.setPageImageSrc(pageId, workingUrl);
    ce.block.setPageImageOriginalDimensions(pageId, workingWidth, workingHeight);
    ce.endSilent();

    setEditableBlockId(pageId);

    if (prevZoomRef.current) {
      ce.editor.setZoom(prevZoomRef.current.zoom);
      ce.editor.panTo(prevZoomRef.current.pan.x, prevZoomRef.current.pan.y);
      prevZoomRef.current = null;
    }

    const zoom = ce.editor.getZoom();
    setShownImageDimensions({
      width: workingWidth * zoom,
      height: workingHeight * zoom,
      scale: zoom,
    });

    loadedSourceRef.current = source;
    loadingSourceIdentityRef.current = null;
    setLoading(false);
    setEngine(ce);

    ce.block.onSelectionChanged((ids: number[]) => {
      setSelectedShapeId(ids[0] ?? null);
    });
  } catch (err) {
    if (signal?.disposed) return;
    loadingSourceIdentityRef.current = null;
    const message = err instanceof Error ? err.message : "Failed to load image";
    console.error("[editx] Init error:", message);

    if (typeof source === "object" && source !== null && "width" in source && "height" in source) {
      const obj = source as unknown as { width: number; height: number; src?: string };
      if (obj.width && obj.height) {
        setOriginalImage({
          src: "",
          width: obj.width,
          height: obj.height,
          name: extractFilename(source),
        });
      }
    }

    setError(message);
    setLoading(false);
  }
}
