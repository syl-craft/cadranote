import { requireElement } from "../ui/query-element";

export class HighlightLayer {
  private readonly primaryBox: HTMLDivElement;
  private readonly primaryLabel: HTMLDivElement;
  private readonly supplementContainer: HTMLDivElement;
  private readonly supplementBoxes = new Map<Element, HTMLDivElement>();
  private readonly listeners = new AbortController();
  private activeElement: Element | null = null;
  private pendingFrame = 0;
  private disposed = false;

  constructor(root: ShadowRoot) {
    this.primaryBox = requireElement(root, ".box", HTMLDivElement);
    this.primaryLabel = requireElement(root, ".tag", HTMLDivElement);
    this.supplementContainer = requireElement(root, "#attachment-highlights", HTMLDivElement);

    const schedule = () => this.scheduleUpdate();
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
      signal: this.listeners.signal,
    });
    window.addEventListener("resize", schedule, { passive: true, signal: this.listeners.signal });
  }

  showActiveElement(element: Element | null): void {
    this.activeElement = element;
    this.scheduleUpdate();
  }

  showSupplements(elements: readonly (Element | null)[]): void {
    const retainedElements = new Set(elements);

    for (const [element, box] of this.supplementBoxes) {
      if (!retainedElements.has(element)) {
        box.remove();
        this.supplementBoxes.delete(element);
      }
    }

    elements.forEach((element, index) => {
      if (!element) return;
      let box = this.supplementBoxes.get(element);

      if (!box) {
        box = createSupplementBox();
        this.supplementContainer.append(box);
        this.supplementBoxes.set(element, box);
      }

      requireElement(box, ".attachment-number", HTMLSpanElement).textContent = String(index + 1);
    });

    this.scheduleUpdate();
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.abort();
    cancelAnimationFrame(this.pendingFrame);
    this.supplementBoxes.clear();
    this.supplementContainer.replaceChildren();
    this.activeElement = null;
  }

  private scheduleUpdate(): void {
    if (this.disposed || this.pendingFrame) return;
    this.pendingFrame = requestAnimationFrame(() => this.updateGeometry());
  }

  private updateGeometry(): void {
    this.pendingFrame = 0;
    if (this.disposed) return;

    // Read rectangles before writing styles to avoid forced layout.
    const supplementMeasurements = [...this.supplementBoxes].map(([element, box]) => ({
      box,
      rectangle: element.isConnected ? element.getBoundingClientRect() : null,
    }));
    const activeRectangle = this.activeElement?.isConnected
      ? this.activeElement.getBoundingClientRect()
      : null;

    for (const { box, rectangle } of supplementMeasurements) {
      box.hidden = !rectangle || !intersectsViewport(rectangle);
      if (rectangle && !box.hidden) positionBox(box, rectangle);
    }

    this.updateActiveHighlight(activeRectangle);

    // Track movements that do not trigger scroll or resize.
    if (this.supplementBoxes.size) this.scheduleUpdate();
  }

  private updateActiveHighlight(rectangle: DOMRect | null): void {
    const isSupplement =
      this.activeElement !== null && this.supplementBoxes.has(this.activeElement);
    const hidden =
      !rectangle || !this.activeElement || isSupplement || !intersectsViewport(rectangle);
    this.primaryBox.hidden = this.primaryLabel.hidden = hidden;
    if (hidden || !rectangle || !this.activeElement) return;

    positionBox(this.primaryBox, rectangle);
    const elementLabel =
      this.activeElement.localName + (this.activeElement.id ? `#${this.activeElement.id}` : "");
    this.primaryLabel.textContent = `${elementLabel} · ${Math.round(rectangle.width)} × ${Math.round(rectangle.height)}`;
    this.primaryLabel.style.left = `${Math.max(8, Math.min(rectangle.left, innerWidth - 200))}px`;
    this.primaryLabel.style.top = `${Math.max(4, Math.min(rectangle.top - 30, innerHeight - 32))}px`;
  }
}

function createSupplementBox(): HTMLDivElement {
  const box = document.createElement("div");
  box.className = "attachment-highlight";
  const number = document.createElement("span");
  number.className = "attachment-number";
  box.append(number);
  return box;
}

function positionBox(box: HTMLDivElement, rectangle: DOMRect): void {
  const position = `left:${rectangle.left}px;top:${rectangle.top}px;width:${rectangle.width}px;height:${rectangle.height}px;`;
  if (box.dataset.position === position) return;
  box.style.cssText = position;
  box.dataset.position = position;
}

function intersectsViewport(rectangle: DOMRect): boolean {
  return (
    rectangle.width > 0 &&
    rectangle.height > 0 &&
    rectangle.bottom > 0 &&
    rectangle.right > 0 &&
    rectangle.top < innerHeight &&
    rectangle.left < innerWidth
  );
}
