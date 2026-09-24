export interface PickerCallbacks {
  isSelecting(): boolean;
  containsInterfaceEvent(event: Event): boolean;
  onHover(element: Element | null): void;
  onSelected(element: Element): void;
  onEscape(): void;
}

export function installElementPicker(callbacks: PickerCallbacks): () => void {
  const listeners = new AbortController();
  const captureOptions = { capture: true, passive: false, signal: listeners.signal };

  window.addEventListener(
    "pointermove",
    (event) => {
      if (!callbacks.isSelecting()) return;
      const element = callbacks.containsInterfaceEvent(event) ? null : findPointedElement(event);
      callbacks.onHover(element);
    },
    { capture: true, passive: true, signal: listeners.signal },
  );

  for (const eventName of [
    "pointerdown",
    "pointerup",
    "mousedown",
    "mouseup",
    "dblclick",
    "auxclick",
  ]) {
    window.addEventListener(
      eventName,
      (event) => {
        if (callbacks.isSelecting() && !callbacks.containsInterfaceEvent(event))
          suppressPageAction(event);
      },
      captureOptions,
    );
  }

  window.addEventListener(
    "click",
    (event) => {
      if (!callbacks.isSelecting() || callbacks.containsInterfaceEvent(event)) return;
      suppressPageAction(event);
      const element = findPointedElement(event);
      if (element) callbacks.onSelected(element);
    },
    captureOptions,
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;
      suppressPageAction(event);
      callbacks.onEscape();
    },
    captureOptions,
  );

  return () => listeners.abort();
}

function findPointedElement(event: Event): Element | null {
  return event.composedPath().find((entry): entry is Element => entry instanceof Element) ?? null;
}

function suppressPageAction(event: Event): void {
  event.preventDefault();
  event.stopImmediatePropagation();
}
