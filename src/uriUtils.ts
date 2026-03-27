// ---------------------------------------------------------------------------
// URI detection
// ---------------------------------------------------------------------------

export const URI_SOURCE = /https?:\/\/[^\s`'"<>)\]]+/.source;

// Trailing punctuation that commonly appears after a URI in prose but is not
// part of the URI itself (e.g. "See https://example.com.")
export const TRAILING_PUNCT = /[.,;:!?]+$/;

export interface UriMatch {
  raw: string;    // the URI string with trailing punctuation stripped
  start: number;  // 0-based char index on the line
  end: number;    // exclusive end index
}

export function findUrisOnLine(lineText: string): UriMatch[] {
  // Create a new RegExp each call to avoid stale lastIndex state
  const regex = new RegExp(URI_SOURCE, 'g');
  const results: UriMatch[] = [];
  let m: RegExpExecArray | null;

  while ((m = regex.exec(lineText)) !== null) {
    const raw = m[0].replace(TRAILING_PUNCT, '');
    if (raw.length === 0) { continue; }
    results.push({ raw, start: m.index, end: m.index + raw.length });
  }

  return results;
}

export function uriAtCharacter(lineText: string, character: number): UriMatch | undefined {
  for (const match of findUrisOnLine(lineText)) {
    if (character >= match.start && character < match.end) {
      return match;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Markdown formatting
// ---------------------------------------------------------------------------

/** Escape pipe and backtick chars so they don't break Markdown tables. */
export function escMd(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/`/g, '\\`');
}

/**
 * Build a plain Markdown string breaking down the URI components.
 * Returns a string so it can be tested without the vscode module.
 */
export function buildMarkdownContent(uri: URL): string {
  const scheme = uri.protocol.replace(/:$/, '');
  const authority = uri.host;
  const path = uri.pathname || '/';
  const fragment = uri.hash.replace(/^#/, '');

  const rows: [string, string][] = [
    ['Scheme', scheme],
    ['Authority', authority],
    ['Path', path],
  ];
  if (fragment) {
    rows.push(['Fragment', fragment]);
  }

  let table = '### URI Breakdown\n\n';
  table += '| Part | Value |\n';
  table += '|:-----|:------|\n';
  for (const [part, value] of rows) {
    table += `| ${part} | \`${escMd(value)}\` |\n`;
  }

  const params = [...uri.searchParams.entries()];
  if (params.length > 0) {
    table += '\n**Query Parameters**\n\n';
    table += '| Key | Value |\n';
    table += '|:----|:------|\n';
    for (const [key, value] of params) {
      // URLSearchParams automatically decodes percent-encoding
      table += `| \`${escMd(key)}\` | \`${escMd(value)}\` |\n`;
    }
  }

  return table;
}
