/**
 * TikToken Nature Video App
 * @format
 */

import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaView, StatusBar, useColorScheme } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';

// Import all screens
import HomeScreen from './src/screens/HomeScreen';
import ViewScreen from './src/screens/ViewScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RecordScreen from './src/screens/RecordScreen';
import SignInScreen from './src/screens/SignInScreen';

const Stack = createStackNavigator();

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  };

  return (
    <NavigationContainer>
      <SafeAreaView style={backgroundStyle}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={backgroundStyle.backgroundColor}
        />
        <Stack.Navigator
          initialRouteName="SignIn"
          screenOptions={{
            headerStyle: {
              backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
            },
            headerTintColor: isDarkMode ? Colors.lighter : Colors.darker,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            cardStyle: { backgroundColor: isDarkMode ? Colors.darker : Colors.lighter }
          }}
        >
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{
              title: 'Welcome to TikToken Nature',
              headerShown: false
            }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Nature Collection',
            }}
          />
          <Stack.Screen
            name="View"
            component={ViewScreen}
            options={{
              title: 'Preview',
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: 'My Profile',
            }}
          />
          <Stack.Screen
            name="Record"
            component={RecordScreen}
            options={{
              title: 'Record Nature',
            }}
          />
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
}

export default App;
