import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

class VideoProcessor {
  constructor() {
    this.ffmpeg = new FFmpeg()
    this.loaded = false
  }

  async load() {
    if (this.loaded) return

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

  terminate() {
    if (this.loaded) {
      this.ffmpeg.terminate()
      this.loaded = false
    }
  }
}

// Export singleton instance
export const videoProcessor = new VideoProcessor() 