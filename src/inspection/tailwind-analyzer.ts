export function analyzeTailwind(element: Element): string[] {
  const utility =
    /^(?:(?:p[trblxyse]?|m[trblxyse]?|gap(?:-[xy])?|space-[xy]|w|min-w|max-w|h|min-h|max-h|text|bg|border|rounded|shadow|font|leading|tracking|grid-cols|col-span|row-span|items|justify|flex|basis|grow|shrink|opacity|ring|translate-[xy]|duration|ease)-.+|flex|inline-flex|grid|hidden|block|inline-block|relative|absolute|fixed|sticky|truncate|antialiased|sr-only)$/;
  return [...element.classList]
    .filter((name) => {
      const base = name
        .split(/:(?![^\[]*\])/)
        .at(-1)
        ?.replace(/^!/, "");
      return base && utility.test(base);
    })
    .slice(0, 80)
    .map((name) => name.slice(0, 200));
}
