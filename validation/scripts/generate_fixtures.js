#!/usr/bin/env node

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

const FIXTURES_DIR = path.join(__dirname, '../tests/fixtures');

// Ensure fixtures directory exists
const ensureDir = async () => {
  try {
    await fs.access(FIXTURES_DIR);
  } catch {
    await fs.mkdir(FIXTURES_DIR, { recursive: true });
  }
};

// Generate a test video with specified parameters
const generateVideo = (outputPath, options) => {
  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input('testsrc=duration=5:size=720x1280:rate=30')
      .inputFormat('lavfi')
      .outputOptions([
        `-vf scale=${options.width}:${options.height}`,
        `-r ${options.fps}`,
        `-t ${options.duration}`,
        `-color_primaries bt709`,
        `-color_trc bt709`,
        `-colorspace bt709`,
        `-color_range tv`,
        `-pix_fmt yuv420p`
      ])
      .output(outputPath);

    if (options.bitrate) {
      command.outputOptions(`-b:v ${options.bitrate}`);
    }

    command
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
};

// Generate all test fixtures
const generateFixtures = async () => {
  await ensureDir();

  const fixtures = [
    {
      name: 'valid.mp4',
      options: {
        width: 720,
        height: 1280,
        fps: 30,
        duration: 5,
        bitrate: '1M'
      }
    },
    {
      name: 'wrong_res.mp4',
      options: {
        width: 1080,
        height: 1920,
        fps: 30,
        duration: 5,
        bitrate: '2M'
      }
    },
    {
      name: 'invalid_multiple.mp4',
      options: {
        width: 1080,
        height: 1920,
        fps: 60,
        duration: 65,
        bitrate: '4M'
      }
    }
  ];

  for (const fixture of fixtures) {
    const outputPath = path.join(FIXTURES_DIR, fixture.name);
    console.log(`Generating ${fixture.name}...`);
    await generateVideo(outputPath, fixture.options);
  }

  console.log('All fixtures generated successfully!');
};

// Run if called directly
if (require.main === module) {
  generateFixtures().catch(console.error);
}

module.exports = { generateVideo, generateFixtures };
