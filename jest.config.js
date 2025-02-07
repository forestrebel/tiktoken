/** @type {import('jest').Config} */
const config = {
    // Test environment
    testEnvironment: 'node',
    
    // Test files
    testMatch: [
        '<rootDir>/test/*.test.js',
        '<rootDir>/test/rules/**/*.test.js'
    ],
    
    // Module resolution
    moduleFileExtensions: ['js', 'json', 'node'],
    
    // Setup files
    globalSetup: '<rootDir>/test/global-setup.js',
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'],
    
    // Coverage configuration
    collectCoverageFrom: [
        'storage.rules',
        'test/rules/**/*.js'
    ],
    coverageDirectory: 'coverage/rules',
    coverageReporters: ['text', 'lcov', 'html'],
    
    // Test timeout
    testTimeout: 10000,
    
    // Verbose output for debugging
    verbose: true,
    
    // Custom reporters
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: 'reports/rules',
            outputName: 'junit.xml',
            classNameTemplate: '{filepath}',
            titleTemplate: '{title}'
        }]
    ],
    
    // Global variables
    globals: {
        __FIREBASE_CONFIG__: {
            projectId: 'demo-tiktoken',
            ports: {
                auth: 9099,
                storage: 9199
            }
        }
    }
};

module.exports = config; 