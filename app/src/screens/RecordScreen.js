import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { videoService } from '../services';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GRID_PADDING = 8;
const ITEM_MARGIN = 8;
const ITEM_WIDTH = (width - (GRID_PADDING * 2) - (ITEM_MARGIN * (COLUMN_COUNT - 1))) / COLUMN_COUNT;
const ITEM_HEIGHT = (ITEM_WIDTH * 16) / 9;

/**
 * Home screen with import functionality and video collection
 */
export default function HomeScreen({ navigation }) {
  const [videos, setVideos] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  
  // Load videos on mount
  useEffect(() => {
    loadVideos();
    // Initialize video service
    videoService.init().catch(error => {
      console.error('Failed to initialize video service:', error);
    });
  }, []);

  const loadVideos = async () => {
    const result = await videoService.getVideos();
    if (result.status === 'success') {
      setVideos(result.data);
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setImportProgress('Selecting video...');

      // Open document picker
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
      });

      const videoUri = result[0].uri;
      setImportProgress('Validating format...');

      // Quick validation
      const validation = await videoService.validateVideo(videoUri);
      if (validation.status === 'error') {
        setImportProgress('');
        setImporting(false);
        // Show error with retry option
        Alert.alert(
          'Invalid Video Format',
          validation.error + '\n\nPlease select a different video.',
          [
            { text: 'Try Again', onPress: handleImport },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }

      setImportProgress('Importing video...');
      const importResult = await videoService.importVideo(videoUri);
      
      if (importResult.status === 'success') {
        // Add to collection and navigate to preview
        setVideos(prev => [importResult.data, ...prev]);
        navigation.navigate('View', { videoId: importResult.data.id });
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Import Failed', 'Please try again');
      }
    } finally {
      setImporting(false);
      setImportProgress('');
    }
  };

  const renderVideo = ({ item }) => (
    <TouchableOpacity 
      style={styles.gridItem}
      onPress={() => navigation.navigate('View', { videoId: item.id })}
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
      <Text style={styles.title}>Nature Collection</Text>
      
      <TouchableOpacity
        style={styles.importButton}
        onPress={handleImport}
        disabled={importing}
      >
        <Text style={styles.importButtonText}>
          {importing ? importProgress : 'Import Nature Video'}
        </Text>
        {importing && <ActivityIndicator color="#fff" style={styles.loader} />}
      </TouchableOpacity>

      <FlatList
        data={videos}
        renderItem={renderVideo}
        keyExtractor={item => item.id}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: GRID_PADDING,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4444ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loader: {
    marginLeft: 10,
  },
  grid: {
    paddingBottom: 20,
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
}); 