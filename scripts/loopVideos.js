const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const PROCESSED_DIR = path.join(__dirname, '../src/assets/demo/processed');
const LOOP_DIR = path.join(__dirname, '../src/assets/demo/loops');

// Videos that need extending
const VIDEOS_TO_EXTEND = {
  'birds_demo.mp4': {
    currentLength: 10.4,
    targetLength: 17,
    loopStrategy: {
      // Extract middle segment for birds in flight
      extractStart: 3, // Start after initial scene
      extractDuration: 2, // 2-second loop segment
      repeats: 4, // Increased from 3 to 4 repeats to reach >15s
      crossfade: 0.5 // Half-second crossfade
    }
  },
  'forest_demo.mp4': {
    currentLength: 12.1,
    targetLength: 16,
    loopStrategy: {
      // Extract end segment for forest canopy
      extractStart: 8, // Use later part of video
      extractDuration: 2, // 2-second loop segment
      repeats: 3, // Increased from 2 to 3 repeats to reach >15s
      crossfade: 0.5 // Half-second crossfade
    }
  }
};

async function setupDirectories() {
  if (!fs.existsSync(LOOP_DIR)) {
    fs.mkdirSync(LOOP_DIR, { recursive: true });
  }
}

async function extractLoopSegment(videoPath, outputPath, start, duration) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(start)
      .duration(duration)
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

async function createLoopedVideo(inputPath, outputPath, config) {
  const { extractStart, extractDuration, repeats } = config;
  const loopSegmentPath = path.join(LOOP_DIR, `loop_${path.basename(inputPath)}`);
  const concatFilePath = path.join(LOOP_DIR, 'concat.txt');

  try {
    // Extract loop segment
    console.log('Extracting loop segment...');
    await extractLoopSegment(inputPath, loopSegmentPath, extractStart, extractDuration);

    // Create initial segment
    const initialSegmentPath = path.join(LOOP_DIR, `initial_${path.basename(inputPath)}`);
    await extractLoopSegment(inputPath, initialSegmentPath, 0, extractStart);

    // Create end segment
    const endSegmentPath = path.join(LOOP_DIR, `end_${path.basename(inputPath)}`);
    const inputDuration = await getVideoDuration(inputPath);
    const endDuration = inputDuration - (extractStart + extractDuration);
    if (endDuration > 0) {
      await extractLoopSegment(inputPath, endSegmentPath, extractStart + extractDuration, endDuration);
    }

    // Create concat file with simple format
    const concatContent = [
      `file '${initialSegmentPath}'`,
      ...Array(repeats).fill(`file '${loopSegmentPath}'`),
      endDuration > 0 ? `file '${endSegmentPath}'` : ''
    ].filter(Boolean).join('\n');

    fs.writeFileSync(concatFilePath, concatContent);

    // Build ffmpeg command
    const command = [
      'ffmpeg',
      '-f', 'concat',
      '-safe', '0',
      '-i', `"${concatFilePath}"`,
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '23',
      '-y',
      `"${outputPath}"`
    ].join(' ');

    // Execute command
    console.log('Creating looped video...');
    await exec(command);

    // Clean up temporary files
    fs.unlinkSync(loopSegmentPath);
    fs.unlinkSync(initialSegmentPath);
    if (endDuration > 0) {
      fs.unlinkSync(endSegmentPath);
    }
    fs.unlinkSync(concatFilePath);

    // Verify output duration
    const { stdout } = await exec(`ffprobe -v error -select_streams v:0 -show_entries stream=duration -of json "${outputPath}"`);
    const info = JSON.parse(stdout);
    console.log(`Final duration: ${info.streams[0].duration}s`);

  } catch (error) {
    console.error('Failed to create looped video:', error);
    throw error;
  }
}

// Helper function to get video duration
async function getVideoDuration(videoPath) {
  const { stdout } = await exec(`ffprobe -v error -select_streams v:0 -show_entries stream=duration -of json "${videoPath}"`);
  const info = JSON.parse(stdout);
  return parseFloat(info.streams[0].duration);
}

async function main() {
  try {
    console.log('Starting video loop extension...\n');

    // Setup directories
    await setupDirectories();

    // Process each video
    for (const [filename, config] of Object.entries(VIDEOS_TO_EXTEND)) {
      console.log(`\nProcessing ${filename}...`);
      
      const inputPath = path.join(PROCESSED_DIR, filename);
      const outputPath = path.join(PROCESSED_DIR, `extended_${filename}`);

      if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input video not found: ${filename}`);
        continue;
      }

      await createLoopedVideo(inputPath, outputPath, config.loopStrategy);
      
      // Replace original with extended version if successful
      fs.renameSync(outputPath, inputPath);
      console.log(`✅ Successfully extended: ${filename}`);
    }

    console.log('\nLoop extension complete! Please verify the videos.');

  } catch (error) {
    console.error('Processing failed:', error);
  }
}

main().catch(console.error); 