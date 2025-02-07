import { VideoMetadata } from '../../app/src/services/videoUploader';

// Mock File implementation for testing
class MockFile {
  constructor(content, name, options = {}) {
    this.content = content;
    this.name = name;
    this.type = options.type || '';
    this.size = options.size || content.length;
  }
}

// If File is not defined, use our mock
if (typeof File === 'undefined') {
  global.File = MockFile;
}

// Video file creation helpers
export const createVideoFile = {
    portrait() {
        return new MockFile(['test-content'], 'test.mp4', {
            type: 'video/mp4',
            size: 50 * 1024 * 1024 // 50MB
        });
    },

    landscape() {
        return new MockFile(['test-content'], 'test.mp4', {
            type: 'video/mp4',
            size: 75 * 1024 * 1024 // 75MB
        });
    },

    oversized() {
        return new MockFile(['test-content'], 'test.mp4', {
            type: 'video/mp4',
            size: 150 * 1024 * 1024 // 150MB
        });
    },

    invalid() {
        return new MockFile(['test-content'], 'test.txt', {
            type: 'text/plain',
            size: 1024
        });
    }
};

// Video metadata generation
export const createVideoMetadata = {
    valid() {
        return {
            width: 1920,
            height: 1080,
            fps: 30,
            duration: 120
        };
    },

    portrait: () => ({
        width: 720,
        height: 1280,
        fps: 30,
        duration: 45
    }),

    landscape: () => ({
        width: 1280,
        height: 720,
        fps: 30,
        duration: 45
    }),

    invalidDimensions: () => ({
        width: 1080,
        height: 1920,
        fps: 30,
        duration: 45
    }),

    invalidFps: () => ({
        width: 720,
        height: 1280,
        fps: 60,
        duration: 45
    }),

    invalidDuration: () => ({
        width: 720,
        height: 1280,
        fps: 30,
        duration: 90
    }),

    boundary: {
        minFps: () => ({
            width: 720,
            height: 1280,
            fps: 29.97,
            duration: 45
        }),
        maxFps: () => ({
            width: 720,
            height: 1280,
            fps: 30,
            duration: 45
        }),
        maxDuration: () => ({
            width: 720,
            height: 1280,
            fps: 30,
            duration: 60
        })
    },

    invalid: {
        width: () => ({
            height: 1080,
            fps: 30,
            duration: 120
        }),
        height: () => ({
            width: 1920,
            fps: 30,
            duration: 120
        }),
        fps: () => ({
            width: 1920,
            height: 1080,
            duration: 120
        }),
        duration: () => ({
            width: 1920,
            height: 1080,
            fps: 30
        })
    }
};

// Upload scenario helpers
export const uploadScenarios = {
    success: {
        file: createVideoFile.portrait(),
        metadata: createVideoMetadata.valid()
    },

    invalidFile: {
        size: {
            file: createVideoFile.oversized(),
            metadata: createVideoMetadata.valid()
        },
        format: {
            file: createVideoFile.invalid(),
            metadata: createVideoMetadata.valid()
        }
    },

    invalidMetadata: {
        dimensions: {
            file: createVideoFile.portrait(),
            metadata: createVideoMetadata.invalidDimensions()
        },
        fps: {
            file: createVideoFile.portrait(),
            metadata: createVideoMetadata.invalidFps()
        },
        duration: {
            file: createVideoFile.portrait(),
            metadata: createVideoMetadata.invalidDuration()
        }
    },

    boundary: {
        fps: {
            min: {
                file: createVideoFile.portrait(),
                metadata: createVideoMetadata.boundary.minFps()
            },
            max: {
                file: createVideoFile.portrait(),
                metadata: createVideoMetadata.boundary.maxFps()
            }
        },
        duration: {
            max: {
                file: createVideoFile.portrait(),
                metadata: createVideoMetadata.boundary.maxDuration()
            }
        }
    }
}; 