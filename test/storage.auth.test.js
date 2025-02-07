const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const fs = require('fs');

describe("Storage Auth Test", () => {
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

  it("allows user to write with valid metadata", async () => {
    const userId = 'user123';
    const auth = testEnv.authenticatedContext(userId, {
      sub: userId,
      email: `${userId}@example.com`
    });
    const storage = auth.storage();
    const ref = storage.ref(`users/${userId}/test.mp4`);
    
    const data = new Uint8Array([1]);
    const metadata = {
      contentType: 'video/mp4',
      customMetadata: {
        width: "720",
        height: "1280"
      }
    };

    console.log('Test setup:', {
      userId,
      metadata: JSON.stringify(metadata, null, 2)
    });
    
    await assertSucceeds(
      ref.put(data, metadata)
    );
  });

  it("blocks upload with invalid dimensions", async () => {
    const userId = 'user123';
    const auth = testEnv.authenticatedContext(userId, {
      sub: userId,
      email: `${userId}@example.com`
    });
    const storage = auth.storage();
    const ref = storage.ref(`users/${userId}/test.mp4`);
    
    const data = new Uint8Array([1]);
    const metadata = {
      contentType: 'video/mp4',
      customMetadata: {
        width: "1080",  // Invalid width
        height: "1920"  // Invalid height
      }
    };

    await assertFails(
      ref.put(data, metadata)
    );
  });

  it("blocks upload with missing metadata", async () => {
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
      contentType: 'video/mp4',
      customMetadata: {
        width: "720",
        height: "1280"
      }
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
      contentType: 'video/mp4',
      customMetadata: {
        width: "720",
        height: "1280"
      }
    };

    await assertFails(
      ref.put(data, metadata)
    );
  });
}); 