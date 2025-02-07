import { beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import { envHelpers } from './helpers';

// Global state
let testEnv;

// Setup before all tests
beforeAll(async () => {
    // Initialize test environment
    testEnv = await envHelpers.initializeTestEnv();
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// Setup before each test
beforeEach(async () => {
    // Clear storage
    if (testEnv) {
        await testEnv.clearStorage();
    }
    
    // Clear all mocks
    vi.clearAllMocks();
});

// Cleanup after each test
afterEach(async () => {
    // Additional cleanup if needed
});

// Cleanup after all tests
afterAll(async () => {
    // Cleanup test environment
    await envHelpers.cleanup(testEnv);
    
    // Restore console methods
    vi.restoreAllMocks();
}); 