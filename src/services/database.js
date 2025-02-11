import { db } from '../services/supabase/config';

class DatabaseService {
  static instance = null;

  static getInstance() {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async init() {
    try {
      // Test connection to local Supabase
      const { data, error } = await db
        .from('videos')
        .select('count(*)')
        .single();

      if (error) throw error;
      console.log('Database initialized successfully');
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      return false;
    }
  }

  // Video operations
  async saveVideo(videoData) {
    const { id, path, filename, duration, format } = videoData;
    try {
      const { data, error } = await db
        .from('videos')
        .upsert({
          id,
          file_path: path,
          title: filename,
          type: format,
          metadata: { duration },
          storage_path: `videos/${filename}`
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving video:', error);
      return false;
    }
  }

  async getVideos() {
    try {
      const { data, error } = await db
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting videos:', error);
      return [];
    }
  }

  // Token operations
  async saveToken(tokenData) {
    const { id, amount, video_id, type } = tokenData;
    try {
      const { data, error } = await db
        .from('tokens')
        .insert({
          id,
          amount,
          video_id,
          type
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving token:', error);
      return false;
    }
  }

  async getTokenBalance() {
    try {
      const { data, error } = await db
        .rpc('get_token_balance');

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0;
    }
  }
}

export default DatabaseService.getInstance(); 