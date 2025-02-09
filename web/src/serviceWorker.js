const CACHE_NAME = 'tiktoken-cache-v1';
const VIDEO_CACHE = 'video-cache-v1';
const PROGRESS_STORE = 'upload-progress';

// Files to cache for offline functionality
const CACHE_FILES = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/ffmpeg/ffmpeg-core.js',
  '/ffmpeg/ffmpeg-core.wasm',
  '/ffmpeg/ffmpeg-worker.js'
];

// Install event - cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES))
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME && key !== VIDEO_CACHE)
        .map(key => caches.delete(key))
    ))
  );
});

// Fetch event - handle offline access
self.addEventListener('fetch', (event) => {
  // Handle video files specially
  if (event.request.url.includes('/videos/')) {
    event.respondWith(handleVideoFetch(event.request));
    return;
  }

  // Network-first strategy for API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Handle video fetch requests
async function handleVideoFetch(request) {
  // Try network first
  try {
    const response = await fetch(request);
    const cache = await caches.open(VIDEO_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    // Return cached video if available
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

// Handle API requests
async function handleApiRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // If offline, return cached response if available
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Return offline error response
    return new Response(
      JSON.stringify({ error: 'No internet connection' }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Background sync for uploads
self.addEventListener('sync', (event) => {
  if (event.tag === 'videoUpload') {
    event.waitUntil(handleBackgroundUpload());
  }
});

// Handle background upload
async function handleBackgroundUpload() {
  const db = await openProgressDB();
  const pendingUploads = await db.getAll('pending');
  
  for (const upload of pendingUploads) {
    try {
      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        body: upload.data
      });
      
      if (response.ok) {
        await db.delete('pending', upload.id);
        self.registration.showNotification('Upload Complete', {
          body: 'Your video has been uploaded successfully'
        });
      }
    } catch (error) {
      console.error('Background upload failed:', error);
    }
  }
}

// IndexedDB for progress tracking
async function openProgressDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PROGRESS_STORE, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id' });
      }
    };
  });
}

// Handle battery status
self.addEventListener('message', async (event) => {
  if (event.data.type === 'BATTERY_STATUS') {
    const battery = event.data.battery;
    
    // Adjust processing based on battery
    if (battery.level < 0.2 && !battery.charging) {
      // Reduce quality for low battery
      event.ports[0].postMessage({
        type: 'REDUCE_QUALITY',
        factor: 0.5
      });
    }
  }
}); 