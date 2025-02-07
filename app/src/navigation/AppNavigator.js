import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { TransitionPresets } from '@react-navigation/stack';
import UploadScreen from '../screens/UploadScreen';
import ViewScreen from '../screens/ViewScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createStackNavigator();

// Optimized transitions for performance (< 300ms)
const FastModalTransition = {
  ...TransitionPresets.ModalPresentationIOS,
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 250,
        // Using timing for predictable duration
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 200,
      },
    },
  },
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2E7D32', // Darker nature green
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          cardStyle: {
            backgroundColor: '#FFFFFF',
          },
          ...TransitionPresets.SlideFromRightIOS,
          // Optimize default transitions
          transitionSpec: {
            open: {
              animation: 'timing',
              config: { duration: 250 },
            },
            close: {
              animation: 'timing',
              config: { duration: 200 },
            },
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Nature Videos',
            headerLargeTitle: true,
            headerLargeTitleStyle: {
              color: '#1B5E20',
            },
          }}
        />
        <Stack.Screen
          name="Upload"
          component={UploadScreen}
          options={{
            title: 'New Nature Video',
            ...FastModalTransition,
            presentation: 'modal',
            headerStyle: {
              backgroundColor: '#2E7D32',
            },
          }}
        />
        <Stack.Screen
          name="View"
          component={ViewScreen}
          options={{
            title: '',
            headerTransparent: true,
            headerTintColor: '#FFFFFF',
            headerShadowVisible: false,
            // Quick slide from bottom
            ...TransitionPresets.ModalSlideFromBottomIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 250 } },
              close: { animation: 'timing', config: { duration: 200 } },
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 