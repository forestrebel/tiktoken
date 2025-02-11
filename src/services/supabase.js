import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase configuration');
}

// Create Supabase client with optimized configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  storage: {
    maxConcurrentUploads: 3
  },
  global: {
    headers: {
      'X-Client-Info': 'tiktoken-android'
    }
  }
});

// Database operations
export const db = {
  // Video operations
  videos: {
    save: async (videoData) => {
      const { data, error } = await supabase
        .from('videos')
        .upsert(videoData);
      if (error) throw error;
      return data;
    },
    getAll: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    get: async (id) => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  },

  // Token operations
  tokens: {
    save: async (tokenData) => {
      const { data, error } = await supabase
        .from('tokens')
        .insert(tokenData);
      if (error) throw error;
      return data;
    },
    getBalance: async () => {
      const { data, error } = await supabase
        .rpc('get_token_balance');
      if (error) throw error;
      return data || 0;
    }
  }
};

// Storage operations
export const storage = {
  upload: async (file, path, onProgress) => {
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(path, file, {
        onUploadProgress: (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          onProgress?.(percent);
        }
      });
    if (error) throw error;
    return data;
  },
  getUrl: (path) => {
    return supabase.storage
      .from('videos')
      .getPublicUrl(path).data.publicUrl;
  }
};

export default supabase; 