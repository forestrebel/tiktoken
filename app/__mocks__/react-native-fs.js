module.exports = {
  mkdir: jest.fn(),
  moveFile: jest.fn(),
  copyFile: jest.fn(),
  unlink: jest.fn(),
  exists: jest.fn(),
  readDir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  stat: jest.fn(),
  DocumentDirectoryPath: '/test/path',
  CachesDirectoryPath: '/test/cache',
  read: jest.fn()
}; 