import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  ToastAndroid,
  Platform,
  Vibration
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { videoService } from '../services/video';
import VideoGrid from '../components/VideoGrid';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
  interpolateColor,
  useSharedValue
} from 'react-native-reanimated';

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150
};

const showToast = (message) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
};

const ImportButton = ({ onPress, isLoading, progress }) => {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(0);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      backgroundColor.value,
      [0, 1],
      ['#4444ff', '#00cc66']
    )
  }));

  const handlePress = async () => {
    Vibration.vibrate(50); // Haptic feedback
    scale.value = withSequence(
      withSpring(0.95, SPRING_CONFIG),
      withSpring(1, SPRING_CONFIG)
    );
    onPress();
  };

  return (
    <Animated.View style={[styles.importButtonContainer, buttonStyle]}>
      <TouchableOpacity
        style={styles.importButton}
        onPress={handlePress}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Text style={styles.importButtonText}>
          {isLoading 
            ? progress || 'Importing...'
            : 'Import Nature Video'
          }
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const HomeScreen = ({ navigation }) => {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingVideoId, setLoadingVideoId] = useState(null);
  const [importProgress, setImportProgress] = useState('');

  // Reset and load videos on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Reset everything on fresh start
        await videoService.init();
        // Load empty video list
        const result = await videoService.getVideos();
        if (result.status === 'success') {
          setVideos(result.data || []);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    initializeApp();
  }, []);

  const handleImportPress = useCallback(async () => {
    try {
      setIsLoading(true);
      setImportProgress('Selecting video...');

      // Pick video file
      const result = await DocumentPicker.pickSingle({
        type: DocumentPicker.types.video,
        copyTo: 'cachesDirectory'
      });

      const uri = result.fileCopyUri || result.uri;
      setImportProgress('Validating format...');
      
      // Validate video first
      const validation = await videoService.validateVideo(uri);
      if (validation.status === 'error') {
        Alert.alert(
          'Invalid Video Format',
          validation.error,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'View Requirements',
              onPress: () => Alert.alert(
                'Video Requirements',
                validation.suggestions.join('\n\n'),
                [{ text: 'Got It' }]
              )
            }
          ]
        );
        return;
      }

      // Show loading state
      const tempId = Date.now().toString();
      const tempVideo = {
        id: tempId,
        filename: 'importing.mp4',
        created_at: new Date().toISOString()
      };
      setVideos(prev => [tempVideo, ...prev]);
      setLoadingVideoId(tempId);
      setImportProgress('Processing video...');

      // Import video
      const importResult = await videoService.importVideo(uri);
      
      // Update UI based on result
      if (importResult.status === 'success') {
        setVideos(prev => {
          const filtered = prev.filter(v => v.id !== tempId);
          return [importResult.data, ...filtered];
        });
        Vibration.vibrate([0, 50, 50, 50]); // Success haptic
        showToast('Video imported successfully');
        
        // Navigate to preview
        navigation.navigate('View', { videoId: importResult.data.id });
      } else {
        setVideos(prev => prev.filter(v => v.id !== tempId));
        Alert.alert(
          'Import Failed',
          importResult.error,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: handleImportPress }
          ]
        );
      }

    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert(
          'Import Error',
          'Failed to import video. Please try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: handleImportPress }
          ]
        );
      }
    } finally {
      setIsLoading(false);
      setLoadingVideoId(null);
      setImportProgress('');
    }
  }, [navigation]);

  const handleVideoPress = useCallback((video) => {
    Vibration.vibrate(50); // Haptic feedback
    navigation.navigate('View', { videoId: video.id });
  }, [navigation]);

  const handleReset = async () => {
    Alert.alert(
      'Reset Library',
      'This will delete all videos and thumbnails. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await videoService.reset();
              if (result.status === 'success') {
                setVideos([]);
                showToast('Library cleared successfully');
              } else {
                Alert.alert(
                  'Reset Failed',
                  result.error,
                  [
                    { text: 'OK' },
                    {
                      text: 'View Suggestions',
                      onPress: () => Alert.alert(
                        'Troubleshooting',
                        result.suggestions.join('\n\n')
                      )
                    }
                  ]
                );
              }
            } catch (error) {
              console.error('Reset failed:', error);
              Alert.alert('Reset Failed', 'Failed to reset video library');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ImportButton
          onPress={handleImportPress}
          isLoading={isLoading}
          progress={importProgress}
        />
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
        >
          <Text style={styles.resetButtonText}>
            Clear Library {videos.length > 0 ? ` (${videos.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <VideoGrid
        videos={videos}
        onVideoPress={handleVideoPress}
        loadingVideoId={loadingVideoId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 16,
    gap: 8,
    backgroundColor: '#111',
  },
  importButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  importButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  resetButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#333',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
});

export default HomeScreen; 