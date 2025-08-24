"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const CampaignService_1 = require("../services/CampaignService");
const logger_1 = __importDefault(require("../utils/logger"));
class ChatController {
    constructor() {
        /**
         * Process chat message and generate campaign materials
         */
        this.processMessage = async (req, res) => {
            const startTime = Date.now();
            try {
                const { message, productInfo } = req.body;
                if (!message || message.trim().length === 0) {
                    const response = {
                        success: false,
                        message: 'Message is required',
                        timestamp: new Date().toISOString(),
                    };
                    res.status(400).json(response);
                    return;
                }
                // Process uploaded images if any
                const images = [];
                if (req.files && Array.isArray(req.files)) {
                    for (const file of req.files) {
                        // Convert file buffer to base64 data URL for processing
                        const base64 = file.buffer.toString('base64');
                        const dataUrl = `data:${file.mimetype};base64,${base64}`;
                        images.push(dataUrl);
                    }
                }
                logger_1.default.info('Processing chat request', {
                    messageLength: message.length,
                    hasProductInfo: !!productInfo,
                    imageCount: images.length,
                });
                // Build chat request
                const chatRequest = {
                    message,
                    productInfo,
                    images: images.length > 0 ? images : undefined,
                };
                // Process with campaign service
                const chatResponse = await this.campaignService.processChatMessage(chatRequest);
                const processingTime = Date.now() - startTime;
                const response = {
                    success: true,
                    data: chatResponse,
                    message: 'Chat processed successfully',
                    timestamp: new Date().toISOString(),
                };
                logger_1.default.info('Chat processing completed', {
                    processingTime,
                    hasAnalysis: !!chatResponse.analysis,
                    generatedImages: chatResponse.generatedImages?.length || 0,
                });
                res.json(response);
            }
            catch (error) {
                const processingTime = Date.now() - startTime;
                logger_1.default.error('Error processing chat message:', error);
                const response = {
                    success: false,
                    message: 'Failed to process chat message',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                };
                res.status(500).json(response);
            }
        };
        /**
         * Analyze product profile only (without generating images)
         */
        this.analyzeProduct = async (req, res) => {
            try {
                const { productInfo } = req.body;
                if (!productInfo) {
                    const response = {
                        success: false,
                        message: 'Product information is required',
                        timestamp: new Date().toISOString(),
                    };
                    res.status(400).json(response);
                    return;
                }
                logger_1.default.info('Analyzing product profile');
                const analysis = await this.campaignService.analyzeProductOnly(productInfo);
                const response = {
                    success: true,
                    data: analysis,
                    message: `Product classified as ${analysis.profile} profile with ${analysis.confidence}% confidence`,
                    timestamp: new Date().toISOString(),
                };
                res.json(response);
            }
            catch (error) {
                logger_1.default.error('Error analyzing product:', error);
                const response = {
                    success: false,
                    message: 'Failed to analyze product',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                };
                res.status(500).json(response);
            }
        };
        /**
         * Generate campaign images only
         */
        this.generateImages = async (req, res) => {
            try {
                const { productInfo, profile } = req.body;
                if (!productInfo) {
                    const response = {
                        success: false,
                        message: 'Product information is required',
                        timestamp: new Date().toISOString(),
                    };
                    res.status(400).json(response);
                    return;
                }
                if (profile && !['baixo', 'medio', 'alto'].includes(profile)) {
                    const response = {
                        success: false,
                        message: 'Profile must be one of: baixo, medio, alto',
                        timestamp: new Date().toISOString(),
                    };
                    res.status(400).json(response);
                    return;
                }
                logger_1.default.info('Generating campaign images', { profile });
                const results = await this.campaignService.generateImagesOnly(productInfo, profile);
                const successCount = results.filter(r => r.success).length;
                const response = {
                    success: successCount > 0,
                    data: results,
                    message: `Generated ${successCount}/${results.length} images successfully`,
                    timestamp: new Date().toISOString(),
                };
                res.json(response);
            }
            catch (error) {
                logger_1.default.error('Error generating images:', error);
                const response = {
                    success: false,
                    message: 'Failed to generate images',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                };
                res.status(500).json(response);
            }
        };
        /**
         * Get template status and availability
         */
        this.getTemplateStatus = async (req, res) => {
            try {
                const status = await this.campaignService.getTemplateStatus();
                const response = {
                    success: true,
                    data: status,
                    message: `${status.available} templates available, ${status.missing} missing`,
                    timestamp: new Date().toISOString(),
                };
                res.json(response);
            }
            catch (error) {
                logger_1.default.error('Error getting template status:', error);
                const response = {
                    success: false,
                    message: 'Failed to get template status',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                };
                res.status(500).json(response);
            }
        };
        /**
         * Initialize template system (create mock templates for development)
         */
        this.initializeTemplates = async (req, res) => {
            try {
                await this.campaignService.initializeTemplates();
                const response = {
                    success: true,
                    message: 'Template system initialized successfully',
                    timestamp: new Date().toISOString(),
                };
                res.json(response);
            }
            catch (error) {
                logger_1.default.error('Error initializing templates:', error);
                const response = {
                    success: false,
                    message: 'Failed to initialize templates',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                };
                res.status(500).json(response);
            }
        };
        this.campaignService = new CampaignService_1.CampaignService();
    }
}
exports.ChatController = ChatController;
//# sourceMappingURL=ChatController.js.map