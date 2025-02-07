import { videoService } from '../../src/services/video';
import { createVideoFile } from '../../test/helpers/video';

describe('Video Service Performance Tests', () => {
  it('completes import flow within 3 seconds', async () => {
    const file = createVideoFile.portrait();
    const start = Date.now();
    
    const result = await videoService.importVideo(file);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(3000);
    expect(result.status).toBe('success');
    expect(result.data.id).toBeDefined();
  });

  it('recovers from errors within 1 second', async () => {
    const file = createVideoFile.invalid();
    const start = Date.now();
    
    const result = await videoService.importVideo(file);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000);
    expect(result.status).toBe('error');
    expect(result.recoverable).toBe(true);
  });

  it('handles rapid sequential imports', async () => {
    const files = Array(5).fill(null).map(() => createVideoFile.portrait());
    const start = Date.now();
    
    const results = await Promise.all(
      files.map(file => videoService.importVideo(file))
    );
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000); // Should handle 5 imports in 5s
    results.forEach(result => {
      expect(result.status).toBe('success');
      expect(result.data.id).toBeDefined();
    });
  });

  it('maintains performance under memory pressure', async () => {
    // Create memory pressure
    const largeArray = new Array(1000000).fill('test');
    
    const file = createVideoFile.portrait();
    const start = Date.now();
    
    const result = await videoService.importVideo(file);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(3000);
    expect(result.status).toBe('success');
    expect(result.data.id).toBeDefined();

    // Cleanup
    largeArray.length = 0;
  });
}); 