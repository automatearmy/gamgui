/**
 * Virtual file system for terminal operations
 * Provides a virtual file system for terminal operations
 */
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

/**
 * Virtual file system for terminal operations
 */
class VirtualFileSystem {
  /**
   * Create a new VirtualFileSystem
   * @param {string} uploadsDir - Path to uploads directory
   */
  constructor(uploadsDir) {
    /**
     * Path to uploads directory
     * @type {string}
     * @private
     */
    this._uploadsDir = uploadsDir;
    
    /**
     * Virtual file system structure
     * @type {object}
     * @private
     */
    this._fs = {
      currentDir: '/gam',
      dirs: {
        '/gam': ['uploads'],
        '/gam/uploads': []
      },
      files: {
        '/gam/uploads': []
      }
    };
    
    // Initialize the file system
    this._initialize();
  }

  /**
   * Initialize the virtual file system
   * @private
   */
  _initialize() {
    try {
      // Ensure uploads directory exists
      if (!fs.existsSync(this._uploadsDir)) {
        fs.mkdirSync(this._uploadsDir, { recursive: true });
        logger.info(`Created uploads directory: ${this._uploadsDir}`);
      }
      
      // Read existing files in uploads directory
      this._refreshUploadsDirectory();
    } catch (error) {
      logger.error('Error initializing virtual file system:', error);
    }
  }

  /**
   * Refresh the uploads directory
   * @private
   */
  _refreshUploadsDirectory() {
    try {
      if (fs.existsSync(this._uploadsDir)) {
        const files = fs.readdirSync(this._uploadsDir);
        this._fs.files['/gam/uploads'] = files;
        logger.debug(`Refreshed uploads directory: ${files.length} files found`);
      }
    } catch (error) {
      logger.error('Error refreshing uploads directory:', error);
    }
  }

  /**
   * Get the current directory
   * @returns {string} - Current directory
   */
  getCurrentDir() {
    return this._fs.currentDir;
  }

  /**
   * Set the current directory
   * @param {string} dir - Directory to set as current
   * @returns {boolean} - Whether the directory was set
   */
  setCurrentDir(dir) {
    // Check if directory exists
    if (this._fs.dirs[dir]) {
      this._fs.currentDir = dir;
      return true;
    }
    return false;
  }

  /**
   * List files in a directory
   * @param {string} [dir] - Directory to list (defaults to current directory)
   * @returns {string[]} - List of files and directories
   */
  listFiles(dir = null) {
    const targetDir = dir || this._fs.currentDir;
    
    // Refresh uploads directory if listing it
    if (targetDir === '/gam/uploads') {
      this._refreshUploadsDirectory();
    }
    
    // Get directories in this directory
    const dirs = this._fs.dirs[targetDir] || [];
    
    // Get files in this directory
    const files = this._fs.files[targetDir] || [];
    
    return [...dirs, ...files];
  }

  /**
   * Check if a file exists
   * @param {string} filePath - Path to file
   * @returns {boolean} - Whether the file exists
   */
  fileExists(filePath) {
    // If it's a directory, check if it exists in the virtual file system
    if (this._fs.dirs[filePath]) {
      return true;
    }
    
    // If it's in the uploads directory, check if it exists in the actual file system
    if (filePath.startsWith('/gam/uploads/')) {
      const relativePath = filePath.replace('/gam/uploads/', '');
      const actualPath = path.join(this._uploadsDir, relativePath);
      return fs.existsSync(actualPath);
    }
    
    // Otherwise, check if it exists in the virtual file system
    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    
    return this._fs.files[dir] && this._fs.files[dir].includes(fileName);
  }

  /**
   * Read a file
   * @param {string} filePath - Path to file
   * @returns {string} - File contents
   * @throws {Error} - If the file doesn't exist
   */
  readFile(filePath) {
    // If it's in the uploads directory, read from the actual file system
    if (filePath.startsWith('/gam/uploads/')) {
      const relativePath = filePath.replace('/gam/uploads/', '');
      const actualPath = path.join(this._uploadsDir, relativePath);
      
      if (!fs.existsSync(actualPath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      return fs.readFileSync(actualPath, 'utf8');
    }
    
    // Otherwise, throw an error
    throw new Error(`File not found: ${filePath}`);
  }

  /**
   * Write a file
   * @param {string} filePath - Path to file
   * @param {string} content - File contents
   * @throws {Error} - If the directory doesn't exist
   */
  writeFile(filePath, content) {
    // If it's in the uploads directory, write to the actual file system
    if (filePath.startsWith('/gam/uploads/')) {
      const relativePath = filePath.replace('/gam/uploads/', '');
      const actualPath = path.join(this._uploadsDir, relativePath);
      
      // Create the directory if it doesn't exist
      const dir = path.dirname(actualPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write the file
      fs.writeFileSync(actualPath, content);
      
      // Refresh the uploads directory
      this._refreshUploadsDirectory();
      
      return;
    }
    
    // Otherwise, throw an error
    throw new Error(`Cannot write to file: ${filePath}`);
  }

  /**
   * Create a directory
   * @param {string} dirPath - Path to directory
   * @returns {boolean} - Whether the directory was created
   */
  createDir(dirPath) {
    // If it's in the uploads directory, create in the actual file system
    if (dirPath.startsWith('/gam/uploads/')) {
      const relativePath = dirPath.replace('/gam/uploads/', '');
      const actualPath = path.join(this._uploadsDir, relativePath);
      
      // Create the directory if it doesn't exist
      if (!fs.existsSync(actualPath)) {
        fs.mkdirSync(actualPath, { recursive: true });
      }
      
      // Add to virtual file system
      this._fs.dirs[dirPath] = [];
      this._fs.files[dirPath] = [];
      
      // Add to parent directory
      const parentDir = path.dirname(dirPath);
      const dirName = path.basename(dirPath);
      
      if (!this._fs.dirs[parentDir]) {
        this._fs.dirs[parentDir] = [];
      }
      
      if (!this._fs.dirs[parentDir].includes(dirName)) {
        this._fs.dirs[parentDir].push(dirName);
      }
      
      return true;
    }
    
    // Otherwise, only allow creating in /gam
    if (dirPath.startsWith('/gam/')) {
      // Add to virtual file system
      this._fs.dirs[dirPath] = [];
      this._fs.files[dirPath] = [];
      
      // Add to parent directory
      const parentDir = path.dirname(dirPath);
      const dirName = path.basename(dirPath);
      
      if (!this._fs.dirs[parentDir]) {
        this._fs.dirs[parentDir] = [];
      }
      
      if (!this._fs.dirs[parentDir].includes(dirName)) {
        this._fs.dirs[parentDir].push(dirName);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Delete a file or directory
   * @param {string} filePath - Path to file or directory
   * @returns {boolean} - Whether the file or directory was deleted
   */
  delete(filePath) {
    // If it's a directory, delete it from the virtual file system
    if (this._fs.dirs[filePath]) {
      // Remove from parent directory
      const parentDir = path.dirname(filePath);
      const dirName = path.basename(filePath);
      
      if (this._fs.dirs[parentDir]) {
        const index = this._fs.dirs[parentDir].indexOf(dirName);
        if (index !== -1) {
          this._fs.dirs[parentDir].splice(index, 1);
        }
      }
      
      // Remove from virtual file system
      delete this._fs.dirs[filePath];
      delete this._fs.files[filePath];
      
      return true;
    }
    
    // If it's in the uploads directory, delete from the actual file system
    if (filePath.startsWith('/gam/uploads/')) {
      const relativePath = filePath.replace('/gam/uploads/', '');
      const actualPath = path.join(this._uploadsDir, relativePath);
      
      if (fs.existsSync(actualPath)) {
        fs.unlinkSync(actualPath);
        
        // Refresh the uploads directory
        this._refreshUploadsDirectory();
        
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get the absolute path for a file
   * @param {string} filePath - Path to file (absolute or relative)
   * @returns {string} - Absolute path
   */
  getAbsolutePath(filePath) {
    // If it's already an absolute path, return it
    if (filePath.startsWith('/')) {
      return filePath;
    }
    
    // Otherwise, resolve relative to current directory
    if (this._fs.currentDir === '/') {
      return `/${filePath}`;
    }
    
    return `${this._fs.currentDir}/${filePath}`;
  }

  /**
   * Get the actual file system path for a virtual path
   * @param {string} virtualPath - Virtual file system path
   * @returns {string|null} - Actual file system path, or null if not in uploads directory
   */
  getActualPath(virtualPath) {
    if (virtualPath.startsWith('/gam/uploads/')) {
      const relativePath = virtualPath.replace('/gam/uploads/', '');
      return path.join(this._uploadsDir, relativePath);
    }
    
    return null;
  }
}

module.exports = VirtualFileSystem;
