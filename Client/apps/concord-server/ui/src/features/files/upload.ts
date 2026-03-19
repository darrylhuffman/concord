import { encryptBytes, decryptBytes } from "@concord/crypto";

export interface UploadResult {
  id: string;
  filename: string;
  size: number;
}

/**
 * Upload a file to the realm server (unencrypted).
 * In the server UI, the server is same-origin so we use relative URLs.
 */
export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/files", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

export async function uploadEncryptedFile(
  file: File,
  encryptionKey: Uint8Array
): Promise<UploadResult> {
  const arrayBuffer = await file.arrayBuffer();
  const plainBytes = new Uint8Array(arrayBuffer);
  const encryptedBytes = await encryptBytes(plainBytes, encryptionKey);

  const encryptedBlob = new Blob([encryptedBytes.buffer as ArrayBuffer], {
    type: "application/octet-stream",
  });
  const encryptedFile = new File([encryptedBlob], file.name + ".enc", {
    type: "application/octet-stream",
  });

  const formData = new FormData();
  formData.append("file", encryptedFile);

  const response = await fetch("/files", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const result: UploadResult = await response.json();
  return { ...result, filename: file.name };
}

export async function downloadDecryptedFile(
  fileId: string,
  encryptionKey: Uint8Array | null
): Promise<Uint8Array> {
  const response = await fetch(getFileUrl(fileId));
  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  if (!encryptionKey) return bytes;
  return decryptBytes(bytes, encryptionKey);
}

export async function downloadDecryptedBlob(
  fileId: string,
  mimeType: string,
  encryptionKey: Uint8Array | null
): Promise<string> {
  const bytes = await downloadDecryptedFile(fileId, encryptionKey);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  return URL.createObjectURL(blob);
}

/** Same-origin file URL (relative path). */
export function getFileUrl(fileId: string): string {
  return `/files/${fileId}`;
}
