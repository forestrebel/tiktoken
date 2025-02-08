import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  ToastAndroid,
  Platform,
  Vibration,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { videoService } from '../services/video';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
  interpolateColor,
  useSharedValue,
} from 'react-native-reanimated';

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
};

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GRID_PADDING = 8;
const ITEM_MARGIN = 8;
const ITEM_WIDTH = (width - (GRID_PADDING * 2) - (ITEM_MARGIN * (COLUMN_COUNT - 1))) / COLUMN_COUNT;
const ITEM_HEIGHT = (ITEM_WIDTH * 16) / 9;

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
    ),
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
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');

  // Load videos on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await videoService.init();
        const result = await videoService.getVideos();
        if (result.status === 'success') {
          setVideos(result.data || []);
        } else {
          console.error('Failed to load videos:', result.error);
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };

    initializeApp();
  }, []);

  const handleImport = async () => {
    if (importing) {return;}

    try {
      setImporting(true);
      setImportProgress('Selecting video...');

      // Open document picker
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
        copyTo: 'cachesDirectory',
      });

      if (!result || !result[0]) {
        throw new Error('No video selected');
      }

      const videoUri = result[0].fileCopyUri || result[0].uri;
      if (!videoUri) {
        throw new Error('Invalid video file');
      }

      setImportProgress('Validating format...');
      console.log('Validating video:', videoUri);

      // Quick validation
      const validation = await videoService.validateVideo(videoUri);
      console.log('Validation result:', validation);

      if (validation.status === 'error') {
        setImportProgress('');
        throw new Error(validation.error || 'Invalid video format');
      }

      setImportProgress('Importing video...');
      console.log('Importing video...');

      const importResult = await videoService.importVideo(
        videoUri,
        (progress) => setImportProgress(`Importing: ${Math.round(progress * 100)}%`)
      );

      console.log('Import result:', importResult);

      if (!importResult || importResult.status === 'error') {
        throw new Error(importResult?.error || 'Failed to import video');
      }

      // Add to collection
      const newVideo = {
        id: Date.now().toString(),
        uri: importResult.uri,
        filename: importResult.filename,
        created_at: new Date().toISOString(),
      };

      setVideos(prev => [newVideo, ...prev]);
      showToast('Video imported successfully');

      // Navigate to preview
      navigation.navigate('View', { videoId: newVideo.id });

    } catch (err) {
      console.error('Import error:', err);
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert(
          'Import Failed',
          err.message || 'Failed to import video. Please try again.',
          [
            { text: 'OK' },
            {
              text: 'Try Again',
              onPress: handleImport,
            },
          ]
        );
      }
    } finally {
      setImporting(false);
      setImportProgress('');
    }
  };

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
                throw new Error(result.error);
              }
            } catch (error) {
              console.error('Reset failed:', error);
              Alert.alert('Reset Failed', error.message || 'Failed to reset video library');
            }
          },
        },
      ]
    );
  };

  const renderVideo = ({ item }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => handleVideoPress(item)}
    >
      <View style={styles.thumbnail}>
        <Text style={styles.thumbnailText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ImportButton
          onPress={handleImport}
          isLoading={importing}
          progress={importProgress}
        />
        {videos.length > 0 && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
          >
            <Text style={styles.resetButtonText}>
              Clear Library ({videos.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {videos.length > 0 ? (
        <FlatList
          data={videos}
          renderItem={renderVideo}
          keyExtractor={item => item.id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.grid}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No videos yet. Import one to get started!
          </Text>
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
  grid: {
    padding: GRID_PADDING,
  },
  gridItem: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    marginRight: ITEM_MARGIN,
    marginBottom: ITEM_MARGIN,
  },
  thumbnail: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailText: {
    color: '#666',
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default HomeScreen;
