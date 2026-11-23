// XSD validation, powered by libxml2 compiled to WebAssembly (xmllint-wasm).

import { validateXML, memoryPages } from './vendor/xmllint-wasm/index-browser.js';

const INPUT_NAME = 'input.xml';
const MAX_MEMORY_PAGES = 512 * memoryPages.MiB;

const schemaCache = new Map();

export function loadSchema(xsdFile) {
  if (!schemaCache.has(xsdFile)) {
    const request = fetch(new URL(`../data/${xsdFile}`, import.meta.url)).then((response) => {
      if (!response.ok) throw new Error(`Could not load schema ${xsdFile} (HTTP ${response.status})`);
      return response.text();
    });
    // Don't cache failures, so a retry can succeed.
    request.catch(() => schemaCache.delete(xsdFile));
    schemaCache.set(xsdFile, request);
  }
  return schemaCache.get(xsdFile);
}

// Splits xmllint's stderr into one entry per "input.xml:LINE: ..." line,
// dropping the source excerpts and the "fails to validate" summary.
export function parseXmllintOutput(output) {
  const header = new RegExp(`^${INPUT_NAME.replace('.', '\\.')}:(\\d+): (.*)$`);
  const parseErrors = [];
  const schemaErrors = [];

  for (const text of output.split('\n')) {
    const match = header.exec(text);
    if (!match) continue;

    const line = Number(match[1]);
    const detail = match[2];
    const schema = /^Schemas validity error : (.*)$/.exec(detail);
    if (schema) {
      schemaErrors.push(`Error: ${schema[1]} at line ${line}.`);
      continue;
    }

    const other = /^(.*?) (error|warning) : (.*)$/.exec(detail);
    const [domain, level, message] = other ? other.slice(1) : ['parser', 'error', detail];
    const label = level === 'warning' ? 'Warning' : domain === 'parser' ? 'Fatal error' : 'Error';
    parseErrors.push({
      message: `${label}: ${message} at line ${line}.`,
      fatal: level === 'error' && domain === 'parser',
    });
  }
  return { parseErrors, schemaErrors };
}

// Validates `xml` (a Uint8Array) against the given XSD. Resolves to
// { parseErrors, schemaErrors }; parseErrors are problems that stop the
// document from being parsed at all.
export async function checkSchema(xml, xsdFile) {
  const schema = await loadSchema(xsdFile);
  let output = '';
  try {
    const result = await validateXML({
      xml: { fileName: INPUT_NAME, contents: xml },
      schema: [schema],
      initialMemoryPages: 256,
      maxMemoryPages: MAX_MEMORY_PAGES,
    });
    output = result.valid ? '' : result.rawOutput;
  } catch (err) {
    // xmllint exits with an unclassified status for some unparseable inputs
    // but still reports why; anything else (e.g. a WASM abort) is a real failure.
    if (!(err.code > 0)) throw err;
    output = err.message;
  }

  const found = parseXmllintOutput(output);
  if (output.trim() && !found.parseErrors.length && !found.schemaErrors.length) {
    found.parseErrors.push({ message: `Error: ${output.trim()}`, fatal: true });
  }
  return found;
}
