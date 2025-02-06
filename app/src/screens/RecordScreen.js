import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

/**
 * Temporary screen component while camera functionality is being configured
 */
export default function RecordScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Camera functionality coming soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
}); 