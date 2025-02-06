import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Navigation } from './src/navigation';
import { authService, initServices } from './src/services';

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize services
        await initServices();
        
        // Check auth state
        const result = await authService.getCurrentUser();
        if (result.status === 'success' && result.data) {
          setIsSignedIn(true);
        }
      } catch (error) {
        console.error('Initialization failed:', error);
      } finally {
        setInitializing(false);
      }
    };

    initialize();
  }, []);

  if (initializing) {
    return null; // Or a loading screen
  }

  return (
    <SafeAreaView style={styles.container}>
      <Navigation isSignedIn={isSignedIn} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
}); 