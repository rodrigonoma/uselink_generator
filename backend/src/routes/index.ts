import express from 'express';
import path from 'path';
import fs from 'fs';
import { ChatController } from '../controllers/ChatController';
import { upload, handleUploadError } from '../middleware/upload';

const router = express.Router();
const chatController = new ChatController();

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
router.post('/chat/message', upload, handleUploadError, chatController.processMessage);
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
}, express.static('output'));

// Download endpoint for generated images
router.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(process.cwd(), 'output', filename);
  
  if (!fs.existsSync(filepath)) {
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

export default router;