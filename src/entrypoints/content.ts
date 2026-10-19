import { SessionController } from "../application/session-controller";
import { takeOverPreviousRuntime } from "../application/runtime-handoff";
import { loadLanguage } from "../i18n/i18n";

const runtime = globalThis as typeof globalThis & { __htmlLocator?: unknown };

void loadLanguage().then(() => {
  // The handoff waits for the language so that the previous panel stays open until then.
  const previousSession = takeOverPreviousRuntime(runtime.__htmlLocator);
  const controller = new SessionController(previousSession, () => {
    if (runtime.__htmlLocator === controller) delete runtime.__htmlLocator;
  });
  runtime.__htmlLocator = controller;
});
