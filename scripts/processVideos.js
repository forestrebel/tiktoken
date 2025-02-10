const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const DEMO_DIR = path.join(__dirname, '../src/assets/demo');
const PROCESSED_DIR = path.join(DEMO_DIR, 'processed');
const BACKUP_DIR = path.join(DEMO_DIR, 'backup');

// Video processing configurations
const TRANSCODE_CONFIG = {
  codec: 'libx264',
  preset: 'slow', // High quality
  crf: 23, // Good balance of quality/size
  profile: 'high',
  level: '4.0',
  pixFmt: 'yuv420p',
  audioBitrate: '128k',
  audioCodec: 'aac',
  audioChannels: 2
};

// Videos that need fixing
const VIDEOS_TO_FIX = {
  // AV1 to H.264 conversion needed
  'video_2025-02-05_20-14-03.mp4': {
    issues: ['codec', 'duration'],
    targetDuration: 20, // Aim for middle of range if extending
    newName: 'birds_demo.mp4'
  },
  'video_2025-02-05_20-14-27.mp4': {
    issues: ['codec'],
    newName: 'flowers_demo.mp4'
  },
  'video_2025-02-05_20-14-38.mp4': {
    issues: ['codec', 'duration'],
    targetDuration: 30,
    trimStart: 0, // Start from beginning
    newName: 'upload_demo.mp4'
  },
  // Low resolution and duration fix needed
  'video_2025-02-05_20-14-21.mp4': {
    issues: ['resolution', 'duration'],
    targetDuration: 20,
    newName: 'forest_demo.mp4'
  }
};

async function setupDirectories() {
  // Create processed and backup directories if they don't exist
  for (const dir of [PROCESSED_DIR, BACKUP_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

async function backupVideo(filename) {
  const sourcePath = path.join(DEMO_DIR, filename);
  const backupPath = path.join(BACKUP_DIR, filename);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, backupPath);
    console.log(`✅ Backed up: ${filename}`);
  }
}

async function transcodeVideo(inputPath, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .outputOptions([
        `-c:v ${TRANSCODE_CONFIG.codec}`,
        `-preset ${TRANSCODE_CONFIG.preset}`,
        `-crf ${TRANSCODE_CONFIG.crf}`,
        `-profile:v ${TRANSCODE_CONFIG.profile}`,
        `-level ${TRANSCODE_CONFIG.level}`,
        `-pix_fmt ${TRANSCODE_CONFIG.pixFmt}`,
        `-c:a ${TRANSCODE_CONFIG.audioCodec}`,
        `-b:a ${TRANSCODE_CONFIG.audioBitrate}`,
        `-ac ${TRANSCODE_CONFIG.audioChannels}`
      ]);

    // Add duration limit if specified
    if (options.duration) {
      command = command.duration(options.duration);
    }

    // Add trim start if specified
    if (options.trimStart) {
      command = command.seekInput(options.trimStart);
    }

    // Add scaling if needed
    if (options.scale) {
      command = command.size('720x1280');
    }

    command
      .on('progress', progress => {
        process.stdout.write(`\rProcessing: ${Math.floor(progress.percent)}%`);
      })
      .on('end', () => {
        process.stdout.write('\n');
        resolve();
      })
      .on('error', reject)
      .save(outputPath);
  });
}

async function processVideo(filename, config) {
  try {
    console.log(`\nProcessing ${filename}...`);
    
    const inputPath = path.join(DEMO_DIR, filename);
    const outputPath = path.join(PROCESSED_DIR, config.newName);
    
    // Get video info
    const { stdout } = await exec(`ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,duration -of json "${inputPath}"`);
    const info = JSON.parse(stdout);
    const stream = info.streams[0];

    // Determine what processing is needed
    const needsTranscode = config.issues.includes('codec') && stream.codec_name === 'av1';
    const needsResize = config.issues.includes('resolution') && (stream.width < 720 || stream.height < 1280);
    const needsTrim = config.issues.includes('duration') && config.targetDuration;

    // Process video
    await transcodeVideo(inputPath, outputPath, {
      duration: needsTrim ? config.targetDuration : undefined,
      trimStart: config.trimStart,
      scale: needsResize
    });

    console.log(`✅ Processed: ${filename} -> ${config.newName}`);
    
    // Verify the processed video
    const { stdout: newInfo } = await exec(`ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,duration -of json "${outputPath}"`);
    const processedInfo = JSON.parse(newInfo);
    console.log('Processed video info:', {
      codec: processedInfo.streams[0].codec_name,
      resolution: `${processedInfo.streams[0].width}x${processedInfo.streams[0].height}`,
      duration: processedInfo.streams[0].duration
    });

  } catch (error) {
    console.error(`❌ Failed to process ${filename}:`, error.message);
  }
}

async function main() {
  try {
    console.log('Starting video processing...\n');

    // Setup directories
    await setupDirectories();

    // Backup original videos
    console.log('Backing up original videos...');
    for (const filename of Object.keys(VIDEOS_TO_FIX)) {
      await backupVideo(filename);
    }

    // Process videos
    console.log('\nProcessing videos...');
    for (const [filename, config] of Object.entries(VIDEOS_TO_FIX)) {
      await processVideo(filename, config);
    }

    console.log('\nProcessing complete! Please verify the processed videos in:');
    console.log(PROCESSED_DIR);

  } catch (error) {
    console.error('Processing failed:', error);
  }
}

main().catch(console.error); 