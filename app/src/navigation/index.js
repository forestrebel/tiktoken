import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import SignInScreen from '../screens/SignInScreen';
import RecordScreen from '../screens/RecordScreen';
import ViewScreen from '../screens/ViewScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();

/**
 * Main navigation container with authentication flow
 * @param {Object} props Component props
 * @param {boolean} props.isSignedIn Whether user is signed in
 */
export function Navigation({ isSignedIn }) {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isSignedIn ? (
          // Auth flow
          <Stack.Screen 
            name="SignIn" 
            component={SignInScreen}
            options={{ headerShown: false }}
          />
        ) : (
          // Main app flow
          <>
            <Stack.Screen 
              name="Record" 
              component={RecordScreen}
              options={{ title: 'Record Video' }}
            />
            <Stack.Screen 
              name="View" 
              component={ViewScreen}
              options={{ title: 'View Recording' }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ title: 'My Profile' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 