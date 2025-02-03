import { useState } from 'react';
import { api } from '../api/client';

/**
 * @typedef {Object} UploadState
 * @property {number} progress - Upload progress (0-100)
 * @property {string|null} error - Error message if upload failed
 * @property {string|null} url - URL of uploaded video
 */

export function VideoUpload() {
  /** @type {[number, Function]} */
  const [progress, setProgress] = useState(0);
  
  /** @type {[string|null, Function]} */
  const [error, setError] = useState(null);
  
  /** @type {[string|null, Function]} */
  const [url, setUrl] = useState(null);

  /**
   * Handle file upload
   * @param {React.ChangeEvent<HTMLInputElement>} event
   */
  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state
    setProgress(0);
    setError(null);
    setUrl(null);

    try {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        throw new Error('Please select a video file');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.uploadVideo(formData, (progress) => {
        setProgress(progress);
      });

      setUrl(response.url);
      setProgress(100);

    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setProgress(0);
    }
  }

  return (
    <div className="upload-container">
      <label className="upload-label">
        {progress === 0 && 'Choose video to upload'}
        <input
          type="file"
          accept="video/*"
          onChange={handleUpload}
          disabled={progress > 0 && progress < 100}
        />
      </label>

      {progress > 0 && (
        <div className="upload-progress">
          <progress value={progress} max="100" />
          <span>{progress}%</span>
        </div>
      )}

      {error && (
        <div className="upload-error" role="alert">
          {error}
        </div>
      )}

      {url && (
        <div className="upload-success">
          <p>Upload complete!</p>
          <a href={url} target="_blank" rel="noopener noreferrer">
            View video
          </a>
        </div>
      )}
    </div>
  );
} 