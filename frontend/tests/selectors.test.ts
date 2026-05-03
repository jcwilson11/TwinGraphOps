import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDocumentEvidencePages } from '../src/lib/selectors';

test('formatDocumentEvidencePages separates distinct page citations', () => {
  assert.equal(
    formatDocumentEvidencePages([
      { quote: 'Debt-to-GDP ratio', pageStart: 33, pageEnd: 33 },
      { quote: 'Debt-to-GDP ratio', pageStart: 167, pageEnd: 167 },
    ]),
    'Pages 33, 167'
  );
});

test('formatDocumentEvidencePages preserves actual page ranges', () => {
  assert.equal(
    formatDocumentEvidencePages([
      { quote: 'First span', pageStart: 33, pageEnd: 35 },
      { quote: 'Second span', pageStart: 167, pageEnd: 168 },
    ]),
    'Pages 33-35, 167-168'
  );
});

test('formatDocumentEvidencePages handles single pages and missing markers', () => {
  assert.equal(formatDocumentEvidencePages([{ quote: 'Only page', pageStart: 33, pageEnd: 33 }]), 'Page 33');
  assert.equal(formatDocumentEvidencePages([{ quote: 'No marker', pageStart: null, pageEnd: null }]), 'No page marker');
});
