import path from 'path';
import fs from 'fs';
import CreativeEngine from '@cesdk/node';
import { PSDParser, createPNGJSEncodeBufferToPNG } from '@imgly/psd-importer';
import { PNG } from 'pngjs';
import config from '../config';
import logger from '../utils/logger';
import { PSDExtractedData, PSDLayerData, ImageGenerationResult, ProductInfo, AIAnalysisResult } from '../models';

export class PSDService {
  private readonly customFontResolver = (font: { family: string }): string => {
    const fontMap: Record<string, string> = {
      'Bebas Neue': 'file://' + path.resolve(__dirname, '../../fonts/BebasNeue Regular.otf'),
      'Bebas Neue Bold': 'file://' + path.resolve(__dirname, '../../fonts/BebasNeue Bold.otf'),
      'Bebas Neue Book': 'file://' + path.resolve(__dirname, '../../fonts/BebasNeue Book.otf'),
      'Bebas Neue Light': 'file://' + path.resolve(__dirname, '../../fonts/BebasNeue Light.otf'),
      'Bebas Neue Thin': 'file://' + path.resolve(__dirname, '../../fonts/BebasNeue Thin.otf'),
      'Inter 28pt': 'file://' + path.resolve(__dirname, '../../fonts/Inter 28pt.ttf'),
      'Inter 28pt Bold': 'file://' + path.resolve(__dirname, '../../fonts/Inter_28pt-Bold.ttf'),
    };

    const fontPath = fontMap[font.family];
    if (fontPath && fs.existsSync(fontPath.replace('file://', ''))) {
      logger.debug(`Font resolved: ${font.family} -> ${fontPath}`);
      return fontPath;
    }

    logger.warn(`Font not found: ${font.family}, using default`);
    return 'file://' + path.resolve(__dirname, '../../fonts/BebasNeue Regular.otf');
  };

  async generateCampaignImages(
    productInfo: ProductInfo,
    analysis: AIAnalysisResult
  ): Promise<ImageGenerationResult[]> {
    logger.info('Starting campaign image generation', {
      profile: analysis.profile,
      templateCount: analysis.templateRecommendations.length,
      uploadedImages: productInfo.images // Add this line
    });

    const results: ImageGenerationResult[] = [];

    for (let i = 0; i < analysis.templateRecommendations.length; i++) {
      const templateName = analysis.templateRecommendations[i];
      const currentImageUri = productInfo.images[i % productInfo.images.length]; // Cycle through images

      try {
        const templatePath = this.getTemplatePath(templateName);

        if (!fs.existsSync(templatePath)) {
          logger.warn(`Template not found: ${templatePath}`);
          continue;
        }

        const outputFileName = `${analysis.profile}_${templateName}_${Date.now()}.png`;
        const outputPath = path.join(config.output.directory, outputFileName);

        const result = await this.generateImageFromTemplate(
          templatePath,
          productInfo,
          analysis,
          outputPath,
          i, // Pass the correct templateIndex
          currentImageUri
        );

        if (result.success) {
          result.webPath = `/output/${outputFileName}`;
        }

        results.push(result);

      } catch (error) {
        logger.error(`Error generating image for template ${templateName} with image ${currentImageUri}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info(`Campaign generation completed: ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
  }

  private getTemplatePath(templateName: string): string {
    const templateConfig = this.getTemplateConfig(templateName);
    if (templateConfig) {
      return path.join(config.templates.directory, templateConfig.psdPath);
    }
    
    return path.join(config.templates.directory, `${templateName}.psd`);
  }

  private getTemplateConfig(templateName: string): any {
    const { TemplateService } = require('./TemplateService');
    const templateService = new TemplateService();
    return templateService.getTemplateByName(templateName);
  }

  private async generateImageFromTemplate(
    templatePath: string,
    productInfo: ProductInfo,
    analysis: AIAnalysisResult,
    outputPath: string,
    templateIndex: number = 0,
    currentImageUri?: string // New parameter
  ): Promise<ImageGenerationResult> {
    logger.info(`[Optimized] Generating image from template: ${templatePath}`);

    // AI SIMULATION FOR ROTATION (Objective C)
    if (!analysis.visualEffects) {
      analysis.visualEffects = {} as any;
    }
    if (!analysis.visualEffects.rotation) {
      analysis.visualEffects.rotation = { subtitle: -3.5 }; // Rotate subtitle
      logger.info('AI Simulation: Injected rotation suggestion for subtitle.');
    }

    let instance: any;

    try {
      // OPTIMIZATION: Initialize Engine ONCE (Objective B)
      instance = await CreativeEngine.init({
        license: process.env.CESDK_LICENSE || '',
        userId: process.env.CESDK_USER_ID || 'default-user',
        callbacks: { onAssetResolve: { typeface: this.customFontResolver } },
      } as any);

      instance.asset.addLocalSource('ly.img.google-fonts', {
        type: 'ly.img.asset.typeface',
        payload: { typefaces: [] }
      } as any);

      const psdBuffer = fs.readFileSync(templatePath);
      const psdArrayBuffer = psdBuffer.buffer.slice(psdBuffer.byteOffset, psdBuffer.byteOffset + psdBuffer.byteLength);
      const psdParser = await PSDParser.fromFile(instance, psdArrayBuffer as ArrayBuffer, createPNGJSEncodeBufferToPNG(PNG));
      await psdParser.parse();
      logger.info(`PSD loaded into engine: ${templatePath}`);

      // Extract Data from the live instance
      const extractedData: PSDExtractedData = {};
      const allBlocks = instance.block.findAll();
      for (const blockId of allBlocks) {
        const name = instance.block.getName(blockId);
        if (name) {
          const layerData: PSDLayerData = { type: instance.block.getType(blockId), name };
          const blockProperties = instance.block.findAllProperties(blockId);
          for (const propPath of blockProperties) {
            try {
              let value;
              if (propPath.includes('color')) { value = instance.block.getColor(blockId, propPath); }
              else if (propPath.includes('text') || propPath.includes('uri')) { value = instance.block.getString(blockId, propPath); }
              else if (propPath.includes('size') || propPath.includes('opacity') || propPath.includes('weight') || propPath.includes('x') || propPath.includes('y') || propPath.includes('width') || propPath.includes('height')) { value = instance.block.getFloat(blockId, propPath); }
              else if (propPath.includes('enabled') || propPath.includes('visible')) { value = instance.block.getBool(blockId, propPath); }
              else {
                try { value = instance.block.getString(blockId, propPath); } catch (e) {
                  try { value = instance.block.getFloat(blockId, propPath); } catch (e) { continue; }
                }
              }
              layerData[propPath] = value;
            } catch (e) { logger.debug(`Could not extract property ${propPath} for ${name}`); }
          }
          try {
            const fillId = instance.block.getFill(blockId);
            if (fillId) {
              layerData.fill = {};
              const fillProperties = instance.block.findAllProperties(fillId);
              for (const fillPropPath of fillProperties) {
                try {
                  let fillValue;
                  if (fillPropPath.includes('color')) { fillValue = instance.block.getColor(fillId, fillPropPath); }
                  else if (fillPropPath.includes('uri')) { fillValue = instance.block.getString(fillId, fillPropPath); }
                  else {
                    try { fillValue = instance.block.getString(fillId, fillPropPath); } catch (e) {
                      try { fillValue = instance.block.getFloat(fillId, fillPropPath); } catch (e) { continue; }
                    }
                  }
                  layerData.fill[fillPropPath] = fillValue;
                } catch (e) { logger.debug(`Could not extract fill property ${fillPropPath} for ${name}`); }
              }
            }
          } catch (e) { logger.debug(`Could not extract fill for ${name}`); }
          extractedData[name] = layerData;
        }
      }
      logger.info(`Extracted ${Object.keys(extractedData).length} named layers from scene.`);

      const modifiedData = this.applyProductDataToLayers(extractedData, productInfo, analysis, templateIndex, currentImageUri);
      await this.applyLayerModifications(instance, modifiedData, analysis);

      const pageBlock = instance.block.findByType('page')[0];
      if (!pageBlock) { throw new Error('No page block found in scene'); }
      const result = await instance.block.export(pageBlock, 'image/png');
      const imageBuffer = Buffer.from(await result.arrayBuffer());

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) { fs.mkdirSync(outputDir, { recursive: true }); }
      fs.writeFileSync(outputPath, imageBuffer);

      if (fs.existsSync(outputPath)) {
        logger.info(`Image generated successfully: ${outputPath}`);
        return { success: true, outputPath, message: 'Image generated successfully' };
      } else {
        throw new Error('File was not created');
      }
    } catch (error) {
      logger.error(`Error in generateImageFromTemplate:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      if (instance) {
        await instance.dispose();
        logger.info('Creative Engine instance disposed.');
      }
    }
  }

  private applyProductDataToLayers(
    extractedData: PSDExtractedData,
    productInfo: ProductInfo,
    analysis: AIAnalysisResult,
    templateIndex: number = 0,
    currentImageUri?: string // New parameter
  ): PSDExtractedData {
    logger.info('Applying product data to layers using template mappings', { templateIndex });

    const modifiedData = { ...extractedData };
    const templateName = analysis.templateRecommendations[templateIndex];
    const templateConfig = this.getTemplateConfig(templateName);

    if (!templateConfig) {
      logger.error(`Template configuration not found for '${templateName}'. Skipping layer modification.`);
      return extractedData; // Return original data if no config
    }

    const layerMappings = templateConfig.layers;
    // Create a reverse mapping for efficient lookup: { 'titulo_principal': 'title', 'imagem_produto': 'image', ... }
    const reverseMappings = Object.fromEntries(
      Object.entries(layerMappings).map(([logicalName, psdName]) => [psdName, logicalName])
    );

    const isStoryTemplate = templateConfig.format === 'story';
    const textSuggestions = this.createTextVariations(productInfo, analysis, templateIndex, isStoryTemplate);

    // --- Handle Image and Logo Layers First ---
    const imageLayers = Object.keys(layerMappings).filter(key => key.startsWith('image'));
    const logoLayers = Object.keys(layerMappings).filter(key => key.startsWith('logo'));

    // Assign product images to mapped image layers
    if (productInfo.images && productInfo.images.length > 0) {
      imageLayers.forEach((logicalName, index) => {
        const psdLayerName = layerMappings[logicalName];
        if (modifiedData[psdLayerName]) {
          const imageToUse = currentImageUri || productInfo.images[index % productInfo.images.length]; // Use currentImageUri if provided, else cycle
          const layer = modifiedData[psdLayerName];
          if (!layer.fill) layer.fill = {};
          layer.fill['fill/image/imageFileURI'] = imageToUse;
          logger.info(`Set image for ${logicalName} (${psdLayerName}) to ${imageToUse.substring(0, 50)}... (currentImageUri: ${currentImageUri}, productInfo.images[${index % productInfo.images.length}]: ${productInfo.images[index % productInfo.images.length]})`); // Add more details to the log
        }
      });
    }

    // Assign logo to mapped logo layers
    if (productInfo.logo) {
      logoLayers.forEach(logicalName => {
        const psdLayerName = layerMappings[logicalName];
        if (modifiedData[psdLayerName]) {
          const layer = modifiedData[psdLayerName];
          if (!layer.fill) layer.fill = {};
          layer.fill['fill/image/imageFileURI'] = productInfo.logo;
          logger.info(`Set logo for ${logicalName} (${psdLayerName}) to ${productInfo.logo.substring(0, 50)}...`);
        }
      });
    }

    // --- Handle Text and Other Layers ---
    Object.keys(modifiedData).forEach(layerName => {
      const layer = modifiedData[layerName];
      const logicalName = reverseMappings[layerName]; // Find the logical role of the layer (e.g., 'title')

      if (logicalName) {
        // This is a mapped layer, apply data based on its logical role
        switch (logicalName) {
          case 'title':
            layer.text = textSuggestions.title;
            logger.info(`Set text for ${logicalName} (${layerName}): "${layer.text}"`);
            break;
          case 'subtitle':
            layer.text = textSuggestions.subtitle;
            logger.info(`Set text for ${logicalName} (${layerName}): "${layer.text}"`);
            break;
          case 'cta':
            layer.text = textSuggestions.cta;
            logger.info(`Set text for ${logicalName} (${layerName}): "${layer.text}"`);
            break;
          case 'price':
            layer.text = textSuggestions.price || 'Consulte valores';
            logger.info(`Set text for ${logicalName} (${layerName}): "${layer.text}"`);
            break;
          case 'location':
            layer.text = productInfo.location || 'Localização';
            logger.info(`Set text for ${logicalName} (${layerName}): "${layer.text}"`);
            break;
          case 'description':
            layer.text = this.truncateText(productInfo.description || '', isStoryTemplate ? 80 : 100);
            logger.info(`Set text for ${logicalName} (${layerName}): "${layer.text}"`);
            break;
        }
      }
      
      // Apply styling to all layers, mapped or not, as styling might apply globally
      this.applyProfileStyling(layer, analysis.profile, templateIndex, analysis.colorSuggestions);
    });

    logger.info(`Modified layers with product data for template ${templateName}`);
    return modifiedData;
  }

  private createTextVariations(
    productInfo: ProductInfo,
    analysis: AIAnalysisResult,
    templateIndex: number,
    isStoryTemplate: boolean
  ): any {
    // Use AI suggestions if available, fallback to legacy or defaults
    const suggestions = analysis.textSuggestions;
    
    if (isStoryTemplate) {
      return {
        title: suggestions?.storyTitle || suggestions?.title || 'Oportunidade Única!',
        subtitle: suggestions?.storySubtitle || `${analysis.profile.toUpperCase()} PADRÃO`,
        cta: suggestions?.storyCta || suggestions?.cta || 'FALE CONOSCO',
        price: suggestions?.price || 'Consulte valores'
      };
    } else {
      return {
        title: suggestions?.feedTitle || suggestions?.title || 'Novo Empreendimento',
        subtitle: suggestions?.feedSubtitle || `${analysis.profile.toUpperCase()} PADRÃO - Qualidade Garantida`,
        cta: suggestions?.feedCta || suggestions?.cta || 'SAIBA MAIS',
        price: suggestions?.price || 'A partir de R$ 350.000'
      };
    }
  }

  private applyProfileStyling(layer: PSDLayerData, profile: 'baixo' | 'medio' | 'alto', templateIndex: number = 0, aiColors?: any): void {
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
      } else if (templateIndex === 0) {
        colorToUse = aiColors.primaryTitle || style.primaryColor;
      } else {
        colorToUse = aiColors.secondaryTitle || style.secondaryColor;
      }
    } else {
      colorToUse = templateIndex === 0 ? style.primaryColor : style.secondaryColor;
    }
    
    // Apply colors to text elements
    if (layerLower.includes('title') || layerLower.includes('cta') || layerLower.includes('botao')) {
      if (!layer.fill) {
        layer.fill = {};
      }
      layer.fill['fill/color/value'] = colorToUse;
      logger.debug(`Applied AI color to ${layer.name}:`, colorToUse);
    }

    // Apply font size adjustments
    if (layer.fontSize) {
      const sizeMultiplier = templateIndex === 0 ? style.fontSize : style.fontSize * 0.9;
      layer.fontSize = layer.fontSize * sizeMultiplier;
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  


  private async applyLayerModifications(instance: any, layerData: PSDExtractedData, analysis?: AIAnalysisResult): Promise<void> {
    logger.info(`Starting to apply modifications to ${Object.keys(layerData).length} layers`);
    
    const allBlocks = instance.block.findAll();
    logger.info(`Found ${allBlocks.length} total blocks in scene`);

    const templateName = analysis?.templateRecommendations[0] || '';
    const templateConfig = this.getTemplateConfig(templateName);
    const layerMappings = templateConfig?.layers || {};

    for (const blockId of allBlocks) {
      const blockName = instance.block.getName(blockId);
      if (!blockName || !layerData[blockName]) continue;

      const modifications = layerData[blockName];
      logger.info(`Applying modifications to layer: ${blockName}`); // Removed modifications object from log to avoid circular references
      
      try {
        if (modifications.text !== undefined) {
          instance.block.setString(blockId, 'text/text', modifications.text);
        }
        
        if (modifications.fontSize !== undefined) {
          instance.block.setFloat(blockId, 'text/fontSize', modifications.fontSize);
        }

        if (modifications.fill && modifications.fill['fill/color/value']) {
          const fillBlock = instance.block.getFill(blockId);
          if (fillBlock) {
            const color = modifications.fill['fill/color/value'];
            instance.block.setColor(fillBlock, 'fill/color/value', color);
          }
        }

        if (modifications.fill && modifications.fill['fill/image/imageFileURI']) {
          const fillBlock = instance.block.getFill(blockId);
          if (fillBlock) {
            instance.block.setString(fillBlock, 'fill/image/imageFileURI', modifications.fill['fill/image/imageFileURI']);
          }
        }

        // APPLY AI ROTATION (Objective C)
        const rotationSuggestions = analysis?.visualEffects?.rotation;
        if (rotationSuggestions) {
          const logicalName = Object.keys(layerMappings).find(key => layerMappings[key] === blockName);
          if (logicalName && rotationSuggestions[logicalName] !== undefined) {
            const angle = rotationSuggestions[logicalName];
            instance.block.setFloat(blockId, 'rotation', angle); // Line 455
            logger.info(`Applied AI rotation of ${angle}° to ${logicalName} (${blockName})`);
          }
        }

        await this.applyAdvancedEffects(instance, blockId, blockName, modifications, analysis); // Pass modifications
        await this.applyDynamicPositioning(instance, blockId, blockName, analysis);

        if (modifications.transform) {
          instance.block.setFloat(blockId, 'transform/x', modifications.transform.x);
          instance.block.setFloat(blockId, 'transform/y', modifications.transform.y);
          instance.block.setFloat(blockId, 'transform/width', modifications.transform.width);
          instance.block.setFloat(blockId, 'transform/height', modifications.transform.height);
        }

        logger.info(`Successfully applied modifications to layer: ${blockName}`);
      } catch (error) {
        logger.error(`Failed to apply modifications to layer ${blockName}:`, error);
      }
    }
    
    logger.info('Finished applying layer modifications');
  }

  private async applyAdvancedEffects(instance: any, blockId: any, blockName: string, modifications: PSDLayerData, analysis?: AIAnalysisResult): Promise<void> { // Add modifications parameter
    const layerLower = blockName.toLowerCase();
    
    // Get AI visual effects suggestions
    const effects = analysis?.visualEffects;
    
    if (!effects) {
      logger.debug(`No visual effects available for ${blockName}`);
      return;
    }

    try {
      // Apply blur effects
      if (layerLower.includes('fundo') || layerLower.includes('background')) {
        // Background blur for depth effect
        instance.block.setBool(blockId, 'blur/enabled', true);
        logger.info(`Applied blur to background layer: ${blockName}`);
      }

      // Apply drop shadow to CTA buttons for prominence
      if ((layerLower.includes('cta') || layerLower.includes('botao')) && effects.ctaDropShadow) {
        instance.block.setBool(blockId, 'dropShadow/enabled', true);
        instance.block.setFloat(blockId, 'dropShadow/blurRadius/x', 4);
        instance.block.setFloat(blockId, 'dropShadow/blurRadius/y', 4);
        instance.block.setFloat(blockId, 'dropShadow/offset/x', 2);
        instance.block.setFloat(blockId, 'dropShadow/offset/y', 2);
        // Set shadow color (dark semi-transparent)
        instance.block.setColor(blockId, 'dropShadow/color', { r: 0, g: 0, b: 0, a: 0.4 });
        logger.info(`Applied drop shadow to CTA: ${blockName}`);
      }

      // Apply text stroke for better readability
      if (modifications.type === '//ly.img.ubq/text' && (layerLower.includes('titulo') || layerLower.includes('title') || layerLower.includes('preco')) && effects.textStroke) { // Add type check
        instance.block.setBool(blockId, 'stroke/enabled', true);
        instance.block.setFloat(blockId, 'stroke/width', effects.strokeWidth);
        // White stroke for contrast
        instance.block.setColor(blockId, 'stroke/color', { r: 1, g: 1, b: 1, a: 0.8 });
        logger.info(`Applied text stroke to: ${blockName}`);
      }

      // Apply background opacity for better text contrast
      if (layerLower.includes('fundo') && !layerLower.includes('localizacao')) {
        instance.block.setFloat(blockId, 'opacity', effects.backgroundOpacity);
        logger.info(`Applied opacity ${effects.backgroundOpacity} to: ${blockName}`);
      }

      // Apply corner radius to background elements
      if (layerLower.includes('fundo') && layerLower.includes('cta')) {
        instance.block.setBool(blockId, 'backgroundColor/enabled', true);
        instance.block.setFloat(blockId, 'backgroundColor/cornerRadius', effects.cornerRadius);
        logger.info(`Applied corner radius ${effects.cornerRadius} to: ${blockName}`);
      }

      // Enhanced positioning for better hierarchy
      if (modifications.type === '//ly.img.ubq/text' && (layerLower.includes('titulo_principal') || layerLower.includes('title') || layerLower.includes('title_main'))) { // Add type check
        // Increase font size for main titles
        const currentFontSize = instance.block.getFloat(blockId, 'text/fontSize') || 24;
        instance.block.setFloat(blockId, 'text/fontSize', currentFontSize * 1.2);
        logger.info(`Enhanced main title font size for: ${blockName}`);
      }

      // Price elements get special treatment
      if (modifications.type === '//ly.img.ubq/text' && layerLower.includes('preco') && !layerLower.includes('titulo')) { // Add type check
        // Make price more prominent
        const currentFontSize = instance.block.getFloat(blockId, 'text/fontSize') || 20;
        instance.block.setFloat(blockId, 'text/fontSize', currentFontSize * 1.1);
        
        // Add subtle glow effect through stroke
        instance.block.setBool(blockId, 'stroke/enabled', true);
        instance.block.setFloat(blockId, 'stroke/width', 1);
        instance.block.setColor(blockId, 'stroke/color', { r: 1, g: 0.9, b: 1, a: 0.6 });
        logger.info(`Enhanced price styling for: ${blockName}`);
      }
    } catch (error) {
      logger.warn(`Failed to apply advanced effects to ${blockName}:`, error);
    }
  }

  private async applyDynamicPositioning(instance: any, blockId: any, blockName: string, analysis?: AIAnalysisResult): Promise<void> {
    const layerLower = blockName.toLowerCase();
    
    // Get AI layout strategy
    const layoutStrategy = analysis?.layoutStrategy;
    
    logger.info(`Layout strategy for ${blockName}:`, layoutStrategy);
    
    if (!layoutStrategy) {
      logger.warn(`No layout strategy available for ${blockName} - analysis available: ${!!analysis}`);
      return;
    }

    try {
      // Get current position and dimensions
      const currentX = instance.block.getFloat(blockId, 'position/x') || 0;
      const currentY = instance.block.getFloat(blockId, 'position/y') || 0;
      const width = instance.block.getFloat(blockId, 'width') || 0;
      const height = instance.block.getFloat(blockId, 'height') || 0;

      // Apply positioning based on element type and AI strategy
      
      // Title positioning using AI suggestions
      if (layerLower.includes('titulo_principal') || layerLower.includes('title_main')) {
        const positioning = analysis?.positioning?.titleOffset;
        if (positioning) {
          const newY = Math.max(50, currentY + positioning.y);
          const newX = Math.max(50, currentX + positioning.x);
          
          instance.block.setFloat(blockId, 'position/y', newY);
          instance.block.setFloat(blockId, 'position/x', newX);
          logger.info(`Applied AI title positioning for ${blockName}: (${currentX}, ${currentY}) -> (${newX}, ${newY}), offset: (${positioning.x}, ${positioning.y})`);
        }
      }

      // Subtitle positioning using AI suggestions
      if (layerLower.includes('subtitulo') || layerLower.includes('subtitle')) {
        const positioning = analysis?.positioning?.subtitleOffset;
        if (positioning) {
          const newY = Math.max(50, currentY + positioning.y);
          const newX = Math.max(50, currentX + positioning.x);
          
          instance.block.setFloat(blockId, 'position/y', newY);
          instance.block.setFloat(blockId, 'position/x', newX);
          logger.info(`Applied AI subtitle positioning for ${blockName}: (${currentX}, ${currentY}) -> (${newX}, ${newY}), offset: (${positioning.x}, ${positioning.y})`);
        }
      }

      // CTA positioning using AI suggestions
      if (layerLower.includes('cta') || layerLower.includes('botao')) {
        const positioning = analysis?.positioning?.ctaOffset;
        if (positioning) {
          const newY = Math.max(50, Math.min(1000, currentY + positioning.y));
          const newX = Math.max(50, Math.min(1000, currentX + positioning.x));
          
          instance.block.setFloat(blockId, 'position/y', newY);
          instance.block.setFloat(blockId, 'position/x', newX);
          logger.info(`Applied AI CTA positioning for ${blockName}: (${currentX}, ${currentY}) -> (${newX}, ${newY}), offset: (${positioning.x}, ${positioning.y})`);
        }
      }

      // Image positioning using AI suggestions
      if (layerLower.includes('image') || layerLower.includes('foto') || layerLower.includes('imagem')) {
        const positioning = analysis?.positioning?.imageOffset;
        if (positioning) {
          const newY = Math.max(-200, Math.min(800, currentY + positioning.y));
          const newX = Math.max(-200, Math.min(800, currentX + positioning.x));
          
          instance.block.setFloat(blockId, 'position/x', newX);
          instance.block.setFloat(blockId, 'position/y', newY);
          logger.info(`Applied AI image positioning for ${blockName}: (${currentX}, ${currentY}) -> (${newX}, ${newY}), offset: (${positioning.x}, ${positioning.y})`);
        }
      }

      // Price positioning using AI suggestions
      if (layerLower.includes('preco') && !layerLower.includes('titulo')) {
        const positioning = analysis?.positioning?.priceOffset;
        if (positioning) {
          const newY = Math.max(50, currentY + positioning.y);
          const newX = Math.max(50, currentX + positioning.x);
          
          instance.block.setFloat(blockId, 'position/y', newY);
          instance.block.setFloat(blockId, 'position/x', newX);
          logger.info(`Applied AI price positioning for ${blockName}: (${currentX}, ${currentY}) -> (${newX}, ${newY}), offset: (${positioning.x}, ${positioning.y})`);
        }
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
          logger.info(`Applied overlap avoidance for ${blockName}: margin ${margin}px`);
        }
      }

    } catch (error) {
      logger.warn(`Failed to apply dynamic positioning to ${blockName}:`, error);
    }
  }
}