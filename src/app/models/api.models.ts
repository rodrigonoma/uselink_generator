// Interfaces for API communication

export interface ProductInfo {
  description: string;
  target_audience: string;
  location: string;
  budget: string;
  duration: string;
  images?: string[];
}

export interface AIAnalysisResult {
  profile: 'baixo' | 'medio' | 'alto';
  confidence: number;
  reasoning: string;
  templateRecommendations: string[];
  textSuggestions: {
    title: string;
    subtitle: string;
    cta: string;
    price?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: string[];
  productInfo?: ProductInfo;
  analysis?: AIAnalysisResult;
  generatedImages?: GeneratedImage[];
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

export interface ImageGenerationResult {
  success: boolean;
  outputPath?: string;
  webPath?: string;
  message?: string;
  error?: string;
}