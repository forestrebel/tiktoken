import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-test';
const rulesFile = resolve(__dirname, '../storage.rules');

module.exports = async () => {
    // Read storage rules
    const rules = readFileSync(rulesFile, 'utf8');

    // Initialize the test environment
    const testEnv = await initializeTestEnvironment({
        projectId,
        storage: {
            rules,
            host: process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost',
            port: process.env.FIREBASE_STORAGE_EMULATOR_PORT || 9199
        }
    });

    // Make the test environment available globally
    global.__FIREBASE_TEST_ENV__ = testEnv;

    // Ensure cleanup on process termination
    const cleanup = async () => {
        if (global.__FIREBASE_TEST_ENV__) {
            await global.__FIREBASE_TEST_ENV__.cleanup();
            delete global.__FIREBASE_TEST_ENV__;
        }
        process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}; 