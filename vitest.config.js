import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Environment configuration
        environment: 'node',
        globals: true,
        
        // Setup files
        setupFiles: ['./test/setup.js'],
        
        // Include patterns
        include: [
            // Application tests
            'app/src/services/__tests__/**/*.test.js',
            'app/src/services/__tests__/**/*.test.ts',
            // Storage rules tests
            'test/**/*.test.js'
        ],
        
        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: [
                'app/src/services/**/*.js',
                'app/src/services/**/*.ts'
            ],
            exclude: [
                'test/**',
                '**/*.test.js',
                '**/*.test.ts'
            ]
        },
        
        // Test isolation
        isolate: true,
        
        // Timeouts
        testTimeout: 10000,
        hookTimeout: 10000,
        
        // Parallel execution
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: true
            }
        }
    }
}); 