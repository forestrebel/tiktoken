// Utility function to generate random numbers within a range
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// Video metadata generators
export const generateMetadata = {
    // Generate valid metadata with random values within acceptable ranges
    random: () => ({
        width: randomBetween(480, 720),
        height: randomBetween(640, 1280),
        fps: randomBetween(24, 30),
        duration: randomBetween(15, 45)
    }),

    // Generate sets of metadata for different test scenarios
    sets: (count = 5) => Array.from({ length: count }, () => generateMetadata.random()),

    // Generate boundary value metadata
    boundary: {
        dimensions: [
            { width: 480, height: 640, fps: 30, duration: 30 },   // Minimum
            { width: 720, height: 1280, fps: 30, duration: 30 },  // Maximum
            { width: 600, height: 960, fps: 30, duration: 30 }    // Middle
        ],
        
        fps: [
            { width: 720, height: 1280, fps: 24, duration: 30 },    // Min FPS
            { width: 720, height: 1280, fps: 30, duration: 30 },    // Max FPS
            { width: 720, height: 1280, fps: 29.97, duration: 30 }  // Common FPS
        ],
        
        duration: [
            { width: 720, height: 1280, fps: 30, duration: 15 },  // Min duration
            { width: 720, height: 1280, fps: 30, duration: 60 },  // Max duration
            { width: 720, height: 1280, fps: 30, duration: 45 }   // Typical duration
        ]
    },

    // Generate invalid metadata for testing error cases
    invalid: {
        dimensions: [
            { width: 400, height: 600, fps: 30, duration: 30 },    // Too small
            { width: 1080, height: 1920, fps: 30, duration: 30 },  // Too large
            { width: -720, height: 1280, fps: 30, duration: 30 },  // Negative width
            { width: 720, height: -1280, fps: 30, duration: 30 }   // Negative height
        ],
        
        fps: [
            { width: 720, height: 1280, fps: 15, duration: 30 },   // Too low
            { width: 720, height: 1280, fps: 60, duration: 30 },   // Too high
            { width: 720, height: 1280, fps: -30, duration: 30 },  // Negative
            { width: 720, height: 1280, fps: 0, duration: 30 }     // Zero
        ],
        
        duration: [
            { width: 720, height: 1280, fps: 30, duration: 10 },   // Too short
            { width: 720, height: 1280, fps: 30, duration: 90 },   // Too long
            { width: 720, height: 1280, fps: 30, duration: -30 },  // Negative
            { width: 720, height: 1280, fps: 30, duration: 0 }     // Zero
        ]
    }
};

// File data generators
export const generateFile = {
    // Generate a video file of specified size (in bytes)
    ofSize: (bytes) => new File(
        [new ArrayBuffer(bytes)],
        `video-${bytes}.mp4`,
        { type: 'video/mp4' }
    ),

    // Generate files of various sizes for testing
    sizes: {
        tiny: () => generateFile.ofSize(1024),                    // 1KB
        small: () => generateFile.ofSize(1024 * 1024),            // 1MB
        medium: () => generateFile.ofSize(10 * 1024 * 1024),      // 10MB
        large: () => generateFile.ofSize(50 * 1024 * 1024),       // 50MB
        tooLarge: () => generateFile.ofSize(101 * 1024 * 1024)    // 101MB (over limit)
    },

    // Generate files with different formats
    formats: {
        mp4: () => new File([new ArrayBuffer(1024)], 'video.mp4', { type: 'video/mp4' }),
        mov: () => new File([new ArrayBuffer(1024)], 'video.mov', { type: 'video/quicktime' }),
        avi: () => new File([new ArrayBuffer(1024)], 'video.avi', { type: 'video/x-msvideo' }),
        invalid: () => new File([new ArrayBuffer(1024)], 'document.pdf', { type: 'application/pdf' })
    },

    // Generate corrupted or malformed files
    corrupt: {
        emptyFile: () => new File([], 'empty.mp4', { type: 'video/mp4' }),
        wrongContent: () => new File([new TextEncoder().encode('Not a video file')], 'fake.mp4', { type: 'video/mp4' }),
        missingType: () => new File([new ArrayBuffer(1024)], 'unknown.mp4', { type: '' })
    }
}; 