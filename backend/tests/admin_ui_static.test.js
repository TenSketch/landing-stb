import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Static regression checks for the admin SPA (browser code with no DOM harness).
//
// Guards the PR review findings:
//  - P1: focus trap called .filter() on a single querySelector result
//  - P1 introduced alongside it: .modal-close binding was changed from $$ to $,
//    which threw TypeError and prevented the submit handler from binding.
// Also locks in the accessibility contract added by the dialog work
// (role/aria/focus entry/focus restore/Escape).

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const appJs = fs.readFileSync(path.join(root, 'public', 'admin', 'app.js'), 'utf8');
let passed = 0;

function test(name, condition) {
  assert.ok(condition, name);
  passed++;
  console.log(`✅ ${name}`);
}

// Array methods must never be called directly on a single-element
// querySelector result (`$(...)`). The correct helper is `$$(...)`.
const singleQueryArrayMethod = appJs.match(
  /(?<!\$)\$\([^()]*\)\s*\.\s*(filter|forEach|map|some|every|slice|reduce|indexOf|at|find)\s*\(/g
) || [];
test(`no array methods on single querySelector results (found: ${singleQueryArrayMethod.join(', ') || 'none'})`,
  singleQueryArrayMethod.length === 0);

test('focus trap collects focusables with $$ (querySelectorAll)',
  /\$\$\(focusableSelector,\s*dialog\)/.test(appJs));
test('modal close buttons are bound with $$ and restore focus',
  /\$\$\('\.modal-close',\s*overlay\)\.forEach\(btn => btn\.addEventListener\('click', closeModal\)\)/.test(appJs));
test('driver dialog exposes role=dialog and aria-modal',
  /role="dialog"[^>]*aria-modal="true"/.test(appJs));
test('driver dialog is labelled by its title',
  /aria-labelledby="dam-title"/.test(appJs));
test('dialog box accepts initial focus (tabindex=-1)',
  /class="modal-box"[^>]*tabindex="-1"/.test(appJs));
test('Escape key closes the dialog',
  /event\.key === 'Escape'/.test(appJs));
test('focus is restored to the opener on close',
  /previouslyFocused && typeof previouslyFocused\.focus === 'function'\) previouslyFocused\.focus\(\)/.test(appJs));

console.log(`Admin UI static tests: ${passed} assertions passed`);
