# Uselink Generator - Sistema de Chat com IA para Campanhas Imobiliárias

Sistema completo que integra chat com IA e geração automatizada de campanhas publicitárias para empreendimentos imobiliários usando templates PSD e CE.SDK da img.ly.

## 🎯 Visão Geral

O sistema permite que corretores e empresas imobiliárias:
1. **Conversem com IA** sobre seus empreendimentos
2. **Façam upload de fotos** (quarto, prédio, área comum)
3. **Forneçam informações** (descrição, público-alvo, orçamento, etc.)
4. **Recebam análise automática** do perfil do empreendimento (baixo/médio/alto padrão)
5. **Gerem imagens personalizadas** usando templates PSD profissionais

## 🏗️ Arquitetura

```
📁 uselink_generator/
├── 🖥️ Frontend (Angular 20+)
│   ├── Chat interface com IA
│   ├── Upload de imagens
│   ├── Formulário de produto
│   └── Exibição de resultados
│
├── ⚡ Backend (Node.js + TypeScript)
│   ├── 🤖 AIService (OpenAI GPT-4)
│   ├── 🎨 PSDService (CE.SDK img.ly)
│   ├── 📋 TemplateService
│   └── 🚀 CampaignService
│
└── 🎨 Templates PSD
    ├── Baixo padrão (Feed + Story)
    ├── Médio padrão (Feed + Story)
    └── Alto padrão (Feed + Story)
```

## 🚀 Quick Start

### 1. Frontend (Angular)
```bash
cd uselink_generator
npm install
npm start
# Acesse: http://localhost:4200
```

### 2. Backend (Node.js)
```bash
cd backend
npm install
cp .env.example .env
# Configure suas chaves de API no .env
npm run dev
# API: http://localhost:3001
```

### 3. Configuração Essencial

**Backend (.env):**
```env
CESDK_LICENSE=sua_licenca_cesdk
OPENAI_API_KEY=sua_chave_openai
PORT=3001
```

**Inicializar Templates:**
```bash
curl -X POST http://localhost:3001/api/templates/initialize
```

## 💡 Fluxo de Uso

### 1. **Usuário interage com o chat:**
- Envia mensagem descrevendo o empreendimento
- Faz upload de fotos (fachada, decorado, áreas comuns)
- Preenche informações estruturadas (opcional)

### 2. **IA analisa automaticamente:**
- Classifica o perfil: **baixo**, **médio** ou **alto** padrão
- Identifica público-alvo e estratégia
- Sugere textos otimizados para conversão

### 3. **Sistema gera campanhas:**
- Seleciona templates PSD apropriados
- Aplica textos personalizados
- Insere fotos do empreendimento
- Exporta imagens PNG finais

### 4. **Resultado:**
- Imagens para Feed (1080x1080)
- Imagens para Stories (1080x1920)
- Textos otimizados por perfil
- Pronto para publicar!

## 📊 Exemplo de Análise de IA

**Input do usuário:**
- Descrição: "Apartamento de 3 quartos com varanda gourmet"
- Público-alvo: "Famílias jovens"
- Orçamento: "R$ 400/dia"
- Fotos: apartamento decorado

**Output da IA:**
```json
{
  "profile": "medio",
  "confidence": 87,
  "reasoning": "Apartamento com diferencial (varanda gourmet) e orçamento médio indicam público classe B",
  "textSuggestions": {
    "title": "Sua Nova Casa Te Espera!",
    "subtitle": "3 quartos com varanda gourmet",
    "cta": "Agende sua Visita"
  }
}
```

## 🎨 Sistema de Templates

### Perfis Disponíveis:

**🏠 BAIXO PADRÃO**
- Cores: Azul vibrante
- Linguagem: Acessível, "realize seu sonho"
- Foco: Financiamento facilitado

**🏘️ MÉDIO PADRÃO**
- Cores: Verde/neutro
- Linguagem: Família, qualidade de vida
- Foco: Localização e comodidade

**🏙️ ALTO PADRÃO**
- Cores: Dourado/elegante
- Linguagem: Exclusividade, sofisticação
- Foco: Diferencial e status

### Formatos Gerados:
- **Feed Instagram**: 1080x1080px (quadrado)
- **Stories Instagram**: 1080x1920px (vertical)

## 🔧 Tecnologias Utilizadas

### Frontend
- **Angular 20+** - Framework principal
- **Tailwind CSS** - Estilização
- **RxJS** - Programação reativa
- **HttpClient** - Comunicação com API

### Backend
- **Node.js + TypeScript** - Runtime e linguagem
- **Express.js** - Framework web
- **OpenAI GPT-4** - Análise de IA
- **CE.SDK (img.ly)** - Processamento de PSD
- **Multer** - Upload de arquivos
- **Winston** - Logging

### Integração PSD
- **@cesdk/node** - Engine de processamento
- **@imgly/psd-importer** - Parser de arquivos PSD
- **Templates personalizados** - PSDs por perfil

## 📁 Estrutura de Diretórios

```
uselink_generator/
├── src/app/
│   ├── ai-assistant/          # Componente principal do chat
│   ├── services/              # Serviços Angular
│   └── models/                # Interfaces TypeScript
│
├── backend/
│   ├── src/
│   │   ├── services/          # Lógica de negócio
│   │   │   ├── AIService.ts   # OpenAI integration
│   │   │   ├── PSDService.ts  # CE.SDK processing
│   │   │   └── CampaignService.ts # Orchestration
│   │   ├── controllers/       # API endpoints
│   │   └── routes/            # Route definitions
│   ├── templates/             # Arquivos PSD
│   ├── output/                # Imagens geradas
│   └── uploads/               # Uploads temporários
│
└── imgly_novo/                # Código base CE.SDK
```

## 🔌 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/chat/message` | Processar mensagem + imagens |
| POST | `/api/chat/analyze` | Análise de perfil apenas |
| POST | `/api/chat/generate` | Gerar imagens apenas |
| GET | `/api/templates/status` | Status dos templates |
| GET | `/api/health` | Health check |
| GET | `/api/output/*` | Servir imagens geradas |

## 🧪 Exemplo de Uso Completo

```typescript
// Frontend - Enviar mensagem completa
const formData = new FormData();
formData.append('message', 'Criar campanha para lançamento');
formData.append('productInfo', JSON.stringify({
  description: 'Condomínio de casas, acabamento premium',
  target_audience: 'Executivos e profissionais liberais',
  location: 'Alphaville, SP',
  budget: 'R$ 800/dia',
  duration: '30 dias'
}));
formData.append('images', imagemFachada);
formData.append('images', imagemArea);

const response = await this.apiService.sendChatMessage(
  'Criar campanha para lançamento',
  productInfo,
  [imagemFachada, imagemArea]
);

// Resposta inclui:
// - Análise de perfil (alto padrão)
// - Imagens geradas (2 feeds + 2 stories)
// - Textos otimizados
```

## 🚦 Status do Projeto

- ✅ **Frontend Angular** - Chat interface completa
- ✅ **Backend Node.js** - API funcionando
- ✅ **Integração IA** - OpenAI GPT-4
- ✅ **Sistema PSD** - CE.SDK integrado
- ✅ **Templates** - Sistema por perfil
- ✅ **Upload** - Processamento de imagens
- ✅ **Comunicação** - Frontend ↔ Backend

## 📋 Próximos Passos

1. **Adicionar Templates PSD Reais**
   - Criar PSDs profissionais para cada perfil
   - Configurar camadas nomeadas corretamente

2. **Melhorar Análise de IA**
   - Análise de imagens com Computer Vision
   - Detecção automática de características

3. **Funcionalidades Avançadas**
   - Histórico de campanhas
   - Métricas de performance
   - Integração com redes sociais

## 🔑 Configuração de Produção

### Variáveis de Ambiente Necessárias:
```env
# CE.SDK
CESDK_LICENSE=sua_licenca_img_ly

# OpenAI
OPENAI_API_KEY=sk-sua_chave_openai
OPENAI_MODEL=gpt-4

# Servidor
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://seudominio.com
```

## 📞 Suporte

Para dúvidas técnicas:
1. Verifique os logs: `backend/logs/`
2. Teste a API: `GET /api/health`
3. Verifique templates: `GET /api/templates/status`

---

**Uselink Generator** - Transformando descrições em campanhas de alta conversão! 🚀
