import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

/**
 * Video processing utility for client-side video compression and thumbnail generation
 * @class VideoProcessor
 */
class VideoProcessor {
  constructor() {
    // Only initialize FFmpeg in browser environment
    if (typeof window !== 'undefined') {
      this.ffmpeg = new FFmpeg()
    }
    this.loaded = false
  }

  /**
   * Loads FFmpeg WASM in browser environment
   * @returns {Promise<void>}
   * @throws {Error} If FFmpeg fails to initialize
   */
  async load() {
    if (this.loaded || typeof window === 'undefined') return

    try {
      // Load FFmpeg with CORS headers
      await this.ffmpeg.load({
        coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
        workerURL: await toBlobURL('/ffmpeg/ffmpeg-worker.js', 'text/javascript')
      })

      this.loaded = true
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      throw new Error('Failed to initialize video processor')
    }
  }

  /**
   * Compresses video file to target size while maintaining quality
   * @param {File} file - Original video file
   * @param {Object} options - Compression options
   * @param {number} [options.maxSize=100MB] - Target file size in bytes
   * @param {string} [options.targetBitrate='2M'] - Target bitrate
   * @param {number} [options.maxWidth=720] - Maximum width
   * @param {number} [options.maxHeight=1280] - Maximum height
   * @param {Function} [options.onProgress] - Progress callback
   * @returns {Promise<File>} Compressed video file
   */
  async compress(file, options = {}) {
    await this.load()

    const {
      maxSize = 100 * 1024 * 1024, // 100MB
      targetBitrate = '2M',
      maxWidth = 720,
      maxHeight = 1280,
      onProgress
    } = options

    // If file is already small enough, return as is
    if (file.size <= maxSize) {
      return file
    }

    try {
      const inputName = 'input.mp4'
      const outputName = 'output.mp4'

      // Write input file to memory
      await this.ffmpeg.writeFile(inputName, await fetchFile(file))

      // Set up progress handling
      this.ffmpeg.on('progress', ({ progress, time }) => {
        onProgress?.(Math.min(progress * 100, 100))
      })

      // Process video
      await this.ffmpeg.exec([
        '-i', inputName,
        '-c:v', 'libx264', // Video codec
        '-preset', 'medium', // Compression preset
        '-crf', '23', // Quality (lower = better, 18-28 is good)
        '-c:a', 'aac', // Audio codec
        '-b:a', '128k', // Audio bitrate
        '-movflags', '+faststart', // Enable streaming
        '-vf', `scale=min(${maxWidth}\\,iw):min(${maxHeight}\\,ih):force_original_aspect_ratio=decrease`,
        '-y', // Overwrite output
        outputName
      ])

      // Read the output file
      const data = await this.ffmpeg.readFile(outputName)
      const blob = new Blob([data], { type: 'video/mp4' })
      
      // Clean up
      await this.ffmpeg.deleteFile(inputName)
      await this.ffmpeg.deleteFile(outputName)

      return new File([blob], file.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4', {
        type: 'video/mp4'
      })
    } catch (error) {
      console.error('Video compression failed:', error)
      throw new Error('Failed to compress video')
    }
  }

  /**
   * Generates video thumbnail at specified timestamp
   * @param {File} file - Video file
   * @param {Object} options - Thumbnail options
   * @param {number} [options.time=0] - Timestamp in seconds
   * @param {number} [options.width=720] - Output width
   * @param {number} [options.height=1280] - Output height
   * @param {number} [options.quality=90] - JPEG quality (1-100)
   * @returns {Promise<Blob>} Thumbnail as JPEG blob
   */
  async generateThumbnail(file, options = {}) {
    await this.load()

    const {
      time = 0,
      width = 720,
      height = 1280,
      quality = 90
    } = options

    try {
      const inputName = 'input.mp4'
      const outputName = 'thumbnail.jpg'

      await this.ffmpeg.writeFile(inputName, await fetchFile(file))

      // Extract frame and generate thumbnail
      await this.ffmpeg.exec([
        '-i', inputName,
        '-ss', time.toString(),
        '-frames:v', '1',
        '-vf', `scale=min(${width}\\,iw):min(${height}\\,ih):force_original_aspect_ratio=decrease`,
        '-q:v', Math.round((100 - quality) / 10).toString(), // Convert quality to FFmpeg scale
        '-f', 'image2',
        '-y',
        outputName
      ])

      const data = await this.ffmpeg.readFile(outputName)
      const blob = new Blob([data], { type: 'image/jpeg' })

      // Clean up
      await this.ffmpeg.deleteFile(inputName)
      await this.ffmpeg.deleteFile(outputName)

      return blob
    } catch (error) {
      console.error('Thumbnail generation failed:', error)
      throw new Error('Failed to generate thumbnail')
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