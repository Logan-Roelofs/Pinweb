import imageCompression from "browser-image-compression";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "./firebase";
import type { Photo } from "./types";

const FULL = { maxWidthOrHeight: 2000, maxSizeMB: 1 };
const THUMB = { maxWidthOrHeight: 480, maxSizeMB: 0.1 };

export function newPhotoId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

/** Shrinks a camera/gallery image on the device and converts it to JPEG. */
export async function compressImage(file: File): Promise<{ full: Blob; thumb: Blob; width: number; height: number }> {
  const options = { useWebWorker: true, fileType: "image/jpeg", initialQuality: 0.82 };
  const full = await imageCompression(file, { ...options, ...FULL });
  const thumb = await imageCompression(full, { ...options, ...THUMB });
  const bitmap = await createImageBitmap(full);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return { full, thumb, ...size };
}

function upload(path: string, blob: Blob, onProgress: (sent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), blob, {
      contentType: "image/jpeg",
      cacheControl: "public, max-age=31536000, immutable",
    });
    task.on(
      "state_changed",
      (snap) => onProgress(snap.bytesTransferred),
      reject,
      () => getDownloadURL(task.snapshot.ref).then(resolve, reject),
    );
  });
}

/**
 * Compresses and uploads one image into `folder` (e.g. "strategies/abc").
 * onProgress receives 0–1 for the combined full + thumbnail upload.
 */
export async function uploadPhoto(
  file: File,
  folder: string,
  onProgress: (fraction: number) => void = () => {},
): Promise<Photo> {
  const id = newPhotoId();
  const { full, thumb, width, height } = await compressImage(file);
  const total = full.size + thumb.size;
  let fullSent = 0;
  let thumbSent = 0;
  const report = () => onProgress((fullSent + thumbSent) / total);

  const path = `${folder}/${id}.jpg`;
  const thumbPath = `${folder}/${id}_thumb.jpg`;
  const [url, thumbUrl] = await Promise.all([
    upload(path, full, (n) => ((fullSent = n), report())),
    upload(thumbPath, thumb, (n) => ((thumbSent = n), report())),
  ]);
  return { id, path, url, thumbPath, thumbUrl, width, height };
}

/** Deletes a photo's files. Missing files are ignored. */
export async function deletePhotoFiles(photo: Pick<Photo, "path" | "thumbPath">): Promise<void> {
  await Promise.all(
    [photo.path, photo.thumbPath].map((p) =>
      deleteObject(ref(storage, p)).catch((err) => {
        if (err?.code !== "storage/object-not-found") throw err;
      }),
    ),
  );
}
