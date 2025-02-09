'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { errorReporter } from '@/lib/errorReporting';

// Initial state
const initialPerformanceData = {
  uploads: { count: 0, success: 0, avgTime: 0 },
  playback: { starts: 0, buffers: 0, avgFPS: 0 },
  memory: { average: 0, peak: 0, leaks: 0 }
};

const initialErrorData = {
  total: 0,
  critical: 0,
  types: {}
};

const initialWebVitals = {
  fcp: 0,
  lcp: 0,
  fid: 0,
  cls: 0
};

export default function MetricsDashboard() {
  const [performanceData, setPerformanceData] = useState(initialPerformanceData);
  const [errorData, setErrorData] = useState(initialErrorData);
  const [webVitals, setWebVitals] = useState(initialWebVitals);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadMetrics() {
    try {
      setIsLoading(true);
      
      // Load upload metrics
      const { data: uploads } = await supabase
        .from('metrics')
        .select('*')
        .eq('type', 'upload');

      const uploadStats = {
        count: uploads?.length || 0,
        success: uploads?.filter(u => u.data.success)?.length || 0,
        avgTime: uploads?.reduce((acc, u) => acc + u.data.duration, 0) / uploads?.length || 0
      };

      // Load playback metrics
      const { data: playback } = await supabase
        .from('metrics')
        .select('*')
        .in('type', ['playback_start', 'playback_buffer', 'playback_performance']);

      const playbackStats = {
        starts: playback?.filter(p => p.type === 'playback_start')?.length || 0,
        buffers: playback?.filter(p => p.type === 'playback_buffer')?.length || 0,
        avgFPS: playback?.filter(p => p.type === 'playback_performance')
          ?.reduce((acc, p) => acc + p.data.fps, 0) / 
          playback?.filter(p => p.type === 'playback_performance')?.length || 0
      };

      // Load memory metrics
      const { data: memory } = await supabase
        .from('metrics')
        .select('*')
        .eq('type', 'playback_performance');

      const memoryStats = {
        average: memory?.reduce((acc, m) => acc + m.data.memory, 0) / memory?.length || 0,
        peak: Math.max(...(memory?.map(m => m.data.memory) || [0])),
        leaks: memory?.filter(m => m.data.memoryDelta > 50 * 1024 * 1024)?.length || 0
      };

      setPerformanceData({
        uploads: uploadStats,
        playback: playbackStats,
        memory: memoryStats
      });

      // Load error stats
      const errorStats = await errorReporter.getErrorStats();
      setErrorData(errorStats || initialErrorData);

      // Load web vitals
      const { data: vitals } = await supabase
        .from('metrics')
        .select('*')
        .in('type', ['fcp', 'lcp', 'fid', 'cls'])
        .order('timestamp', { ascending: false })
        .limit(4);

      if (vitals) {
        setWebVitals({
          fcp: vitals.find(v => v.type === 'fcp')?.data.value || 0,
          lcp: vitals.find(v => v.type === 'lcp')?.data.value || 0,
          fid: vitals.find(v => v.type === 'fid')?.data.value || 0,
          cls: vitals.find(v => v.type === 'cls')?.data.value || 0
        });
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Performance Dashboard</h1>
      
      {/* Web Vitals */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Web Vitals</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">First Contentful Paint</div>
            <div className="text-2xl">{webVitals.fcp.toFixed(1)}ms</div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Largest Contentful Paint</div>
            <div className="text-2xl">{webVitals.lcp.toFixed(1)}ms</div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">First Input Delay</div>
            <div className="text-2xl">{webVitals.fid.toFixed(1)}ms</div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Cumulative Layout Shift</div>
            <div className="text-2xl">{webVitals.cls.toFixed(3)}</div>
          </div>
        </div>
      </div>

      {/* Upload Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Upload Performance</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Total Uploads</div>
            <div className="text-2xl">{performanceData.uploads.count}</div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Success Rate</div>
            <div className="text-2xl">
              {((performanceData.uploads.success / performanceData.uploads.count) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Average Upload Time</div>
            <div className="text-2xl">{(performanceData.uploads.avgTime / 1000).toFixed(1)}s</div>
          </div>
        </div>
      </div>

      {/* Playback Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Playback Performance</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Video Starts</div>
            <div className="text-2xl">{performanceData.playback.starts}</div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Buffer Events</div>
            <div className="text-2xl">{performanceData.playback.buffers}</div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Average FPS</div>
            <div className="text-2xl">{performanceData.playback.avgFPS.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* Memory Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Memory Usage</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Average Usage</div>
            <div className="text-2xl">{(performanceData.memory.average / (1024 * 1024)).toFixed(1)}MB</div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Peak Usage</div>
            <div className="text-2xl">{(performanceData.memory.peak / (1024 * 1024)).toFixed(1)}MB</div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Memory Leaks</div>
            <div className="text-2xl">{performanceData.memory.leaks}</div>
          </div>
        </div>
      </div>

      {/* Error Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Error Tracking</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Total Errors</div>
            <div className="text-2xl">{errorData.total}</div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Critical Errors</div>
            <div className="text-2xl">{errorData.critical}</div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Error Types</div>
            <div className="text-sm mt-2">
              {Object.entries(errorData.types).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span>{type}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 