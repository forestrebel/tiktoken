'use client'
import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions, TouchableWithoutFeedback, Text } from 'react-native';
import Video from 'react-native-video';
import RNFS from 'react-native-fs';
import { motion } from 'framer-motion';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

// Video format validation
const SUPPORTED_FORMATS = {
  'video/mp4': ['avc1', 'h264'],  // H.264 codec
  'video/quicktime': ['avc1'],     // MOV format
};

const MAX_BITRATE = 5000000; // 5 Mbps max for smooth playback
const CACHE_EXPIRY_HOURS = 24;

const VideoPlayer = ({ url, onError, onProgress, autoPlay = false, loop = true, controls = true }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [localUrl, setLocalUrl] = useState(null);
  const [error, setError] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);

  const { width, height } = Dimensions.get('window');
  // Force portrait mode with perfect 9:16 ratio
  const videoWidth = Math.min(width, (height * 9) / 16);
  const videoHeight = (videoWidth * 16) / 9;

  // Resource cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.seek(0);
        setIsPlaying(false);
      }
      cleanupCache();
    };
  }, []);

  // Cache cleanup utility
  const cleanupCache = async () => {
    try {
      const cacheDir = RNFS.CachesDirectoryPath;
      const files = await RNFS.readDir(cacheDir);
      const now = new Date();

      for (const file of files) {
        if (file.name.endsWith('.mp4') || file.name.endsWith('.mov')) {
          const stats = await RNFS.stat(file.path);
          const fileAge = (now - new Date(stats.mtime)) / (1000 * 60 * 60);

          if (fileAge > CACHE_EXPIRY_HOURS) {
            await RNFS.unlink(file.path);
          }
        }
      }
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  };

  // Enhanced video caching with validation
  const cacheVideo = async () => {
    if (!url) {
      setError('No video URL provided');
      return;
    }

    try {
      // If it's already a file URL, use it directly
      if (url.startsWith('file://')) {
        setLocalUrl(url);
        return;
      }

      // For remote URLs, cache the video
      if (url.startsWith('http')) {
        const filename = url.split('/').pop();
        const localPath = `${RNFS.CachesDirectoryPath}/${filename}`;

        // Check existing cache
        const exists = await RNFS.exists(localPath);
        if (exists) {
          const stats = await RNFS.stat(localPath);
          const fileAge = (new Date() - new Date(stats.mtime)) / (1000 * 60 * 60);

          if (fileAge <= CACHE_EXPIRY_HOURS) {
            setLocalUrl(`file://${localPath}`);
            return;
          }
          // Expired cache, remove it
          await RNFS.unlink(localPath);
        }

        // Download with progress tracking
        const download = RNFS.downloadFile({
          fromUrl: url,
          toFile: localPath,
          background: true,
          discretionary: true,
          progress: (response) => {
            const progress = response.bytesWritten / response.contentLength;
            // You can add a download progress indicator if needed
          },
        });

        const result = await download.promise;

        if (result.statusCode === 200) {
          setLocalUrl(`file://${localPath}`);
        } else {
          throw new Error('Download failed');
        }
      } else {
        // Assume it's a local path
        const exists = await RNFS.exists(url);
        if (!exists) {
          throw new Error('Video file not found');
        }
        setLocalUrl(`file://${url}`);
      }
    } catch (error) {
      console.error('Video caching error:', error);
      setError('Failed to load video');
      if (onError) {onError(error);}
    }
  };

  useEffect(() => {
    if (url) {
      console.log('Loading video URL:', url);
      cacheVideo();
    }
    return () => {
      setLocalUrl(null);
      setError(null);
    };
  }, [url]);

  useEffect(() => {
    if (!videoRef.current) return;

    playerRef.current = videojs(videoRef.current, {
      autoplay: autoPlay,
      controls: controls,
      loop: loop,
      responsive: true,
      fluid: true,
      aspectRatio: '9:16',
      playbackRates: [0.5, 1, 1.5, 2],
      userActions: {
        hotkeys: true,
        doubleClick: true
      },
      controlBar: {
        children: [
          'playToggle',
          'progressControl',
          'volumePanel',
          'playbackRateMenuButton',
          'fullscreenToggle',
        ],
      },
      html5: {
        vhs: {
          overrideNative: true
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false
      }
    });

    // Lock to portrait orientation if supported
    if (typeof window !== 'undefined' && screen.orientation?.lock) {
      screen.orientation.lock('portrait').catch(() => {
        // Silently fail if orientation lock is not supported
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [autoPlay, controls, loop]);

  useEffect(() => {
    if (!playerRef.current || !url) return;
    
    playerRef.current.src({
      src: url,
      type: 'video/mp4'
    });
  }, [url]);

  const handleLoad = (metadata) => {
    console.log('Video loaded:', metadata);
    setVideoInfo(metadata);
    setIsReady(true);
    setIsPlaying(true);
    setError(null);

    // Validate video format and bitrate
    if (metadata.naturalSize) {
      const { width, height, orientation } = metadata.naturalSize;
      const bitrate = metadata.bitrate || 0;

      if (bitrate > MAX_BITRATE) {
        setError('Video bitrate too high for smooth playback');
        return;
      }
    }
  };

  const handleError = (error) => {
    console.error('Video playback error:', error);
    let userMessage = 'An error occurred during playback';

    // Enhanced error handling
    switch (error.errorCode) {
      case -1004:
        userMessage = 'Network error - Please check your connection';
        break;
      case -11800:
        userMessage = 'This video format is not supported';
        break;
      case -11828:
        userMessage = 'Video codec not supported';
        break;
      case -1:
        userMessage = 'Video resource unavailable';
        break;
      default:
        if (error.message?.includes('codec')) {
          userMessage = 'Unsupported video format';
        }
    }

    setError(userMessage);
    if (onError) {onError({ ...error, userMessage });}
  };

  const handleProgress = (data) => {
    // Monitor playback for potential issues
    if (data.playableDuration < 1 && data.currentTime > 0) {
      console.warn('Playback buffer warning');
    }
    if (onProgress) {onProgress(data);}
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const retryPlayback = () => {
    setError(null);
    if (videoRef.current) {
      videoRef.current.seek(0);
      setIsPlaying(true);
    }
  };

  return (
    <motion.div
      layoutId={`video-${url}`}
      className="video-container relative aspect-[9/16] bg-black"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <TouchableWithoutFeedback onPress={togglePlayback}>
        <View style={[styles.container, { width, height }]}>
          {localUrl && !error && (
            <Video
              ref={videoRef}
              source={{ uri: localUrl }}
              style={[styles.video, { width: videoWidth, height: videoHeight }]}
              resizeMode="cover"
              onLoad={handleLoad}
              onError={handleError}
              onProgress={handleProgress}
              paused={!isPlaying}
              repeat={true}
              controls={false}
              ignoreSilentSwitch="ignore"
              playInBackground={false}
              playWhenInactive={false}
              useTextureView={true}
              maxBitRate={MAX_BITRATE}
              bufferConfig={{
                minBufferMs: 1500,
                maxBufferMs: 6000,
                bufferForPlaybackMs: 1500,
                bufferForPlaybackAfterRebufferMs: 3000,
              }}
              androidHardwareAcceleration="true"
              reportBandwidth={true}
              textTracks={[]}
              selectedTextTrack={{ type: 'disabled' }}
              onBandwidthUpdate={(data) => {
                if (data.bitrate > MAX_BITRATE) {
                  console.warn('High bandwidth usage detected');
                }
              }}
            />
          )}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableWithoutFeedback onPress={retryPlayback}>
                <View style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </motion.div>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    backgroundColor: '#000',
  },
  errorContainer: {
    position: 'absolute',
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default VideoPlayer;
