import { SessionController } from "../application/session-controller";
import { takeOverPreviousRuntime } from "../application/runtime-handoff";

const runtime = globalThis as typeof globalThis & { __htmlLocator?: unknown };
const previousSession = takeOverPreviousRuntime(runtime.__htmlLocator);

const controller = new SessionController(previousSession, () => {
  if (runtime.__htmlLocator === controller) delete runtime.__htmlLocator;
});

runtime.__htmlLocator = controller;
