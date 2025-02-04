import { useState } from 'react'
import './App.css'

function App() {
  const [text, setText] = useState('')
  const [tokens, setTokens] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleTokenize = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/tokenize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setTokens(data)
    } catch (err) {
      setError(err.message)
      setTokens(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Tiktoken Demo</h1>
      
      <div className="card">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to tokenize..."
          rows={5}
        />
        
        <button onClick={handleTokenize} disabled={!text || loading}>
          {loading ? 'Tokenizing...' : 'Tokenize'}
        </button>

        {error && (
          <div className="error">
            Error: {error}
          </div>
        )}

        {tokens && (
          <div className="results">
            <h3>Results:</h3>
            <p>Token Count: {tokens.token_count}</p>
            <div className="tokens">
              {tokens.tokens.map((token, index) => (
                <span key={index} className="token">
                  {token}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
