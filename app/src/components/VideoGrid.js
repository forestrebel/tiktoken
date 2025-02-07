import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Text,
} from 'react-native';
import { videoService } from '../services/video';
import Animated, {
  FadeIn,
  Layout,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GRID_PADDING = 16;
const ITEM_SPACING = 12;
const ITEM_WIDTH = (width - (GRID_PADDING * 2) - (ITEM_SPACING * (COLUMN_COUNT - 1))) / COLUMN_COUNT;
const ITEM_HEIGHT = (ITEM_WIDTH * 16) / 9; // Portrait videos (9:16)

// Performance optimization: Memoize empty state
const EmptyState = React.memo(({ onImport }) => (
  <Animated.View
    style={styles.emptyContainer}
    entering={FadeIn.duration(200)} // Reduced for performance
  >
    <Icon name="leaf-outline" size={48} color="#2E7D32" />
    <Text style={styles.emptyTitle}>Capture Nature</Text>
    <Text style={styles.emptyText}>
      Share the beauty of nature in portrait mode
    </Text>
    <TouchableOpacity
      style={styles.importButton}
      onPress={onImport}
      activeOpacity={0.8}
    >
      <Text style={styles.importButtonText}>Record Nature Video</Text>
    </TouchableOpacity>
  </Animated.View>
));

// Performance optimization: Memoize grid items
const VideoGridItem = React.memo(({ video, onPress, isLoading }) => {
  // Instant loading with placeholder
  const placeholderIcon = useMemo(() => (
    <View style={styles.placeholderContainer}>
      <Icon name="leaf" size={24} color="#1B5E20" />
      <Text style={styles.placeholderText}>Loading preview...</Text>
    </View>
  ), []);

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      layout={Layout.springify().damping(20)}
      style={styles.itemContainer}
    >
      <TouchableOpacity
        onPress={() => onPress(video)}
        style={styles.item}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {video.thumbnail ? (
          <Image
            source={{ uri: `file://${videoService.getThumbnailPath(video.thumbnail)}` }}
            style={styles.thumbnail}
            resizeMode="cover"
            defaultSource={require('../assets/nature-placeholder.png')}
          />
        ) : placeholderIcon}

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#2E7D32" size="small" />
          </View>
        )}

        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {video.title || 'Nature Moment'}
          </Text>
          <Text style={styles.itemDuration}>
            {Math.round(video.duration || 0)}s • Portrait
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const VideoGrid = ({ videos = [], onVideoPress, onImport, isLoading }) => {
  // Performance optimization: Early return for empty state
  if (!videos.length) {
    return <EmptyState onImport={onImport} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {videos.map((video, index) => (
          <VideoGridItem
            key={video.id || index}
            video={video}
            onPress={onVideoPress}
            isLoading={isLoading}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: GRID_PADDING,
    gap: ITEM_SPACING,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    marginBottom: 16,
  },
  item: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F8E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: ITEM_HEIGHT,
    backgroundColor: '#E8F5E9',
  },
  placeholderContainer: {
    width: '100%',
    height: ITEM_HEIGHT,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#1B5E20',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  itemTitle: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  itemDuration: {
    fontSize: 12,
    color: '#1B5E20',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  importButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  videoMeta: {
    fontSize: 12,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
});
