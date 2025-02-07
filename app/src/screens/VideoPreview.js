import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import { useNavigation, useRoute } from '@react-navigation/native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const VideoPreview = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { videoUri } = route.params || {};

  useEffect(() => {
    if (!videoUri) {
      setError('No video selected');
      return;
    }

    // Reset state on mount
    setIsLoading(true);
    setError(null);

    // Auto-cleanup
    return () => {
      if (videoRef.current) {
        videoRef.current.seek(0);
      }
    };
  }, [videoUri]);

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = (err) => {
    console.error('Video preview error:', err);
    setError('Unable to play video');
    setIsLoading(false);
  };

  if (!videoUri) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: videoUri }}
        style={styles.video}
        resizeMode="cover"
        onLoad={handleLoad}
        onError={handleError}
        repeat={true}
        paused={false}
        controls={true}
        // Performance optimizations
        maxBitRate={2 * 1024 * 1024} // 2 Mbps max
        bufferConfig={{
          minBufferMs: 1000,
          maxBufferMs: 5000,
          bufferForPlaybackMs: 1000,
          bufferForPlaybackAfterRebufferMs: 2000
        }}
        // Android specific
        {...Platform.select({
          android: {
            streamType: 'STREAM_SYSTEM',
            useTextureView: true,
            hideShutterView: true
          }
        })}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});

export default VideoPreview;
 