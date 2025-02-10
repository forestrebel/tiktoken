import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'
import { VideoErrorHandler, ErrorTypes } from './errorHandler'

// Supported video formats
export const SUPPORTED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-m4v']

// Error types
export const VideoError = {
  INVALID_FORMAT: 'INVALID_FORMAT',
  SIZE_EXCEEDED: 'SIZE_EXCEEDED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_ORIENTATION: 'INVALID_ORIENTATION',
  METADATA_ERROR: 'METADATA_ERROR'
}

// Video constants
export const VIDEO_CONSTANTS = {
  MAX_SIZE: 100 * 1024 * 1024, // 100MB
  DEFAULT_DIMENSIONS: {
    maxWidth: 720,
    maxHeight: 1280
  },
  ASPECT_RATIO: {
    PORTRAIT: 16 / 9, // 1.77778 (inverted for portrait)
    LANDSCAPE: 9 / 16, // 0.5625
    TOLERANCE: 0.1 // 10% tolerance for aspect ratio
  }
};

/**
 * Video processing utility for client-side video compression and thumbnail generation
 * @class VideoProcessor
 */
class VideoProcessor {
  constructor(options = {}) {
    if (typeof window !== 'undefined') {
      this.ffmpeg = createFFmpeg({
        log: true,
        mainName: 'main',
        corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
        wasmPath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm'
      })
    }
    this.loaded = false
    
    // Initialize error handler
    this.errorHandler = new VideoErrorHandler(options)
  }

  /**
   * Extracts video metadata using FFmpeg
   * @param {File} file - Video file to analyze
   * @returns {Promise<Object>} Video metadata
   * @throws {Error} If metadata extraction fails
   */
  async getVideoMetadata(file) {
    try {
      if (!file || !(file instanceof File)) {
        throw new Error(`${VideoError.INVALID_INPUT}: Invalid video file`)
      }

      await this.load()

      // Use unique file names to avoid conflicts
      const timestamp = Date.now()
      const inputName = `input_${timestamp}.mp4`
      const metadataName = `metadata_${timestamp}.json`

      try {
        // Write input file
        const data = await fetchFile(file)
        await this.ffmpeg.FS('writeFile', inputName, data)

        // Extract metadata
        await this.ffmpeg.run(
          '-i', inputName,
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          metadataName
        )

        // Read metadata
        const metadataRaw = await this.ffmpeg.FS('readFile', metadataName)
        const metadata = JSON.parse(new TextDecoder().decode(metadataRaw))

        return metadata
      } finally {
        // Clean up files
        await this.ffmpeg.FS('unlink', inputName).catch(() => {})
        await this.ffmpeg.FS('unlink', metadataName).catch(() => {})
      }
    } catch (error) {
      console.error('Metadata extraction failed:', error)
      throw new Error(`${VideoError.METADATA_ERROR}: Failed to extract video metadata`)
    }
  }

  /**
   * Validates video orientation and dimensions
   * @param {File} file - Video file to validate
   * @returns {Promise<Object>} Validation results
   * @throws {Error} If validation fails
   */
  async validatePortraitMode(file) {
    try {
      if (!file || file.size === 0) {
        throw new Error(`${VideoError.INVALID_INPUT}: Invalid video file`);
      }

      const metadata = await this.getVideoMetadata(file);
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      
      if (!videoStream) {
        throw new Error(`${VideoError.INVALID_INPUT}: No video stream found`);
      }

      const { width, height } = videoStream;
      const aspectRatio = height / width;

      // Check if video is in portrait orientation
      if (width > height) {
        throw new Error(`${VideoError.INVALID_ORIENTATION}: Video must be in portrait orientation`);
      }

      // Calculate aspect ratio deviation from 9:16
      const targetRatio = VIDEO_CONSTANTS.ASPECT_RATIO.PORTRAIT;
      const ratioDifference = Math.abs(aspectRatio - targetRatio);
      const isWithinTolerance = ratioDifference <= VIDEO_CONSTANTS.ASPECT_RATIO.TOLERANCE;

      return {
        isValid: true,
        dimensions: { width, height },
        aspectRatio,
        isStandardRatio: isWithinTolerance,
        metadata: {
          duration: videoStream.duration,
          bitrate: videoStream.bit_rate,
          codec: videoStream.codec_name
        }
      };
    } catch (error) {
      console.error('Portrait validation failed:', error);
      if (error.message.includes(VideoError)) {
        throw error;
      }
      throw new Error(`${VideoError.PROCESSING_FAILED}: Failed to validate video orientation`);
    }
  }

  /**
   * Validates video file format and size
   * @param {File} file - Video file to validate
   * @param {number} maxSize - Maximum allowed size in bytes
   * @throws {Error} If validation fails
   */
  validateVideo(file, maxSize) {
    if (!file || !(file instanceof File)) {
      throw new Error(`${VideoError.INVALID_INPUT}: Invalid file input`)
    }

    if (!SUPPORTED_FORMATS.includes(file.type)) {
      throw new Error(`${VideoError.INVALID_FORMAT}: Unsupported video format. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`)
    }

    if (maxSize && file.size > maxSize) {
      throw new Error(`${VideoError.SIZE_EXCEEDED}: File size exceeds ${maxSize / (1024 * 1024)}MB limit`)
    }
  }

  /**
   * Loads FFmpeg WASM in browser environment
   * @returns {Promise<void>}
   * @throws {Error} If FFmpeg fails to initialize
   */
  async load() {
    if (this.loaded || typeof window === 'undefined') return

    try {
      await this.ffmpeg.load()
      
      // Test file system
      try {
        const testData = new Uint8Array([1, 2, 3])
        await this.ffmpeg.FS('writeFile', 'test.bin', testData)
        const readData = await this.ffmpeg.FS('readFile', 'test.bin')
        await this.ffmpeg.FS('unlink', 'test.bin')

        if (!readData || readData.length !== testData.length) {
          throw new Error('File system verification failed')
        }
      } catch (fsError) {
        console.error('File system test failed:', fsError)
        throw new Error('File system initialization failed')
      }

      this.loaded = true
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      throw new Error(`${VideoError.INITIALIZATION_FAILED}: Failed to initialize video processor`)
    }
  }

  /**
   * Enhanced compress method with error handling
   */
  async compress(file, options = {}) {
    const compressWithRetry = async (retryOptions = {}) => {
      try {
        // Validate input
        this.validateVideo(file, options.maxSize);
        
        // Validate portrait mode if required
        if (options.enforcePortrait !== false) {
          await this.validatePortraitMode(file);
        }

        // If file is already small enough, return as is
        if (file.size <= (options.maxSize || VIDEO_CONSTANTS.MAX_SIZE)) {
          return file;
        }

        await this.load();

        const inputName = 'input.mp4';
        const outputName = 'output.mp4';

        // Write input file to memory
        await this.ffmpeg.FS('writeFile', inputName, await fetchFile(file));

        // Set up progress handling
        if (options.onProgress) {
          this.ffmpeg.on('progress', ({ progress, time }) => {
            options.onProgress(Math.min(progress * 100, 100));
          });
        }

        // Process video with portrait mode constraints
        const maxWidth = options.maxWidth || VIDEO_CONSTANTS.DEFAULT_DIMENSIONS.maxWidth;
        const maxHeight = options.maxHeight || VIDEO_CONSTANTS.DEFAULT_DIMENSIONS.maxHeight;

        // Adjust quality if needed
        const crf = retryOptions.reduceQuality ? '28' : '23';

        await this.ffmpeg.run(
          '-i', inputName,
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', crf,
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
          '-vf', `scale=min(${maxWidth}\\,iw):min(${maxHeight}\\,ih):force_original_aspect_ratio=decrease`,
          '-y',
          outputName
        );

        // Read the output file
        const data = await this.ffmpeg.FS('readFile', outputName);
        const blob = new Blob([data], { type: 'video/mp4' });
        
        // Clean up
        await this.ffmpeg.FS('unlink', inputName);
        await this.ffmpeg.FS('unlink', outputName);

        return new File([blob], file.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4', {
          type: 'video/mp4'
        });
      } catch (error) {
        throw error;
      }
    };

    try {
      return await compressWithRetry();
    } catch (error) {
      return await this.errorHandler.handleError(error, compressWithRetry);
    }
  }

  /**
   * Enhanced thumbnail generation with error handling
   */
  async generateThumbnail(file, options = {}) {
    const generateWithRetry = async (retryOptions = {}) => {
      try {
        await this.load();

        const {
          time = 0,
          width = 720,
          height = 1280,
          quality = retryOptions.reduceQuality ? 70 : 90
        } = options;

        const inputName = 'input.mp4';
        const outputName = 'thumbnail.jpg';

        await this.ffmpeg.FS('writeFile', inputName, await fetchFile(file));

        await this.ffmpeg.run(
          '-i', inputName,
          '-ss', time.toString(),
          '-frames:v', '1',
          '-vf', `scale=min(${width}\\,iw):min(${height}\\,ih):force_original_aspect_ratio=decrease`,
          '-q:v', Math.round((100 - quality) / 10).toString(),
          '-f', 'image2',
          '-y',
          outputName
        );

        const data = await this.ffmpeg.FS('readFile', outputName);
        const blob = new Blob([data], { type: 'image/jpeg' });

        await this.ffmpeg.FS('unlink', inputName);
        await this.ffmpeg.FS('unlink', outputName);

        return blob;
      } catch (error) {
        throw error;
      }
    };

    try {
      return await generateWithRetry();
    } catch (error) {
      return await this.errorHandler.handleError(error, generateWithRetry);
    }
  }

  /**
   * Cleans up FFmpeg instance
   */
  terminate() {
    if (this.loaded) {
      this.ffmpeg.terminate()
      this.loaded = false
    }
  }
}

// Export singleton instance
export const videoProcessor = new VideoProcessor() 