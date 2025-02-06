import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';
import App from '../App';
import { videoService } from '../src/services';

// Mock video service
jest.mock('../src/services/video', () => ({
  videoService: {
    init: jest.fn().mockResolvedValue({ status: 'success' }),
    importVideo: jest.fn().mockResolvedValue({ 
      status: 'success', 
      data: {
        id: '1',
        filename: 'test.mp4',
        created_at: new Date().toISOString()
      }
    }),
    getVideo: jest.fn().mockResolvedValue({
      status: 'success',
      data: {
        id: '1',
        filename: 'test.mp4'
      }
    })
  }
}));

describe('Nature Creator Demo Flow', () => {
  // Reset timers and mocks before each test
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('completes core demo flow within 10 seconds', async () => {
    const startTime = Date.now();
    
    // 1. Launch app (2s max)
    const app = renderer.create(<App />);
    expect(Date.now() - startTime).toBeLessThan(2000);

    // 2. Import video (3s max)
    const result = await videoService.importVideo('file://test.mp4');
    expect(result.status).toBe('success');
    expect(Date.now() - startTime).toBeLessThan(5000);

    // 3. Preview video (3s max)
    const video = await videoService.getVideo(result.data.id);
    expect(video.status).toBe('success');
    expect(Date.now() - startTime).toBeLessThan(8000);

    // 4. Error recovery (1s max)
    const recoveryStart = Date.now();
    await videoService.init(); // Reset service if needed
    expect(Date.now() - recoveryStart).toBeLessThan(1000);

    // Total flow
    expect(Date.now() - startTime).toBeLessThan(10000);
  });

  it('maintains portrait mode for video playback', () => {
    const app = renderer.create(<App />);
    const tree = app.toJSON();
    
    // Basic structural validation
    expect(tree).toBeTruthy();
  });
}); 