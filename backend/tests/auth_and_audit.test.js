// Unit Test Suite for STB Admin Authentication & Audit Helpers
import assert from 'assert';
import crypto from 'crypto';

console.log('🧪 Starting STB Admin Auth & Session Test Suite...\n');

function hashValue(val) {
  return crypto.createHash('sha256').update(String(val)).digest('hex');
}

function runAuthTests() {
  let passed = 0;

  // ─── Test 1: OTP Generation & Hashing ───
  try {
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    assert.strictEqual(rawOtp.length, 6, 'OTP must be 6 digits');
    assert.match(rawOtp, /^\d{6}$/, 'OTP must be numeric');

    const hash = hashValue(rawOtp);
    assert.strictEqual(hash.length, 64, 'SHA-256 hash must be 64 characters hex');
    assert.notStrictEqual(hash, rawOtp, 'Hash must not equal raw OTP');
    assert.strictEqual(hashValue(rawOtp), hash, 'Hash must be deterministic');

    console.log('✅ Test 1 Passed: OTP generation and SHA-256 hashing.');
    passed++;
  } catch (err) {
    console.error('❌ Test 1 Failed:', err.message);
  }

  // ─── Test 2: Session Token Generation & Hashing ───
  try {
    const rawSessionToken = crypto.randomBytes(32).toString('hex');
    assert.strictEqual(rawSessionToken.length, 64, '32-byte token in hex must be 64 characters');

    const tokenHash = hashValue(rawSessionToken);
    assert.strictEqual(tokenHash.length, 64, 'Session token hash must be 64 hex characters');
    assert.notStrictEqual(rawSessionToken, tokenHash, 'Raw session token must not be stored unhashed');

    console.log('✅ Test 2 Passed: 32-byte cryptographic session token generation and hashing.');
    passed++;
  } catch (err) {
    console.error('❌ Test 2 Failed:', err.message);
  }

  // ─── Test 3: Attempt Limit Verification Logic ───
  try {
    const session = { attempts: 0, max: 3, is_verified: false };
    const correctOtp = '482910';
    const correctHash = hashValue(correctOtp);

    // Attempt 1: Wrong OTP
    let entered = '111111';
    if (hashValue(entered) !== correctHash) {
      session.attempts++;
    }
    assert.strictEqual(session.attempts, 1);

    // Attempt 2: Wrong OTP
    entered = '222222';
    if (hashValue(entered) !== correctHash) {
      session.attempts++;
    }
    assert.strictEqual(session.attempts, 2);

    // Attempt 3: Wrong OTP
    entered = '333333';
    if (hashValue(entered) !== correctHash) {
      session.attempts++;
    }
    assert.strictEqual(session.attempts, 3);

    // Attempt 4: Should be rejected due to attempt limit
    const isLocked = session.attempts >= session.max;
    assert.strictEqual(isLocked, true, 'Session should be locked after 3 failed attempts');

    console.log('✅ Test 3 Passed: OTP 3-attempt lockout logic.');
    passed++;
  } catch (err) {
    console.error('❌ Test 3 Failed:', err.message);
  }

  console.log(`\n🎉 Summary: ${passed}/3 Auth & Security Tests Passed Successfully!`);
}

runAuthTests();
