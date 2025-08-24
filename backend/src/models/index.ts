// Interfaces para o sistema de chat com IA e geração de imagens

export interface ProductInfo {
  description: string;
  target_audience: string;
  location: string;
  budget: string;
  duration: string;
  images: string[];
}

export interface AIAnalysisResult {
  profile: 'baixo' | 'medio' | 'alto';
  confidence: number;
  reasoning: string;
  templateRecommendations: string[];
  textSuggestions: {
    feedTitle: string;
    feedSubtitle: string;
    feedCta: string;
    storyTitle: string;
    storySubtitle: string;
    storyCta: string;
    price?: string;
    // Legacy fields for backward compatibility
    title?: string;
    subtitle?: string;
    cta?: string;
  };
  colorSuggestions?: {
    primaryTitle: {r: number, g: number, b: number, a: number};
    secondaryTitle: {r: number, g: number, b: number, a: number};
    ctaButton: {r: number, g: number, b: number, a: number};
    background: {r: number, g: number, b: number, a: number};
  };
  visualEffects?: {
    titleBlur: number;
    ctaDropShadow: boolean;
    backgroundOpacity: number;
    strokeWidth: number;
    cornerRadius: number;
    textStroke: boolean;
    rotation?: { [logicalLayerName: string]: number };
  };
  layoutStrategy?: {
    titlePriority: number;
    imageFocus: boolean;
    ctaPosition: string;
    avoidOverlap: boolean;
  };
  positioning?: {
    titleOffset: {x: number, y: number};
    subtitleOffset: {x: number, y: number};
    ctaOffset: {x: number, y: number};
    priceOffset: {x: number, y: number};
    imageOffset: {x: number, y: number};
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: string[];
  productInfo?: ProductInfo;
}

export interface ChatRequest {
  message: string;
  images?: string[];
  productInfo?: ProductInfo;
}

export interface ChatResponse {
  message: string;
  analysis?: AIAnalysisResult;
  generatedImages?: GeneratedImage[];
}

export interface GeneratedImage {
  url: string;
  type: 'feed' | 'story';
  format: 'square' | 'portrait';
  template: string;
}

// Interfaces do PSD Service (adaptadas da imgly_novo)
export interface PSDLayerData {
  type: string;
  name: string;
  text?: string;
  fontSize?: number;
  fill?: {
    'fill/image/imageFileURI'?: string;
    [key: string]: unknown;
  };
  transform?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  [key: string]: unknown;
}

export interface PSDExtractedData {
  [layerName: string]: PSDLayerData;
}

export interface ImageGenerationRequest {
  productInfo: ProductInfo;
  analysis: AIAnalysisResult;
  templateType: string;
  outputFormat: 'feed' | 'story';
}

export interface ImageGenerationResult {
  success: boolean;
  outputPath?: string;
  webPath?: string;
  message?: string;
  error?: string;
}

export interface TemplateConfig {
  name: string;
  profile: 'baixo' | 'medio' | 'alto';
  format: 'feed' | 'story';
  psdPath: string;
  layers: {
    title: string;
    subtitle?: string;
    price?: string;
    cta?: string;
    image?: string;
    logo?: string;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}