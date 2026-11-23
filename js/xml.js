// XML helpers: decode uploaded bytes and map DOM elements to source line numbers.

const decode = (label, bytes) => new TextDecoder(label).decode(bytes);

// Decodes an XML document the way an XML parser would: BOM first, then an
// encoding declaration in the XML prolog, falling back to UTF-8.
export function decodeXml(bytes) {
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return decode('utf-16be', bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return decode('utf-16le', bytes);
  if (bytes[0] === 0x3c && bytes[1] === 0x00) return decode('utf-16le', bytes);
  if (bytes[0] === 0x00 && bytes[1] === 0x3c) return decode('utf-16be', bytes);

  const prolog = decode('windows-1252', bytes.subarray(0, 200));
  const declared = /^\s*<\?xml[^>]*?\sencoding\s*=\s*["']([A-Za-z][\w.:-]*)["']/.exec(prolog);
  if (declared) {
    try {
      return decode(declared[1], bytes);
    } catch {
      // Unknown encoding label; fall through to UTF-8.
    }
  }
  return decode('utf-8', bytes);
}

// Pasted text is already Unicode, so whatever encoding its XML declaration
// claims must not be applied when the text is re-encoded as UTF-8.
export function declareUtf8(text) {
  return text.replace(/^(\s*<\?xml[^>]*?\sencoding\s*=\s*)(["'])[^"']*\2/, '$1$2UTF-8$2');
}

// Returns, for every element start tag in document order, the line holding the
// tag's closing ">". That is the line libxml2 records for an element.
export function startTagLines(text) {
  const lines = [];
  let line = 1;
  let pos = 0;

  const advanceTo = (end) => {
    for (; pos < end; pos++) {
      if (text.charCodeAt(pos) === 10) line++;
    }
  };
  const skipPast = (token, from) => {
    const at = text.indexOf(token, from);
    advanceTo(at < 0 ? text.length : at + token.length);
  };
  // Finds the ">" ending a tag, ignoring any inside quotes or an internal DTD subset.
  const findTagEnd = (from) => {
    let quote = null;
    let depth = 0;
    for (let i = from; i < text.length; i++) {
      const c = text[i];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '[') {
        depth++;
      } else if (c === ']') {
        depth--;
      } else if (c === '>' && depth <= 0) {
        return i;
      }
    }
    return text.length;
  };

  while (pos < text.length) {
    const lt = text.indexOf('<', pos);
    if (lt < 0) break;
    advanceTo(lt);

    if (text.startsWith('<!--', pos)) {
      skipPast('-->', pos + 4);
    } else if (text.startsWith('<![CDATA[', pos)) {
      skipPast(']]>', pos + 9);
    } else if (text.startsWith('<?', pos)) {
      skipPast('?>', pos + 2);
    } else if (text.startsWith('<!', pos)) {
      advanceTo(findTagEnd(pos + 2) + 1);
    } else if (text.startsWith('</', pos)) {
      skipPast('>', pos + 2);
    } else {
      const end = findTagEnd(pos + 1);
      advanceTo(end);
      lines.push(line);
      advanceTo(end + 1);
    }
  }
  return lines;
}

// All elements under `root`, in document order.
export function allElements(root) {
  const found = [];
  const walk = (node) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1) {
        found.push(child);
        walk(child);
      }
    }
  };
  walk(root);
  return found;
}

// Builds a function mapping an element of `doc` to its line in `text`.
// Falls back to "?" if the source and the DOM disagree about the element count
// (for example when a DTD entity expands to markup).
export function lineFinder(doc, text) {
  const elements = allElements(doc);
  const lines = startTagLines(text);
  if (elements.length !== lines.length) return () => '?';

  const byElement = new Map(elements.map((el, i) => [el, lines[i]]));
  return (el) => byElement.get(el) ?? '?';
}
