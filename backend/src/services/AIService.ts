import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import config from '../config';
import logger from '../utils/logger';
import { ProductInfo, AIAnalysisResult } from '../models';

export class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async analyzeProductProfile(productInfo: ProductInfo): Promise<AIAnalysisResult> {
    logger.info('Starting AI analysis for product profile');

    const MAX_RETRIES = 3;
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        const prompt = this.buildAnalysisPrompt(productInfo);
        
        const completion = await this.openai.chat.completions.create({
          model: config.openai.model,
          messages: [
            {
              role: 'system',
              content: `Você é um especialista em marketing imobiliário, design gráfico e comunicação visual. Sua tarefa é analisar informações de produtos imobiliários e criar uma estratégia completa de comunicação visual.

Analise cuidadosamente:
1. Descrição do produto e características
2. Público-alvo e perfil econômico
3. Localização e contexto regional
4. Orçamento e duração da campanha
5. Imagens fornecidas pelo cliente

Baseado nessas informações, gere *apenas* um objeto JSON que contenha a estratégia completa de comunicação visual. Não inclua nenhum texto adicional, explicações ou formatação além do JSON.

O JSON deve conter:

1. CLASSIFICAÇÃO DO PERFIL:
- BAIXO: Empreendimentos populares, preços acessíveis, primeiros imóveis
- MEDIO: Empreendimentos intermediários, classe média, bom custo-benefício  
- ALTO: Empreendimentos de luxo, alto padrão, público premium

2. TEXTOS CRIATIVOS E PERSUASIVOS:
- Títulos chamtivos e diretos (máx 30 caracteres)
- Subtítulos explicativos (máx 50 caracteres)
- CTAs impactantes (máx 20 caracteres)
- Preços/ofertas atrativas

3. CORES ESTRATÉGICAS:
- Cores primárias para títulos (baseadas no perfil e imagens)
- Cores secundárias para fundos e destaques
- Cores de CTA que geram conversão
- Cores de fundo que complementam as imagens

4. EFEITOS VISUAIS PERSONALIZADOS:
- Intensidade de blur baseada no estilo
- Sombras apropriadas para o perfil
- Transparências que valorizam o conteúdo
- Bordas e cantos que combinam com o público

5. POSICIONAMENTO ESPECÍFICO DOS ELEMENTOS:
- Coordenadas X,Y para títulos principais
- Deslocamentos para subtítulos e CTAs
- Posicionamento estratégico de preços
- Ajustes de imagens para melhor foco
- Evitar sobreposições entre elementos

Seja CRIATIVO com cores, efeitos E POSICIONAMENTO. Analise o perfil do cliente e crie uma identidade visual única que maximize conversões.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
          throw new Error('No response from OpenAI');
        }

        // Clean and parse JSON response
        let cleanResponse = response.trim();
        
        // Remove markdown code blocks if present
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const analysisResult = JSON.parse(cleanResponse) as AIAnalysisResult;
        
        logger.info('AI Analysis Result:', analysisResult);
        
        // Validate and ensure required fields
        if (!analysisResult.profile || !['baixo', 'medio', 'alto'].includes(analysisResult.profile)) {
          throw new Error('Invalid profile classification from AI');
        }

        logger.info(`AI analysis completed: ${analysisResult.profile} profile with ${analysisResult.confidence}% confidence`);
        
        return analysisResult;

      } catch (error) {
        logger.error(`Error in AI analysis (retry ${retries + 1}/${MAX_RETRIES}):`, error);
        retries++;
        if (retries === MAX_RETRIES) {
          // Fallback analysis based on simple heuristics
          return this.fallbackAnalysis(productInfo);
        }
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
      }
    }
    // Should not reach here, but for type safety
    return this.fallbackAnalysis(productInfo);
  }

  private buildAnalysisPrompt(productInfo: ProductInfo): string {
    return `Analise o seguinte produto imobiliário e crie uma estratégia completa de comunicação visual:

DESCRIÇÃO: ${productInfo.description || 'Não informado'}
PÚBLICO-ALVO: ${productInfo.target_audience || 'Não informado'}  
LOCALIZAÇÃO: ${productInfo.location || 'Não informado'}
ORÇAMENTO: ${productInfo.budget || 'Não informado'}
DURAÇÃO: ${productInfo.duration || 'Não informado'}
NÚMERO DE IMAGENS: ${productInfo.images?.length || 0}

Crie textos CRIATIVOS e PERSUASIVOS para marketing imobiliário. Seja criativo, use linguagem de vendas e marketing que gera conversão.

Responda no seguinte formato JSON:
{
  "profile": "baixo|medio|alto",
  "confidence": 85,
  "reasoning": "Explicação detalhada da classificação e estratégia criativa",
  "templateRecommendations": ["template_baixo_feed", "template_baixo_story"],
  "textSuggestions": {
    "feedTitle": "Título criativo para feed (máx 25 chars)",
    "feedSubtitle": "Subtítulo persuasivo feed (máx 40 chars)",
    "feedCta": "CTA impactante (máx 15 chars)",
    "storyTitle": "Título criativo para story (máx 25 chars)", 
    "storySubtitle": "Subtítulo story (máx 40 chars)",
    "storyCta": "CTA story (máx 15 chars)",
    "price": "Preço/oferta atrativa"
  },
  "colorSuggestions": {
    "primaryTitle": {"r": 0.0-1.0, "g": 0.0-1.0, "b": 0.0-1.0, "a": 1},
    "secondaryTitle": {"r": 0.0-1.0, "g": 0.0-1.0, "b": 0.0-1.0, "a": 1},
    "ctaButton": {"r": 0.0-1.0, "g": 0.0-1.0, "b": 0.0-1.0, "a": 1},
    "background": {"r": 0.0-1.0, "g": 0.0-1.0, "b": 0.0-1.0, "a": 0.0-1.0}
  },
  "visualEffects": {
    "titleBlur": 0-10,
    "ctaDropShadow": true/false,
    "backgroundOpacity": 0.0-1.0,
    "strokeWidth": 1-5,
    "cornerRadius": 0-20,
    "textStroke": true/false
  },
  "layoutStrategy": {
    "titlePriority": 1-5,
    "imageFocus": true/false,
    "ctaPosition": "top|center|bottom",
    "avoidOverlap": true/false
  },
  "positioning": {
    "titleOffset": {"x": -50 a +50, "y": -100 a +100},
    "subtitleOffset": {"x": -50 a +50, "y": -50 a +50},
    "ctaOffset": {"x": -100 a +100, "y": -200 a +200},
    "priceOffset": {"x": -30 a +30, "y": -30 a +30},
    "imageOffset": {"x": -100 a +100, "y": -100 a +100}
  }
}

IMPORTANTE: 
- Cores devem ser escolhidas baseadas no perfil (baixo=azuis, médio=verdes, alto=dourados/marrons)
- Efeitos visuais devem ser mais intensos para alto padrão e mais sutis para baixo padrão
- CTAs devem ter cores vibrantes que contrastem com o fundo
- Backgrounds devem ser neutros mas que complementem as imagens enviadas
- POSICIONAMENTO deve ser estratégico: títulos principais podem ser movidos para ganhar destaque, CTAs podem ser reposicionados para melhor conversão, elementos podem ser espaçados para evitar sobreposição
- Use valores de offset NEGATIVOS para mover elementos para cima/esquerda e POSITIVOS para baixo/direita`;
  }

  private fallbackAnalysis(productInfo: ProductInfo): AIAnalysisResult {
    logger.warn('Using fallback analysis due to AI service error');
    
    let profile: 'baixo' | 'medio' | 'alto' = 'medio';
    let confidence = 60;
    let reasoning = 'Análise baseada em heurísticas simples devido a erro no serviço de IA';

    // Simple heuristics for classification
    const description = productInfo.description?.toLowerCase() || '';
    const budget = productInfo.budget?.toLowerCase() || '';
    const targetAudience = productInfo.target_audience?.toLowerCase() || '';

    // Palavras-chave para alto padrão
    const luxuryKeywords = ['luxo', 'premium', 'alto padrão', 'exclusivo', 'sofisticado', 'diferenciado'];
    const hasLuxuryKeywords = luxuryKeywords.some(keyword => 
      description.includes(keyword) || targetAudience.includes(keyword)
    );

    // Palavras-chave para baixo padrão
    const popularKeywords = ['popular', 'acessível', 'primeira casa', 'entrada facilitada', 'financiamento'];
    const hasPopularKeywords = popularKeywords.some(keyword => 
      description.includes(keyword) || targetAudience.includes(keyword)
    );

    // Análise de orçamento
    const budgetValue = this.extractBudgetValue(budget);
    
    if (hasLuxuryKeywords || budgetValue > 1000) {
      profile = 'alto';
      confidence = 70;
      reasoning = 'Palavras-chave de luxo identificadas ou orçamento alto';
    } else if (hasPopularKeywords || budgetValue < 300) {
      profile = 'baixo';
      confidence = 70;
      reasoning = 'Palavras-chave populares identificadas ou orçamento baixo';
    }

    return {
      profile,
      confidence,
      reasoning,
      templateRecommendations: [
        `template_${profile}_feed`,
        `template_${profile}_story`
      ],
      textSuggestions: {
        feedTitle: this.generateTitleByProfile(profile),
        feedSubtitle: this.generateSubtitleByProfile(profile),
        feedCta: this.generateCTAByProfile(profile),
        storyTitle: profile === 'alto' ? 'Exclusividade!' : 'Oportunidade!',
        storySubtitle: `${profile.toUpperCase()} PADRÃO`,
        storyCta: profile === 'alto' ? 'CONHEÇA' : 'SAIBA MAIS',
        price: profile === 'alto' ? 'A partir de R$ 800.000' : 
               profile === 'medio' ? 'A partir de R$ 400.000' : 
               'A partir de R$ 200.000',
        // Legacy fields for backward compatibility
        title: this.generateTitleByProfile(profile),
        subtitle: this.generateSubtitleByProfile(profile),
        cta: this.generateCTAByProfile(profile),
      },
      colorSuggestions: this.generateDynamicColors(profile),
      visualEffects: this.generateDynamicEffects(profile),
      layoutStrategy: this.generateDynamicLayoutStrategy(profile),
      positioning: this.generateDynamicPositioning(profile)
    };
  }

  private extractBudgetValue(budget: string): number {
    const match = budget.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 500; // default value
  }

  private generateTitleByProfile(profile: 'baixo' | 'medio' | 'alto'): string {
    const titles = {
      baixo: 'Seu Primeiro Imóvel Está Aqui!',
      medio: 'O Apartamento Ideal Para Sua Família',
      alto: 'Exclusividade e Sofisticação'
    };
    return titles[profile];
  }

  private generateSubtitleByProfile(profile: 'baixo' | 'medio' | 'alto'): string {
    const subtitles = {
      baixo: 'Financiamento facilitado e entrada reduzida',
      medio: 'Localização privilegiada e acabamento de qualidade',
      alto: 'Alto padrão em cada detalhe'
    };
    return subtitles[profile];
  }

  private generateCTAByProfile(profile: 'baixo' | 'medio' | 'alto'): string {
    const ctas = {
      baixo: 'Realize Seu Sonho Agora!',
      medio: 'Agende Sua Visita',
      alto: 'Conheça o Exclusivo'
    };
    return ctas[profile];
  }

  private generateDynamicColors(profile: 'baixo' | 'medio' | 'alto'): any {
    // Adicionar variação aleatória às cores base para torná-las únicas
    const randomVariation = () => Math.random() * 0.2 - 0.1; // -0.1 a +0.1
    
    const baseColors = {
      baixo: {
        primaryTitle: {r: 0.2 + randomVariation(), g: 0.5 + randomVariation(), b: 0.9 + randomVariation(), a: 1},
        secondaryTitle: {r: 0.1 + randomVariation(), g: 0.4 + randomVariation(), b: 0.8 + randomVariation(), a: 1},
        ctaButton: {r: 0.9 + randomVariation(), g: 0.3 + randomVariation(), b: 0.1 + randomVariation(), a: 1},
        background: {r: 0.92 + randomVariation() * 0.05, g: 0.95 + randomVariation() * 0.05, b: 0.98 + randomVariation() * 0.05, a: 0.85}
      },
      medio: {
        primaryTitle: {r: 0.2 + randomVariation(), g: 0.7 + randomVariation(), b: 0.3 + randomVariation(), a: 1},
        secondaryTitle: {r: 0.1 + randomVariation(), g: 0.6 + randomVariation(), b: 0.2 + randomVariation(), a: 1},
        ctaButton: {r: 0.8 + randomVariation(), g: 0.6 + randomVariation(), b: 0.1 + randomVariation(), a: 1},
        background: {r: 0.95 + randomVariation() * 0.05, g: 0.97 + randomVariation() * 0.05, b: 0.93 + randomVariation() * 0.05, a: 0.88}
      },
      alto: {
        primaryTitle: {r: 0.7 + randomVariation(), g: 0.5 + randomVariation(), b: 0.2 + randomVariation(), a: 1},
        secondaryTitle: {r: 0.6 + randomVariation(), g: 0.4 + randomVariation(), b: 0.1 + randomVariation(), a: 1},
        ctaButton: {r: 0.8 + randomVariation(), g: 0.2 + randomVariation(), b: 0.1 + randomVariation(), a: 1},
        background: {r: 0.98 + randomVariation() * 0.02, g: 0.96 + randomVariation() * 0.02, b: 0.92 + randomVariation() * 0.02, a: 0.92}
      }
    };

    // Garantir que os valores ficam entre 0 e 1
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const colors = baseColors[profile];
    
    return {
      primaryTitle: {
        r: clamp(colors.primaryTitle.r),
        g: clamp(colors.primaryTitle.g), 
        b: clamp(colors.primaryTitle.b),
        a: colors.primaryTitle.a
      },
      secondaryTitle: {
        r: clamp(colors.secondaryTitle.r),
        g: clamp(colors.secondaryTitle.g),
        b: clamp(colors.secondaryTitle.b), 
        a: colors.secondaryTitle.a
      },
      ctaButton: {
        r: clamp(colors.ctaButton.r),
        g: clamp(colors.ctaButton.g),
        b: clamp(colors.ctaButton.b),
        a: colors.ctaButton.a
      },
      background: {
        r: clamp(colors.background.r),
        g: clamp(colors.background.g),
        b: clamp(colors.background.b),
        a: clamp(colors.background.a)
      }
    };
  }

  private generateDynamicEffects(profile: 'baixo' | 'medio' | 'alto'): any {
    // Adicionar variação nos efeitos baseada no perfil
    const randomBool = () => Math.random() > 0.5;
    const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
    
    const effects = {
      baixo: {
        titleBlur: 0,
        ctaDropShadow: randomBool(),
        backgroundOpacity: randomRange(0.85, 0.95),
        strokeWidth: randomRange(1, 2.5),
        cornerRadius: randomRange(4, 10),
        textStroke: randomBool()
      },
      medio: {
        titleBlur: randomRange(0, 2),
        ctaDropShadow: true,
        backgroundOpacity: randomRange(0.88, 0.95),
        strokeWidth: randomRange(2, 3.5),
        cornerRadius: randomRange(6, 12),
        textStroke: true
      },
      alto: {
        titleBlur: randomRange(0, 3),
        ctaDropShadow: true,
        backgroundOpacity: randomRange(0.9, 0.98),
        strokeWidth: randomRange(2.5, 4),
        cornerRadius: randomRange(8, 16),
        textStroke: true
      }
    };

    return effects[profile];
  }

  private generateDynamicLayoutStrategy(profile: 'baixo' | 'medio' | 'alto'): any {
    // Generate layout strategy based on profile
    const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
    
    const strategies = {
      baixo: {
        titlePriority: Math.floor(randomRange(1, 3)), // Lower priority for simpler layouts
        imageFocus: Math.random() > 0.6, // 40% chance of image focus
        ctaPosition: ['bottom', 'center'][Math.floor(Math.random() * 2)],
        avoidOverlap: true
      },
      medio: {
        titlePriority: Math.floor(randomRange(2, 4)), // Medium priority
        imageFocus: Math.random() > 0.4, // 60% chance of image focus
        ctaPosition: ['bottom', 'center', 'top'][Math.floor(Math.random() * 3)],
        avoidOverlap: true
      },
      alto: {
        titlePriority: Math.floor(randomRange(3, 5)), // High priority for sophisticated layouts
        imageFocus: Math.random() > 0.2, // 80% chance of image focus
        ctaPosition: ['center', 'top'][Math.floor(Math.random() * 2)],
        avoidOverlap: true
      }
    };

    return strategies[profile];
  }

  private generateDynamicPositioning(profile: 'baixo' | 'medio' | 'alto'): any {
    // Generate positioning offsets based on profile
    const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
    
    const positioning = {
      baixo: {
        titleOffset: {
          x: Math.floor(randomRange(-20, 20)),
          y: Math.floor(randomRange(-30, 10))
        },
        subtitleOffset: {
          x: Math.floor(randomRange(-15, 15)),
          y: Math.floor(randomRange(10, 40))
        },
        ctaOffset: {
          x: Math.floor(randomRange(-30, 30)),
          y: Math.floor(randomRange(-50, 50))
        },
        priceOffset: {
          x: Math.floor(randomRange(-15, 15)),
          y: Math.floor(randomRange(-20, 10))
        },
        imageOffset: {
          x: Math.floor(randomRange(-30, 30)),
          y: Math.floor(randomRange(-40, 40))
        }
      },
      medio: {
        titleOffset: {
          x: Math.floor(randomRange(-40, 40)),
          y: Math.floor(randomRange(-60, 20))
        },
        subtitleOffset: {
          x: Math.floor(randomRange(-30, 30)),
          y: Math.floor(randomRange(20, 70))
        },
        ctaOffset: {
          x: Math.floor(randomRange(-60, 60)),
          y: Math.floor(randomRange(-100, 100))
        },
        priceOffset: {
          x: Math.floor(randomRange(-25, 25)),
          y: Math.floor(randomRange(-30, 15))
        },
        imageOffset: {
          x: Math.floor(randomRange(-50, 50)),
          y: Math.floor(randomRange(-60, 60))
        }
      },
      alto: {
        titleOffset: {
          x: Math.floor(randomRange(-60, 60)),
          y: Math.floor(randomRange(-100, 30))
        },
        subtitleOffset: {
          x: Math.floor(randomRange(-50, 50)),
          y: Math.floor(randomRange(30, 100))
        },
        ctaOffset: {
          x: Math.floor(randomRange(-100, 100)),
          y: Math.floor(randomRange(-200, 200))
        },
        priceOffset: {
          x: Math.floor(randomRange(-40, 40)),
          y: Math.floor(randomRange(-40, 20))
        },
        imageOffset: {
          x: Math.floor(randomRange(-80, 80)),
          y: Math.floor(randomRange(-100, 100))
        }
      }
    };

    return positioning[profile];
  }

  async generateChatResponse(
    message: string, 
    productInfo?: ProductInfo, 
    images?: string[]
  ): Promise<string> {
    logger.info('Generating chat response', {
      hasProductInfo: !!productInfo,
      imageCount: images?.length || 0
    });

    try {
      const systemPrompt = `Você é uma assistente de IA especializada em marketing imobiliário no Brasil. Você ajuda corretores e empresas a criar campanhas publicitárias eficazes.

Suas responsabilidades:
1. Analisar informações de empreendimentos imobiliários
2. Classificar perfil econômico (baixo, médio, alto padrão)
3. Sugerir estratégias de marketing personalizadas
4. Recomendar textos otimizados para conversão
5. Orientar sobre campanhas digitais eficazes

IMPORTANTE: Quando o usuário enviar imagens e informações do produto, você deve:
- Reconhecer que recebeu as imagens
- Analisar as informações fornecidas
- Classificar o perfil do empreendimento
- Sugerir estratégias específicas
- Ser entusiasta sobre gerar campanhas

Seja sempre profissional, prestativa e focada em resultados de marketing.`;

      const userMessage = this.buildChatPrompt(message, productInfo, images);

      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return response;

    } catch (error) {
      logger.error('Error generating chat response:', error);
      return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente ou forneça mais detalhes sobre seu empreendimento.';
    }
  }

  private buildChatPrompt(
    message: string, 
    productInfo?: ProductInfo, 
    images?: string[]
  ): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: 'text', text: `Mensagem do usuário: ${message}` }
    ];

    if (productInfo) {
      let productText = `\n\nInformações do produto:`;
      if (productInfo.description) productText += `\nDescrição: ${productInfo.description}`;
      if (productInfo.target_audience) productText += `\nPúblico-alvo: ${productInfo.target_audience}`;
      if (productInfo.location) productText += `\nLocalização: ${productInfo.location}`;
      if (productInfo.budget) productText += `\nOrçamento: ${productInfo.budget}`;
      if (productInfo.duration) productText += `\nDuração: ${productInfo.duration}`;
      content.push({ type: 'text', text: productText });
    }

    if (images && images.length > 0) {
      content.push({ type: 'text', text: `\n\nO usuário enviou ${images.length} imagem(ns) do empreendimento. Analise-as para criar um layout profissional.` });
      for (const imagePath of images) {
        try {
          let base64Image: string;
          let mimeType: string;

          if (imagePath.startsWith('data:')) {
            // It's a data URI
            const parts = imagePath.match(/^data:(image\/(?:png|jpeg|gif|webp|svg\+xml|bmp));base64,(.*)$/);
            if (parts && parts.length === 3) {
              mimeType = parts[1];
              base64Image = parts[2];
            } else {
              logger.warn(`Invalid data URI format for image: ${imagePath.substring(0, 50)}...`);
              continue; // Skip this image
            }
          } else {
            // Assume it's a file path
            const imageBuffer = fs.readFileSync(imagePath);
            base64Image = imageBuffer.toString('base64');
            // Try to determine mime type from file extension, or default to png
            const ext = path.extname(imagePath).toLowerCase();
            if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
            else if (ext === '.gif') mimeType = 'image/gif';
            else if (ext === '.webp') mimeType = 'image/webp';
            else if (ext === '.svg') mimeType = 'image/svg+xml';
            else if (ext === '.bmp') mimeType = 'image/bmp';
            else mimeType = 'image/png'; // Default
          }

          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`
            }
          });
        } catch (error) {
          logger.error(`Error reading image file for AI analysis: ${imagePath}`, error);
        }
      }
    }

    return content;
  }
}