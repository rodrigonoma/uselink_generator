import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ApiService } from '../services/api.service';
import { ProductInfo, ChatMessage as APIChatMessage, GeneratedImage } from '../models/api.models';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  images?: string[];
  productInfo?: ProductInfo;
  generatedImages?: GeneratedImage[];
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  templateUrl: './ai-assistant.html',
  styleUrl: './ai-assistant.css',
  providers: [DatePipe, ApiService]
})
export class AiAssistantComponent implements OnInit, AfterViewInit {
  @ViewChild('messagesEndRef') messagesEndRef!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      content:
        "👋 Olá! Sou a assistente de IA do Uselink Escalável. Estou aqui para ajudar você a criar anúncios incríveis para seu empreendimento imobiliário! \n\nPara começar, você pode:\n• Fazer upload de fotos do seu empreendimento\n• Preencher as informações básicas\n• Ou simplesmente descrever seu projeto no chat\n\nComo você gostaria de começar?",
      timestamp: new Date(),
    },
  ];
  input: string = "";
  isLoading: boolean = false;
  
  // Upload e informações do produto
  uploadedImages: string[] = [];
  showProductForm: boolean = false;
  productInfo: ProductInfo = {
    description: '',
    target_audience: '',
    location: '',
    budget: '',
    duration: ''
  };

  constructor(
    private datePipe: DatePipe,
    private apiService: ApiService
  ) { }

  ngOnInit(): void {
    // Initial setup if needed
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.messagesEndRef.nativeElement.scrollIntoView({ behavior: "smooth" });
    } catch (err) { }
  }

  handleSendMessage(): void {
    if (!this.input.trim() && this.uploadedImages.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: this.input || "Enviei algumas imagens",
      timestamp: new Date(),
      images: this.uploadedImages.length > 0 ? [...this.uploadedImages] : undefined,
      productInfo: this.hasProductInfo() ? {...this.productInfo} : undefined
    };
    
    this.messages = [...this.messages, userMessage];
    const messageText = this.input;
    this.input = "";
    
    // Convert base64 images to File objects for API
    const imageFiles = this.convertBase64ToFiles(this.uploadedImages);
    this.uploadedImages = [];
    
    this.isLoading = true;

    // Send to backend API
    this.apiService.sendChatMessage(
      messageText || "Enviei algumas imagens",
      this.hasProductInfo() ? this.productInfo : undefined,
      imageFiles
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: response.data.message,
            timestamp: new Date(),
            generatedImages: response.data.generatedImages
          };
          this.messages = [...this.messages, aiResponse];
        } else {
          this.handleApiError(response.error || 'Erro desconhecido');
        }
        this.isLoading = false;
        this.scrollToBottom();
      },
      error: (error) => {
        console.error('API Error:', error);
        this.handleApiError('Erro de conexão com o servidor');
        this.isLoading = false;
        this.scrollToBottom();
      }
    });
  }

  getImageUrl(image: GeneratedImage): string {
    // Convert relative URL to absolute URL for backend
    if (image.url.startsWith('/output/')) {
      return `http://localhost:3001/api${image.url}`;
    } else if (image.url.startsWith('/')) {
      return `http://localhost:3001/api${image.url}`;
    }
    return image.url;
  }

  hasProductInfo(): boolean {
    return !!(this.productInfo.description || this.productInfo.target_audience || 
             this.productInfo.location || this.productInfo.budget || this.productInfo.duration);
  }

  selectedFiles: File[] = [];

  onFileSelect(event: any): void {
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          this.selectedFiles.push(file);
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.uploadedImages.push(e.target.result);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  removeImage(index: number): void {
    this.uploadedImages.splice(index, 1);
    this.selectedFiles.splice(index, 1);
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  toggleProductForm(): void {
    this.showProductForm = !this.showProductForm;
  }

  clearProductInfo(): void {
    this.productInfo = {
      description: '',
      target_audience: '',
      location: '',
      budget: '',
      duration: ''
    };
  }

  private convertBase64ToFiles(base64Images: string[]): File[] {
    return base64Images.map((base64, index) => {
      // Extract the data part from data URL
      const byteString = atob(base64.split(',')[1]);
      const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
      
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      return new File([ab], `image_${index}.jpg`, { type: mimeString });
    });
  }

  downloadImage(image: GeneratedImage): void {
    // Extract filename from URL
    const filename = image.url.split('/').pop();
    if (!filename) {
      console.error('Unable to extract filename from URL:', image.url);
      return;
    }

    // Create download URL using backend download endpoint
    const downloadUrl = `http://localhost:3001/api/download/${filename}`;
    
    // Create temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.target = '_blank';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private handleApiError(errorMessage: string): void {
    const errorResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `Desculpe, ocorreu um erro: ${errorMessage}. Por favor, tente novamente.`,
      timestamp: new Date()
    };
    this.messages = [...this.messages, errorResponse];
  }
}