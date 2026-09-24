export function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
  constructor: { new (): T },
): T {
  const element = root.querySelector(selector);
  if (!(element instanceof constructor))
    throw new Error(`Élément d’interface absent : ${selector}`);
  return element;
}
