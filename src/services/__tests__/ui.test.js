import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { videoService } from '../video';
import { createVideoFile } from '../../../test/helpers/video';
import { useNavigation } from '@react-navigation/native';
import { View, Text } from 'react-native';
import VideoPlayer from '../../components/VideoPlayer';
import VideoGrid from '../../components/VideoGrid';
import VideoImport from '../../components/VideoImport';

// Timing constants for UX requirements
const UX_TIMING = {
  LOAD_TIME: 2000,      // Max time to load UI components
  RESPONSE_TIME: 100,   // Max time for UI to respond to user input
  ANIMATION_TIME: 250,  // Max time for animations to complete
};

describe('User Experience Tests', () => {
  const navigation = useNavigation();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('1. Video Import Experience', () => {
    it('shows loading state during video import', async () => {
      const { getByTestId, queryByTestId } = render(<VideoImport />);
      
      // Start import
      const file = createVideoFile.portrait();
      await act(async () => {
        fireEvent.press(getByTestId('import-button'));
      });

      // Verify loading indicator appears
      expect(getByTestId('loading-indicator')).toBeTruthy();
      
      // Complete import
      await act(async () => {
        await videoService.importVideo(file.uri);
      });

      // Verify loading indicator disappears
      expect(queryByTestId('loading-indicator')).toBeNull();
    });

    it('provides clear feedback for invalid files', async () => {
      const { getByTestId, findByText } = render(<VideoImport />);
      
      // Try importing invalid file
      const file = createVideoFile.landscape();
      await act(async () => {
        fireEvent.press(getByTestId('import-button'));
      });

      // Verify error message
      const errorMessage = await findByText(/portrait mode/i);
      expect(errorMessage).toBeTruthy();
    });

    it('shows progress during long imports', async () => {
      const { getByTestId, getByText } = render(<VideoImport />);
      
      // Start import of large file
      const file = createVideoFile.portrait();
      let progress = 0;
      
      await act(async () => {
        fireEvent.press(getByTestId('import-button'));
        progress = 0.5; // Simulate 50% progress
      });

      // Verify progress indicator
      expect(getByTestId('progress-indicator')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
    });
  });

  describe('2. Video Playback Experience', () => {
    it('starts playback within 3 seconds', async () => {
      const start = Date.now();
      const { getByTestId } = render(
        <VideoPlayer videoId="test-video" />
      );

      await waitFor(() => {
        expect(getByTestId('video-playing')).toBeTruthy();
      });

      expect(Date.now() - start).toBeLessThan(3000);
    });

    it('maintains smooth playback', async () => {
      const { getByTestId } = render(
        <VideoPlayer videoId="test-video" />
      );

      // Monitor frame drops
      const frameDrops = [];
      const player = getByTestId('video-player');

      // Simulate 5 seconds of playback
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          frameDrops.push(player.props.onFrameDrop?.() || 0);
          jest.advanceTimersByTime(1000);
        }
      });

      // Verify no significant frame drops
      expect(Math.max(...frameDrops)).toBeLessThan(5);
    });

    it('responds to user controls within 100ms', async () => {
      const { getByTestId } = render(
        <VideoPlayer videoId="test-video" />
      );

      const start = Date.now();
      await act(async () => {
        fireEvent.press(getByTestId('play-pause-button'));
      });

      expect(Date.now() - start).toBeLessThan(UX_TIMING.RESPONSE_TIME);
    });
  });

  describe('3. Navigation Experience', () => {
    it('provides smooth transitions between screens', async () => {
      const { getByTestId } = render(<VideoGrid />);
      
      const start = Date.now();
      await act(async () => {
        fireEvent.press(getByTestId('video-thumbnail'));
      });

      // Verify navigation occurred quickly
      expect(Date.now() - start).toBeLessThan(UX_TIMING.ANIMATION_TIME);
      expect(navigation.navigate).toHaveBeenCalledWith(
        'Player',
        expect.any(Object)
      );
    });

    it('preserves grid scroll position on return', async () => {
      const { getByTestId } = render(<VideoGrid />);
      const scrollView = getByTestId('video-grid-scroll');
      
      // Scroll down
      await act(async () => {
        fireEvent.scroll(scrollView, {
          nativeEvent: {
            contentOffset: { y: 200 },
          },
        });
      });

      // Navigate away and back
      await act(async () => {
        navigation.navigate('Player', { videoId: 'test-video' });
        navigation.goBack();
      });

      // Verify scroll position maintained
      expect(scrollView.props.contentOffset.y).toBe(200);
    });
  });

  describe('4. Error Recovery Experience', () => {
    it('shows retry button for failed imports', async () => {
      const { getByTestId, findByText } = render(<VideoImport />);
      
      // Simulate failed import
      await act(async () => {
        fireEvent.press(getByTestId('import-button'));
        // Force failure
        jest.spyOn(videoService, 'importVideo')
          .mockRejectedValueOnce(new Error('Import failed'));
      });

      // Verify retry button appears
      const retryButton = await findByText(/try again/i);
      expect(retryButton).toBeTruthy();
    });

    it('recovers gracefully from playback errors', async () => {
      const { getByTestId, findByText } = render(
        <VideoPlayer videoId="test-video" />
      );

      // Simulate playback error
      await act(async () => {
        const player = getByTestId('video-player');
        player.props.onError({ nativeEvent: { error: 'Playback failed' } });
      });

      // Verify error message and retry option
      const errorMessage = await findByText(/playback error/i);
      const retryButton = await findByText(/retry/i);
      
      expect(errorMessage).toBeTruthy();
      expect(retryButton).toBeTruthy();
    });
  });

  describe('5. Performance Experience', () => {
    it('loads video grid within 2 seconds', async () => {
      const start = Date.now();
      const { getByTestId } = render(<VideoGrid />);
      
      await waitFor(() => {
        expect(getByTestId('video-grid')).toBeTruthy();
      });

      expect(Date.now() - start).toBeLessThan(UX_TIMING.LOAD_TIME);
    });

    it('maintains responsive UI during video processing', async () => {
      const { getByTestId } = render(<VideoImport />);
      
      // Start heavy processing
      await act(async () => {
        fireEvent.press(getByTestId('import-button'));
      });

      // Verify UI remains responsive
      const start = Date.now();
      await act(async () => {
        fireEvent.press(getByTestId('cancel-button'));
      });

      expect(Date.now() - start).toBeLessThan(UX_TIMING.RESPONSE_TIME);
    });
  });
}); 