import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@user';

/**
 * Auth service for user management
 */
export const authService = {
  /**
   * Sign in with email
   * @param {string} email
   * @returns {Promise<Object>}
   */
  async signIn(email) {
    try {
      const user = {
        id: Date.now().toString(),
        email,
        created_at: new Date().toISOString(),
      };
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      return { status: 'success', data: user };
    } catch (error) {
      return { status: 'error', error };
    }
  },

  /**
   * Get current user
   * @returns {Promise<Object>}
   */
  async getCurrentUser() {
    try {
      const data = await AsyncStorage.getItem(USER_KEY);
      return { status: 'success', data: data ? JSON.parse(data) : null };
    } catch (error) {
      return { status: 'error', error };
    }
  },

  /**
   * Sign out current user
   * @returns {Promise<void>}
   */
  async signOut() {
    try {
      await AsyncStorage.removeItem(USER_KEY);
      return { status: 'success' };
    } catch (error) {
      return { status: 'error', error };
    }
  },
};
