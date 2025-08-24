import { Request, Response } from 'express';
import { CampaignService } from '../services/CampaignService';
import logger from '../utils/logger';
import { ApiResponse, ChatRequest, ChatResponse } from '../models';

export class ChatController {
  private campaignService: CampaignService;

  constructor() {
    this.campaignService = new CampaignService();
  }

  /**
   * Process chat message and generate campaign materials
   */
  processMessage = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const { message, productInfo } = req.body as ChatRequest;
      
      if (!message || message.trim().length === 0) {
        const response: ApiResponse = {
          success: false,
          message: 'Message is required',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      // Process uploaded images if any
      const images: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          // Convert file buffer to base64 data URL for processing
          const base64 = file.buffer.toString('base64');
          const dataUrl = `data:${file.mimetype};base64,${base64}`;
          images.push(dataUrl);
        }
      }

      logger.info('Processing chat request', {
        messageLength: message.length,
        hasProductInfo: !!productInfo,
        imageCount: images.length,
      });

      // Build chat request
      const chatRequest: ChatRequest = {
        message,
        productInfo,
        images: images.length > 0 ? images : undefined,
      };

      // Process with campaign service
      const chatResponse = await this.campaignService.processChatMessage(chatRequest);
      
      const processingTime = Date.now() - startTime;

      const response: ApiResponse<ChatResponse> = {
        success: true,
        data: chatResponse,
        message: 'Chat processed successfully',
        timestamp: new Date().toISOString(),
      };

      logger.info('Chat processing completed', {
        processingTime,
        hasAnalysis: !!chatResponse.analysis,
        generatedImages: chatResponse.generatedImages?.length || 0,
      });

      res.json(response);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error processing chat message:', error);

      const response: ApiResponse = {
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
  analyzeProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productInfo } = req.body;
      
      if (!productInfo) {
        const response: ApiResponse = {
          success: false,
          message: 'Product information is required',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      logger.info('Analyzing product profile');

      const analysis = await this.campaignService.analyzeProductOnly(productInfo);

      const response: ApiResponse = {
        success: true,
        data: analysis,
        message: `Product classified as ${analysis.profile} profile with ${analysis.confidence}% confidence`,
        timestamp: new Date().toISOString(),
      };

      res.json(response);

    } catch (error) {
      logger.error('Error analyzing product:', error);

      const response: ApiResponse = {
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
  generateImages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productInfo, profile } = req.body;
      
      if (!productInfo) {
        const response: ApiResponse = {
          success: false,
          message: 'Product information is required',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      if (profile && !['baixo', 'medio', 'alto'].includes(profile)) {
        const response: ApiResponse = {
          success: false,
          message: 'Profile must be one of: baixo, medio, alto',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      logger.info('Generating campaign images', { profile });

      const results = await this.campaignService.generateImagesOnly(productInfo, profile);
      const successCount = results.filter(r => r.success).length;

      const response: ApiResponse = {
        success: successCount > 0,
        data: results,
        message: `Generated ${successCount}/${results.length} images successfully`,
        timestamp: new Date().toISOString(),
      };

      res.json(response);

    } catch (error) {
      logger.error('Error generating images:', error);

      const response: ApiResponse = {
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
  getTemplateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = await this.campaignService.getTemplateStatus();

      const response: ApiResponse = {
        success: true,
        data: status,
        message: `${status.available} templates available, ${status.missing} missing`,
        timestamp: new Date().toISOString(),
      };

      res.json(response);

    } catch (error) {
      logger.error('Error getting template status:', error);

      const response: ApiResponse = {
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
  initializeTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.campaignService.initializeTemplates();

      const response: ApiResponse = {
        success: true,
        message: 'Template system initialized successfully',
        timestamp: new Date().toISOString(),
      };

      res.json(response);

    } catch (error) {
      logger.error('Error initializing templates:', error);

      const response: ApiResponse = {
        success: false,
        message: 'Failed to initialize templates',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  };
}