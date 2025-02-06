import { videoService } from './video';
import { authService } from './auth';

/**
 * Initialize all services
 */
export async function initServices() {
  await videoService.init();
}

export { videoService, authService }; 