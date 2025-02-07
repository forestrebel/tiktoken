const assert = require('assert');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = "demo-tiktoken";
const TEST_DATA = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello" in bytes

describe("TikToken Storage Rules", () => {
  let testEnv;

  before(async () => {
    console.log('Setting up test environment...');
    const rules = fs.readFileSync('storage.rules', 'utf8');
    console.log('Rules loaded successfully');
    
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      storage: {
        rules,
        host: "127.0.0.1",
        port: 9199
      }
    });
    console.log('Test environment initialized');
  });

  beforeEach(async () => {
    console.log('\nStarting new test...');
    await testEnv.clearStorage();
  });

  after(async () => {
    await testEnv.cleanup();
    console.log('\nTest environment cleaned up');
  });

  // Test: Basic test upload
  it("allows test user upload to videos", async () => {
    // Create test user context
    const auth = testEnv.authenticatedContext('test_user123', {
      sub: 'test_user123',
      email: 'test@example.com'
    });
    
    console.log('\nTest Context:', {
      sub: 'test_user123',
      token: auth.token
    });
    
    // Get storage reference
    const storage = auth.storage();
    const ref = storage.ref("videos/test.mp4");
    
    // Upload with valid metadata
    const metadata = {
      contentType: "video/mp4",
      customMetadata: {
        test: "true"
      }
    };
    
    // Should succeed
    await assertSucceeds(
      ref.put(TEST_DATA, metadata)
    );
  });

  // Test: Regular user blocked
  it("blocks non-test user upload to videos", async () => {
    // Create regular user context
    const auth = testEnv.authenticatedContext('regular_user', {
      sub: 'regular_user',
      email: 'user@example.com'
    });
    
    console.log('\nRegular User Context:', {
      sub: 'regular_user',
      token: auth.token
    });
    
    // Get storage reference
    const storage = auth.storage();
    const ref = storage.ref("videos/test.mp4");
    
    // Attempt upload
    const metadata = {
      contentType: "video/mp4"
    };
    
    // Should fail
    await assertFails(
      ref.put(TEST_DATA, metadata)
    );
  });

  // Test: Test area access
  it("allows any authenticated user to access test area", async () => {
    // Create regular user context
    const auth = testEnv.authenticatedContext('any_user', {
      sub: 'any_user',
      email: 'any@example.com'
    });
    
    console.log('\nTest Area Context:', {
      sub: 'any_user',
      token: auth.token
    });
    
    // Get storage reference
    const storage = auth.storage();
    const ref = storage.ref("test/simple.txt");
    
    // Attempt upload
    const metadata = {
      contentType: "text/plain"
    };
    
    // Should succeed
    await assertSucceeds(
      ref.put(TEST_DATA, metadata)
    );
  });
}); 