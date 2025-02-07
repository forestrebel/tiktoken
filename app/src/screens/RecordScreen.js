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
 * Record screen for video recording functionality
 */
export default function RecordScreen({ navigation }) {
  const [recording, setRecording] = useState(false);
  
  const handleStartRecording = () => {
    // TODO: Implement recording functionality
    Alert.alert('Coming Soon', 'Video recording functionality will be available in the next update.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record Video</Text>
      
      <TouchableOpacity
        style={styles.recordButton}
        onPress={handleStartRecording}
      >
        <Text style={styles.recordButtonText}>
          Start Recording
        </Text>
      </TouchableOpacity>
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
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4444',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
}); 