import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import VideoPlayer from '../components/VideoPlayer';
import { videoService } from '../services/video';

const SCREEN_WIDTH = Dimensions.get('window').width;
const VIDEO_HEIGHT = (SCREEN_WIDTH * 16) / 9; // Force 9:16 aspect ratio

/**
 * Full-screen vertical video playback screen
 * @param {Object} props Navigation props
 */
export default function ViewScreen({ route }) {
  const { videoId } = route.params;
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadVideo = async () => {
      try {
        // Check if this is a demo video
        if (videoId.startsWith('demo')) {
          const result = await videoService.getDemoVideo(videoId);
          if (result.status === 'success') {
            setVideo(result.data);
          } else {
            setError('Failed to load demo video');
          }
        } else {
          // Load regular video
          const result = await videoService.getVideo(videoId);
          if (result.status === 'success') {
            setVideo(result.data);
          } else {
            setError('Failed to load video');
          }
        }
      } catch (err) {
        console.error('Failed to load video:', err);
        setError('Failed to load video');
      }
    };
    loadVideo();
  }, [videoId]);

  const handleError = (err) => {
    console.error('Video playback error:', err);
    setError('Failed to play video');
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!video) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // For demo videos, use a bundled asset
  const source = video.id.startsWith('demo')
    ? require('../assets/demo/video_2025-02-05_20-14-03.mp4')  // Use an existing demo video
    : { uri: video.uri || videoService.getVideoPath(video.filename) };

  return (
    <View style={styles.container}>
      <VideoPlayer
        url={source.uri || source}
        onError={handleError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
  },
});
