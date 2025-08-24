import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface AppConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
    destination: string;
  };
  output: {
    directory: string;
    maxImages: number;
  };
  security: {
    rateLimitWindow: number;
    rateLimitRequests: number;
  };
  logging: {
    level: string;
  };
  cesdk: {
    license: string;
    userId: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
  templates: {
    directory: string;
  };
}

const config: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  env: (process.env.NODE_ENV as any) || 'development',
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    destination: process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads'),
  },
  
  output: {
    directory: process.env.OUTPUT_PATH || path.join(process.cwd(), 'output'),
    maxImages: parseInt(process.env.MAX_IMAGES || '10', 10),
  },
  
  security: {
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100', 10),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  cesdk: {
    license: process.env.CESDK_LICENSE || '',
    userId: process.env.CESDK_USER_ID || 'uselink-generator',
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
  },
  
  templates: {
    directory: process.env.TEMPLATES_PATH || path.join(process.cwd(), 'templates'),
  },
};

export default config;