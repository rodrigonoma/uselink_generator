import logger from '../utils/logger';
import { AIService } from './AIService';
import { PSDService } from './PSDService';
import { TemplateService } from './TemplateService';
import { 
  ProductInfo, 
  ChatMessage, 
  ChatRequest, 
  ChatResponse, 
  AIAnalysisResult,
  ImageGenerationResult 
} from '../models';

export class CampaignService {
  private aiService: AIService;
  private psdService: PSDService;
  private templateService: TemplateService;

  constructor() {
    this.aiService = new AIService();
    this.psdService = new PSDService();
    this.templateService = new TemplateService();
  }

  async processChatMessage(request: ChatRequest): Promise<ChatResponse> {
    logger.info('Processing chat message', {
      hasImages: !!(request.images && request.images.length > 0),
      hasProductInfo: !!request.productInfo,
      messageLength: request.message.length
    });

    try {
      let analysis: AIAnalysisResult | undefined;
      let generatedImages: ImageGenerationResult[] = [];

      // Check if we have enough information to perform analysis and generation
      const shouldAnalyze = this.shouldPerformAnalysis(request);
      
      if (shouldAnalyze) {
        logger.info('Performing AI analysis of product');
        
        // Create minimal product info if not provided
        const productInfoForAnalysis = request.productInfo || {
          description: request.message,
          target_audience: 'Público em geral',
          location: 'Não especificado',
          budget: 'R$ 500/dia',
          duration: '15 dias',
          images: request.images || []
        };
        
        // Analyze product profile with AI
        analysis = await this.aiService.analyzeProductProfile(productInfoForAnalysis);
        
        // Update template recommendations based on available templates
        analysis.templateRecommendations = this.templateService.getTemplateRecommendations(analysis.profile);
        
        // Generate images if templates are available
        if (analysis.templateRecommendations.length > 0) {
          logger.info(`Generating campaign images using ${analysis.templateRecommendations.length} templates`);
          generatedImages = await this.psdService.generateCampaignImages(productInfoForAnalysis, analysis);
        } else {
          logger.warn(`No templates available for profile: ${analysis.profile}`);
        }
      }

      // Generate AI chat response
      const chatResponse = await this.aiService.generateChatResponse(
        request.message,
        request.productInfo,
        request.images
      );

      // Build response
      const response: ChatResponse = {
        message: chatResponse,
        analysis,
        generatedImages: generatedImages.filter(img => img.success).map(img => ({
          url: img.webPath || img.outputPath || '',
          type: this.inferImageType(img.outputPath || ''),
          format: this.inferImageFormat(img.outputPath || ''),
          template: this.extractTemplateName(img.outputPath || '')
        }))
      };

      // Enhance response message if we have analysis
      if (analysis) {
        response.message = this.enhanceResponseWithAnalysis(chatResponse, analysis, generatedImages);
      }

      logger.info('Chat processing completed', {
        hasAnalysis: !!analysis,
        generatedCount: response.generatedImages?.length || 0
      });

      return response;

    } catch (error) {
      logger.error('Error processing chat message:', error);
      
      return {
        message: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente ou forneça mais informações sobre seu empreendimento.',
      };
    }
  }

  private shouldPerformAnalysis(request: ChatRequest): boolean {
    // Always perform analysis if we have product info with basic details
    if (request.productInfo) {
      const hasBasicInfo = !!(
        request.productInfo.description ||
        request.productInfo.target_audience ||
        request.productInfo.budget ||
        request.productInfo.location
      );
      
      if (hasBasicInfo) {
        logger.info('Analysis triggered: ProductInfo with basic information found');
        return true;
      }
    }

    // Also analyze if user is asking for image generation or analysis
    const analysisKeywords = ['gerar', 'criar', 'campanha', 'anúncio', 'template', 'perfil', 'análise', 'gere', 'monte'];
    const hasAnalysisIntent = analysisKeywords.some(keyword => 
      request.message.toLowerCase().includes(keyword)
    );

    if (hasAnalysisIntent) {
      logger.info('Analysis triggered: User intent detected with keywords');
      return true;
    }

    // Analyze if we have images (user probably wants to generate campaign)
    if (request.images && request.images.length > 0) {
      logger.info('Analysis triggered: Images uploaded');
      return true;
    }

    logger.info('Analysis not triggered: Insufficient information');
    return false;
  }

  private enhanceResponseWithAnalysis(
    originalResponse: string, 
    analysis: AIAnalysisResult, 
    generatedImages: ImageGenerationResult[]
  ): string {
    const successfulImages = generatedImages.filter(img => img.success);
    const failedImages = generatedImages.filter(img => !img.success);

    let enhancedResponse = originalResponse;

    // Add analysis summary
    enhancedResponse += `\n\n🎯 **Análise do Perfil:** ${analysis.profile.toUpperCase()} padrão (${analysis.confidence}% de confiança)`;
    enhancedResponse += `\n📝 **Justificativa:** ${analysis.reasoning}`;

    // Add image generation results
    if (successfulImages.length > 0) {
      enhancedResponse += `\n\n✅ **Imagens Geradas:** ${successfulImages.length} peça(s) criada(s) com sucesso`;
      
      // List generated images
      successfulImages.forEach((img, index) => {
        const type = this.inferImageType(img.outputPath || '');
        enhancedResponse += `\n  • ${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}`;
      });
      
      enhancedResponse += `\n\nAs imagens estão prontas para download e uso em suas campanhas! 🚀`;
    }

    // Add failure information if any
    if (failedImages.length > 0) {
      enhancedResponse += `\n\n⚠️ **Atenção:** ${failedImages.length} imagem(ns) não pôde(ram) ser gerada(s).`;
    }

    // Add recommendations
    if (analysis.templateRecommendations.length === 0) {
      enhancedResponse += `\n\n📋 **Recomendação:** Para gerar imagens personalizadas, certifique-se de que os templates PSD estão disponíveis para o perfil ${analysis.profile}.`;
    }

    return enhancedResponse;
  }

  private inferImageType(filePath: string): 'feed' | 'story' {
    return filePath.toLowerCase().includes('story') ? 'story' : 'feed';
  }

  private inferImageFormat(filePath: string): 'square' | 'portrait' {
    return filePath.toLowerCase().includes('story') ? 'portrait' : 'square';
  }

  private extractTemplateName(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    const parts = fileName.split('_');
    return parts.length > 2 ? `${parts[0]}_${parts[1]}` : 'unknown';
  }

  async getTemplateStatus(): Promise<{
    available: number;
    missing: number;
    details: any;
  }> {
    const templateList = this.templateService.listAllTemplates();
    
    return {
      available: templateList.available.length,
      missing: templateList.missing.length,
      details: templateList
    };
  }

  async initializeTemplates(): Promise<void> {
    logger.info('Initializing template system');
    this.templateService.createMockTemplates();
  }

  async analyzeProductOnly(productInfo: ProductInfo): Promise<AIAnalysisResult> {
    logger.info('Performing standalone product analysis');
    return await this.aiService.analyzeProductProfile(productInfo);
  }

  async generateImagesOnly(productInfo: ProductInfo, profile?: 'baixo' | 'medio' | 'alto'): Promise<ImageGenerationResult[]> {
    logger.info('Performing standalone image generation');
    
    let analysis: AIAnalysisResult;
    
    if (profile) {
      // Use provided profile
      analysis = {
        profile,
        confidence: 100,
        reasoning: 'Profile manually specified',
        templateRecommendations: this.templateService.getTemplateRecommendations(profile),
        textSuggestions: {
          feedTitle: 'Título Personalizado',
          feedSubtitle: 'Subtítulo Personalizado',
          feedCta: 'Saiba Mais',
          storyTitle: 'Título Story',
          storySubtitle: 'Subtítulo Story',
          storyCta: 'Fale Conosco',
          // Legacy fields for backward compatibility
          title: 'Título Personalizado',
          subtitle: 'Subtítulo Personalizado',
          cta: 'Saiba Mais'
        }
      };
    } else {
      // Analyze first
      analysis = await this.aiService.analyzeProductProfile(productInfo);
      analysis.templateRecommendations = this.templateService.getTemplateRecommendations(analysis.profile);
    }

    return await this.psdService.generateCampaignImages(productInfo, analysis);
  }
}