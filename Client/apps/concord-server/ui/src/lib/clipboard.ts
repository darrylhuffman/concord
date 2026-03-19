import { requestCopyToClipboard, isEmbedded } from "../features/bridge/iframe-bridge";

/**
 * Copy text to clipboard.
 * When running inside an iframe, delegates to the parent window
 * since the Clipboard API is blocked by permissions policy.
 */
export function copyText(text: string): Promise<void> {
  if (isEmbedded()) {
    requestCopyToClipboard(text);
    return Promise.resolve();
  }

  // Standalone mode — use Clipboard API directly
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    return navigator.clipboard.writeText(text);
  }

  // Final fallback
  return new Promise((resolve, reject) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      resolve();
    } catch {
      reject(new Error("Copy failed"));
    } finally {
      document.body.removeChild(textarea);
    }
  });
}
