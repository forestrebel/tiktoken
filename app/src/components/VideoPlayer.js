import React, { useRef, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Video from 'react-native-video';

const VideoPlayer = ({ url, onError, onProgress }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const { width, height: screenHeight } = Dimensions.get('window');
  // Force portrait mode by using screen width as base
  const videoHeight = (width * 16) / 9; // 9:16 aspect ratio
  const isFullHeight = videoHeight > screenHeight;
  
  // If video would be taller than screen, use screen height as base
  const finalWidth = isFullHeight ? (screenHeight * 9) / 16 : width;
  const finalHeight = isFullHeight ? screenHeight : videoHeight;

  const handleProgress = (data) => {
    setCurrentTime(data.currentTime);
    if (onProgress) onProgress(data);
  };

  const handleError = (error) => {
    console.error('Video playback error:', error);
    if (onError) onError(error);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <View style={styles.container}>
      {url ? (
        <Video
          ref={videoRef}
          source={{ uri: url }}
          style={[
            styles.video,
            {
              width: finalWidth,
              height: finalHeight,
            },
          ]}
          resizeMode="cover"
          onError={handleError}
          onProgress={handleProgress}
          paused={!isPlaying}
          controls={true}
          onTouchEnd={togglePlayback}
          repeat={true}
        />
      ) : (
        <View 
          style={[
            styles.placeholder,
            {
              width: finalWidth,
              height: finalHeight,
            },
          ]} 
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    backgroundColor: '#000',
  },
  placeholder: {
    backgroundColor: '#1a1a1a',
  },
});

export default VideoPlayer; 