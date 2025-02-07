import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['app/src/**/*.test.{js,ts}'],
        setupFiles: ['test/setup.js'],
        testTimeout: 10000
    }
}); 