import path from 'path';
import fs from 'fs';
import config from '../config';
import logger from '../utils/logger';
import { TemplateConfig } from '../models';

export class TemplateService {
  private templates: TemplateConfig[] = [];

  constructor() {
    this.loadTemplateConfigurations();
  }

  private loadTemplateConfigurations(): void {
    logger.info('Loading template configurations');

    // Template configurations for different profiles and formats
    this.templates = [
      // BAIXO PADRÃO
      {
        name: 'template_baixo_feed',
        profile: 'baixo',
        format: 'feed',
        psdPath: 'baixo_padrao_feed.psd',
        layers: {
          title: 'titulo_principal',
          subtitle: 'subtitulo',
          price: 'preco',
          cta: 'botao_cta',
          image: 'imagem_produto',
          logo: 'logo_empresa'
        }
      },
      {
        name: 'template_baixo_story',
        profile: 'baixo',
        format: 'story',
        psdPath: 'baixo_padrao_story.psd',
        layers: {
          title: 'titulo_principal',
          subtitle: 'subtitulo',
          price: 'preco',
          cta: 'botao_cta',
          image: 'imagem_produto',
          logo: 'logo_empresa'
        }
      },

      // MÉDIO PADRÃO
      {
        name: 'template_medio_feed',
        profile: 'medio',
        format: 'feed',
        psdPath: 'medio_padrao_feed.psd',
        layers: {
          title: 'titulo_principal',
          subtitle: 'subtitulo',
          price: 'preco',
          cta: 'botao_cta',
          image: 'imagem_produto',
          logo: 'logo_empresa'
        }
      },
      {
        name: 'template_medio_story',
        profile: 'medio',
        format: 'story',
        psdPath: 'medio_padrao_story.psd',
        layers: {
          title: 'titulo_principal',
          subtitle: 'subtitulo',
          price: 'preco',
          cta: 'botao_cta',
          image: 'imagem_produto',
          logo: 'logo_empresa'
        }
      },

      // ALTO PADRÃO
      {
        name: 'template_alto_feed',
        profile: 'alto',
        format: 'feed',
        psdPath: 'alto_padrao_feed.psd',
        layers: {
          title: 'titulo_principal',
          subtitle: 'subtitulo',
          price: 'preco',
          cta: 'botao_cta',
          image: 'imagem_produto',
          logo: 'logo_empresa'
        }
      },
      {
        name: 'template_alto_story',
        profile: 'alto',
        format: 'story',
        psdPath: 'alto_padrao_story.psd',
        layers: {
          title: 'titulo_principal',
          subtitle: 'subtitulo',
          price: 'preco',
          cta: 'botao_cta',
          image: 'imagem_produto',
          logo: 'logo_empresa'
        }
      }
    ];

    logger.info(`Loaded ${this.templates.length} template configurations`);
  }

  getTemplatesByProfile(profile: 'baixo' | 'medio' | 'alto'): TemplateConfig[] {
    return this.templates.filter(template => template.profile === profile);
  }

  getTemplateByName(name: string): TemplateConfig | undefined {
    return this.templates.find(template => template.name === name);
  }

  getAvailableTemplates(): TemplateConfig[] {
    // Filter templates that actually exist in the file system
    return this.templates.filter(template => {
      const templatePath = path.join(config.templates.directory, template.psdPath);
      return fs.existsSync(templatePath);
    });
  }

  validateTemplateExists(templateName: string): boolean {
    const template = this.getTemplateByName(templateName);
    if (!template) return false;

    const templatePath = path.join(config.templates.directory, template.psdPath);
    return fs.existsSync(templatePath);
  }

  getTemplateRecommendations(profile: 'baixo' | 'medio' | 'alto'): string[] {
    const profileTemplates = this.getTemplatesByProfile(profile);
    const availableTemplates = profileTemplates.filter(template => 
      this.validateTemplateExists(template.name)
    );

    // Return template names
    return availableTemplates.map(template => template.name);
  }

  createMockTemplates(): void {
    logger.info('Creating mock template directory structure');

    const templatesDir = config.templates.directory;
    
    // Ensure templates directory exists
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
      logger.info(`Created templates directory: ${templatesDir}`);
    }

    // Create mock template files (placeholder PSDs)
    const mockTemplates = [
      'baixo_padrao_feed.psd',
      'baixo_padrao_story.psd',
      'medio_padrao_feed.psd',
      'medio_padrao_story.psd',
      'alto_padrao_feed.psd',
      'alto_padrao_story.psd'
    ];

    for (const templateFile of mockTemplates) {
      const templatePath = path.join(templatesDir, templateFile);
      
      if (!fs.existsSync(templatePath)) {
        // Create empty placeholder file
        fs.writeFileSync(templatePath, '');
        logger.info(`Created mock template: ${templateFile}`);
      }
    }

    // Create README for templates
    const readmePath = path.join(templatesDir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      const readmeContent = `# Templates PSD

Este diretório contém os templates PSD para diferentes perfis de empreendimentos imobiliários.

## Estrutura dos Templates

### Baixo Padrão
- \`baixo_padrao_feed.psd\` - Template para feed (formato quadrado)
- \`baixo_padrao_story.psd\` - Template para stories (formato vertical)

### Médio Padrão  
- \`medio_padrao_feed.psd\` - Template para feed (formato quadrado)
- \`medio_padrao_story.psd\` - Template para stories (formato vertical)

### Alto Padrão
- \`alto_padrao_feed.psd\` - Template para feed (formato quadrado)
- \`alto_padrao_story.psd\` - Template para stories (formato vertical)

## Camadas Esperadas

Cada template deve conter as seguintes camadas nomeadas:

- \`titulo_principal\` - Título do anúncio
- \`subtitulo\` - Subtítulo ou descrição
- \`preco\` - Valor ou faixa de preço
- \`botao_cta\` - Call to action
- \`imagem_produto\` - Imagem do empreendimento
- \`logo_empresa\` - Logo da empresa/corretor

## Formatação

- **Feed**: 1080x1080px (formato quadrado)
- **Story**: 1080x1920px (formato vertical)
- Resolução: 300 DPI
- Formato de cores: RGB
`;

      fs.writeFileSync(readmePath, readmeContent);
      logger.info('Created templates README.md');
    }
  }

  getTemplateInfo(templateName: string): TemplateConfig | null {
    const template = this.getTemplateByName(templateName);
    if (!template) return null;

    return {
      ...template,
      psdPath: path.join(config.templates.directory, template.psdPath)
    };
  }

  listAllTemplates(): { available: TemplateConfig[], missing: TemplateConfig[] } {
    const available: TemplateConfig[] = [];
    const missing: TemplateConfig[] = [];

    for (const template of this.templates) {
      if (this.validateTemplateExists(template.name)) {
        available.push(template);
      } else {
        missing.push(template);
      }
    }

    return { available, missing };
  }
}