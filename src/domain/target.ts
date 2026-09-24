import type { Inspection } from "./inspection";

export interface ElementDescription {
  readonly chain: readonly string[];
  readonly selector: string;
  readonly javascript: string;
  readonly path: string;
  readonly html: string;
  readonly text: string;
  readonly label: string;
  readonly dimensions: string;
  readonly iframe: boolean;
}

export interface TargetSnapshot {
  readonly inspection?: Inspection;
  readonly id: string;
  readonly description: ElementDescription;
  readonly pageUrl: string;
  readonly pageTitle: string;
}
