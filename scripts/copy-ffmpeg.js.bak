const fs = require('fs')
const path = require('path')

const ffmpegSource = path.join(
  __dirname,
  '../node_modules/@ffmpeg/core/dist'
)

const ffmpegDest = path.join(
  __dirname,
  '../public'
)

// Create destination directory if it doesn't exist
if (!fs.existsSync(ffmpegDest)) {
  fs.mkdirSync(ffmpegDest, { recursive: true })
}

// Copy FFmpeg files
;['ffmpeg-core.js', 'ffmpeg-core.wasm'].forEach(file => {
  try {
    fs.copyFileSync(
      path.join(ffmpegSource, file),
      path.join(ffmpegDest, file)
    )
    console.log(`Copied ${file} successfully`)
  } catch (error) {
    console.error(`Error copying ${file}:`, error)
    process.exit(1)
  }
})

console.log('FFmpeg files copied successfully') 