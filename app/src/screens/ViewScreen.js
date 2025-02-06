import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Video from 'react-native-video';
import { videoService } from '../services';

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
    ? require('../assets/demo1.mp4')  // This will be our demo video
    : { uri: videoService.getVideoPath(video.filename) };

  return (
    <View style={styles.container}>
      <Video
        source={source}
        style={styles.video}
        resizeMode="cover"
        repeat={true}
        controls={true}
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
  video: {
    width: SCREEN_WIDTH,
    height: VIDEO_HEIGHT,
    backgroundColor: '#000',
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