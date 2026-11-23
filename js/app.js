import { PBCORE_VERSIONS, DEFAULT_VERSION, validate, isValid } from './validator.js';

const form = document.getElementById('validator-form');
const formView = document.getElementById('validator-view');
const results = document.getElementById('results');
const versionSelect = document.getElementById('version');
const submitButton = form.querySelector('input[type="submit"]');

const SECTIONS = [
  ['xml', 'PBCore Schema Errors'],
  ['best_practices', 'Best Practices'],
  ['vocabs', 'Controlled Vocabularies'],
  ['fail', 'Input Failure'],
];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'class') node.className = value;
    else node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

const box = (...children) => el('div', { class: 'box-gray' }, ...children);

function renderResults({ validXml, errors }) {
  const nodes = [];

  if (isValid(errors)) {
    nodes.push(box(el('p', {},
      el('span', { class: 'success' }, 'Congratulations!'),
      " I couldn't find any errors in the PBCore document you provided. Hooray!",
    )));
  } else {
    nodes.push(box(el('p', { style: 'font-size: 28px;' },
      el('span', { class: 'failure' }, 'Sorry.'),
      ' The following potential errors were found in your PBCore document:',
    )));

    for (const [key, title] of SECTIONS) {
      if (errors[key].length === 0) continue;
      nodes.push(box(
        el('h2', {}, title),
        el('ul', { class: 'error-list' }, ...errors[key].map((message) => el('li', {}, message))),
      ));
    }

    if (!validXml) {
      nodes.push(box(el('p', {},
        'Note that these errors indicate that your input could not even be parsed as XML. Please fix those errors in order to allow the PBCore-specific checks to be run.',
      )));
    }
  }

  const back = el('a', { href: '#', class: 'button' }, 'Go Back');
  back.addEventListener('click', (event) => {
    event.preventDefault();
    showForm();
  });
  nodes.push(back);

  results.replaceChildren(...nodes);
}

function showResults() {
  formView.hidden = true;
  results.hidden = false;
  window.scrollTo(0, 0);
}

function showForm() {
  results.hidden = true;
  formView.hidden = false;
}

async function readInput() {
  const file = form.elements.file.files[0];
  if (file && file.size > 0) {
    return { bytes: new Uint8Array(await file.arrayBuffer()) };
  }
  const text = form.elements.textarea.value;
  return text.trim() ? { text } : null;
}

async function onSubmit(event) {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.value = 'Validating…';

  try {
    const input = await readInput();
    const outcome = input
      ? await validate(input, versionSelect.value, {
          vocabs: form.elements.vocabs.checked,
          bestPractices: form.elements.best_practices.checked,
        })
      : {
          validXml: true,
          errors: {
            xml: [], best_practices: [], vocabs: [],
            fail: ['You must provide a PBCore document either by file upload or by pasting into the textarea.'],
          },
        };
    renderResults(outcome);
    showResults();
  } catch (err) {
    renderResults({
      validXml: true,
      errors: { xml: [], best_practices: [], vocabs: [], fail: [`Unexpected error: ${err.message}`] },
    });
    showResults();
  } finally {
    submitButton.disabled = false;
    submitButton.value = 'Validate PBCore';
  }
}

for (const code of Object.keys(PBCORE_VERSIONS).sort()) {
  versionSelect.append(new Option(PBCORE_VERSIONS[code].version, code, false, code === DEFAULT_VERSION));
}

form.addEventListener('submit', onSubmit);
