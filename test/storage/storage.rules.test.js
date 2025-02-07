const { assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const fs = require('fs');

describe('Storage Rules', () => {
  let testEnv;
  let storage;
  let auth;

  beforeAll(async () => {
    // Set emulator host and port
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

    testEnv = await initializeTestEnvironment({
      projectId: 'demo-tiktoken',
      storage: {
        rules: fs.readFileSync('storage.rules', 'utf8'),
        host: '0.0.0.0',  // Match docker config
        port: 9199
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearStorage();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('Video Upload Rules', () => {
    it('allows authenticated users to upload valid videos', async () => {
      const auth = testEnv.authenticatedContext('user123');
      const storage = auth.storage();

      const result = await assertSucceeds(
        storage.ref('videos/user123/video1.mp4').put(new ArrayBuffer(5 * 1024 * 1024), {
          contentType: 'video/mp4',
        })
      );

      expect(result).toBeDefined();
    });

    it('denies videos larger than 6MB', async () => {
      const auth = testEnv.authenticatedContext('user123');
      const storage = auth.storage();

      await assertFails(
        storage.ref('videos/user123/large.mp4').put(new ArrayBuffer(7 * 1024 * 1024), {
          contentType: 'video/mp4',
        })
      );
    });

    it('denies non-video files', async () => {
      const auth = testEnv.authenticatedContext('user123');
      const storage = auth.storage();

      await assertFails(
        storage.ref('videos/user123/document.pdf').put(new ArrayBuffer(1024), {
          contentType: 'application/pdf',
        })
      );
    });

    it('denies uploads to other users directories', async () => {
      const auth = testEnv.authenticatedContext('user123');
      const storage = auth.storage();

      await assertFails(
        storage.ref('videos/otheruser/video.mp4').put(new ArrayBuffer(1024), {
          contentType: 'video/mp4',
        })
      );
    });
  });

  describe('Processed Videos Access', () => {
    it('allows public read access to processed videos', async () => {
      const unauth = testEnv.unauthenticatedContext();
      const storage = unauth.storage();

      await assertSucceeds(
        storage.ref('processed/video123.mp4').getDownloadURL()
      );
    });

    it('denies public write access to processed videos', async () => {
      const unauth = testEnv.unauthenticatedContext();
      const storage = unauth.storage();

      await assertFails(
        storage.ref('processed/video123.mp4').put(new ArrayBuffer(1024), {
          contentType: 'video/mp4',
        })
      );
    });
  });
}); 