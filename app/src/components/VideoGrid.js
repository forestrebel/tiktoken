import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Text,
  FlatList
} from 'react-native';
import { videoService } from '../services/video';
import Animated, { 
  FadeIn,
  FadeOut,
  Layout,
  SlideInRight,
  withSpring,
  withSequence,
  withTiming,
  useAnimatedStyle,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GRID_PADDING = 16;
const ITEM_SPACING = 12;
const ITEM_WIDTH = (width - (GRID_PADDING * 2) - (ITEM_SPACING * (COLUMN_COUNT - 1))) / COLUMN_COUNT;
const ITEM_HEIGHT = (ITEM_WIDTH * 16) / 9;

const LoadingOverlay = ({ progress }) => (
  <View style={styles.loadingOverlay}>
    <ActivityIndicator color="#fff" size="large" />
    <Text style={styles.loadingText}>
      {progress || 'Processing...'}
    </Text>
  </View>
);

const EmptyState = () => (
  <Animated.View 
    style={styles.emptyContainer}
    entering={FadeIn.duration(600).delay(300)}
  >
    <Text style={styles.emptyTitle}>Nature Collection</Text>
    <Text style={styles.emptyText}>
      Import your first nature video to begin your collection.
      {'\n\n'}
      Tap the blue button above to get started.
    </Text>
  </Animated.View>
);

const VideoGridItem = ({ video, onPress, isLoading, index }) => {
  const thumbnailUri = video.thumbnail 
    ? `file://${videoService.getThumbnailPath(video.thumbnail)}`
    : null;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(isLoading ? 0.95 : 1) },
      { translateY: withSpring(isLoading ? 2 : 0) }
    ],
    opacity: withSpring(isLoading ? 0.7 : 1)
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(index * 100)}
      exiting={FadeOut.duration(300)}
      layout={Layout.springify()}
      style={[styles.itemContainer, animatedStyle]}
    >
      <TouchableOpacity
        onPress={() => onPress(video)}
        style={styles.item}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <LoadingOverlay />
        ) : (
          <View style={styles.thumbnailContainer}>
            {thumbnailUri ? (
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderText}>Processing...</Text>
              </View>
            )}
            <View style={styles.metaContainer}>
              <Text style={styles.metaText}>
                {new Date(video.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const VideoGrid = ({ videos = [], onVideoPress, loadingVideoId }) => {
  return (
    <View style={styles.container}>
      <Animated.View 
        style={styles.grid}
        entering={SlideInRight.duration(500)}
      >
        {videos.map((video, index) => (
          <VideoGridItem
            key={video.id}
            video={video}
            onPress={onVideoPress}
            isLoading={loadingVideoId === video.id}
            index={index}
          />
        ))}
      </Animated.View>
      {videos.length === 0 && <EmptyState />}
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
    marginHorizontal: -ITEM_SPACING / 2,
  },
  itemContainer: {
    width: ITEM_WIDTH + ITEM_SPACING,
    padding: ITEM_SPACING / 2,
    marginBottom: ITEM_SPACING,
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    backgroundColor: '#222',
    aspectRatio: 9/16,
  },
  item: {
    flex: 1,
  },
  thumbnailContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
  },
  metaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  metaText: {
    color: '#fff',
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 13,
    fontWeight: '500',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
    padding: 16,
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 15,
  },
}); 