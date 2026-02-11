/**
 * Parse blockers text into structured array.
 * Splits by newlines, strips bullet prefixes, extracts optional feature refs.
 */
export function parseBlockers(
  text: string
): Array<{ description: string; featureRef?: string }> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // Strip common bullet prefixes
      const cleaned = line.replace(/^[-*•]\s*/, "");

      // Extract feature ref pattern: #?[A-Z]+-\d+ (e.g., #FEAT-123 or FEAT-123)
      const featureRefMatch = cleaned.match(/#?([A-Z]+-\d+)/);
      const featureRef = featureRefMatch ? featureRefMatch[1] : undefined;

      return {
        description: cleaned.trim(),
        featureRef,
      };
    })
    .filter((item) => item.description.length > 0);
}

/**
 * Parse action items text into structured array.
 * Splits by newlines, strips bullet prefixes.
 */
export function parseActionItems(
  text: string
): Array<{ description: string }> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // Strip common bullet prefixes
      const cleaned = line.replace(/^[-*•]\s*/, "");
      return { description: cleaned.trim() };
    })
    .filter((item) => item.description.length > 0);
}
