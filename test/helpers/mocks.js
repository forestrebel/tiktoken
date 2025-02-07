import { vi } from 'vitest';

// Firebase Storage Mocks
export const createStorageMocks = {
    ref: (path) => ({
        put: vi.fn(),
        putString: vi.fn(),
        delete: vi.fn(),
        getDownloadURL: vi.fn(),
        getMetadata: vi.fn(),
        updateMetadata: vi.fn(),
        fullPath: path,
        name: path.split('/').pop()
    }),

    uploadTask: (progress = 0, error = null, downloadURL = 'https://example.com/video.mp4') => ({
        on: (event, progressCallback, errorCallback, completeCallback) => {
            if (error) {
                errorCallback(error);
                return;
            }
            
            // Simulate upload progress
            progressCallback({
                bytesTransferred: progress,
                totalBytes: 100,
                state: 'running'
            });
            
            // Simulate completion
            completeCallback({
                ref: {
                    getDownloadURL: () => Promise.resolve(downloadURL)
                }
            });
        },
        
        then: (callback) => callback({
            ref: {
                getDownloadURL: () => Promise.resolve(downloadURL)
            }
        }),
        
        catch: (callback) => error ? callback(error) : null
    })
};

// Firebase Auth Mocks
export const createAuthMocks = {
    currentUser: (overrides = {}) => ({
        uid: 'test_user_123',
        email: 'test@example.com',
        emailVerified: true,
        isAnonymous: false,
        getIdToken: () => Promise.resolve('mock_id_token'),
        ...overrides
    }),

    userCredential: (user = createAuthMocks.currentUser()) => ({
        user,
        credential: null,
        operationType: 'signIn',
        additionalUserInfo: {
            isNewUser: false,
            providerId: 'password',
            profile: null
        }
    })
};

// Response Mocks
export const createResponseMocks = {
    success: {
        upload: (downloadURL = 'https://example.com/video.mp4') => ({
            success: true,
            downloadURL,
            metadata: {
                contentType: 'video/mp4',
                customMetadata: {
                    width: '720',
                    height: '1280',
                    fps: '30',
                    duration: '45'
                }
            }
        }),

        delete: () => ({
            success: true
        })
    },

    error: {
        auth: (code = 'auth/user-not-found') => ({
            code,
            message: 'Authentication error occurred',
            name: 'AuthError'
        }),

        storage: (code = 'storage/unauthorized') => ({
            code,
            message: 'Storage operation failed',
            name: 'StorageError'
        }),

        validation: (code = 'validation/invalid-metadata') => ({
            code,
            message: 'Validation failed',
            name: 'ValidationError'
        })
    },

    progress: (bytesTransferred, totalBytes) => ({
        bytesTransferred,
        totalBytes,
        state: 'running',
        progress: bytesTransferred / totalBytes
    })
}; 