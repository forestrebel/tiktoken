/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '<rootDir>/test/storage.*.test.js'
    ],
    setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
    testTimeout: 10000,
    verbose: true
}; 