const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 8000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check Supabase connection
    await supabase.from('health').select('*').limit(1);
    
    res.json({
      status: 'healthy',
      supabase: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Video endpoints
app.post('/api/v1/videos', async (req, res) => {
  const { title, description, duration, tags } = req.body;
  
  try {
    const { data, error } = await supabase
      .from('videos')
      .insert([{ title, description, duration, tags }])
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/videos/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', req.params.id)
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User endpoints
app.post('/api/v1/users', async (req, res) => {
  const { wallet_address, engagement_score } = req.body;
  
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{ wallet_address, engagement_score }])
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/rewards/calculate', async (req, res) => {
  const { user_id } = req.body;
  
  try {
    // Simulate reward calculation
    const reward = Math.random() * 100;
    
    const { data, error } = await supabase
      .from('wallets')
      .upsert([
        { 
          user_id,
          balance: reward
        }
      ])
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/users/:id/wallet', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', req.params.id)
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 