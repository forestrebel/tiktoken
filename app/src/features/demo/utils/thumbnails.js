import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { createThumbnail } from 'react-native-create-thumbnail';

const THUMBNAIL_DIR = `${RNFS.CachesDirectoryPath}/thumbnails`;

export const ensureThumbnailDir = async () => {
  const exists = await RNFS.exists(THUMBNAIL_DIR);
  if (!exists) {
    await RNFS.mkdir(THUMBNAIL_DIR);
  }
};

export const generateThumbnail = async (videoUri) => {
  await ensureThumbnailDir();
  
  const timestamp = Date.now();
  const thumbnailPath = `${THUMBNAIL_DIR}/thumb_${timestamp}.jpg`;

  try {
    const result = await createThumbnail({
      url: videoUri,
      timeStamp: 1000, // 1 second into video
      format: 'jpeg',
      quality: 0.7,
    });

    // Move thumbnail to our cache directory
    await RNFS.moveFile(result.path, thumbnailPath);

    return thumbnailPath;
  } catch (err) {
    console.error('Failed to generate thumbnail:', err);
    throw err;
  }
};

export const clearThumbnails = async () => {
  try {
    const exists = await RNFS.exists(THUMBNAIL_DIR);
    if (exists) {
      await RNFS.unlink(THUMBNAIL_DIR);
    }
  } catch (err) {
    console.error('Failed to clear thumbnails:', err);
  }
}; 