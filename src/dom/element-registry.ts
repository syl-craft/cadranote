import type { TargetSnapshot } from "../domain/target";
import { describeElement } from "./describe-element";

export class ElementRegistry {
  private readonly elementsById = new Map<string, Element>();
  private readonly idsByElement = new WeakMap<Element, string>();
  private nextId = 1;

  constructor(bindings: readonly (readonly [string, Element])[] = []) {
    for (const [id, element] of bindings) {
      this.elementsById.set(id, element);
      this.idsByElement.set(element, id);
      const sequence = Number(id.replace(/^target-/, ""));
      if (Number.isSafeInteger(sequence)) this.nextId = Math.max(this.nextId, sequence + 1);
    }
  }

  capture(element: Element): TargetSnapshot {
    const id = this.idsByElement.get(element) ?? `target-${this.nextId++}`;
    this.idsByElement.set(element, id);
    this.elementsById.set(id, element);

    return {
      id,
      description: describeElement(element),
      pageUrl: `${location.origin}${location.pathname}`,
      pageTitle: document.title,
    };
  }

  resolve(targetId: string): Element | null {
    return this.elementsById.get(targetId) ?? null;
  }

  refresh(target: TargetSnapshot): TargetSnapshot {
    const element = this.resolve(target.id);
    return element?.isConnected ? { ...target, ...this.capture(element) } : target;
  }

  isConnected(targetId: string): boolean {
    return this.resolve(targetId)?.isConnected ?? false;
  }

  retain(targetIds: readonly string[]): void {
    const retainedIds = new Set(targetIds);

    for (const targetId of this.elementsById.keys()) {
      if (!retainedIds.has(targetId)) this.elementsById.delete(targetId);
    }
  }

  exportBindings(): readonly (readonly [string, Element])[] {
    return [...this.elementsById];
  }

  dispose(): void {
    this.elementsById.clear();
  }
}
