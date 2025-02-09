import { supabase } from './supabase';

/**
 * Generate a simulated Ethereum token ID
 * @returns {string} Simulated token ID
 */
function generateEthTokenId() {
  return '0x' + Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a simulated IPFS URI for token metadata
 * @param {string} tokenId - Ethereum token ID
 * @returns {string} IPFS URI
 */
function generateTokenUri(tokenId) {
  const baseIpfsHash = 'QmTK5PqCFVgHNmhQYwvPJ8aj5o8UZKrTKzEHwzKEfQEZWR';
  return `ipfs://${baseIpfsHash}/${tokenId}`;
}

/**
 * Get simulated on-chain metadata for token
 * @param {string} tokenId - Token to get metadata for
 * @returns {Object} Simulated IPFS metadata
 */
export function getTokenMetadata(tokenId) {
  return {
    name: `TikToken #${tokenId}`,
    description: 'Nature Content Recognition Token',
    image: `ipfs://QmYx3GHkgjpCVKQhgTR86qhW7YknBhXt9K2TzFMyBD6Kep/${tokenId}.png`,
    attributes: [
      { trait_type: 'Type', value: 'Nature Content' },
      { trait_type: 'Platform', value: 'TikToken' },
      { trait_type: 'Chain', value: 'Ethereum' },
      { trait_type: 'Created', value: new Date().toISOString() }
    ]
  };
}

/**
 * Create a simple recognition token for a video with Ethereum stub
 * @param {string} video_id - ID of the video being recognized
 * @param {string} recipient_id - ID of the content creator
 * @returns {Promise<Object>} Created token data with Ethereum stub
 */
export async function createToken(video_id, recipient_id) {
  try {
    const eth_token_id = generateEthTokenId();
    const token_uri = generateTokenUri(eth_token_id);

    const { data, error } = await supabase
      .from('tokens')
      .insert({
        video_id,
        recipient_id,
        issuer_id: (await supabase.auth.getUser()).data.user.id,
        eth_token_id,
        token_uri
      })
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating token:', error);
    throw error;
  }
}

/**
 * Get all tokens for a user with Ethereum data
 * @param {string} user_id - User to get tokens for
 * @returns {Promise<Array>} User's tokens with Ethereum stubs
 */
export async function getUserTokens(user_id) {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*, videos(*)')
      .eq('recipient_id', user_id);

    if (error) throw error;
    return data.map(token => ({
      ...token,
      eth_value: '0.001', // Simulated ETH value
      metadata: getTokenMetadata(token.eth_token_id)
    }));
  } catch (error) {
    console.error('Error getting user tokens:', error);
    throw error;
  }
}

/**
 * Get formatted token count with ETH symbol
 * @param {string} video_id - Video to count tokens for
 * @returns {Promise<string>} Formatted count (e.g. "⧫ 5")
 */
export async function getTokenCount(video_id) {
  try {
    const { count, error } = await supabase
      .from('tokens')
      .select('id', { count: 'exact' })
      .eq('video_id', video_id);

    if (error) throw error;
    return `⧫ ${count}`; // Ethereum diamond symbol
  } catch (error) {
    console.error('Error getting token count:', error);
    return '⧫ -';
  }
}

/**
 * Get simulated ETH value display
 * @param {string} token_id - Token to display value for
 * @returns {Promise<string>} Formatted ETH value
 */
export async function getTokenValue(token_id) {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('created_at')
      .eq('eth_token_id', token_id)
      .single();

    if (error) throw error;

    // Simulate a small ETH value that grows slightly with age
    const ageInDays = (new Date() - new Date(data.created_at)) / (1000 * 60 * 60 * 24);
    const baseValue = 0.001;
    const growthRate = 0.0001;
    const ethValue = baseValue + (ageInDays * growthRate);

    return `≈ ${ethValue.toFixed(4)} ETH`;
  } catch (error) {
    console.error('Error getting token value:', error);
    return '≈ 0.001 ETH';
  }
} 