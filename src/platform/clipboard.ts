export async function writeClipboard(
  text: string,
  root: ShadowRoot,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    signal.throwIfAborted();
    copyWithTemporaryTextarea(text, root);
  }
}

function copyWithTemporaryTextarea(text: string, root: ShadowRoot): void {
  const previousFocus = root.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  root.append(textarea);

  try {
    textarea.focus();
    textarea.select();
    if (!document.execCommand("copy"))
      throw new Error("La copie dans le presse-papiers a été refusée.");
  } finally {
    textarea.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  }
}
