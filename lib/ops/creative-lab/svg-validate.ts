/** Guard SVG before sharp/librsvg — catches mismatched tags early. */
export function assertWellFormedSvg(svg: string, context: string): void {
  const trimmed = svg.trim();
  if (!trimmed.startsWith("<svg") || !trimmed.endsWith("</svg>")) {
    throw new Error(`Malformed SVG (${context}): root <svg> wrapper missing`);
  }

  const openSvg = (trimmed.match(/<svg\b/gi) ?? []).length;
  const closeSvg = (trimmed.match(/<\/svg>/gi) ?? []).length;
  if (openSvg !== closeSvg) {
    throw new Error(`Malformed SVG (${context}): svg tag mismatch (${openSvg} open, ${closeSvg} close)`);
  }

  const openText = (trimmed.match(/<text\b/gi) ?? []).length;
  const closeText = (trimmed.match(/<\/text>/gi) ?? []).length;
  if (openText !== closeText) {
    throw new Error(`Malformed SVG (${context}): text tag mismatch (${openText} open, ${closeText} close)`);
  }

  const openRect = (trimmed.match(/<rect\b/gi) ?? []).length;
  const closeRect = (trimmed.match(/<\/rect>/gi) ?? []).length;
  if (closeRect > 0 && openRect !== closeRect) {
    throw new Error(`Malformed SVG (${context}): rect tag mismatch`);
  }
}
