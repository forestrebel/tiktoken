const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const fs = require('fs');

describe("Storage Basic Test", () => {
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

  describe("Metadata Validation", () => {
    const validMetadata = {
      contentType: 'video/mp4',
      customMetadata: {
        width: "720",
        height: "1280",
        fps: "30",
        duration: "45"
      }
    };

    it("accepts valid metadata", async () => {
      const userId = 'user123';
      const auth = testEnv.authenticatedContext(userId, {
        sub: userId,
        email: `${userId}@example.com`
      });
      const storage = auth.storage();
      const ref = storage.ref(`users/${userId}/test.mp4`);
      
      const data = new Uint8Array([1]);
      
      await assertSucceeds(
        ref.put(data, validMetadata)
      );
    });

    it("rejects missing metadata", async () => {
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
        // Missing customMetadata
      };

      await assertFails(
        ref.put(data, metadata)
      );
    });

    it("rejects invalid dimensions", async () => {
      const userId = 'user123';
      const auth = testEnv.authenticatedContext(userId, {
        sub: userId,
        email: `${userId}@example.com`
      });
      const storage = auth.storage();
      const ref = storage.ref(`users/${userId}/test.mp4`);
      
      const data = new Uint8Array([1]);
      const metadata = {
        ...validMetadata,
        customMetadata: {
          ...validMetadata.customMetadata,
          width: "1080",
          height: "1920"
        }
      };

      await assertFails(
        ref.put(data, metadata)
      );
    });

    it("rejects invalid fps", async () => {
      const userId = 'user123';
      const auth = testEnv.authenticatedContext(userId, {
        sub: userId,
        email: `${userId}@example.com`
      });
      const storage = auth.storage();
      const ref = storage.ref(`users/${userId}/test.mp4`);
      
      const data = new Uint8Array([1]);
      const metadata = {
        ...validMetadata,
        customMetadata: {
          ...validMetadata.customMetadata,
          fps: "60"
        }
      };

      await assertFails(
        ref.put(data, metadata)
      );
    });

    it("rejects invalid duration", async () => {
      const userId = 'user123';
      const auth = testEnv.authenticatedContext(userId, {
        sub: userId,
        email: `${userId}@example.com`
      });
      const storage = auth.storage();
      const ref = storage.ref(`users/${userId}/test.mp4`);
      
      const data = new Uint8Array([1]);
      const metadata = {
        ...validMetadata,
        customMetadata: {
          ...validMetadata.customMetadata,
          duration: "90"
        }
      };

      await assertFails(
        ref.put(data, metadata)
      );
    });
  });

  describe("Test Collection", () => {
    it("allows test user with minimal validation", async () => {
      const auth = testEnv.authenticatedContext('test_user123', {
        sub: 'test_user123',
        email: 'test@example.com'
      });
      const storage = auth.storage();
      const ref = storage.ref('test/test.mp4');
      
      const data = new Uint8Array([1]);
      const metadata = {
        contentType: 'video/mp4'
        // No customMetadata required for test collection
      };

      await assertSucceeds(
        ref.put(data, metadata)
      );
    });

    it("still enforces file type for test users", async () => {
      const auth = testEnv.authenticatedContext('test_user123', {
        sub: 'test_user123',
        email: 'test@example.com'
      });
      const storage = auth.storage();
      const ref = storage.ref('test/test.txt');
      
      const data = new Uint8Array([1]);
      const metadata = {
        contentType: 'text/plain'
      };

      await assertFails(
        ref.put(data, metadata)
      );
    });
  });
}); 