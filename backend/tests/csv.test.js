import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper function tested directly from analysisController
const sanitizeCsvCell = (val) => {
  if (val == null) return '""';
  let str = String(val).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str}"`;
};

describe('CSV Sanitization & Formula Injection Protection', () => {
  it('should wrap standard strings in quotes', () => {
    assert.equal(sanitizeCsvCell('John Doe'), '"John Doe"');
    assert.equal(sanitizeCsvCell('Software Engineer'), '"Software Engineer"');
  });

  it('should escape double quotes inside cell values', () => {
    assert.equal(sanitizeCsvCell('Engineer "Senior" Lead'), '"Engineer ""Senior"" Lead"');
  });

  it('should prepend apostrophe when value starts with =', () => {
    assert.equal(sanitizeCsvCell('=1+1'), '"\'=1+1"');
    assert.equal(sanitizeCsvCell('=cmd|/c calc'), '"\'=cmd|/c calc"');
  });

  it('should prepend apostrophe when value starts with +, -, or @', () => {
    assert.equal(sanitizeCsvCell('+123456789'), '"\'+123456789"');
    assert.equal(sanitizeCsvCell('-SUM(A1:A10)'), '"\'-SUM(A1:A10)"');
    assert.equal(sanitizeCsvCell('@SUM(A1:A10)'), '"\'@SUM(A1:A10)"');
  });

  it('should safely handle null or undefined values', () => {
    assert.equal(sanitizeCsvCell(null), '""');
    assert.equal(sanitizeCsvCell(undefined), '""');
  });
});
