import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'react-native-document-picker';
import { videoService } from '../services/video';

/**
 * User profile screen with video management
 */
export function ProfileScreen({ navigation }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load videos on mount and after import
  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    const userVideos = await videoService.getVideos();
    setVideos(userVideos);
  };

  const handleImportVideo = async () => {
    try {
      setLoading(true);

      // Pick video file
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
      });

      // Import and refresh list
      const importResult = await videoService.importVideo(result.uri);
      if (importResult.status === 'success') {
        await loadVideos();
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Import Failed', 'Could not import video. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Videos</Text>
      </View>
      <View style={styles.grid}>
        {videos.map(video => (
          <TouchableOpacity
            key={video.id}
            style={styles.videoItem}
            onPress={() => navigation.navigate('Player', { videoId: video.id })}
          >
            <Text style={styles.videoName} numberOfLines={1}>
              {video.fileName || 'Untitled'}
            </Text>
            <Text style={styles.videoMeta}>
              {new Date(video.createdAt).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Import Button */}
      <TouchableOpacity
        style={[styles.importButton, loading && styles.importButtonDisabled]}
        onPress={handleImportVideo}
        disabled={loading}
      >
        <Text style={styles.importButtonText}>
          {loading ? 'Importing...' : 'Import Video'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  grid: {
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  videoItem: {
    width: '50%',
    padding: 8,
  },
  videoName: {
    fontSize: 16,
    fontWeight: '500',
  },
  videoMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  importButton: {
    backgroundColor: '#4444ff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
