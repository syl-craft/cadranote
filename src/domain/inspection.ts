/** Sent by the page inspector, which has no access to the interface language. */
export const UNNAMED_COMPONENT = "(unnamed)";

export interface ComponentInfo {
  readonly framework: "React" | "Vue" | "Angular";
  readonly hierarchy: readonly string[];
  readonly source: string | null;
}

export interface Inspection {
  readonly vue?: { readonly scope: "element" | "page" };
  readonly angular?: {
    readonly scope: "element" | "page";
    readonly debugAvailable: boolean;
  };
  readonly components: readonly ComponentInfo[];
  readonly utilities: readonly string[];
  readonly available: boolean;
}
