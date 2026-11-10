import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { validateMagicBytes } from '../middleware/uploadMiddleware.js';
import { parseResume, extractTextFromPDF } from '../services/resumeParser.js';

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

  it('should parse real PDF document buffer and extract candidate text and entities', async () => {
    const samplePdfPath = path.join(process.cwd(), 'uploads', 'resume-1793261891728-287612395.pdf');
    if (fs.existsSync(samplePdfPath)) {
      const buffer = fs.readFileSync(samplePdfPath);
      const { rawText, parsedData } = await parseResume(buffer, 'pdf');
      assert.ok(rawText.length > 500, 'rawText should be extracted');
      assert.equal(parsedData.name, 'Pragati Pandey');
      assert.equal(parsedData.email, 'pragatipandey454@gmail.com');
      assert.ok(parsedData.skills.length >= 5, 'should extract at least 5 skills');
      assert.ok(parsedData.skills.includes('JavaScript'));
      assert.ok(parsedData.skills.includes('React'));
    }
  });
});
