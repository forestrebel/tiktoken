import { getStorage, ref, uploadBytes, getMetadata, updateMetadata } from 'firebase/storage';

/**
 * Helper to upload a test file to Firebase Storage
 * @param {Object} context - The authenticated test context
 * @param {string} path - The storage path to upload to
 * @param {File} file - The file to upload
 * @param {Object} metadata - Optional metadata to attach to the file
 * @returns {Promise<string>} The download URL of the uploaded file
 */
export async function uploadTestFile(context, path, file, metadata = {}) {
    const storage = getStorage(context.app);
    const fileRef = ref(storage, path);
    
    const result = await uploadBytes(fileRef, file, metadata);
    return result.ref;
}

/**
 * Helper to verify file metadata in Firebase Storage
 * @param {Object} context - The authenticated test context
 * @param {string} path - The storage path to check
 * @param {Object} expectedMetadata - The expected metadata values
 * @returns {Promise<boolean>} True if metadata matches expectations
 */
export async function verifyFileMetadata(context, path, expectedMetadata) {
    const storage = getStorage(context.app);
    const fileRef = ref(storage, path);
    
    const metadata = await getMetadata(fileRef);
    
    // Check each expected metadata field
    for (const [key, value] of Object.entries(expectedMetadata)) {
        if (metadata.customMetadata?.[key] !== value) {
            return false;
        }
    }
    
    return true;
}

/**
 * Helper to update file metadata in Firebase Storage
 * @param {Object} context - The authenticated test context
 * @param {string} path - The storage path to update
 * @param {Object} newMetadata - The new metadata values
 * @returns {Promise<Object>} The updated metadata
 */
export async function updateFileMetadata(context, path, newMetadata) {
    const storage = getStorage(context.app);
    const fileRef = ref(storage, path);
    
    return await updateMetadata(fileRef, {
        customMetadata: newMetadata
    });
}

/**
 * Helper to create a test user context
 * @param {Object} auth - Authentication details
 * @returns {Promise<Object>} The authenticated test context
 */
export async function createTestContext(auth = null) {
    const testEnv = global.__FIREBASE_TEST_ENV__;
    if (!testEnv) {
        throw new Error('Firebase test environment not initialized');
    }
    
    return auth
        ? testEnv.authenticatedContext('test-user', auth)
        : testEnv.unauthenticatedContext();
}

/**
 * Helper to generate a unique file path
 * @param {string} prefix - Optional prefix for the path
 * @returns {string} A unique storage path
 */
export function generateUniquePath(prefix = 'test') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}/${timestamp}-${random}`;
} 