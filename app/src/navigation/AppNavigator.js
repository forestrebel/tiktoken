import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import UploadScreen from '../screens/UploadScreen';
import DemoScreen from '../screens/DemoScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Demo"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196f3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Demo"
          component={DemoScreen}
          options={{
            title: 'Nature Video Demo',
          }}
        />
        <Stack.Screen
          name="Upload"
          component={UploadScreen}
          options={{
            title: 'Upload Nature Video',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 