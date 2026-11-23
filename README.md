# The PBCore Validator

A validator for [PBCore](http://www.pbcore.org/) documents. It is a fully static
site: everything runs in your browser, so it can be hosted on GitHub Pages (or any
static file host) and documents are never uploaded anywhere.

* **Schema validation** uses [libxml2](https://gitlab.gnome.org/GNOME/libxml2)
  compiled to WebAssembly ([xmllint-wasm](https://github.com/noppa/xmllint-wasm)),
  so errors and line numbers are the same ones libxml reported when this was a
  Ruby/Sinatra app. The PBCore XSDs live in [`data/`](data/).
* **Controlled vocabulary and best-practice checks** are a JavaScript port of the
  original Ruby checks ([`js/checks.js`](js/checks.js)).

## Layout

| Path | Purpose |
| --- | --- |
| `index.html`, `style.css` | The page |
| `js/app.js` | Form handling and rendering of results |
| `js/validator.js` | Supported PBCore versions and the validation pipeline |
| `js/schema.js` | XSD validation through xmllint-wasm |
| `js/checks.js`, `js/picklists.js` | Vocabulary and best-practice checks |
| `js/xml.js` | Decoding of uploaded files and element line numbers |
| `js/vendor/xmllint-wasm/` | Vendored xmllint-wasm 5.3.0 (MIT, see `LICENSE`) |
| `data/` | PBCore XSDs |
| `tests/` | Node tests |

The vendored copy of xmllint-wasm is the unmodified npm package except that its
`.mjs` files are renamed to `.js` (and the one reference to the worker updated), so
that every static host serves them with a JavaScript MIME type.

## Publishing on GitHub Pages

All paths are relative, so the site works from a project URL such as
`https://<owner>.github.io/pbcorevalidator/`. In the repository, go to
**Settings → Pages**, choose **Deploy from a branch**, and select the branch
(e.g. `master`) with the `/ (root)` folder. No build step is needed; `.nojekyll`
tells Pages to publish the files as they are.

## Running locally

The page uses ES modules and a web worker, so it has to be served over HTTP
(opening `index.html` from disk will not work):

```sh
python3 -m http.server 8000   # then open http://localhost:8000/
```

Any browser with module-worker support works (Chrome/Edge 80+, Firefox 114+, Safari 15+).

## Tests

```sh
npm install
npm test
```

The tests check the JavaScript checks against output recorded from the original
Ruby validator (`tests/fixtures/*.expected.json`) plus the line-number and
encoding helpers. Schema validation itself is exercised in a browser.

## License

Originally written by Mike Castleman and copyright (c) 2009
[Roasted Vermicelli, LLC](http://vermicel.li/), released under the
[GNU General Public License](http://www.gnu.org/licenses/gpl.html),
[version 3](COPYING.txt) or later. Currently maintained by WGBH.

PBCore, the Public Broadcasting Metadata Dictionary, is licensed under a
[Creative Commons Attribution 4.0 International license](https://creativecommons.org/licenses/by/4.0/).
