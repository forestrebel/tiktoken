import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Video from 'react-native-video';
import { videoService } from '../services';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

/**
 * Full-screen vertical video playback screen
 * @param {Object} props Navigation props
 */
export default function ViewScreen({ route }) {
  const { videoId } = route.params;
  const [video, setVideo] = useState(null);

  useEffect(() => {
    const loadVideo = async () => {
      const result = await videoService.getVideo(videoId);
      if (result.status === 'success') {
        setVideo(result.data);
      }
    };
    loadVideo();
  }, [videoId]);

  if (!video) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: videoService.getVideoPath(video.filename) }}
        style={styles.video}
        resizeMode="contain"
        repeat={true}
        controls={true}
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
    height: SCREEN_HEIGHT,
  },
  loadingText: {
    color: '#fff',
  },
}); 