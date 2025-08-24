import multer from 'multer';
import config from '../config';
import logger from '../utils/logger';

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  if (config.upload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn(`Rejected file upload: ${file.mimetype} not allowed`);
    cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${config.upload.allowedTypes.join(', ')}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize, // 50MB default
    files: 10, // Maximum 10 files per request
  },
}).array('images', 10); // Accept multiple images

// Error handling middleware for multer
export const handleUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size: ${config.upload.maxFileSize / 1024 / 1024}MB`,
        timestamp: new Date().toISOString(),
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed',
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (error.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  next(error);
};