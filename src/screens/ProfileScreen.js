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
import { videoService } from '../services';

/**
 * User profile screen with video management
 */
export default function ProfileScreen({ navigation }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load videos on mount and after import
  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    const result = await videoService.getVideos();
    if (result.status === 'success') {
      setVideos(result.data);
    }
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

      {/* Video List */}
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.videoItem}
            onPress={() => navigation.navigate('View', { videoId: item.id })}
          >
            <Text style={styles.videoDate}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No videos yet. Import one to start!
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
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
  videoItem: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
  },
  videoDate: {
    fontSize: 16,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 30,
    fontSize: 16,
  },
});
