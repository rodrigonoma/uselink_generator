"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUploadError = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
// Configure multer for file uploads
const storage = multer_1.default.memoryStorage();
const fileFilter = (req, file, cb) => {
    // Check file type
    if (config_1.default.upload.allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        logger_1.default.warn(`Rejected file upload: ${file.mimetype} not allowed`);
        cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${config_1.default.upload.allowedTypes.join(', ')}`));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: config_1.default.upload.maxFileSize, // 50MB default
        files: 10, // Maximum 10 files per request
    },
}).array('images', 10); // Accept multiple images
// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: `File too large. Maximum size: ${config_1.default.upload.maxFileSize / 1024 / 1024}MB`,
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
exports.handleUploadError = handleUploadError;
//# sourceMappingURL=upload.js.map