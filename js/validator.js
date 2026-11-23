// PBCore Validator: runs entirely in the browser.
//
// Originally written by Mike Castleman, copyright (c) 2009 Roasted Vermicelli, LLC.
// Released under the GNU General Public License, version 3 or later.

import { checkSchema } from './schema.js';
import { runChecks } from './checks.js';
import { decodeXml, declareUtf8, lineFinder } from './xml.js';

// List of supported XSDs
export const PBCORE_VERSIONS = {
  '2.1': { version: 'PBCore 2.1', xsd: 'pbcore-2.1.xsd' },
  '2.0': { version: 'PBCore 2.0', xsd: 'PBCoreXSD_v2.xsd' },
  '1.2': { version: 'PBCore 1.2', xsd: 'PBCoreSchema_v1-2.xsd' },
  '1.2.1': { version: 'PBCore 1.2.1', xsd: 'PBCoreXSD_Ver_1-2-1.xsd' },
  '1.3': { version: 'PBCore 1.3', xsd: 'PBCoreXSD-v1.3.xsd' },
};

export const DEFAULT_VERSION = '2.1';

const PARSER_ERROR_NAMESPACES = [
  'http://www.w3.org/1999/xhtml',
  'http://www.mozilla.org/newlayout/xml/parsererror.xml',
];

function parseDocument(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const failure = Array.from(doc.getElementsByTagName('parsererror'))
    .find((el) => PARSER_ERROR_NAMESPACES.includes(el.namespaceURI));
  if (failure) throw new Error(failure.textContent.trim());
  return doc;
}

// Validates a PBCore document.
//
// `input` is either { text } (pasted) or { bytes } (an uploaded file, as a
// Uint8Array). Resolves to { validXml, errors } where errors holds lists of
// messages under the keys xml, best_practices, vocabs and fail.
export async function validate(input, version, { vocabs = false, bestPractices = false } = {}) {
  const errors = { xml: [], best_practices: [], vocabs: [], fail: [] };

  const config = PBCORE_VERSIONS[version];
  if (!config) {
    errors.fail.push('You must select a PBCore version to validate against.');
    return { validXml: true, errors };
  }

  const text = input.text ?? decodeXml(input.bytes);
  const bytes = input.bytes ?? new TextEncoder().encode(declareUtf8(input.text));

  try {
    const { parseErrors, schemaErrors } = await checkSchema(bytes, config.xsd);
    if (parseErrors.length) {
      errors.xml = parseErrors.map((e) => e.message);
      return { validXml: !parseErrors.some((e) => e.fatal), errors };
    }
    errors.xml = schemaErrors;
  } catch (err) {
    errors.fail.push(`The schema validation could not be completed: ${err.message}`);
    return { validXml: true, errors };
  }

  let doc;
  try {
    doc = parseDocument(text);
  } catch (err) {
    errors.fail.push(`Your browser could not parse this document, so the additional checks were skipped: ${err.message}`);
    return { validXml: true, errors };
  }

  const found = runChecks(doc, lineFinder(doc, text), { vocabs, bestPractices, version });
  errors.best_practices = found.bestPractices;
  errors.vocabs = found.vocabs;
  return { validXml: true, errors };
}

export function isValid(errors) {
  return Object.values(errors).every((list) => list.length === 0);
}
