import assert from 'node:assert/strict';
import test from 'node:test';
import { installRuntimeWindowConfig } from './test-utils';

installRuntimeWindowConfig();

const stateModule = await import('../src/state/AppContext');
const {
  createSelectedDocumentFileUploadState,
  createSelectedFileUploadState,
  getFileExtension,
  validateSelectedDocumentFile,
  validateSelectedFile,
} = stateModule;

test('getFileExtension normalizes file extensions', () => {
  assert.equal(getFileExtension('manual.MD'), '.md');
  assert.equal(getFileExtension('notes.txt'), '.txt');
  assert.equal(getFileExtension('README'), '');
});

test('validateSelectedFile rejects unsupported file types', () => {
  const file = new File(['bad'], 'diagram.pdf', { type: 'application/pdf' });
  const result = validateSelectedFile(file, 10 * 1024 * 1024);

  assert.equal(result.phase, 'error');
  assert.equal(result.error, 'Only .md and .txt files are supported.');
  assert.equal(result.statusMessage, 'Unsupported file type.');
});

test('validateSelectedFile rejects oversized files', () => {
  const file = new File([new Uint8Array(12)], 'system.md', { type: 'text/markdown' });
  Object.defineProperty(file, 'size', { configurable: true, value: 12 * 1024 * 1024 });

  const result = validateSelectedFile(file, 10 * 1024 * 1024);

  assert.equal(result.phase, 'error');
  assert.match(result.error || '', /10 MB upload limit/);
  assert.equal(result.statusMessage, 'Selected file is too large.');
});

test('validateSelectedFile accepts supported files and returns the selected-file state', () => {
  const file = new File(['hello'], 'system.md', { type: 'text/markdown' });
  const result = validateSelectedFile(file, 10 * 1024 * 1024);

  assert.deepEqual(result, createSelectedFileUploadState(file));
});

test('validateSelectedDocumentFile accepts pdf markdown and text files', () => {
  for (const filename of ['policy.pdf', 'policy.md', 'policy.txt']) {
    const file = new File(['hello'], filename);
    const result = validateSelectedDocumentFile(file, 10 * 1024 * 1024);

    assert.deepEqual(result, createSelectedDocumentFileUploadState(file));
  }
});
