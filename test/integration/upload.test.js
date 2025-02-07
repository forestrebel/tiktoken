import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { VideoUploader } from '../../app/src/services/videoUploader';
import { createVideoFile, createVideoMetadata } from '../helpers/video';
import { createStorageMocks, createAuthMocks } from '../helpers/mocks';
import { generateFile, generateMetadata } from '../helpers/generators';
import fs from 'fs';

describe('Video Upload Integration', () => {
    let testEnv;
    let uploader;
    
    beforeEach(async () => {
        // Initialize Firebase test environment
        testEnv = await initializeTestEnvironment({
            projectId: "demo-tiktoken",
            storage: {
                rules: fs.readFileSync('storage.rules', 'utf8')
            }
        });

        // Clear previous test data
        await testEnv.clearStorage();
        
        // Initialize uploader with test configuration
        uploader = new VideoUploader();
    });

    afterEach(async () => {
        await testEnv?.cleanup();
    });

    describe('Valid Upload Scenarios', () => {
        it('successfully uploads valid portrait video', async () => {
            // Prepare test data
            const file = createVideoFile.portrait();
            const metadata = createVideoMetadata.valid();
            
            // Authenticate test user
            const auth = testEnv.authenticatedContext('test_user', {
                sub: 'test_user',
                email: 'test@example.com'
            });

            // Attempt upload through application service
            const result = await uploader.uploadVideo(file, metadata);
            
            // Verify upload success
            expect(result).toBeDefined();
            expect(result.path).toContain('test_user');
            
            // Verify storage rules allowed the upload
            const storedFile = await auth.storage()
                .ref(result.path)
                .getMetadata();
                
            expect(storedFile.customMetadata).toMatchObject({
                width: metadata.width.toString(),
                height: metadata.height.toString()
            });
        });

        it('handles boundary condition uploads', async () => {
            // Test boundary cases
            const scenarios = [
                {
                    name: 'Minimum FPS',
                    file: createVideoFile.portrait(),
                    metadata: createVideoMetadata.boundary.minFps()
                },
                {
                    name: 'Maximum Duration',
                    file: createVideoFile.portrait(),
                    metadata: createVideoMetadata.boundary.maxDuration()
                }
            ];

            for (const scenario of scenarios) {
                const result = await uploader.uploadVideo(
                    scenario.file,
                    scenario.metadata
                );
                expect(result, `Failed for ${scenario.name}`).toBeDefined();
            }
        });
    });

    describe('Invalid Upload Scenarios', () => {
        it('rejects invalid file types at both layers', async () => {
            const invalidFiles = [
                {
                    name: 'PDF File',
                    file: generateFile.formats.invalid(),
                    error: 'INVALID_FILE_TYPE'
                },
                {
                    name: 'Corrupt MP4',
                    file: generateFile.corrupt.wrongContent(),
                    error: 'INVALID_FILE_TYPE'
                }
            ];

            for (const { name, file, error } of invalidFiles) {
                // Test application validation
                await expect(
                    uploader.uploadVideo(file, createVideoMetadata.valid())
                ).rejects.toThrow(error);

                // Test storage rules
                const auth = testEnv.authenticatedContext('test_user');
                await expect(
                    auth.storage()
                        .ref('test/invalid.mp4')
                        .put(file)
                ).rejects.toBeDefined();
            }
        });

        it('enforces metadata validation consistently', async () => {
            const invalidScenarios = [
                {
                    name: 'Invalid Dimensions',
                    metadata: createVideoMetadata.invalidDimensions(),
                    error: 'INVALID_DIMENSIONS'
                },
                {
                    name: 'Invalid FPS',
                    metadata: createVideoMetadata.invalidFps(),
                    error: 'INVALID_FPS'
                },
                {
                    name: 'Invalid Duration',
                    metadata: createVideoMetadata.invalidDuration(),
                    error: 'INVALID_DURATION'
                }
            ];

            for (const { name, metadata, error } of invalidScenarios) {
                const file = createVideoFile.portrait();

                // Test application validation
                await expect(
                    uploader.uploadVideo(file, metadata)
                ).rejects.toThrow(error);

                // Test storage rules
                const auth = testEnv.authenticatedContext('test_user');
                await expect(
                    auth.storage()
                        .ref('test/invalid.mp4')
                        .put(file, {
                            customMetadata: {
                                width: metadata.width.toString(),
                                height: metadata.height.toString(),
                                fps: metadata.fps.toString(),
                                duration: metadata.duration.toString()
                            }
                        })
                ).rejects.toBeDefined();
            }
        });
    });

    describe('Auth Scenarios', () => {
        it('enforces authentication at both layers', async () => {
            const file = createVideoFile.portrait();
            const metadata = createVideoMetadata.valid();

            // Test application validation
            await expect(
                uploader.uploadVideo(file, metadata)
            ).rejects.toThrow('AUTH_REQUIRED');

            // Test storage rules
            const noAuth = testEnv.unauthenticatedContext();
            await expect(
                noAuth.storage()
                    .ref('test/video.mp4')
                    .put(file)
            ).rejects.toBeDefined();
        });

        it('prevents cross-user access', async () => {
            const file = createVideoFile.portrait();
            const metadata = createVideoMetadata.valid();
            const targetPath = 'users/other_user/videos/test.mp4';

            // Authenticate as test user
            const auth = testEnv.authenticatedContext('test_user');

            // Attempt to upload to another user's path
            await expect(
                auth.storage()
                    .ref(targetPath)
                    .put(file, {
                        customMetadata: {
                            width: metadata.width.toString(),
                            height: metadata.height.toString()
                        }
                    })
            ).rejects.toBeDefined();
        });
    });
}); 