import { beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

// Test environment state
let testEnv;

// Common setup functions
export const setup = {
    beforeAll: async () => {
        // Initialize test environment if not already done
        if (!testEnv && global.__FIREBASE_TEST_ENV__) {
            testEnv = global.__FIREBASE_TEST_ENV__;
        }
        
        // Silence console output during tests
        const methods = ['log', 'error', 'warn'];
        methods.forEach(method => {
            if (typeof global.console[method] === 'function') {
                global.console[method] = () => {};
            }
        });
    },
    
    beforeEach: async () => {
        // Clear storage between tests
        if (testEnv) {
            await testEnv.clearStorage();
        }
    },
    
    afterEach: async () => {
        // Additional cleanup if needed
    },
    
    afterAll: async () => {
        // Cleanup test environment
        if (testEnv) {
            await testEnv.cleanup();
        }
        
        // Restore console methods if needed
        if (typeof global.console.restore === 'function') {
            global.console.restore();
        }
    }
};

// Common test helpers
export const helpers = {
    createTestFile: (size = 1024) => new File(
        [new ArrayBuffer(size)],
        'test.mp4',
        { type: 'video/mp4' }
    ),
    
    createTestMetadata: (overrides = {}) => ({
        contentType: 'video/mp4',
        customMetadata: {
            width: '720',
            height: '1280',
            fps: '30',
            duration: '45',
            ...overrides
        }
    }),
    
    expectStorageError: async (promise, code) => {
        try {
            await promise;
            throw new Error('Expected operation to fail');
        } catch (error) {
            if (typeof expect === 'function') {
                expect(error.code).toBe(code);
            } else {
                if (error.code !== code) {
                    throw new Error(`Expected error code ${code} but got ${error.code}`);
                }
            }
        }
    }
};

// Firebase-specific matchers
if (typeof expect !== 'undefined') {
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
}

// Set up test lifecycle hooks
beforeAll(setup.beforeAll);
beforeEach(setup.beforeEach);
afterEach(setup.afterEach);
afterAll(setup.afterAll);

// Export commonly used helpers
export const { createTestFile, createTestMetadata, expectStorageError } = helpers; 