/** Value stored by the extension, or undefined outside an extension or when storage fails. */
export async function readStored(key: string): Promise<unknown> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return undefined;
  try {
    return (await chrome.storage.local.get(key))[key];
  } catch {
    return undefined;
  }
}

export async function writeStored(key: string, value: unknown): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.warn("Cadranote : enregistrement impossible", error);
  }
}
