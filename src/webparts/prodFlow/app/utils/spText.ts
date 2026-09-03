// SharePoint returns rich-text multiline fields wrapped in markup and HTML-encoded
// (e.g. `{` -> `&#123;`), which breaks JSON.parse. No-op for plain-text fields.
export function decodeSpRichText(value: string): string {
  if (value.indexOf("<") < 0 && value.indexOf("&") < 0) return value;
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:div|p)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_m, n: string) =>
      String.fromCharCode(parseInt(n, 10)),
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, n: string) =>
      String.fromCharCode(parseInt(n, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

// Parses a JSON blob stored in a SharePoint multiline column, tolerating rich-text encoding.
export function parseSpJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return JSON.parse(decodeSpRichText(raw)) as T;
  }
}
