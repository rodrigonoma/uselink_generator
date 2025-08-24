"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateService = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
class TemplateService {
    constructor() {
        this.templates = [];
        this.loadTemplateConfigurations();
    }
    loadTemplateConfigurations() {
        logger_1.default.info('Loading template configurations');
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
        logger_1.default.info(`Loaded ${this.templates.length} template configurations`);
    }
    getTemplatesByProfile(profile) {
        return this.templates.filter(template => template.profile === profile);
    }
    getTemplateByName(name) {
        return this.templates.find(template => template.name === name);
    }
    getAvailableTemplates() {
        // Filter templates that actually exist in the file system
        return this.templates.filter(template => {
            const templatePath = path_1.default.join(config_1.default.templates.directory, template.psdPath);
            return fs_1.default.existsSync(templatePath);
        });
    }
    validateTemplateExists(templateName) {
        const template = this.getTemplateByName(templateName);
        if (!template)
            return false;
        const templatePath = path_1.default.join(config_1.default.templates.directory, template.psdPath);
        return fs_1.default.existsSync(templatePath);
    }
    getTemplateRecommendations(profile) {
        const profileTemplates = this.getTemplatesByProfile(profile);
        const availableTemplates = profileTemplates.filter(template => this.validateTemplateExists(template.name));
        // Return template names
        return availableTemplates.map(template => template.name);
    }
    createMockTemplates() {
        logger_1.default.info('Creating mock template directory structure');
        const templatesDir = config_1.default.templates.directory;
        // Ensure templates directory exists
        if (!fs_1.default.existsSync(templatesDir)) {
            fs_1.default.mkdirSync(templatesDir, { recursive: true });
            logger_1.default.info(`Created templates directory: ${templatesDir}`);
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
            const templatePath = path_1.default.join(templatesDir, templateFile);
            if (!fs_1.default.existsSync(templatePath)) {
                // Create empty placeholder file
                fs_1.default.writeFileSync(templatePath, '');
                logger_1.default.info(`Created mock template: ${templateFile}`);
            }
        }
        // Create README for templates
        const readmePath = path_1.default.join(templatesDir, 'README.md');
        if (!fs_1.default.existsSync(readmePath)) {
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
            fs_1.default.writeFileSync(readmePath, readmeContent);
            logger_1.default.info('Created templates README.md');
        }
    }
    getTemplateInfo(templateName) {
        const template = this.getTemplateByName(templateName);
        if (!template)
            return null;
        return {
            ...template,
            psdPath: path_1.default.join(config_1.default.templates.directory, template.psdPath)
        };
    }
    listAllTemplates() {
        const available = [];
        const missing = [];
        for (const template of this.templates) {
            if (this.validateTemplateExists(template.name)) {
                available.push(template);
            }
            else {
                missing.push(template);
            }
        }
        return { available, missing };
    }
}
exports.TemplateService = TemplateService;
//# sourceMappingURL=TemplateService.js.map