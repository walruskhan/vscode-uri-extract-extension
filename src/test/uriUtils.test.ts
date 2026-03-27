import { describe, it, expect } from 'vitest';
import { findUrisOnLine, uriAtCharacter, escMd, buildMarkdownContent } from '../uriUtils';

// ---------------------------------------------------------------------------
// findUrisOnLine
// ---------------------------------------------------------------------------

describe('findUrisOnLine', () => {
  it('returns empty array for empty string', () => {
    expect(findUrisOnLine('')).toEqual([]);
  });

  it('returns empty array when no URI is present', () => {
    expect(findUrisOnLine('just some plain text')).toEqual([]);
  });

  it('finds a simple URI', () => {
    const matches = findUrisOnLine('https://example.com');
    expect(matches).toHaveLength(1);
    expect(matches[0].raw).toBe('https://example.com');
    expect(matches[0].start).toBe(0);
    expect(matches[0].end).toBe('https://example.com'.length);
  });

  it('finds a URI mid-line and records correct start/end', () => {
    const line = 'See https://example.com for details';
    const matches = findUrisOnLine(line);
    expect(matches).toHaveLength(1);
    expect(matches[0].start).toBe(4);
    expect(matches[0].end).toBe(4 + 'https://example.com'.length);
  });

  it('finds multiple URIs on one line', () => {
    const line = 'https://foo.com and https://bar.com';
    const matches = findUrisOnLine(line);
    expect(matches).toHaveLength(2);
    expect(matches[0].raw).toBe('https://foo.com');
    expect(matches[1].raw).toBe('https://bar.com');
  });

  it('strips trailing period (prose sentence ending)', () => {
    const matches = findUrisOnLine('See https://example.com.');
    expect(matches[0].raw).toBe('https://example.com');
  });

  it('strips trailing comma', () => {
    const matches = findUrisOnLine('https://example.com, https://other.com');
    expect(matches[0].raw).toBe('https://example.com');
    expect(matches[1].raw).toBe('https://other.com');
  });

  it('strips trailing semicolon, colon, exclamation mark, question mark', () => {
    for (const punct of [';', ':', '!', '?']) {
      const matches = findUrisOnLine(`https://example.com${punct}`);
      expect(matches[0].raw).toBe('https://example.com');
    }
  });

  it('does not strip non-punctuation trailing chars', () => {
    const matches = findUrisOnLine('https://example.com/path');
    expect(matches[0].raw).toBe('https://example.com/path');
  });

  it('preserves dots that are part of the path', () => {
    const matches = findUrisOnLine('https://example.com/file.json');
    expect(matches[0].raw).toBe('https://example.com/file.json');
  });

  it('finds URI with query parameters', () => {
    const uri = 'https://example.com/path?foo=bar&baz=qux';
    const matches = findUrisOnLine(uri);
    expect(matches).toHaveLength(1);
    expect(matches[0].raw).toBe(uri);
  });

  it('stops at whitespace', () => {
    const matches = findUrisOnLine('https://example.com rest of line');
    expect(matches[0].raw).toBe('https://example.com');
    expect(matches[0].end).toBe('https://example.com'.length);
  });

  it('stops at backtick delimiter', () => {
    const matches = findUrisOnLine('`https://example.com`');
    expect(matches[0].raw).toBe('https://example.com');
    expect(matches[0].start).toBe(1);
  });

  it('stops at single-quote delimiter', () => {
    const matches = findUrisOnLine("href='https://example.com'");
    expect(matches[0].raw).toBe('https://example.com');
  });

  it('stops at double-quote delimiter', () => {
    const matches = findUrisOnLine('href="https://example.com"');
    expect(matches[0].raw).toBe('https://example.com');
  });

  it('stops at closing angle bracket', () => {
    const matches = findUrisOnLine('<a href=https://example.com>');
    expect(matches[0].raw).toBe('https://example.com');
  });

  it('handles http:// scheme', () => {
    const matches = findUrisOnLine('http://example.com');
    expect(matches[0].raw).toBe('http://example.com');
  });

  it('does not match ftp:// or other schemes', () => {
    expect(findUrisOnLine('ftp://example.com')).toHaveLength(0);
  });

  it('handles the complex OAuth URI', () => {
    const uri = 'https://dev-q6c8iilor57h508y.us.auth0.com/authorize?client_id=deOEi8etpWEESgYcpnOkulm0RUH4osYs&redirect_uri=https%3A%2F%2Flocalhost%3A7180%2Fcallback&response_type=code&scope=openid%20profile%20email';
    const matches = findUrisOnLine(uri);
    expect(matches).toHaveLength(1);
    expect(matches[0].raw).toBe(uri);
  });

  it('updates end to reflect stripped trailing punctuation', () => {
    const line = 'https://example.com.';
    const matches = findUrisOnLine(line);
    expect(matches[0].raw).toBe('https://example.com');
    expect(matches[0].end).toBe('https://example.com'.length);
  });
});

// ---------------------------------------------------------------------------
// uriAtCharacter
// ---------------------------------------------------------------------------

describe('uriAtCharacter', () => {
  const line = 'See https://example.com for details';
  //           0123456789...
  const uriStart = 4;
  const uriEnd = uriStart + 'https://example.com'.length; // 23

  it('returns undefined when no URI is on the line', () => {
    expect(uriAtCharacter('plain text', 3)).toBeUndefined();
  });

  it('returns undefined when character is before the URI', () => {
    expect(uriAtCharacter(line, uriStart - 1)).toBeUndefined();
  });

  it('returns the match when character is at the start of the URI', () => {
    expect(uriAtCharacter(line, uriStart)?.raw).toBe('https://example.com');
  });

  it('returns the match when character is in the middle of the URI', () => {
    expect(uriAtCharacter(line, uriStart + 5)?.raw).toBe('https://example.com');
  });

  it('returns the match when character is at the last position of the URI', () => {
    expect(uriAtCharacter(line, uriEnd - 1)?.raw).toBe('https://example.com');
  });

  it('returns undefined when character is at the exclusive end of the URI', () => {
    expect(uriAtCharacter(line, uriEnd)).toBeUndefined();
  });

  it('returns undefined when character is after the URI', () => {
    expect(uriAtCharacter(line, uriEnd + 5)).toBeUndefined();
  });

  it('correctly selects between two URIs on the same line', () => {
    const twoUris = 'https://foo.com and https://bar.com';
    const fooStart = 0;
    const barStart = twoUris.indexOf('https://bar.com');
    expect(uriAtCharacter(twoUris, fooStart + 2)?.raw).toBe('https://foo.com');
    expect(uriAtCharacter(twoUris, barStart + 2)?.raw).toBe('https://bar.com');
  });
});

// ---------------------------------------------------------------------------
// escMd
// ---------------------------------------------------------------------------

describe('escMd', () => {
  it('passes through a clean string unchanged', () => {
    expect(escMd('hello world')).toBe('hello world');
  });

  it('escapes pipe characters', () => {
    expect(escMd('a|b')).toBe('a\\|b');
  });

  it('escapes backticks', () => {
    expect(escMd('a`b')).toBe('a\\`b');
  });

  it('escapes backslashes', () => {
    expect(escMd('a\\b')).toBe('a\\\\b');
  });

  it('escapes backslash before pipe (order matters)', () => {
    // backslash must be escaped first so we don't double-escape the \ we add for |
    expect(escMd('a\\|b')).toBe('a\\\\\\|b');
  });

  it('escapes multiple occurrences', () => {
    expect(escMd('|a|b|')).toBe('\\|a\\|b\\|');
  });
});

// ---------------------------------------------------------------------------
// buildMarkdownContent
// ---------------------------------------------------------------------------

describe('buildMarkdownContent', () => {
  it('includes the scheme', () => {
    const md = buildMarkdownContent(new URL('https://example.com'));
    expect(md).toContain('`https`');
  });

  it('includes the authority', () => {
    const md = buildMarkdownContent(new URL('https://example.com/path'));
    expect(md).toContain('`example.com`');
  });

  it('includes the path', () => {
    const md = buildMarkdownContent(new URL('https://example.com/some/path'));
    expect(md).toContain('`/some/path`');
  });

  it('defaults path to / when absent', () => {
    const md = buildMarkdownContent(new URL('https://example.com'));
    expect(md).toContain('`/`');
  });

  it('includes fragment when present', () => {
    const md = buildMarkdownContent(new URL('https://example.com/page#section'));
    expect(md).toContain('Fragment');
    expect(md).toContain('`section`');
  });

  it('omits fragment row when not present', () => {
    const md = buildMarkdownContent(new URL('https://example.com'));
    expect(md).not.toContain('Fragment');
  });

  it('includes query parameter keys', () => {
    const md = buildMarkdownContent(new URL('https://example.com?foo=bar'));
    expect(md).toContain('`foo`');
  });

  it('includes query parameter values', () => {
    const md = buildMarkdownContent(new URL('https://example.com?foo=bar'));
    expect(md).toContain('`bar`');
  });

  it('decodes percent-encoded query parameter values', () => {
    const md = buildMarkdownContent(new URL('https://example.com?redirect=https%3A%2F%2Flocalhost%3A7180%2Fcallback'));
    expect(md).toContain('https://localhost:7180/callback');
  });

  it('decodes space encoding in query parameter values', () => {
    const md = buildMarkdownContent(new URL('https://example.com?scope=openid%20profile%20email'));
    expect(md).toContain('openid profile email');
  });

  it('omits Query Parameters section when no query string', () => {
    const md = buildMarkdownContent(new URL('https://example.com/path'));
    expect(md).not.toContain('Query Parameters');
  });

  it('includes authority with port', () => {
    const md = buildMarkdownContent(new URL('https://example.com:8080/path'));
    expect(md).toContain('`example.com:8080`');
  });

  it('handles multiple query parameters', () => {
    const md = buildMarkdownContent(new URL('https://example.com?a=1&b=2&c=3'));
    expect(md).toContain('`a`');
    expect(md).toContain('`b`');
    expect(md).toContain('`c`');
  });

  it('escapes pipes in query values to avoid breaking the table', () => {
    // Manually construct URL with a pipe in the value
    const url = new URL('https://example.com');
    url.searchParams.set('filter', 'a|b');
    const md = buildMarkdownContent(url);
    expect(md).toContain('a\\|b');
    expect(md).not.toMatch(/[^\\]\|b/); // unescaped pipe would break the table
  });

  it('produces a markdown table header', () => {
    const md = buildMarkdownContent(new URL('https://example.com'));
    expect(md).toContain('### URI Breakdown');
    expect(md).toContain('| Part | Value |');
  });

  it('handles the full OAuth URI correctly', () => {
    const raw = 'https://dev-q6c8iilor57h508y.us.auth0.com/authorize?client_id=deOEi8etpWEESgYcpnOkulm0RUH4osYs&redirect_uri=https%3A%2F%2Flocalhost%3A7180%2Fcallback&response_type=code&scope=openid%20profile%20email';
    const md = buildMarkdownContent(new URL(raw));
    expect(md).toContain('dev-q6c8iilor57h508y.us.auth0.com');
    expect(md).toContain('/authorize');
    expect(md).toContain('https://localhost:7180/callback');
    expect(md).toContain('openid profile email');
    expect(md).toContain('deOEi8etpWEESgYcpnOkulm0RUH4osYs');
  });
});
