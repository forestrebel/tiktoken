const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const fs = require('fs');

describe("Storage Security Rules", () => {
  let testEnv;
  
  beforeAll(async () => {
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";
    testEnv = await initializeTestEnvironment({
      projectId: "demo-tiktoken",
      storage: {
        rules: fs.readFileSync('storage.rules', 'utf8')
      }
    });
  });

  beforeEach(async () => {
    await testEnv.clearStorage();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe("Basic Security Rules", () => {
    it("allows authenticated user to upload MP4 file", async () => {
      const userId = 'user123';
      const auth = testEnv.authenticatedContext(userId, {
        sub: userId,
        email: `${userId}@example.com`
      });
      const storage = auth.storage();
      const ref = storage.ref(`users/${userId}/test.mp4`);
      
      const data = new Uint8Array([1]);
      const metadata = {
        contentType: 'video/mp4'
      };
      
      await assertSucceeds(
        ref.put(data, metadata)
      );
    });

    it("blocks non-MP4 file upload", async () => {
      const userId = 'user123';
      const auth = testEnv.authenticatedContext(userId, {
        sub: userId,
        email: `${userId}@example.com`
      });
      const storage = auth.storage();
      const ref = storage.ref(`users/${userId}/test.txt`);
      
      const data = new Uint8Array([1]);
      const metadata = {
        contentType: 'text/plain'
      };

      await assertFails(
        ref.put(data, metadata)
      );
    });

    it("blocks oversized file upload", async () => {
      const userId = 'user123';
      const auth = testEnv.authenticatedContext(userId, {
        sub: userId,
        email: `${userId}@example.com`
      });
      const storage = auth.storage();
      const ref = storage.ref(`users/${userId}/test.mp4`);
      
      // Create a file larger than 100MB
      const data = new Uint8Array(101 * 1024 * 1024);
      const metadata = {
        contentType: 'video/mp4'
      };

      await assertFails(
        ref.put(data, metadata)
      );
    });

    it("blocks user from writing to another user's path", async () => {
      const userId = 'user123';
      const otherUserId = 'user456';
      const auth = testEnv.authenticatedContext(userId, {
        sub: userId,
        email: `${userId}@example.com`
      });
      const storage = auth.storage();
      const ref = storage.ref(`users/${otherUserId}/test.mp4`);
      
      const data = new Uint8Array([1]);
      const metadata = {
        contentType: 'video/mp4'
      };

      await assertFails(
        ref.put(data, metadata)
      );
    });

    it("blocks unauthenticated write", async () => {
      const storage = testEnv.unauthenticatedContext().storage();
      const ref = storage.ref('users/anyone/test.mp4');
      
      const data = new Uint8Array([1]);
      const metadata = {
        contentType: 'video/mp4'
      };

      await assertFails(
        ref.put(data, metadata)
      );
    });
  });

  describe("Test Collection", () => {
    it("allows test user to write", async () => {
      const auth = testEnv.authenticatedContext('test_user123', {
        sub: 'test_user123',
        email: 'test@example.com'
      });
      const storage = auth.storage();
      const ref = storage.ref('test/test.mp4');
      
      const data = new Uint8Array([1]);
      const metadata = {
        contentType: 'video/mp4'
      };

      await assertSucceeds(
        ref.put(data, metadata)
      );
    });

    it("blocks non-test user from writing", async () => {
      const auth = testEnv.authenticatedContext('regular_user', {
        sub: 'regular_user',
        email: 'user@example.com'
      });
      const storage = auth.storage();
      const ref = storage.ref('test/test.mp4');
      
      const data = new Uint8Array([1]);
      const metadata = {
        contentType: 'video/mp4'
      };

      await assertFails(
        ref.put(data, metadata)
      );
    });
  });
}); 