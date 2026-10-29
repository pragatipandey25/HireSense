import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateMagicBytes } from '../middleware/uploadMiddleware.js';

describe('Resume File Integrity & Magic Byte Inspection', () => {
  it('should detect valid PDF file headers', () => {
    // 0x25, 0x50, 0x44, 0x46 -> %PDF
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const detected = validateMagicBytes(pdfBuffer);
    assert.equal(detected, 'pdf');
  });

  it('should detect valid DOCX (PK ZIP container) file headers', () => {
    // 0x50, 0x4B, 0x03, 0x04 -> PK\x03\x04
    const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    const detected = validateMagicBytes(docxBuffer);
    assert.equal(detected, 'docx');
  });

  it('should reject spoofed plain text files disguised as PDF', () => {
    const fakeBuffer = Buffer.from('This is a text file renamed to resume.pdf');
    const detected = validateMagicBytes(fakeBuffer);
    assert.equal(detected, null);
  });

  it('should reject executable or binary ELF / PE headers', () => {
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ header
    const detected = validateMagicBytes(exeBuffer);
    assert.equal(detected, null);
  });

  it('should reject empty or undersized buffers', () => {
    assert.equal(validateMagicBytes(Buffer.from([])), null);
    assert.equal(validateMagicBytes(Buffer.from([0x25, 0x50])), null);
    assert.equal(validateMagicBytes(null), null);
  });
});
