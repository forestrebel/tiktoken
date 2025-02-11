import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TransitionPresets } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  ...TransitionPresets.SlideFromRightIOS, // Smooth transitions for both platforms
  headerShown: false,
  gestureEnabled: true,
  cardOverlayEnabled: true,
  presentation: 'card',
  animationEnabled: true,
  gestureDirection: 'horizontal',
  animation: 'slide_from_right',
  cardStyleInterpolator: ({ current: { progress } }) => ({
    cardStyle: {
      opacity: progress,
    },
  }),
};

const AppNavigator = () => {
  return (
    <NavigationContainer
      theme={{
        colors: {
          background: '#FFFFFF',
          primary: '#2196F3',
          card: '#FFFFFF',
          text: '#000000',
          border: '#E0E0E0',
          notification: '#FF4081',
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={screenOptions}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
