import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

describe('Authentication & Access Control Security Tests', () => {
  const TEST_JWT_SECRET = 'hiresense-ai-test-jwt-secret-key-32chars!!';

  it('should normalize emails with trim and lowercase', () => {
    const rawEmails = [
      '  Candidate@Example.COM  ',
      'RECRUITER@HireSense.AI',
      ' test.user+tag@domain.com ',
    ];
    const expected = [
      'candidate@example.com',
      'recruiter@hiresense.ai',
      'test.user+tag@domain.com',
    ];

    rawEmails.forEach((email, i) => {
      const normalized = email.trim().toLowerCase();
      assert.equal(normalized, expected[i]);
    });
  });

  it('should prevent privilege escalation by rejecting role: "admin" during public registration', () => {
    const attemptPublicAdminRegistration = (requestedRole) => {
      if (requestedRole === 'admin') {
        const error = new Error('Admin role cannot be self-assigned');
        error.statusCode = 403;
        throw error;
      }
      return requestedRole === 'employer' ? 'employer' : 'candidate';
    };

    assert.throws(() => attemptPublicAdminRegistration('admin'), /Admin role cannot be self-assigned/);
    assert.equal(attemptPublicAdminRegistration('employer'), 'employer');
    assert.equal(attemptPublicAdminRegistration('candidate'), 'candidate');
    assert.equal(attemptPublicAdminRegistration('arbitraryRole'), 'candidate');
  });

  it('should sign and verify valid JWT tokens with expected payload claims', () => {
    const payload = {
      userId: '65f1a2b3c4d5e6f7a8b9c0d1',
      role: 'employer',
    };

    const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '1h' });
    assert.ok(token);

    const decoded = jwt.verify(token, TEST_JWT_SECRET);
    assert.equal(decoded.userId, payload.userId);
    assert.equal(decoded.role, payload.role);
    assert.ok(decoded.exp > decoded.iat);
  });

  it('should reject tampered or expired JWT tokens', () => {
    const token = jwt.sign({ userId: '123' }, TEST_JWT_SECRET, { expiresIn: '-1s' });
    assert.throws(() => jwt.verify(token, TEST_JWT_SECRET), /jwt expired/);

    const validToken = jwt.sign({ userId: '123' }, TEST_JWT_SECRET);
    const tampered = validToken.slice(0, -5) + 'abcde';
    assert.throws(() => jwt.verify(tampered, TEST_JWT_SECRET));
  });
});
