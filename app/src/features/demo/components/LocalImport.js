import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';

const LocalImport = ({ onImportComplete }) => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  const handleFilePick = async () => {
    try {
      setImporting(true);
      setError(null);
      
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
        copyTo: 'cachesDirectory',
      });

      const file = result[0];
      
      // Quick format check
      if (!file.name.toLowerCase().match(/\.(mp4|mov)$/)) {
        throw new Error('Please select an MP4 or MOV video file');
      }

      // Pass file info up to parent
      onImportComplete({
        uri: file.fileCopyUri,
        name: file.name,
        size: file.size,
        type: file.type,
      });

    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        setError(err.message);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button}
        onPress={handleFilePick}
        disabled={importing}
      >
        {importing ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Select Video</Text>
        )}
      </TouchableOpacity>
      
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#FF3B30',
    marginTop: 10,
    textAlign: 'center',
  }
});

export default LocalImport; 