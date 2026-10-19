import {
  LANGUAGE_KEY,
  browserLanguages,
  parseLanguageSetting,
  readLanguageSetting,
  resolveLanguage,
  setLanguage,
  t,
  translateTree,
} from "../i18n/i18n";
import type { LanguageSetting } from "../i18n/i18n";
import { writeStored } from "../platform/extension-storage";
import { requireElement } from "../ui/query-element";

const form = requireElement(document, "#options", HTMLFormElement);
const saved = requireElement(document, "#saved", HTMLElement);

function applyLanguage(setting: LanguageSetting): void {
  const language = resolveLanguage(setting, browserLanguages());
  setLanguage(language);
  document.documentElement.lang = language;
  translateTree(document);
}

void readLanguageSetting().then((setting) => {
  requireElement(form, `input[value="${setting}"]`, HTMLInputElement).checked = true;
  applyLanguage(setting);
});

form.addEventListener("change", async () => {
  const setting = parseLanguageSetting(new FormData(form).get("language"));
  await writeStored(LANGUAGE_KEY, setting);
  applyLanguage(setting);
  saved.textContent = t().settingSaved;
});
