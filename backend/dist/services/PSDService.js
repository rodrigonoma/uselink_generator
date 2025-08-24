"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PSDService = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const node_1 = __importDefault(require("@cesdk/node"));
const psd_importer_1 = require("@imgly/psd-importer");
const pngjs_1 = require("pngjs");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
class PSDService {
    constructor() {
        this.customFontResolver = (font) => {
            const fontMap = {
                'Bebas Neue': 'file://' + path_1.default.resolve(__dirname, '../../fonts/BebasNeue Regular.otf'),
                'Bebas Neue Bold': 'file://' + path_1.default.resolve(__dirname, '../../fonts/BebasNeue Bold.otf'),
                'Bebas Neue Book': 'file://' + path_1.default.resolve(__dirname, '../../fonts/BebasNeue Book.otf'),
                'Bebas Neue Light': 'file://' + path_1.default.resolve(__dirname, '../../fonts/BebasNeue Light.otf'),
                'Bebas Neue Thin': 'file://' + path_1.default.resolve(__dirname, '../../fonts/BebasNeue Thin.otf'),
            };
            const fontPath = fontMap[font.family];
            if (fontPath && fs_1.default.existsSync(fontPath.replace('file://', ''))) {
                logger_1.default.debug(`Font resolved: ${font.family} -> ${fontPath}`);
                return fontPath;
            }
            logger_1.default.warn(`Font not found: ${font.family}, using default`);
            return 'file://' + path_1.default.resolve(__dirname, '../../fonts/BebasNeue Regular.otf');
        };
    }
    async generateCampaignImages(productInfo, analysis) {
        logger_1.default.info('Starting campaign image generation', {
            profile: analysis.profile,
            templateCount: analysis.templateRecommendations.length
        });
        const results = [];
        for (let i = 0; i < analysis.templateRecommendations.length; i++) {
            const templateName = analysis.templateRecommendations[i];
            try {
                const templatePath = this.getTemplatePath(templateName);
                if (!fs_1.default.existsSync(templatePath)) {
                    logger_1.default.warn(`Template not found: ${templatePath}`);
                    continue;
                }
                const outputFileName = `${analysis.profile}_${templateName}_${Date.now()}.png`;
                const outputPath = path_1.default.join(config_1.default.output.directory, outputFileName);
                const result = await this.generateImageFromTemplate(templatePath, productInfo, analysis, outputPath, i);
                if (result.success) {
                    result.webPath = `/output/${outputFileName}`;
                }
                results.push(result);
            }
            catch (error) {
                logger_1.default.error(`Error generating image for template ${templateName}:`, error);
                results.push({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        logger_1.default.info(`Campaign generation completed: ${results.filter(r => r.success).length}/${results.length} successful`);
        return results;
    }
    getTemplatePath(templateName) {
        const templateConfig = this.getTemplateConfig(templateName);
        if (templateConfig) {
            return path_1.default.join(config_1.default.templates.directory, templateConfig.psdPath);
        }
        return path_1.default.join(config_1.default.templates.directory, `${templateName}.psd`);
    }
    getTemplateConfig(templateName) {
        const { TemplateService } = require('./TemplateService');
        const templateService = new TemplateService();
        return templateService.getTemplateByName(templateName);
    }
    async generateImageFromTemplate(templatePath, productInfo, analysis, outputPath, templateIndex = 0) {
        logger_1.default.info(`Generating image from template: ${templatePath}`);
        try {
            const psdBuffer = fs_1.default.readFileSync(templatePath);
            const extractedData = await this.extractPSDData(psdBuffer);
            const modifiedData = this.applyProductDataToLayers(extractedData, productInfo, analysis, templateIndex);
            const result = await this.generateSingleImage(psdBuffer, modifiedData, outputPath, analysis);
            return result;
        }
        catch (error) {
            logger_1.default.error(`Error in generateImageFromTemplate:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    applyProductDataToLayers(extractedData, productInfo, analysis, templateIndex = 0) {
        logger_1.default.info('Applying product data to layers', { templateIndex });
        const modifiedData = { ...extractedData };
        const isStoryTemplate = analysis.templateRecommendations[templateIndex]?.includes('story');
        const textSuggestions = this.createTextVariations(productInfo, analysis, templateIndex, isStoryTemplate);
        Object.keys(modifiedData).forEach(layerName => {
            const layer = modifiedData[layerName];
            const layerLower = layerName.toLowerCase();
            // Be more specific to avoid conflicts and prioritize main elements
            if (layerLower === 'titulo_principal' || layerLower === 'title_main') {
                layer.text = textSuggestions.title;
                logger_1.default.info(`Set main title for ${layerName}: "${layer.text}"`);
            }
            else if (layerLower === 'subtitulo' || layerLower === 'subtitle') {
                layer.text = textSuggestions.subtitle;
                logger_1.default.info(`Set subtitle for ${layerName}: "${layer.text}"`);
            }
            else if (layerLower === 'botao_cta' || layerLower === 'cta_button') {
                layer.text = textSuggestions.cta;
                logger_1.default.info(`Set CTA button for ${layerName}: "${layer.text}"`);
            }
            else if (layerLower === 'preco' || layerLower === 'price') {
                layer.text = textSuggestions.price || 'Consulte valores';
                logger_1.default.info(`Set price for ${layerName}: "${layer.text}"`);
            }
            else if (layerLower === 'localizacao' || layerLower === 'location') {
                layer.text = productInfo.location || 'São Paulo - SP';
                logger_1.default.info(`Set location for ${layerName}: "${layer.text}"`);
            }
            else if (layerLower.includes('description') || layerLower.includes('descricao')) {
                layer.text = this.truncateText(productInfo.description || 'Descrição do empreendimento', isStoryTemplate ? 80 : 100);
                logger_1.default.info(`Set description for ${layerName}: "${layer.text}"`);
            }
            else if (layerLower.includes('fundo') && layerLower.includes('cta')) {
                // Skip background CTA elements to avoid duplication
                logger_1.default.debug(`Skipping background CTA element: ${layerName}`);
            }
            else if (layerLower.includes('fundo') && layerLower.includes('preco')) {
                // Skip background price elements to avoid duplication  
                logger_1.default.debug(`Skipping background price element: ${layerName}`);
            }
            else if (layerLower.includes('titulo') && layerLower.includes('preco')) {
                // Skip price title elements to avoid duplication
                logger_1.default.debug(`Skipping price title element: ${layerName}`);
            }
            else if (layerLower.includes('fundo') && layerLower.includes('localizacao')) {
                // Skip background location elements
                logger_1.default.debug(`Skipping background location element: ${layerName}`);
            }
            this.applyProfileStyling(layer, analysis.profile, templateIndex, analysis.colorSuggestions);
        });
        if (productInfo.images && productInfo.images.length > 0) {
            Object.keys(modifiedData).forEach(layerName => {
                const layerLower = layerName.toLowerCase();
                if (layerLower.includes('image') || layerLower.includes('foto') || layerLower.includes('picture') || layerLower.includes('img')) {
                    const layer = modifiedData[layerName];
                    if (!layer.fill) {
                        layer.fill = {};
                    }
                    const imageIndex = templateIndex < productInfo.images.length ? templateIndex : templateIndex % productInfo.images.length;
                    layer.fill['fill/image/imageFileURI'] = productInfo.images[imageIndex];
                    logger_1.default.info(`Set image ${imageIndex} for ${layerName} (template ${templateIndex}): ${productInfo.images[imageIndex].substring(0, 50)}...`);
                }
            });
        }
        logger_1.default.info(`Modified ${Object.keys(modifiedData).length} layers with product data for template ${templateIndex}`);
        return modifiedData;
    }
    createTextVariations(productInfo, analysis, templateIndex, isStoryTemplate) {
        // Use AI suggestions if available, fallback to legacy or defaults
        const suggestions = analysis.textSuggestions;
        if (isStoryTemplate) {
            return {
                title: suggestions?.storyTitle || suggestions?.title || 'Oportunidade Única!',
                subtitle: suggestions?.storySubtitle || `${analysis.profile.toUpperCase()} PADRÃO`,
                cta: suggestions?.storyCta || suggestions?.cta || 'FALE CONOSCO',
                price: suggestions?.price || 'Consulte valores'
            };
        }
        else {
            return {
                title: suggestions?.feedTitle || suggestions?.title || 'Novo Empreendimento',
                subtitle: suggestions?.feedSubtitle || `${analysis.profile.toUpperCase()} PADRÃO - Qualidade Garantida`,
                cta: suggestions?.feedCta || suggestions?.cta || 'SAIBA MAIS',
                price: suggestions?.price || 'A partir de R$ 350.000'
            };
        }
    }
    applyProfileStyling(layer, profile, templateIndex = 0, aiColors) {
        // Use AI color suggestions if available, otherwise fallback to default profile colors
        const defaultProfileStyles = {
            baixo: {
                primaryColor: { r: 0.2, g: 0.6, b: 0.9, a: 1 },
                secondaryColor: { r: 0.1, g: 0.4, b: 0.8, a: 1 },
                fontSize: 1.0,
            },
            medio: {
                primaryColor: { r: 0.3, g: 0.7, b: 0.2, a: 1 },
                secondaryColor: { r: 0.2, g: 0.5, b: 0.1, a: 1 },
                fontSize: 1.1,
            },
            alto: {
                primaryColor: { r: 0.8, g: 0.6, b: 0.2, a: 1 },
                secondaryColor: { r: 0.6, g: 0.4, b: 0.1, a: 1 },
                fontSize: 1.2,
            }
        };
        const style = defaultProfileStyles[profile];
        const layerLower = layer.name?.toLowerCase() || '';
        // Determine color based on element type and AI suggestions
        let colorToUse;
        if (aiColors) {
            if (layerLower.includes('cta') || layerLower.includes('botao')) {
                colorToUse = aiColors.ctaButton || style.primaryColor;
            }
            else if (templateIndex === 0) {
                colorToUse = aiColors.primaryTitle || style.primaryColor;
            }
            else {
                colorToUse = aiColors.secondaryTitle || style.secondaryColor;
            }
        }
        else {
            colorToUse = templateIndex === 0 ? style.primaryColor : style.secondaryColor;
        }
        // Apply colors to text elements
        if (layer.fill && (layerLower.includes('title') || layerLower.includes('cta') || layerLower.includes('botao'))) {
            layer.fill.r = colorToUse.r;
            layer.fill.g = colorToUse.g;
            layer.fill.b = colorToUse.b;
            layer.fill.a = colorToUse.a;
            logger_1.default.debug(`Applied AI color to ${layer.name}:`, colorToUse);
        }
        // Apply font size adjustments
        if (layer.fontSize) {
            const sizeMultiplier = templateIndex === 0 ? style.fontSize : style.fontSize * 0.9;
            layer.fontSize = layer.fontSize * sizeMultiplier;
        }
    }
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength)
            return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    async extractPSDData(fileBuffer) {
        logger_1.default.info('Starting PSD data extraction');
        try {
            const instance = await node_1.default.init({
                license: process.env.CESDK_LICENSE || '',
                userId: process.env.CESDK_USER_ID || 'default-user',
                callbacks: {
                    onAssetResolve: {
                        typeface: this.customFontResolver,
                    },
                },
            });
            try {
                // Mock for ly.img.google-fonts
                instance.asset.addLocalSource('ly.img.google-fonts', {
                    type: 'ly.img.asset.typeface',
                    payload: {
                        typefaces: []
                    }
                });
                // Convert Buffer to ArrayBuffer
                const psdArrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
                logger_1.default.info(`PSD ArrayBuffer size: ${psdArrayBuffer.byteLength} bytes`);
                // Use PSDParser.fromFile like the original working version
                const psdParser = await psd_importer_1.PSDParser.fromFile(instance, psdArrayBuffer, (0, psd_importer_1.createPNGJSEncodeBufferToPNG)(pngjs_1.PNG));
                await psdParser.parse();
                const extractedData = {};
                const allBlocks = instance.block.findAll();
                for (const blockId of allBlocks) {
                    const name = instance.block.getName(blockId);
                    const type = instance.block.getType(blockId);
                    if (name) { // Only process named blocks
                        const layerData = {
                            type,
                            name,
                        };
                        // Extract all properties like the original working version
                        const blockProperties = instance.block.findAllProperties(blockId);
                        for (const propPath of blockProperties) {
                            try {
                                let value;
                                // Try different methods based on property path
                                if (propPath.includes('color')) {
                                    value = instance.block.getColor(blockId, propPath);
                                }
                                else if (propPath.includes('text') || propPath.includes('uri') || propPath.includes('name') || propPath.includes('type') || propPath.includes('identifier')) {
                                    value = instance.block.getString(blockId, propPath);
                                }
                                else if (propPath.includes('size') || propPath.includes('width') || propPath.includes('height') || propPath.includes('x') || propPath.includes('y') || propPath.includes('weight') || propPath.includes('opacity')) {
                                    value = instance.block.getFloat(blockId, propPath);
                                }
                                else if (propPath.includes('enabled') || propPath.includes('visible') || propPath.includes('clipped')) {
                                    value = instance.block.getBool(blockId, propPath);
                                }
                                else {
                                    // Try as string first, then float as fallback
                                    try {
                                        value = instance.block.getString(blockId, propPath);
                                    }
                                    catch (e) {
                                        try {
                                            value = instance.block.getFloat(blockId, propPath);
                                        }
                                        catch (e) {
                                            continue;
                                        }
                                    }
                                }
                                layerData[propPath] = value;
                            }
                            catch (e) {
                                logger_1.default.debug(`Could not extract property ${propPath} for ${name}: ${e instanceof Error ? e.message : String(e)}`);
                            }
                        }
                        // Extract fill properties if available
                        try {
                            const fillId = instance.block.getFill(blockId);
                            if (fillId) {
                                layerData.fill = {};
                                const fillProperties = instance.block.findAllProperties(fillId);
                                for (const fillPropPath of fillProperties) {
                                    try {
                                        let fillValue;
                                        if (fillPropPath.includes('color')) {
                                            fillValue = instance.block.getColor(fillId, fillPropPath);
                                        }
                                        else if (fillPropPath.includes('uri') || fillPropPath.includes('type')) {
                                            fillValue = instance.block.getString(fillId, fillPropPath);
                                        }
                                        else {
                                            try {
                                                fillValue = instance.block.getString(fillId, fillPropPath);
                                            }
                                            catch (e) {
                                                try {
                                                    fillValue = instance.block.getFloat(fillId, fillPropPath);
                                                }
                                                catch (e) {
                                                    continue;
                                                }
                                            }
                                        }
                                        layerData.fill[fillPropPath] = fillValue;
                                    }
                                    catch (e) {
                                        logger_1.default.debug(`Could not extract fill property ${fillPropPath} for ${name}: ${e instanceof Error ? e.message : String(e)}`);
                                    }
                                }
                            }
                        }
                        catch (e) {
                            logger_1.default.debug(`Could not extract fill for ${name}: ${e instanceof Error ? e.message : String(e)}`);
                        }
                        extractedData[name] = layerData;
                    }
                }
                logger_1.default.info(`PSD data extraction completed. Found ${Object.keys(extractedData).length} layers`);
                return extractedData;
            }
            finally {
                await instance.dispose();
            }
        }
        catch (error) {
            logger_1.default.error('Error extracting PSD data:', error);
            throw new Error('Failed to extract PSD data');
        }
    }
    async generateSingleImage(psdBuffer, layerData, outputPath, analysis) {
        logger_1.default.info(`Starting image generation for: ${outputPath}`);
        try {
            const instance = await node_1.default.init({
                license: process.env.CESDK_LICENSE || '',
                userId: process.env.CESDK_USER_ID || 'default-user',
                callbacks: {
                    onAssetResolve: {
                        typeface: this.customFontResolver,
                    },
                },
            });
            try {
                // Mock for ly.img.google-fonts
                instance.asset.addLocalSource('ly.img.google-fonts', {
                    type: 'ly.img.asset.typeface',
                    payload: {
                        typefaces: []
                    }
                });
                // Convert Buffer to ArrayBuffer
                const psdArrayBuffer = psdBuffer.buffer.slice(psdBuffer.byteOffset, psdBuffer.byteOffset + psdBuffer.byteLength);
                logger_1.default.info(`PSD ArrayBuffer size: ${psdArrayBuffer.byteLength} bytes`);
                // Use PSDParser.fromFile like the original working version
                const psdParser = await psd_importer_1.PSDParser.fromFile(instance, psdArrayBuffer, (0, psd_importer_1.createPNGJSEncodeBufferToPNG)(pngjs_1.PNG));
                await psdParser.parse();
                // Apply modifications
                await this.applyLayerModifications(instance, layerData, analysis);
                // Find the page block for export
                const pageBlock = instance.block.findByType('page')[0];
                if (!pageBlock) {
                    throw new Error('No page block found in scene');
                }
                // Generate image
                const result = await instance.block.export(pageBlock, 'image/png');
                const imageBuffer = Buffer.from(await result.arrayBuffer());
                // Ensure output directory exists
                const outputDir = path_1.default.dirname(outputPath);
                if (!fs_1.default.existsSync(outputDir)) {
                    fs_1.default.mkdirSync(outputDir, { recursive: true });
                }
                // Save image
                fs_1.default.writeFileSync(outputPath, imageBuffer);
                if (fs_1.default.existsSync(outputPath)) {
                    logger_1.default.info(`Image generated successfully: ${outputPath}`);
                    return {
                        success: true,
                        outputPath,
                        message: 'Image generated successfully',
                    };
                }
                else {
                    throw new Error('File was not created');
                }
            }
            finally {
                await instance.dispose();
            }
        }
        catch (error) {
            logger_1.default.error(`Error generating image ${outputPath}:`, error);
            return {
                success: false,
                message: 'Failed to generate image',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async applyLayerModifications(instance, layerData, analysis) {
        logger_1.default.info(`Starting to apply modifications to ${Object.keys(layerData).length} layers`);
        // Use findAll() like in extraction to get all blocks
        const allBlocks = instance.block.findAll();
        logger_1.default.info(`Found ${allBlocks.length} total blocks in scene`);
        for (const blockId of allBlocks) {
            const blockName = instance.block.getName(blockId);
            if (!blockName || !layerData[blockName])
                continue;
            const modifications = layerData[blockName];
            logger_1.default.info(`Applying modifications to layer: ${blockName}`, modifications);
            try {
                // Apply text modifications
                if (modifications.text !== undefined) {
                    logger_1.default.info(`Setting text for ${blockName}: "${modifications.text}"`);
                    instance.block.setString(blockId, 'text/text', modifications.text);
                }
                if (modifications.fontSize !== undefined) {
                    logger_1.default.info(`Setting font size for ${blockName}: ${modifications.fontSize}`);
                    instance.block.setFloat(blockId, 'text/fontSize', modifications.fontSize);
                }
                // Apply color modifications
                if (modifications.fill && typeof modifications.fill === 'object' && 'r' in modifications.fill) {
                    const fillBlock = instance.block.getFill(blockId);
                    if (fillBlock) {
                        logger_1.default.info(`Setting color for ${blockName}:`, modifications.fill);
                        instance.block.setFloat(fillBlock, 'fill/solid/color/r', modifications.fill.r);
                        instance.block.setFloat(fillBlock, 'fill/solid/color/g', modifications.fill.g);
                        instance.block.setFloat(fillBlock, 'fill/solid/color/b', modifications.fill.b);
                        instance.block.setFloat(fillBlock, 'fill/solid/color/a', modifications.fill.a);
                    }
                }
                // Apply image modifications
                if (modifications.fill && modifications.fill['fill/image/imageFileURI']) {
                    logger_1.default.info(`Setting image for ${blockName}: ${modifications.fill['fill/image/imageFileURI']}`);
                    const fillBlock = instance.block.getFill(blockId);
                    if (fillBlock) {
                        instance.block.setString(fillBlock, 'fill/image/imageFileURI', modifications.fill['fill/image/imageFileURI']);
                    }
                }
                // Apply advanced visual effects from AI
                await this.applyAdvancedEffects(instance, blockId, blockName, analysis);
                // Apply dynamic positioning based on AI layout strategy
                await this.applyDynamicPositioning(instance, blockId, blockName, analysis);
                // Apply transform modifications
                if (modifications.transform) {
                    instance.block.setFloat(blockId, 'transform/x', modifications.transform.x);
                    instance.block.setFloat(blockId, 'transform/y', modifications.transform.y);
                    instance.block.setFloat(blockId, 'transform/width', modifications.transform.width);
                    instance.block.setFloat(blockId, 'transform/height', modifications.transform.height);
                }
                logger_1.default.info(`Successfully applied modifications to layer: ${blockName}`);
            }
            catch (error) {
                logger_1.default.error(`Failed to apply modifications to layer ${blockName}:`, error);
            }
        }
        logger_1.default.info('Finished applying layer modifications');
    }
    async applyAdvancedEffects(instance, blockId, blockName, analysis) {
        const layerLower = blockName.toLowerCase();
        // Get AI visual effects suggestions
        const effects = analysis?.visualEffects;
        if (!effects) {
            logger_1.default.debug(`No visual effects available for ${blockName}`);
            return;
        }
        try {
            // Apply blur effects
            if (layerLower.includes('fundo') || layerLower.includes('background')) {
                // Background blur for depth effect
                instance.block.setBool(blockId, 'blur/enabled', true);
                logger_1.default.info(`Applied blur to background layer: ${blockName}`);
            }
            // Apply drop shadow to CTA buttons for prominence
            if ((layerLower.includes('cta') || layerLower.includes('botao')) && effects.ctaDropShadow) {
                instance.block.setBool(blockId, 'dropShadow/enabled', true);
                instance.block.setFloat(blockId, 'dropShadow/blurRadius/x', 4);
                instance.block.setFloat(blockId, 'dropShadow/blurRadius/y', 4);
                instance.block.setFloat(blockId, 'dropShadow/offset/x', 2);
                instance.block.setFloat(blockId, 'dropShadow/offset/y', 2);
                // Set shadow color (dark semi-transparent)
                instance.block.setFloat(blockId, 'dropShadow/color/r', 0);
                instance.block.setFloat(blockId, 'dropShadow/color/g', 0);
                instance.block.setFloat(blockId, 'dropShadow/color/b', 0);
                instance.block.setFloat(blockId, 'dropShadow/color/a', 0.4);
                logger_1.default.info(`Applied drop shadow to CTA: ${blockName}`);
            }
            // Apply text stroke for better readability
            if ((layerLower.includes('titulo') || layerLower.includes('title') || layerLower.includes('preco')) && effects.textStroke) {
                instance.block.setBool(blockId, 'stroke/enabled', true);
                instance.block.setFloat(blockId, 'stroke/width', effects.strokeWidth);
                // White stroke for contrast
                instance.block.setFloat(blockId, 'stroke/color/r', 1);
                instance.block.setFloat(blockId, 'stroke/color/g', 1);
                instance.block.setFloat(blockId, 'stroke/color/b', 1);
                instance.block.setFloat(blockId, 'stroke/color/a', 0.8);
                logger_1.default.info(`Applied text stroke to: ${blockName}`);
            }
            // Apply background opacity for better text contrast
            if (layerLower.includes('fundo') && !layerLower.includes('localizacao')) {
                instance.block.setFloat(blockId, 'opacity', effects.backgroundOpacity);
                logger_1.default.info(`Applied opacity ${effects.backgroundOpacity} to: ${blockName}`);
            }
            // Apply corner radius to background elements
            if (layerLower.includes('fundo') && layerLower.includes('cta')) {
                instance.block.setBool(blockId, 'backgroundColor/enabled', true);
                instance.block.setFloat(blockId, 'backgroundColor/cornerRadius', effects.cornerRadius);
                logger_1.default.info(`Applied corner radius ${effects.cornerRadius} to: ${blockName}`);
            }
            // Enhanced positioning for better hierarchy
            if (layerLower.includes('titulo_principal') || layerLower.includes('title_main')) {
                // Increase font size for main titles
                const currentFontSize = instance.block.getFloat(blockId, 'text/fontSize') || 24;
                instance.block.setFloat(blockId, 'text/fontSize', currentFontSize * 1.2);
                logger_1.default.info(`Enhanced main title font size for: ${blockName}`);
            }
            // Price elements get special treatment
            if (layerLower.includes('preco') && !layerLower.includes('titulo')) {
                // Make price more prominent
                const currentFontSize = instance.block.getFloat(blockId, 'text/fontSize') || 20;
                instance.block.setFloat(blockId, 'text/fontSize', currentFontSize * 1.1);
                // Add subtle glow effect through stroke
                instance.block.setBool(blockId, 'stroke/enabled', true);
                instance.block.setFloat(blockId, 'stroke/width', 1);
                instance.block.setFloat(blockId, 'stroke/color/r', 1);
                instance.block.setFloat(blockId, 'stroke/color/g', 0.9);
                instance.block.setFloat(blockId, 'stroke/color/b', 0.3);
                instance.block.setFloat(blockId, 'stroke/color/a', 0.6);
                logger_1.default.info(`Enhanced price styling for: ${blockName}`);
            }
        }
        catch (error) {
            logger_1.default.warn(`Failed to apply advanced effects to ${blockName}:`, error);
        }
    }
    async applyDynamicPositioning(instance, blockId, blockName, analysis) {
        const layerLower = blockName.toLowerCase();
        // Get AI layout strategy
        const layoutStrategy = analysis?.layoutStrategy;
        if (!layoutStrategy) {
            logger_1.default.debug(`No layout strategy available for ${blockName}`);
            return;
        }
        try {
            // Get current position and dimensions
            const currentX = instance.block.getFloat(blockId, 'position/x') || 0;
            const currentY = instance.block.getFloat(blockId, 'position/y') || 0;
            const width = instance.block.getFloat(blockId, 'width') || 0;
            const height = instance.block.getFloat(blockId, 'height') || 0;
            // Apply positioning based on element type and AI strategy
            // Title positioning - higher priority titles get more prominent positions
            if (layerLower.includes('titulo_principal') || layerLower.includes('title_main')) {
                const titlePriority = layoutStrategy.titlePriority || 1;
                const offsetY = titlePriority > 3 ? -20 : titlePriority > 1 ? -10 : 0;
                const newY = Math.max(50, currentY + offsetY); // Ensure it doesn't go off screen
                instance.block.setFloat(blockId, 'position/y', newY);
                logger_1.default.info(`Adjusted main title position for ${blockName}: Y ${currentY} -> ${newY}`);
            }
            // Subtitle positioning - place relative to title priority
            if (layerLower.includes('subtitulo') || layerLower.includes('subtitle')) {
                const titlePriority = layoutStrategy.titlePriority || 1;
                const spacing = titlePriority > 3 ? 40 : titlePriority > 1 ? 30 : 20;
                const newY = currentY + spacing;
                instance.block.setFloat(blockId, 'position/y', newY);
                logger_1.default.info(`Adjusted subtitle position for ${blockName}: spacing +${spacing}px`);
            }
            // CTA positioning based on strategy
            if (layerLower.includes('cta') || layerLower.includes('botao')) {
                const ctaPosition = layoutStrategy.ctaPosition || 'bottom';
                let newY = currentY;
                let newX = currentX;
                switch (ctaPosition) {
                    case 'top':
                        newY = Math.max(100, currentY - 50);
                        break;
                    case 'center':
                        newY = 540; // Middle of typical 1080px canvas
                        break;
                    case 'bottom':
                        newY = Math.min(1000, currentY + 50);
                        break;
                }
                // Center horizontally for better prominence
                if (layoutStrategy.titlePriority && layoutStrategy.titlePriority > 2) {
                    newX = (1080 - width) / 2; // Center in 1080px width
                }
                instance.block.setFloat(blockId, 'position/y', newY);
                instance.block.setFloat(blockId, 'position/x', newX);
                logger_1.default.info(`Adjusted CTA position for ${blockName}: (${currentX}, ${currentY}) -> (${newX}, ${newY})`);
            }
            // Image positioning - focus strategy
            if ((layerLower.includes('image') || layerLower.includes('foto') || layerLower.includes('imagem')) && layoutStrategy.imageFocus) {
                // Move image more centrally if image focus is enabled
                const centerX = (1080 - width) / 2;
                const centerY = (1080 - height) / 2;
                // Apply some offset from perfect center for visual interest
                const offsetX = (Math.random() - 0.5) * 100; // Random offset up to 50px each side
                const offsetY = (Math.random() - 0.5) * 100;
                const newX = centerX + offsetX;
                const newY = centerY + offsetY;
                instance.block.setFloat(blockId, 'position/x', newX);
                instance.block.setFloat(blockId, 'position/y', newY);
                logger_1.default.info(`Applied image focus positioning for ${blockName}: (${currentX}, ${currentY}) -> (${newX}, ${newY})`);
            }
            // Price positioning - make it more prominent
            if (layerLower.includes('preco') && !layerLower.includes('titulo')) {
                const prominentY = currentY - 15; // Move up slightly for more visibility
                const prominentX = currentX + 10; // Move right slightly
                instance.block.setFloat(blockId, 'position/y', prominentY);
                instance.block.setFloat(blockId, 'position/x', prominentX);
                logger_1.default.info(`Enhanced price positioning for ${blockName}: (${currentX}, ${currentY}) -> (${prominentX}, ${prominentY})`);
            }
            // Avoid overlap strategy
            if (layoutStrategy.avoidOverlap) {
                // Add margin to text elements to prevent overlap
                if (layerLower.includes('titulo') || layerLower.includes('subtitulo') || layerLower.includes('texto')) {
                    const margin = 5;
                    const newX = Math.max(margin, currentX);
                    const newY = Math.max(margin, currentY);
                    instance.block.setFloat(blockId, 'position/x', newX);
                    instance.block.setFloat(blockId, 'position/y', newY);
                    logger_1.default.info(`Applied overlap avoidance for ${blockName}: margin ${margin}px`);
                }
            }
        }
        catch (error) {
            logger_1.default.warn(`Failed to apply dynamic positioning to ${blockName}:`, error);
        }
    }
}
exports.PSDService = PSDService;
//# sourceMappingURL=PSDService.js.map