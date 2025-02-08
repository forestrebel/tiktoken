import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const NATURE_TIPS = {
  import: [
    'Best for wildlife and nature footage',
    'Portrait (9:16) recommended for immersive viewing',
    'Stable footage works best',
  ],
  preview: [
    'Check natural lighting and colors',
    'Ensure wildlife is clearly visible',
    'Verify smooth motion in playback',
  ],
  collection: [
    'Organize by species or habitat',
    'Recent captures appear first',
    'Quick access to your best moments',
  ],
};

const NatureGuidance = ({ context, onDismiss }) => {
  const tips = NATURE_TIPS[context] || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {context === 'import' && 'Nature Video Tips'}
          {context === 'preview' && 'Preview Guidelines'}
          {context === 'collection' && 'Collection Tips'}
        </Text>
        <TouchableOpacity onPress={onDismiss}>
          <Text style={styles.dismiss}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        {tips.map((tip, index) => (
          <View key={index} style={styles.tipContainer}>
            <Text style={styles.tipIcon}>🌿</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    margin: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#81C784',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#81C784',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
  },
  dismiss: {
    fontSize: 18,
    color: '#1B5E20',
    padding: 4,
  },
  content: {
    padding: 12,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  tipIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#2E7D32',
    flex: 1,
  },
});

export default NatureGuidance; 