# Uselink Generator Backend

Backend em Node.js + TypeScript para geração de campanhas imobiliárias com IA e templates PSD.

## 🚀 Funcionalidades

- **Chat com IA**: Análise de perfil de empreendimentos imobiliários
- **Geração de Imagens**: Uso do CE.SDK da img.ly para manipular templates PSD
- **Templates Inteligentes**: Sistema baseado em perfis (baixo, médio, alto padrão)
- **Upload de Imagens**: Processamento de fotos dos empreendimentos
- **API RESTful**: Endpoints para integração com frontend Angular

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Licença do CE.SDK da img.ly
- Chave da API OpenAI

## 🛠️ Instalação

1. **Instalar dependências**
```bash
npm install
```

2. **Configurar variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

3. **Configurar o arquivo .env**
```env
# Servidor
PORT=3001
NODE_ENV=development

# CE.SDK Configuration
CESDK_LICENSE=sua_licenca_cesdk_aqui
CESDK_USER_ID=uselink-generator

# OpenAI API
OPENAI_API_KEY=sua_chave_openai_aqui
OPENAI_MODEL=gpt-4

# Outros...
```

4. **Compilar TypeScript**
```bash
npm run build
```

5. **Inicializar templates (desenvolvimento)**
```bash
curl -X POST http://localhost:3001/api/templates/initialize
```

## 🚦 Execução

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── controllers/     # Controladores da API
│   ├── services/        # Lógica de negócio
│   │   ├── AIService.ts          # Integração com OpenAI
│   │   ├── PSDService.ts         # Processamento de PSDs
│   │   ├── TemplateService.ts    # Gerenciamento de templates
│   │   └── CampaignService.ts    # Orquestração geral
│   ├── models/          # Interfaces TypeScript
│   ├── routes/          # Definição de rotas
│   ├── middleware/      # Middlewares (upload, etc)
│   ├── config/          # Configurações
│   └── utils/           # Utilitários
├── templates/           # Templates PSD
├── output/              # Imagens geradas
├── uploads/             # Uploads temporários
└── logs/                # Logs da aplicação
```

## 🔧 API Endpoints

### Chat
- `POST /api/chat/message` - Processar mensagem do chat
- `POST /api/chat/analyze` - Analisar perfil do produto
- `POST /api/chat/generate` - Gerar imagens apenas

### Templates
- `GET /api/templates/status` - Status dos templates
- `POST /api/templates/initialize` - Inicializar sistema de templates

### Utilitários
- `GET /api/health` - Health check
- `GET /api/output/*` - Servir imagens geradas

## 📖 Uso da API

### Enviar mensagem no chat com imagens
```javascript
const formData = new FormData();
formData.append('message', 'Quero criar uma campanha para meu apartamento');
formData.append('productInfo', JSON.stringify({
  description: 'Apartamento de 3 quartos...',
  target_audience: 'Famílias jovens',
  location: 'São Paulo - SP',
  budget: 'R$ 500/dia',
  duration: '15 dias'
}));
formData.append('images', file1);
formData.append('images', file2);

const response = await fetch('/api/chat/message', {
  method: 'POST',
  body: formData
});
```

### Resposta esperada
```json
{
  "success": true,
  "data": {
    "message": "Análise concluída! Seu empreendimento foi classificado...",
    "analysis": {
      "profile": "medio",
      "confidence": 85,
      "reasoning": "Baseado na descrição e orçamento...",
      "templateRecommendations": ["template_medio_feed", "template_medio_story"]
    },
    "generatedImages": [
      {
        "url": "/output/medio_template_feed_123456.png",
        "type": "feed",
        "format": "square",
        "template": "template_medio"
      }
    ]
  }
}
```

## 🎨 Sistema de Templates

O sistema usa templates PSD organizados por perfil:

### Estrutura de Templates
```
templates/
├── baixo_padrao_feed.psd
├── baixo_padrao_story.psd
├── medio_padrao_feed.psd
├── medio_padrao_story.psd
├── alto_padrao_feed.psd
└── alto_padrao_story.psd
```

### Camadas Esperadas nos PSDs
- `titulo_principal` - Título do anúncio
- `subtitulo` - Subtítulo ou descrição
- `preco` - Valor ou faixa de preço
- `botao_cta` - Call to action
- `imagem_produto` - Imagem do empreendimento
- `logo_empresa` - Logo da empresa/corretor

## 🤖 Análise de IA

A IA analisa automaticamente:
- Descrição do produto
- Público-alvo mencionado
- Localização e contexto
- Orçamento de mídia
- Palavras-chave indicativas

### Classificação de Perfis
- **BAIXO**: Empreendimentos populares, primeiros imóveis
- **MÉDIO**: Classe média, bom custo-benefício
- **ALTO**: Empreendimentos de luxo, alto padrão

## 🔍 Logs e Monitoramento

```bash
# Ver logs em tempo real
tail -f logs/combined.log

# Ver apenas erros
tail -f logs/error.log
```

## 🧪 Testes

```bash
# Executar testes
npm test

# Testes com coverage
npm run test:coverage
```

## 🐛 Troubleshooting

### Erro: "CE.SDK license invalid"
- Verifique se `CESDK_LICENSE` está configurado corretamente
- Confirme se a licença não expirou

### Erro: "OpenAI API key missing"
- Configure `OPENAI_API_KEY` no arquivo .env
- Verifique se há créditos na conta OpenAI

### Templates não encontrados
- Execute `POST /api/templates/initialize` para criar estrutura
- Adicione arquivos PSD reais na pasta `templates/`

### Problema de CORS
- Verifique `ALLOWED_ORIGINS` no .env
- Certifique-se que o frontend está na URL permitida

## 📞 Suporte

Para suporte técnico:
- Verifique os logs em `logs/`
- Teste endpoints com `GET /api/health`
- Consulte a documentação do CE.SDK