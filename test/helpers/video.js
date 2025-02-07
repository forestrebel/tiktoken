import { VideoMetadata } from '../../app/src/services/videoUploader';

// Video file creation helpers
export const createVideoFile = {
    portrait: (size = 1024) => new File(
        [new ArrayBuffer(size)],
        'portrait.mp4',
        { type: 'video/mp4' }
    ),

    landscape: (size = 1024) => new File(
        [new ArrayBuffer(size)],
        'landscape.mp4',
        { type: 'video/mp4' }
    ),

    oversized: () => {
        const file = new File(
            [new ArrayBuffer(1024)],
            'large.mp4',
            { type: 'video/mp4' }
        );
        // Override size property to simulate large file
        Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 });
        return file;
    },

    corrupt: () => new File(
        [new ArrayBuffer(1024)],
        'corrupt.mp4',
        { type: 'application/octet-stream' }
    )
};

// Video metadata generation
export const createVideoMetadata = {
    valid: (overrides = {}) => ({
        width: 720,
        height: 1280,
        fps: 30,
        duration: 45,
        ...overrides
    }),

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
            file: createVideoFile.corrupt(),
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