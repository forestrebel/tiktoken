'use client'
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Text,
  Animated,
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatDuration } from '../utils/format';

const VideoPlayer = memo(({
  source,
  onClose,
  onError,
  onLoad,
  onProgress,
  onEnd,
  title
}) => {
  const [paused, setPaused] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const controlsAnim = useRef(new Animated.Value(1)).current;
  const controlsTimeout = useRef(null);

  const { width, height } = Dimensions.get('window');
  const videoHeight = width * (16/9); // Portrait mode aspect ratio

  useEffect(() => {
    StatusBar.setHidden(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    return () => {
      StatusBar.setHidden(false);
      clearTimeout(controlsTimeout.current);
    };
  }, []);

  const hideControlsAfterDelay = useCallback(() => {
    clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (!paused) {
        Animated.timing(controlsAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }, 3000);
  }, [paused]);

  const showControls = useCallback(() => {
    Animated.timing(controlsAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    hideControlsAfterDelay();
  }, [hideControlsAfterDelay]);

  const onLoadStart = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const onVideoLoad = useCallback((data) => {
    setLoading(false);
    setDuration(data.duration);
    onLoad?.(data);
    showControls();
  }, [onLoad, showControls]);

  const onVideoError = useCallback((error) => {
    setLoading(false);
    setError('Failed to load video');
    onError?.(error);
  }, [onError]);

  const onVideoProgress = useCallback((data) => {
    setCurrentTime(data.currentTime);
    onProgress?.(data);
  }, [onProgress]);

  const onVideoEnd = useCallback(() => {
    setPaused(true);
    showControls();
    onEnd?.();
  }, [onEnd, showControls]);

  const togglePlayPause = useCallback(() => {
    setPaused(prev => !prev);
    showControls();
  }, [showControls]);

  const seekTo = useCallback((time) => {
    videoRef.current?.seek(time);
    showControls();
  }, [showControls]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.videoContainer}
        onPress={showControls}
      >
        <Video
          ref={videoRef}
          source={source}
          style={[styles.video, { height: videoHeight }]}
          resizeMode="contain"
          paused={paused}
          onLoadStart={onLoadStart}
          onLoad={onVideoLoad}
          onError={onVideoError}
          onProgress={onVideoProgress}
          onEnd={onVideoEnd}
          repeat={false}
          useTextureView={Platform.OS === 'android'}
          controls={false}
          androidLayerType="hardware"
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000
          }}
        />

        {/* Title Bar */}
        <Animated.View style={[styles.titleBar, { opacity: controlsAnim }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          {title && (
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
          )}
        </Animated.View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.overlay}>
            <Icon name="error-outline" size={48} color="#fff" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Controls */}
        <Animated.View style={[styles.controls, { opacity: controlsAnim }]}>
          <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
            <Icon
              name={paused ? 'play-arrow' : 'pause'}
              size={32}
              color="#fff"
            />
          </TouchableOpacity>
          
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </Text>
          </View>

          <TouchableOpacity 
            onPress={() => seekTo(0)} 
            style={styles.restartButton}
          >
            <Icon name="replay" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  titleBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    padding: 8,
    marginRight: 16,
  },
  titleText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  playButton: {
    padding: 8,
  },
  timeContainer: {
    flex: 1,
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
  },
  restartButton: {
    padding: 8,
  },
  errorText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
});

export default VideoPlayer;
