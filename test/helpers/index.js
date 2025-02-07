import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import fs from 'fs';

// Authentication Helpers
export const authHelpers = {
    getTestUser: (customClaims = {}) => ({
        uid: 'test_user123',
        email: 'test@example.com',
        ...customClaims
    }),

    getAuthContext: async (testEnv, userId = 'test_user123', customClaims = {}) => {
        return testEnv.authenticatedContext(userId, {
            sub: userId,
            email: `${userId}@example.com`,
            ...customClaims
        });
    },

    getUnauthContext: async (testEnv) => {
        return testEnv.unauthenticatedContext();
    }
};

// Storage Helpers
export const storageHelpers = {
    createTestFile: (size = 1024, type = 'video/mp4') => {
        return new File([new ArrayBuffer(size)], 'test.mp4', { type });
    },

    getValidMetadata: (customMetadata = {}) => ({
        contentType: 'video/mp4',
        customMetadata: {
            width: "720",
            height: "1280",
            fps: "30",
            duration: "45",
            ...customMetadata
        }
    }),

    getInvalidMetadata: (type = 'dimensions') => {
        const base = storageHelpers.getValidMetadata();
        switch (type) {
            case 'dimensions':
                return {
                    ...base,
                    customMetadata: {
                        ...base.customMetadata,
                        width: "1080",
                        height: "1920"
                    }
                };
            case 'fps':
                return {
                    ...base,
                    customMetadata: {
                        ...base.customMetadata,
                        fps: "60"
                    }
                };
            case 'duration':
                return {
                    ...base,
                    customMetadata: {
                        ...base.customMetadata,
                        duration: "90"
                    }
                };
            default:
                return base;
        }
    }
};

// Environment Helpers
export const envHelpers = {
    initializeTestEnv: async (config = {}) => {
        process.env.FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";
        
        return initializeTestEnvironment({
            projectId: "demo-tiktoken",
            storage: {
                rules: fs.readFileSync('storage.rules', 'utf8')
            },
            ...config
        });
    },

    cleanup: async (testEnv) => {
        if (testEnv) {
            await testEnv.clearStorage();
            await testEnv.cleanup();
        }
    }
};

// Assertion Helpers
export const assertHelpers = {
    expectValidationError: async (promise, errorCode) => {
        try {
            await promise;
            throw new Error('Expected validation to fail');
        } catch (error) {
            expect(error.code).toBe(errorCode);
        }
    },

    expectStorageError: async (promise, errorType) => {
        try {
            await promise;
            throw new Error('Expected storage operation to fail');
        } catch (error) {
            expect(error.name).toBe(errorType);
        }
    }
};

// Path Helpers
export const pathHelpers = {
    getUserVideoPath: (userId, filename = 'test.mp4') => 
        `users/${userId}/videos/${filename}`,
    
    getTestPath: (filename = 'test.mp4') => 
        `test/${filename}`,
    
    getPublicPath: (videoId = 'test.mp4') => 
        `videos/${videoId}`
};

// Test Summary Helpers
export const summaryHelpers = {
    // Generate test summary for reporting
    generateSummary: (results) => ({
        total: results.numTotalTests,
        passed: results.numPassedTests,
        failed: results.numFailedTests,
        duration: results.testResults.reduce((acc, result) => acc + result.duration, 0),
        coverage: results.coverageMap ? {
            statements: results.coverageMap.getCoverageSummary().statements.pct,
            branches: results.coverageMap.getCoverageSummary().branches.pct,
            functions: results.coverageMap.getCoverageSummary().functions.pct,
            lines: results.coverageMap.getCoverageSummary().lines.pct
        } : null
    }),

    // Format test results for CI reporting
    formatForCI: (summary) => ({
        testResults: {
            total: summary.total,
            passed: summary.passed,
            failed: summary.failed,
            duration: `${(summary.duration / 1000).toFixed(2)}s`
        },
        coverage: summary.coverage ? {
            statements: `${summary.coverage.statements}%`,
            branches: `${summary.coverage.branches}%`,
            functions: `${summary.coverage.functions}%`,
            lines: `${summary.coverage.lines}%`
        } : 'No coverage data'
    })
};

export * from './generators';
export * from './mocks';
export * from './video';
export * from './storage';

// Re-export commonly used helpers
export { generateUniquePath, createTestContext } from './storage'; 