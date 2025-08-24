"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const fs_1 = __importDefault(require("fs"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./utils/logger"));
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
// Security middleware with relaxed CORS policies for development
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
}));
// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'];
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.default.security.rateLimitWindow,
    max: config_1.default.security.rateLimitRequests,
    message: {
        success: false,
        message: 'Too many requests, please try again later',
        timestamp: new Date().toISOString(),
    },
});
app.use('/api/', limiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Compression
app.use((0, compression_1.default)());
// Request logging
app.use((req, res, next) => {
    logger_1.default.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    next();
});
// API routes
app.use('/api', routes_1.default);
// Error handling middleware
app.use((error, req, res, next) => {
    logger_1.default.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        timestamp: new Date().toISOString(),
    });
});
// Ensure required directories exist
function ensureDirectories() {
    const directories = [
        config_1.default.upload.destination,
        config_1.default.output.directory,
        config_1.default.templates.directory,
        'logs'
    ];
    for (const dir of directories) {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
            logger_1.default.info(`Created directory: ${dir}`);
        }
    }
}
// Start server
function startServer() {
    ensureDirectories();
    const server = app.listen(config_1.default.port, () => {
        logger_1.default.info(`🚀 Uselink Generator Backend started`, {
            port: config_1.default.port,
            env: config_1.default.env,
            version: '1.0.0',
        });
        logger_1.default.info('📁 Directory structure:', {
            uploads: config_1.default.upload.destination,
            output: config_1.default.output.directory,
            templates: config_1.default.templates.directory,
        });
        // Log configuration (without sensitive data)
        logger_1.default.info('⚙️ Configuration:', {
            maxFileSize: `${config_1.default.upload.maxFileSize / 1024 / 1024}MB`,
            maxImages: config_1.default.output.maxImages,
            rateLimit: `${config_1.default.security.rateLimitRequests} requests per ${config_1.default.security.rateLimitWindow / 1000}s`,
            hasCesdkLicense: !!config_1.default.cesdk.license,
            hasOpenAIKey: !!config_1.default.openai.apiKey,
        });
    });
    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger_1.default.info('SIGTERM received, shutting down gracefully...');
        server.close(() => {
            logger_1.default.info('Server closed');
            process.exit(0);
        });
    });
    process.on('SIGINT', () => {
        logger_1.default.info('SIGINT received, shutting down gracefully...');
        server.close(() => {
            logger_1.default.info('Server closed');
            process.exit(0);
        });
    });
}
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map