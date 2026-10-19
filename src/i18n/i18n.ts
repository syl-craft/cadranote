import { en, fr } from "./messages";
import type { Messages } from "./messages";
import { readStored } from "../platform/extension-storage";

export type Language = "fr" | "en";
export type LanguageSetting = "auto" | Language;
export type TextKey = {
  [K in keyof Messages]: Messages[K] extends string ? K : never;
}[keyof Messages];

export const LANGUAGE_KEY = "language";
const dictionaries: Readonly<Record<Language, Messages>> = { fr, en };
let current: Messages = fr;

/** Messages of the language chosen by the last call to setLanguage (French by default). */
export function t(): Messages {
  return current;
}

export function setLanguage(language: Language): void {
  current = dictionaries[language];
}

/** The first French or English browser language wins; any other language falls back to English. */
export function resolveLanguage(
  setting: LanguageSetting,
  browserLanguages: readonly string[],
): Language {
  if (setting !== "auto") return setting;
  for (const tag of browserLanguages) {
    const base = tag.toLowerCase().split("-")[0];
    if (base === "fr" || base === "en") return base;
  }
  return "en";
}

export function parseLanguageSetting(value: unknown): LanguageSetting {
  return value === "fr" || value === "en" ? value : "auto";
}

export async function readLanguageSetting(): Promise<LanguageSetting> {
  return parseLanguageSetting(await readStored(LANGUAGE_KEY));
}

/** Reads the stored setting, then applies the resulting language. */
export async function loadLanguage(): Promise<Language> {
  const language = resolveLanguage(await readLanguageSetting(), browserLanguages());
  setLanguage(language);
  return language;
}

export function browserLanguages(): readonly string[] {
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

/** Fills the data-i18n, data-i18n-title, data-i18n-aria-label and data-i18n-placeholder attributes. */
export function translateTree(root: ParentNode): void {
  for (const element of root.querySelectorAll<HTMLElement>("[data-i18n]"))
    element.textContent = text(element.dataset.i18n);
  for (const [attribute, dataKey] of [
    ["title", "i18nTitle"],
    ["aria-label", "i18nAriaLabel"],
    ["placeholder", "i18nPlaceholder"],
  ] as const) {
    for (const element of root.querySelectorAll<HTMLElement>(`[data-i18n-${attribute}]`))
      element.setAttribute(attribute, text(element.dataset[dataKey]));
  }
}

function text(key: string | undefined): string {
  const value = key && key in current ? current[key as keyof Messages] : undefined;
  if (typeof value !== "string") throw new Error(`Texte d’interface absent : ${key}`);
  return value;
}
