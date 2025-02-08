/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaView, StatusBar, useColorScheme } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import ViewScreen from './src/screens/ViewScreen';
import HomeScreen from './src/screens/HomeScreen';

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
          screenOptions={{
            headerStyle: {
              backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
            },
            headerTintColor: isDarkMode ? Colors.lighter : Colors.darker,
          }}
        >
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
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
}

export default App;
