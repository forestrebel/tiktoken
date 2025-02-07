import React from 'react';
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

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GRID_PADDING = 8;
const ITEM_SPACING = 8;
const ITEM_WIDTH = (width - (GRID_PADDING * 2) - (ITEM_SPACING * (COLUMN_COUNT - 1))) / COLUMN_COUNT;
const ITEM_HEIGHT = (ITEM_WIDTH * 16) / 9;

const LoadingOverlay = () => (
  <View style={styles.loadingOverlay}>
    <ActivityIndicator color="#fff" size="small" />
  </View>
);

const EmptyState = () => (
  <Animated.View 
    style={styles.emptyContainer}
    entering={FadeIn.duration(300)}
  >
    <Text style={styles.emptyTitle}>Nature Videos</Text>
    <Text style={styles.emptyText}>
      Tap + to import your first video
    </Text>
  </Animated.View>
);

const VideoGridItem = ({ video, onPress, isLoading }) => {
  const thumbnailUri = video.thumbnail 
    ? `file://${videoService.getThumbnailPath(video.thumbnail)}`
    : null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      layout={Layout.springify()}
      style={styles.itemContainer}
    >
      <TouchableOpacity
        onPress={() => onPress(video)}
        style={styles.item}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {thumbnailUri ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <ActivityIndicator color="#666" size="small" />
          </View>
        )}
        {isLoading && <LoadingOverlay />}
      </TouchableOpacity>
    </Animated.View>
  );
};

const VideoGrid = ({ videos = [], onVideoPress, loadingVideoId }) => {
  if (videos.length === 0) {
    return <EmptyState />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {videos.map((video) => (
          <VideoGridItem
            key={video.id}
            video={video}
            onPress={onVideoPress}
            isLoading={loadingVideoId === video.id}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: GRID_PADDING,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    marginBottom: ITEM_SPACING,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  item: {
    flex: 1,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
}); 