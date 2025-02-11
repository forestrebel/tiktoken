'use client'
import React, { useCallback, memo } from 'react'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'
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

const VideoGrid = ({ videos, onVideoPress, refreshing, onRefresh, ListHeaderComponent }) => {
  const renderItem = useCallback(({ item }) => (
    <VideoGridItem
      item={item}
      onPress={onVideoPress}
    />
  ), [onVideoPress])

  const keyExtractor = useCallback((item) => item.id, [])

  return (
    <FlashList
      data={videos}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={COLUMN_COUNT}
      estimatedItemSize={ITEM_HEIGHT}
      contentContainerStyle={styles.grid}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={EmptyState}
      ListHeaderComponent={ListHeaderComponent}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      initialNumToRender={6}
      maxToRenderPerBatch={4}
      windowSize={5}
      overrideItemLayout={(layout, item) => {
        layout.size = ITEM_HEIGHT
      }}
    />
  )
}

const styles = StyleSheet.create({
  grid: {
    padding: SPACING,
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
