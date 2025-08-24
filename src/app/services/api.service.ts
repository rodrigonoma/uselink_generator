import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductInfo, ChatRequest, ChatResponse, AIAnalysisResult, ImageGenerationResult } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:3001/api';

  constructor(private http: HttpClient) {}

  /**
   * Send chat message with optional images and product info
   */
  sendChatMessage(
    message: string, 
    productInfo?: ProductInfo, 
    images?: File[]
  ): Observable<ApiResponse<ChatResponse>> {
    const formData = new FormData();
    
    // Build chat request
    const chatRequest: ChatRequest = {
      message,
      productInfo
    };
    
    formData.append('message', message);
    
    if (productInfo) {
      formData.append('productInfo', JSON.stringify(productInfo));
    }
    
    // Add image files
    if (images && images.length > 0) {
      images.forEach((image, index) => {
        formData.append('images', image, `image_${index}.${this.getFileExtension(image.name)}`);
      });
    }

    return this.http.post<ApiResponse<ChatResponse>>(`${this.baseUrl}/chat/message`, formData);
  }

  /**
   * Analyze product profile only
   */
  analyzeProduct(productInfo: ProductInfo): Observable<ApiResponse<AIAnalysisResult>> {
    return this.http.post<ApiResponse<AIAnalysisResult>>(`${this.baseUrl}/chat/analyze`, {
      productInfo
    });
  }

  /**
   * Generate campaign images
   */
  generateImages(
    productInfo: ProductInfo, 
    profile?: 'baixo' | 'medio' | 'alto'
  ): Observable<ApiResponse<ImageGenerationResult[]>> {
    return this.http.post<ApiResponse<ImageGenerationResult[]>>(`${this.baseUrl}/chat/generate`, {
      productInfo,
      profile
    });
  }

  /**
   * Get template status
   */
  getTemplateStatus(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/templates/status`);
  }

  /**
   * Initialize template system
   */
  initializeTemplates(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/templates/initialize`, {});
  }

  /**
   * Health check
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop() || 'jpg';
  }
}

// API Response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}