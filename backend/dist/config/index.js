"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const config = {
    port: parseInt(process.env.PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
        allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
        destination: process.env.UPLOADS_PATH || path_1.default.join(process.cwd(), 'uploads'),
    },
    output: {
        directory: process.env.OUTPUT_PATH || path_1.default.join(process.cwd(), 'output'),
        maxImages: parseInt(process.env.MAX_IMAGES || '10', 10),
    },
    security: {
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
        rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100', 10),
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },
    cesdk: {
        license: process.env.CESDK_LICENSE || '',
        userId: process.env.CESDK_USER_ID || 'uselink-generator',
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4',
    },
    templates: {
        directory: process.env.TEMPLATES_PATH || path_1.default.join(process.cwd(), 'templates'),
    },
};
exports.default = config;
//# sourceMappingURL=index.js.map