import { loadLanguage, translateTree } from "../i18n/i18n";

void loadLanguage().then((language) => {
  document.documentElement.lang = language;
  translateTree(document);
});
