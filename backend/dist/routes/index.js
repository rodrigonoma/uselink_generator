"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ChatController_1 = require("../controllers/ChatController");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
const chatController = new ChatController_1.ChatController();
// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
            api: true,
            templates: true,
        },
    });
});
// Chat endpoints
router.post('/chat/message', upload_1.upload, upload_1.handleUploadError, chatController.processMessage);
router.post('/chat/analyze', chatController.analyzeProduct);
router.post('/chat/generate', chatController.generateImages);
// Template management
router.get('/templates/status', chatController.getTemplateStatus);
router.post('/templates/initialize', chatController.initializeTemplates);
// Static file serving for generated images with CORS headers
router.use('/output', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
}, express_1.default.static('output'));
// Download endpoint for generated images
router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path_1.default.join(process.cwd(), 'output', filename);
    if (!fs_1.default.existsSync(filepath)) {
        return res.status(404).json({
            success: false,
            message: 'File not found'
        });
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'image/png');
    res.download(filepath, filename);
});
exports.default = router;
//# sourceMappingURL=index.js.map