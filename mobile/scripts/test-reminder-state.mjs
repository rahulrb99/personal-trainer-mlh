import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/voice/reminder-state.web.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const saved = new Map();
const localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
function mount(storage = localStorage) {
  const context = { exports: {}, localStorage: storage, console: { warn() {} } };
  vm.runInNewContext(compiled, context);
  return context.exports;
}
let state = mount();
assert.equal(state.reminderHandled('session-a'), false);
state.markReminderHandled('session-a'); // Either voice has requested it or the user skipped it.
assert.equal(state.reminderHandled('session-a'), true);
state = mount(); // Reload/remount, same browser storage.
assert.equal(state.reminderHandled('session-a'), true);
assert.equal(state.reminderHandled('session-b'), false);
saved.set('spotter-workout-reminders', 'broken json');
assert.equal(mount().reminderHandled('session-c'), false);
state = mount({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
assert.equal(state.reminderHandled('session-d'), false);
state.markReminderHandled('session-d');
assert.equal(state.reminderHandled('session-d'), true);
assert.equal(mount(null).reminderHandled('session-e'), false);
console.log('PASS: reminder reconnect, reload, new-session, corrupt storage, and storage-denial checks');
