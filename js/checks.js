// Port of the controlled-vocabulary and best-practice checks of the original
// Ruby validator. Messages, check order and quirks are intentionally kept
// identical so results match the previous server-side implementation.

import { allElements } from './xml.js';
import * as Picklists from './picklists.js';

export const PBCORE_NAMESPACE = 'http://www.pbcore.org/PBCore/PBCoreNamespace.html';
const XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';

// Characters left over by Ruby's String#tr(valid, ""), which deletes every
// character listed in `valid`; anything remaining is "unexpected".
const VALID_NUMERIC_CHARS = /[./0-9:\[\]gx]/g;
const VALID_TIMESTAMP_CHARS = /[./0-9:;\[\]g]/g;

const MEDIA_ELEMENT_LIST = [
  'instantiationPhysical', 'instantiationDigital', 'instantiationStandard',
  'instantiationLocation', 'instantiationMediaType', 'instantiationFileSize',
  'instantiationTimeStart', 'instantiationDuration', 'instantiationDataRate',
  'instantiationColors', 'instantiationTracks', 'instantiationChannelConfiguration',
  'instantiationChannelConfiguration',
];

const VOCAB_URL = 'http://pbcore.org/pbcore-controlled-vocabularies/';
const PHYSICAL_VOCAB_URLS =
  `Audio: ${VOCAB_URL}instantiationphysical-audio-vocabulary/, ` +
  `Film: ${VOCAB_URL}instantiationphysical-film-vocabulary/. and ` +
  `Video: ${VOCAB_URL}instantiationphysical-video-vocabulary/.`;
const MEDIA_TYPE_URL = `${VOCAB_URL}instantiationmediatype-vocabulary/.`;
const ROLE_URL = `${VOCAB_URL}creatorrole-and-contributorrole-vocabulary/.`;

// Ruby's String#strip only removes ASCII whitespace.
const isBlank = (s) => /^[ \t\n\v\f\r]*$/.test(s);

// Ruby's String#split drops trailing empty strings.
function rubySplit(s, delimiter) {
  const parts = s.split(delimiter);
  while (parts.length && parts[parts.length - 1] === '') parts.pop();
  return parts;
}

const charLength = (s) => [...s].length;

export function runChecks(doc, lineOf, { vocabs = false, bestPractices = false, version }) {
  const elements = allElements(doc);
  const vocabErrors = [];
  // Best-practice errors are grouped by line so they can be reported in order.
  const byLine = new Map();

  const addForNode = (node, message) => {
    const line = lineOf(node);
    if (!byLine.has(line)) byLine.set(line, []);
    byLine.get(line).push(message);
  };

  const eachElt = (name) =>
    elements.filter((el) => el.namespaceURI === PBCORE_NAMESPACE && el.localName === name);

  const attributeNamed = (el, name) =>
    Array.from(el.attributes).find((a) => !a.namespaceURI && a.localName === name);

  const eachAttr = (name) => elements.filter((el) => attributeNamed(el, name));

  const childrenNamed = (el, name) =>
    Array.from(el.childNodes).filter(
      (c) => c.nodeType === 1 && c.namespaceURI === PBCORE_NAMESPACE && c.localName === name,
    );

  const descendantsNamed = (el, name) =>
    allElements(el).filter((d) => d.namespaceURI === PBCORE_NAMESPACE && d.localName === name);

  const checkLists = (name) => {
    for (const node of eachElt(name)) {
      if (/[,|;]/.test(node.textContent)) {
        addForNode(
          node,
          `In ${name} on line ${lineOf(node)}, you have entered “${node.textContent}”, which looks like it may be a list. It is preferred instead to repeat the containing element.`,
        );
      }
    }
  };

  const checkPicklist = (name, picklist, msg = '', attribute = false) => {
    const nodes = attribute ? eachAttr(name) : eachElt(name);
    for (const node of nodes) {
      const value = attribute ? attributeNamed(node, name).value : node.textContent;
      if (isBlank(value)) {
        vocabErrors.push(`${name} on ${lineOf(node)} is empty. Perhaps consider leaving that element out instead.`);
      } else if (picklist.every((item) => item.toLowerCase() !== value.toLowerCase())) {
        vocabErrors.push(
          `“${value}” on line ${lineOf(node)} is not in the PBCore suggested controlled vocabulary for ${name}. While that is valid, you may want to see if there is an appropriate term in the vocabulary here: ${msg}`,
        );
      }
    }
    checkLists(name);
  };

  const checkOnlyOneFormat = () => {
    for (const node of eachElt('pbcoreInstantiation')) {
      if (descendantsNamed(node, 'formatDigital').length > 0 && descendantsNamed(node, 'formatPhysical').length > 0) {
        addForNode(node, `It looks like the instantiation on line ${lineOf(node)} contains both a formatDigital and a formatPhysical element. This is valid, but not recommended in PBCore XML.`);
      }
      if (descendantsNamed(node, 'instantiationDigital').length > 0 && descendantsNamed(node, 'instantiationPhysical').length > 0) {
        addForNode(node, `It looks like the instantiation on line ${lineOf(node)} contains both a instantiationDigital and a instantiationPhysical element. This is valid, but not recommended in PBCore XML.`);
      }
    }
  };

  const checkElementHasAttribute = (elementName, attributeName, msg = '') => {
    for (const node of eachElt(elementName)) {
      const present = Array.from(node.attributes).some(
        (a) => a.namespaceURI !== XMLNS_NAMESPACE && a.localName === attributeName,
      );
      if (!present) {
        addForNode(node, `Element '${elementName}' at line ${lineOf(node)} must contain the attribute '${attributeName}' ${msg}`);
      }
    }
  };

  const checkOnlyOneSubelement = (parentName, subNames, msg = '') => {
    for (const node of eachElt(parentName)) {
      const total = subNames.reduce((sum, sub) => sum + childrenNamed(node, sub).length, 0);
      if (total !== 1) {
        addForNode(node, `Element '${parentName}' near line ${lineOf(node)} ${msg}`);
      }
    }
  };

  const checkMaxOneSubelements = (parentName, subNames, msg = '') => {
    for (const node of eachElt(parentName)) {
      for (const sub of subNames) {
        if (childrenNamed(node, sub).length > 1) {
          addForNode(node, `Element '${sub}' near line ${lineOf(node)} isn’t repeatable. For valid PBCore, please find another way to incorporate that information.  ${msg}`);
        }
      }
    }
  };

  const checkMinOneSubelements = (parentName, subNames, msg = '') => {
    for (const node of eachElt(parentName)) {
      for (const sub of subNames) {
        if (childrenNamed(node, sub).length < 1) {
          addForNode(node, `Element '${parentName}' near line ${lineOf(node)} is missing required subelement '${sub}.'  For valid PBCore, please add a value for this element. ${msg}`);
        }
      }
    }
  };

  const checkValidCharacters = (names, validChars, msg = '') => {
    for (const name of names) {
      for (const node of eachElt(name)) {
        const unexpected = charLength(node.textContent.replace(validChars, ''));
        if (unexpected > 0) {
          addForNode(node, `Element '${name}' at line ${lineOf(node)} contains unexpected ${unexpected} characters. ${msg}`);
        }
      }
    }
  };

  const checkDate = (names) => {
    for (const name of names) {
      for (const node of eachElt(name)) {
        if (!/^\d{4}-\d{1,2}-\d{1,2}$|^\d{4}-\d{1,2}$|^\d{4}$/.test(node.textContent)) {
          addForNode(node, `Element '${name}' at line ${lineOf(node)}: The recommended formats for date fields are: YYYY-MM-DD, YYYY-MM, and YYYY.`);
        }
      }
    }
  };

  const checkValidLengthCodes = (names, delimiter, msg = '') => {
    for (const name of names) {
      for (const node of eachElt(name)) {
        const unexpected = rubySplit(node.textContent, delimiter)
          .filter((code) => charLength(code) < 2 || charLength(code) > 3).length;
        if (unexpected !== 0) {
          addForNode(node, `Element '${name}' at line ${lineOf(node)} contains ${unexpected} unexpected value${unexpected > 1 ? 's' : ''}. ${msg}`);
        }
      }
    }
  };

  const runVocabs = () => {
    checkPicklist('assetType', Picklists.ASSET_TYPES, `${VOCAB_URL}.`);
    checkPicklist('dateType', Picklists.DATE_TYPES, `${VOCAB_URL}datetype-vocabulary/.`, true);
    checkPicklist('titleType', Picklists.TITLE_TYPES, `${VOCAB_URL}titletype-vocabulary/.`, true);
    checkLists('subject');
    checkPicklist('descriptionType', Picklists.DESCRIPTION_TYPES, `${VOCAB_URL}descriptiontype-vocabulary/.`, true);
    checkPicklist('relationType', Picklists.RELATION_TYPES, `${VOCAB_URL}pbcorerelationtype-vocabulary/ and ${VOCAB_URL}instatiationrelationtype-vocabulary/`);
    checkPicklist('creatorRole', Picklists.ROLES, ROLE_URL);
    checkPicklist('contributorRole', Picklists.ROLES, ROLE_URL);
    checkPicklist('publisherRole', Picklists.PUBLISHER_ROLES, `${VOCAB_URL}publisherrole-vocabulary/.`);
    checkPicklist('formatPhysical', Picklists.PHYSICAL_FORMATS, PHYSICAL_VOCAB_URLS);
    checkPicklist('instantiationPhysical', Picklists.PHYSICAL_FORMATS, PHYSICAL_VOCAB_URLS);
    checkPicklist('formatMediaType', Picklists.MEDIA_TYPES, MEDIA_TYPE_URL);
    checkPicklist('instantiationMediaType', Picklists.MEDIA_TYPES, MEDIA_TYPE_URL);
    checkPicklist('coverageType', Picklists.COVERAGE_TYPES);
  };

  const runBestPractices = () => {
    checkOnlyOneFormat();

    checkMinOneSubelements('pbcoreCollection', ['pbcoreDescriptionDocument']);
    for (const parent of ['pbcoreDescriptionDocument', 'pbcorePart']) {
      checkMinOneSubelements(parent, ['pbcoreIdentifier', 'pbcoreTitle', 'pbcoreDescription']);
    }

    checkElementHasAttribute('pbcoreIdentifier', 'source');

    for (const sub of ['pbcoreRelationType', 'pbcoreRelationIdentifier']) {
      checkOnlyOneSubelement('pbcoreRelation', [sub], `must contain two subelements and only one '${sub}.'  Please repeat the entire 'pbcoreRelation' container element to express each relationship.`);
    }

    checkOnlyOneSubelement('pbcoreCoverage', ['coverage'], "should contain only one 'coverage' subelement.  Please repeat the entire pbcoreCoverage container element for each instance of coverage.");
    checkOnlyOneSubelement('pbcoreCreator', ['creator'], "should contain only one 'creator' subelement.  Please repeat the entire pbcoreCreator container element for each instance of creator.");
    checkOnlyOneSubelement('pbcoreContributor', ['contributor'], "should contain only one 'contributor' subelement.  Please repeat the entire pbcoreContributor container element for each instance of contributor.");
    checkOnlyOneSubelement('pbcorePublisher', ['publisher'], "should contain only one 'publisher' subelement.  Please repeat the entire pbcorePublisher container element for each instance of publisher.");
    checkOnlyOneSubelement('pbcoreRightsSummary', ['rightsSummary', 'rightsLink', 'rightsEmbedded'], 'should contain only one subelement.  Please repeat the entire pbcoreRightsSummary container element for each rightsSummary, rightsLink, or rightsEmbedded.');

    for (const parent of ['pbcoreInstantiationDocument', 'instantiationPart']) {
      checkMinOneSubelements(parent, ['instantiationIdentifier', 'instantiationLocation']);
    }
    checkElementHasAttribute('instantiationIdentifier', 'source');
    for (const parent of ['pbcoreInstantiationDocument', 'instantiationPart']) {
      checkMaxOneSubelements(parent, MEDIA_ELEMENT_LIST);
    }

    checkOnlyOneSubelement('instantiationRights', ['rightsSummary', 'rightsLink', 'rightsEmbedded'], 'should contain only one subelement.  Please repeat the entire instantiationRights container element for each rightsSummary, rightsLink, or rightsEmbedded.');

    for (const parent of ['pbcoreExtension', 'instantiationExtension']) {
      checkOnlyOneSubelement(parent, ['extensionWrap', 'extensionEmbedded'], `should contain only one subelement.  Please repeat the entire '${parent}' container element for each 'extensionWrap' or 'extensionEmbedded'`);
    }
    for (const sub of ['extensionElement', 'extensionValue']) {
      checkOnlyOneSubelement('extensionWrap', [sub], `must contain one '${sub}' subelement.`);
    }

    checkValidCharacters(
      ['instantiationFileSize', 'instantiationDataRate', 'essenceTrackDataRate', 'essenceTrackFrameRate', 'essenceTrackPlaybackSpeed', 'essenceTrackSamplingRate', 'essenceTrackBitDepth', 'essenceTrackFrameSize', 'essenceTrackAspectRatio'],
      VALID_NUMERIC_CHARS,
      'For best practice, this technical element should only contain numeric values. To express a unit of measure for this element, we recommend using the @unitsOfMeasure attribute.',
    );
    checkValidCharacters(
      ['instantiationTimeStart', 'instantiationDuration', 'essenceTrackTimeStart', 'essenceTrackDuration'],
      VALID_TIMESTAMP_CHARS,
      'Best practice is to use a timestamp format for this element, such as HH:MM:SS:FF or HH:MM:SS.mmm or S.mmm.',
    );

    checkDate(['pbcoreAssetDate', 'instantiationDate']);

    checkValidLengthCodes(
      ['instantiationLanguage', 'essenceTrackLanguage'],
      ';',
      'Best practice is to use one of the ISO 639.2 or 639.3 standard language codes, which can be found at http://www.loc.gov/standards/iso639-2/ and http://www-01.sil.org/iso639-3/codes.asp. You can describe more than one language in the element by separating two three-letter codes with a semicolon, i.e. eng;fre.',
    );
  };

  if (vocabs) runVocabs();
  // The original validator never applied the best-practice checks to PBCore 2.0.
  if (bestPractices && version !== '2.0') runBestPractices();

  // Unknown line numbers ("?") sort last.
  const lines = [...byLine.keys()].sort((a, b) => (a === '?') - (b === '?') || a - b);
  return {
    bestPractices: lines.flatMap((line) => byLine.get(line)),
    vocabs: vocabErrors,
  };
}
