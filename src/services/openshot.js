const mockProjects = () => Promise.resolve([]);
const mockProcess = () => Promise.resolve({ jobId: 'test-job' });
const mockStatus = () => Promise.resolve({ state: 'completed', progress: 100 });
const mockThumbnail = () => Promise.resolve('test-thumbnail-base64');

export const OpenShotService = {
  getProjects: mockProjects,
  processVideo: mockProcess,
  getStatus: mockStatus,
  generateThumbnail: mockThumbnail
}; 