import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Static regression checks for PR #10's error-feedback contract:
//  - `api()` must not toast globally (callers own feedback, one toast only).
//  - Every caller that swallows an api() rejection must show its own feedback;
//    the login form previously relied on the removed global toast, so a wrong
//    password did nothing visible.
//  - `api()` must keep attaching the HTTP status to thrown errors.

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const appJs = fs.readFileSync(path.join(root, 'public', 'admin', 'app.js'), 'utf8');
let passed = 0;

function test(name, condition) {
  assert.ok(condition, name);
  passed++;
  console.log(`✅ ${name}`);
}

test('no caller silently swallows api errors via the removed global toast comment',
  !appJs.includes('// error shown by api'));

test('login failure shows an inline toast in its own catch handler',
  /await api\('\/auth\/login'[\s\S]{0,500}?catch \(err\) \{\s*showToast\(err\.message, 'error'\);/.test(appJs));

test('api() does not toast globally (no duplicate error popups)',
  !/showToast\(err, 'error'\)/.test(appJs));

test('api() attaches the HTTP status to thrown errors',
  appJs.includes('error.status = res.status'));

test('session-expired 401 outside auth routes re-renders the login screen',
  /res\.status === 401 && !path\.includes\('\/auth\/'\)/.test(appJs));

console.log(`Admin error feedback static tests: ${passed} assertions passed`);
