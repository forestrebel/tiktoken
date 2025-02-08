import React, { useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import VideoPlayer from '../components/VideoPlayer';

const SCREEN_WIDTH = Dimensions.get('window').width;
const VIDEO_HEIGHT = (SCREEN_WIDTH * 16) / 9;

export default function ViewScreen({ route }) {
  const { videoId } = route.params;
  const [error, setError] = useState(null);

  // Use the full filename as videoId
  const videoUri = `asset:/videos/${videoId}`;

  const handleError = (err) => {
    console.error('Video playback error:', err);
    setError(err.message || 'Failed to play video');
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoPlayer
        url={videoUri}
        onError={handleError}
        style={styles.video}
        resizeMode="contain"
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
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});
