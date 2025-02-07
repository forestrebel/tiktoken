import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_WIDTH = Math.min(SCREEN_WIDTH - 40, 720); // Max width of 720px
const VIDEO_HEIGHT = (VIDEO_WIDTH * 16) / 9; // 9:16 aspect ratio

const VideoPreview = ({ videoUri, onUpload, onCancel }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const handleLoad = (meta) => {
    console.log('Video loaded:', meta);
    setDuration(meta.duration);
    setIsLoading(false);
    setError(null);
  };

  const handleProgress = ({ currentTime }) => {
    setCurrentTime(currentTime);
  };

  const handleEnd = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    videoRef.current?.seek(0);
  };

  const handleError = (error) => {
    console.error('Video preview error:', error);
    setError('Unable to play video');
    setIsLoading(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleUpload = () => {
    // Stop playback before upload
    setIsPlaying(false);
    onUpload?.();
  };

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.video}
          resizeMode="cover"
          onLoad={handleLoad}
          onProgress={handleProgress}
          onEnd={handleEnd}
          onError={handleError}
          paused={!isPlaying}
          repeat={false}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* Error Overlay */}
        {error && (
          <View style={styles.overlay}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Playback Controls */}
        {!isLoading && !error && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={togglePlayback}
            activeOpacity={0.8}
          >
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color="#fff"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View 
          style={[
            styles.progressBar,
            { width: `${(currentTime / duration) * 100}%` }
          ]}
        />
        <Text style={styles.timeText}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, styles.cancelText]}>
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.uploadButton]}
          onPress={handleUpload}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, styles.uploadText]}>
            Upload Video
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  videoContainer: {
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -24 },
      { translateY: -24 }
    ],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    width: VIDEO_WIDTH,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 2,
    backgroundColor: '#007AFF',
  },
  timeText: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f8f8f8',
  },
  cancelText: {
    color: '#666',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
  },
  uploadText: {
    color: '#fff',
  },
});

export default VideoPreview; 