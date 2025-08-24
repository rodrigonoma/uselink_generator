"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const AIService_1 = require("./AIService");
const PSDService_1 = require("./PSDService");
const TemplateService_1 = require("./TemplateService");
class CampaignService {
    constructor() {
        this.aiService = new AIService_1.AIService();
        this.psdService = new PSDService_1.PSDService();
        this.templateService = new TemplateService_1.TemplateService();
    }
    async processChatMessage(request) {
        logger_1.default.info('Processing chat message', {
            hasImages: !!(request.images && request.images.length > 0),
            hasProductInfo: !!request.productInfo,
            messageLength: request.message.length
        });
        try {
            let analysis;
            let generatedImages = [];
            // Check if we have enough information to perform analysis and generation
            const shouldAnalyze = this.shouldPerformAnalysis(request);
            if (shouldAnalyze) {
                logger_1.default.info('Performing AI analysis of product');
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
                    logger_1.default.info(`Generating campaign images using ${analysis.templateRecommendations.length} templates`);
                    generatedImages = await this.psdService.generateCampaignImages(productInfoForAnalysis, analysis);
                }
                else {
                    logger_1.default.warn(`No templates available for profile: ${analysis.profile}`);
                }
            }
            // Generate AI chat response
            const chatResponse = await this.aiService.generateChatResponse(request.message, request.productInfo, request.images);
            // Build response
            const response = {
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
            logger_1.default.info('Chat processing completed', {
                hasAnalysis: !!analysis,
                generatedCount: response.generatedImages?.length || 0
            });
            return response;
        }
        catch (error) {
            logger_1.default.error('Error processing chat message:', error);
            return {
                message: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente ou forneça mais informações sobre seu empreendimento.',
            };
        }
    }
    shouldPerformAnalysis(request) {
        // Always perform analysis if we have product info with basic details
        if (request.productInfo) {
            const hasBasicInfo = !!(request.productInfo.description ||
                request.productInfo.target_audience ||
                request.productInfo.budget ||
                request.productInfo.location);
            if (hasBasicInfo) {
                logger_1.default.info('Analysis triggered: ProductInfo with basic information found');
                return true;
            }
        }
        // Also analyze if user is asking for image generation or analysis
        const analysisKeywords = ['gerar', 'criar', 'campanha', 'anúncio', 'template', 'perfil', 'análise', 'gere', 'monte'];
        const hasAnalysisIntent = analysisKeywords.some(keyword => request.message.toLowerCase().includes(keyword));
        if (hasAnalysisIntent) {
            logger_1.default.info('Analysis triggered: User intent detected with keywords');
            return true;
        }
        // Analyze if we have images (user probably wants to generate campaign)
        if (request.images && request.images.length > 0) {
            logger_1.default.info('Analysis triggered: Images uploaded');
            return true;
        }
        logger_1.default.info('Analysis not triggered: Insufficient information');
        return false;
    }
    enhanceResponseWithAnalysis(originalResponse, analysis, generatedImages) {
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
    inferImageType(filePath) {
        return filePath.toLowerCase().includes('story') ? 'story' : 'feed';
    }
    inferImageFormat(filePath) {
        return filePath.toLowerCase().includes('story') ? 'portrait' : 'square';
    }
    extractTemplateName(filePath) {
        const fileName = filePath.split('/').pop() || '';
        const parts = fileName.split('_');
        return parts.length > 2 ? `${parts[0]}_${parts[1]}` : 'unknown';
    }
    async getTemplateStatus() {
        const templateList = this.templateService.listAllTemplates();
        return {
            available: templateList.available.length,
            missing: templateList.missing.length,
            details: templateList
        };
    }
    async initializeTemplates() {
        logger_1.default.info('Initializing template system');
        this.templateService.createMockTemplates();
    }
    async analyzeProductOnly(productInfo) {
        logger_1.default.info('Performing standalone product analysis');
        return await this.aiService.analyzeProductProfile(productInfo);
    }
    async generateImagesOnly(productInfo, profile) {
        logger_1.default.info('Performing standalone image generation');
        let analysis;
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
        }
        else {
            // Analyze first
            analysis = await this.aiService.analyzeProductProfile(productInfo);
            analysis.templateRecommendations = this.templateService.getTemplateRecommendations(analysis.profile);
        }
        return await this.psdService.generateCampaignImages(productInfo, analysis);
    }
}
exports.CampaignService = CampaignService;
//# sourceMappingURL=CampaignService.js.map