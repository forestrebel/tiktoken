const { validateVideo, LIMITS } = require('../src/validate');
const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');

// Test paths
const FIXTURES = {
  VALID: path.join(__dirname, 'fixtures/valid.mp4'),
  LARGE: path.join(__dirname, 'fixtures/large.mp4'),
  BAD_RES: path.join(__dirname, 'fixtures/bad_res.mp4')
};

// Create test video
const makeVideo = (output, { size = '720x1280', duration = 5 } = {}) => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input('testsrc=duration=' + duration)
      .inputOptions(['-f lavfi'])
      .outputOptions([
        `-s ${size}`,
        '-r 30',
        '-c:v libx264',
        '-color_primaries bt709',
        '-color_trc bt709',
        '-colorspace bt709'
      ])
      .output(output)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
};

// Setup
beforeAll(async () => {
  await fs.mkdir(path.dirname(FIXTURES.VALID), { recursive: true });
  await Promise.all([
    makeVideo(FIXTURES.VALID),
    makeVideo(FIXTURES.LARGE, { duration: 30 }),
    makeVideo(FIXTURES.BAD_RES, { size: '640x480' })
  ]);
});

// Cleanup
afterAll(async () => {
  for (const file of Object.values(FIXTURES)) {
    await fs.unlink(file).catch(() => {});
  }
});

// Tests
describe('validateVideo', () => {
  test('accepts valid video', async () => {
    const result = await validateVideo(FIXTURES.VALID);
    expect(result.valid).toBe(true);
  });

  test('rejects large file', async () => {
    const result = await validateVideo(FIXTURES.LARGE);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('File too large');
  });

  test('rejects bad resolution', async () => {
    const result = await validateVideo(FIXTURES.BAD_RES);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Invalid resolution/);
  });

  test('handles missing file', async () => {
    const result = await validateVideo('nonexistent.mp4');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not found/);
  });

  test('validates color space', async () => {
    const result = await validateVideo(FIXTURES.VALID);
    expect(result.valid).toBe(true);
    expect(result.specs.colorSpace.toLowerCase()).toBe('bt709');
  });
});
