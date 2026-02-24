/**
 * Extract subdomain from a Substack URL.
 * Accepts: "https://samkriss.substack.com", "samkriss.substack.com", or just "samkriss"
 */
export function parseSubstackUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direct subdomain (no dots)
  if (/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // URL form
  try {
    const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const hostname = new URL(url).hostname;
    const match = hostname.match(/^([a-zA-Z0-9-]+)\.substack\.com$/);
    if (match) return match[1].toLowerCase();
  } catch {
    // not a valid URL
  }

  return null;
}
