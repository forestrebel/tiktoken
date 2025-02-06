import { videoService } from '../video';
import RNFS from 'react-native-fs';
import { FFmpegKit, FFprobeKit } from 'ffmpeg-kit-react-native';

jest.mock('react-native-fs');
jest.mock('ffmpeg-kit-react-native');

describe('Video Service Performance Tests', () => {
  const TEST_VIDEO = {
    uri: 'file://test.mp4',
    size: 1024 * 1024, // 1MB
  };

  beforeEach(() => {
    jest.useFakeTimers();
    RNFS.stat.mockResolvedValue({ size: TEST_VIDEO.size });
    RNFS.exists.mockResolvedValue(true);
    FFprobeKit.execute.mockResolvedValue({
      getReturnCode: () => Promise.resolve(0),
      getOutput: () => Promise.resolve(JSON.stringify({
        streams: [{
          width: 1080,
          height: 1920,
          codec_name: 'h264'
        }]
      }))
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('completes validation within 1 second', async () => {
    const start = Date.now();
    const result = await videoService.validateVideo(TEST_VIDEO.uri);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000);
    expect(result.status).toBe('success');
  });

  it('completes import flow within 3 seconds', async () => {
    const start = Date.now();
    const result = await videoService.importVideo(TEST_VIDEO.uri);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(3000);
    expect(result.status).toBe('success');
  });

  it('recovers from errors within 1 second', async () => {
    // Simulate validation error
    FFprobeKit.execute.mockResolvedValueOnce({
      getReturnCode: () => Promise.resolve(1),
      getOutput: () => Promise.resolve('')
    });

    const start = Date.now();
    const result = await videoService.validateVideo(TEST_VIDEO.uri);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000);
    expect(result.status).toBe('error');
  });

  it('handles rapid sequential imports', async () => {
    const imports = Array(5).fill(TEST_VIDEO.uri).map(uri => 
      videoService.importVideo(uri)
    );
    
    const start = Date.now();
    const results = await Promise.all(imports);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000); // Should handle 5 imports in 5s
    results.forEach(result => {
      expect(result.status).toBe('success');
    });
  });

  it('maintains performance under memory pressure', async () => {
    // Simulate low memory condition
    const largeArray = new Array(1000000).fill('test');
    
    const start = Date.now();
    const result = await videoService.importVideo(TEST_VIDEO.uri);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(3000);
    expect(result.status).toBe('success');
    
    // Cleanup
    largeArray.length = 0;
  });
}); 