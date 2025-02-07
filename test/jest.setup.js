import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

// Extend Jest with Firebase-specific matchers
expect.extend({
    async toAllow(promise) {
        let pass = false;
        let error = null;

        try {
            await assertSucceeds(promise);
            pass = true;
        } catch (e) {
            error = e;
            pass = false;
        }

        return {
            pass,
            message: () => pass
                ? 'Expected Firebase operation to be denied, but it was allowed'
                : `Expected Firebase operation to be allowed, but it was denied: ${error?.message}`
        };
    },

    async toDeny(promise) {
        let pass = false;
        let error = null;

        try {
            await assertFails(promise);
            pass = true;
        } catch (e) {
            error = e;
            pass = false;
        }

        return {
            pass,
            message: () => pass
                ? 'Expected Firebase operation to be allowed, but it was denied'
                : `Expected Firebase operation to be denied, but it was allowed: ${error?.message}`
        };
    }
});

// Global test environment setup
beforeAll(async () => {
    // Access the global test environment
    const testEnv = global.__FIREBASE_TEST_ENV__;
    if (!testEnv) {
        throw new Error('Firebase test environment not initialized');
    }
});

// Clean up after each test
afterEach(async () => {
    const testEnv = global.__FIREBASE_TEST_ENV__;
    if (testEnv) {
        await testEnv.clearStorage();
    }
});

// Global test environment teardown
afterAll(async () => {
    const testEnv = global.__FIREBASE_TEST_ENV__;
    if (testEnv) {
        await testEnv.cleanup();
    }
});

// Test helpers
global.createTestFile = (size = 1024) => new File(
    [new ArrayBuffer(size)],
    'test.mp4',
    { type: 'video/mp4' }
);

global.createTestMetadata = (overrides = {}) => ({
    contentType: 'video/mp4',
    customMetadata: {
        width: '720',
        height: '1280',
        fps: '30',
        duration: '45',
        ...overrides
    }
});

// Error helpers
global.expectStorageError = async (promise, code) => {
    try {
        await promise;
        throw new Error('Expected operation to fail');
    } catch (error) {
        expect(error.code).toBe(code);
    }
}; 