'use client'
import React, { useState, useEffect } from 'react'
import { useCallback, memo } from 'react'
import { useInView } from 'react-intersection-observer'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import VideoSkeleton from './VideoSkeleton'
import { FadeIn } from './Transitions'
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { FlashList } from '@shopify/flash-list'
import { formatDuration, formatDate } from '../utils/format'
import { api } from '../api'

const { width } = Dimensions.get('window')
const COLUMN_COUNT = 2
const SPACING = 10
const ITEM_WIDTH = (width - (SPACING * (COLUMN_COUNT + 1))) / COLUMN_COUNT
const ITEM_HEIGHT = ITEM_WIDTH * 1.5

const VideoGridItem = memo(({ item, onPress }) => {
  const hasValidThumbnail = item.thumbnail && !item.thumbnailError
  const opacity = new Animated.Value(0)

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [])

  return (
    <Animated.View style={{ opacity }}>
      <TouchableOpacity
        style={[styles.gridItem, styles.gridItemShadow]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.thumbnailContainer}>
          {hasValidThumbnail ? (
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
              loading="lazy"
              defaultSource={require('../assets/placeholder.png')}
            />
          ) : (
            <View style={styles.placeholderThumbnail}>
              <Icon name="videocam" size={40} color="#666" />
            </View>
          )}
          {item.duration > 0 && (
            <View style={styles.duration}>
              <Text style={styles.durationText}>
                {formatDuration(item.duration)}
              </Text>
            </View>
          )}
          {item.processing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          )}
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.filename} numberOfLines={1}>
            {item.title || item.filename}
          </Text>
          <Text style={styles.date}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
})

const EmptyState = memo(() => (
  <Animated.View 
    style={styles.emptyState}
    entering={Animated.FadeIn.duration(300)}
  >
    <Icon name="videocam-off" size={48} color="#666" />
    <Text style={styles.emptyText}>No videos yet</Text>
    <Text style={styles.emptySubtext}>
      Videos you upload will appear here
    </Text>
  </Animated.View>
))

const VideoGrid = ({ onVideoSelect }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getVideos();
      setVideos(data);
    } catch (err) {
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={loadVideos}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>No videos yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={videos}
      keyExtractor={(item) => item.id}
      numColumns={2}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.videoItem}
          onPress={() => onVideoSelect?.(item)}
        >
          <View style={styles.videoPreview}>
            <Text style={styles.videoName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.videoDate}>
              {new Date(item.timestamp).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.grid}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    padding: 8,
  },
  videoItem: {
    flex: 1,
    margin: 8,
  },
  videoPreview: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoName: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  videoDate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
  },
  error: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  gridItem: {
    width: ITEM_WIDTH,
    marginBottom: SPACING,
    marginHorizontal: SPACING / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridItemShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailContainer: {
    width: '100%',
    height: ITEM_WIDTH,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  duration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  itemInfo: {
    padding: 12,
  },
  filename: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    opacity: 0.8,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
})

export default memo(VideoGrid)
