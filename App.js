import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './app/src/screens/HomeScreen';
import RecordScreen from './app/src/screens/RecordScreen';
import ViewScreen from './app/src/screens/ViewScreen';
import ProfileScreen from './app/src/screens/ProfileScreen';
import SignInScreen from './app/src/screens/SignInScreen';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#F5F5F5',
          },
          headerTintColor: '#007AFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Record" 
          component={RecordScreen}
          options={{ title: 'Record Video' }}
        />
        <Stack.Screen 
          name="View" 
          component={ViewScreen}
          options={{ title: 'View Video' }}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ title: 'My Profile' }}
        />
        <Stack.Screen 
          name="SignIn" 
          component={SignInScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App; 