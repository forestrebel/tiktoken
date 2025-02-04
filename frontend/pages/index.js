import { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [tokens, setTokens] = useState(null);
  const [error, setError] = useState(null);

  const tokenize = async () => {
    try {
      setError(null);
      const response = await fetch(`${process.env.API_URL}/api/v1/tokenize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setTokens(data);
    } catch (err) {
      setError(err.message);
      setTokens(null);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">TikToken Demo</h1>
      
      <div className="mb-4">
        <textarea
          className="w-full p-2 border rounded"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to tokenize..."
          rows={4}
        />
      </div>
      
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={tokenize}
      >
        Tokenize
      </button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {tokens && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Results</h2>
          <p>Token Count: {tokens.token_count}</p>
          <div className="mt-2 p-4 bg-gray-100 rounded">
            {tokens.tokens.map((token, i) => (
              <span
                key={i}
                className="inline-block bg-white m-1 px-2 py-1 rounded border"
              >
                {token}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 