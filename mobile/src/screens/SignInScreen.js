import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import { authService } from '../services';

/**
 * Sign in screen component
 * @param {Object} props Navigation props
 */
export default function SignInScreen({ navigation }) {
  const handleDemoSignIn = async () => {
    try {
      const result = await authService.signIn('demo@example.com');
      if (result.status === 'success') {
        navigation.replace('Profile');
      }
    } catch (error) {
      // Ignore errors in demo
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TikToken Demo</Text>
      <Text style={styles.subtitle}>Nature Video Creator</Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleDemoSignIn}
      >
        <Text style={styles.buttonText}>
          Start Demo
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#4444ff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 