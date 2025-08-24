# Setup do Uselink Generator

## 🔧 Configuração Rápida

### 1. **Configuração do Backend**

O projeto já está configurado com as chaves do imgly_novo:

```bash
cd backend
npm install
```

O arquivo `.env` já foi criado com as chaves:
- ✅ **CE.SDK License**: Copiada do imgly_novo
- ✅ **OpenAI API Key**: Copiada do imgly_novo  
- ✅ **Fontes**: Copiadas para backend/fonts/

### 2. **Executar Backend**

```bash
cd backend
npm run dev
```

O servidor estará disponível em: `http://localhost:3001`

### 3. **Executar Frontend**

```bash
# Na raiz do projeto
npm install
npm start
```

O frontend estará disponível em: `http://localhost:4200`

### 4. **Inicializar Templates**

```bash
curl -X POST http://localhost:3001/api/templates/initialize
```

Isso criará a estrutura básica de templates na pasta `backend/templates/`

## 🧪 **Testando o Sistema**

### 1. **Health Check**
```bash
curl http://localhost:3001/api/health
```

### 2. **Status dos Templates**
```bash
curl http://localhost:3001/api/templates/status
```

### 3. **Teste de Chat (via frontend)**
- Acesse `http://localhost:4200`
- Clique no botão "📝 Informações do produto"
- Preencha os dados:
  - **Descrição**: "Apartamento de 3 quartos com varanda gourmet"
  - **Público-alvo**: "Famílias jovens"
  - **Localização**: "São Paulo - SP"
  - **Orçamento**: "R$ 500/dia"
  - **Duração**: "15 dias"
- Envie mensagem: "Criar campanha para meu empreendimento"

## 📁 **Estrutura Criada**

```
backend/
├── fonts/                    # ✅ Fontes copiadas do imgly_novo
│   ├── BebasNeue Regular.otf
│   ├── BebasNeue Bold.otf
│   └── ...
├── templates/                # 📂 Será criado após inicialização
├── output/                   # 📂 Imagens geradas
├── uploads/                  # 📂 Uploads temporários
├── logs/                     # 📂 Logs da aplicação
└── .env                      # ✅ Configurado com chaves reais
```

## 🎨 **Adicionando Templates PSD Reais**

Para usar templates PSD reais:

1. **Crie os arquivos PSD** com as seguintes especificações:
   - **Feed**: 1080x1080px
   - **Story**: 1080x1920px
   - **Resolução**: 300 DPI
   - **Modo**: RGB

2. **Nomeie as camadas** conforme esperado:
   ```
   titulo_principal    # Título do anúncio
   subtitulo          # Subtítulo
   preco              # Preço/valor
   botao_cta          # Call to action
   imagem_produto     # Foto do empreendimento
   logo_empresa       # Logo da empresa
   ```

3. **Salve os arquivos** em `backend/templates/`:
   ```
   baixo_padrao_feed.psd
   baixo_padrao_story.psd
   medio_padrao_feed.psd
   medio_padrao_story.psd
   alto_padrao_feed.psd
   alto_padrao_story.psd
   ```

## 🤖 **Como a IA Analisa**

A IA analisa automaticamente:

**Perfil BAIXO:**
- Palavras-chave: "popular", "acessível", "primeira casa", "financiamento"
- Orçamento: < R$ 300/dia
- Público: "jovens", "primeiro imóvel"

**Perfil MÉDIO:**
- Palavras-chave: "família", "qualidade", "localização"
- Orçamento: R$ 300-800/dia
- Público: "classe média", "profissionais"

**Perfil ALTO:**
- Palavras-chave: "luxo", "premium", "exclusivo", "sofisticado"
- Orçamento: > R$ 800/dia
- Público: "executivos", "alto padrão"

## 🚦 **Status dos Componentes**

- ✅ **Backend API**: Funcionando
- ✅ **Frontend Chat**: Funcionando  
- ✅ **IA Analysis**: Funcionando
- ✅ **File Upload**: Funcionando
- ✅ **CE.SDK Integration**: Configurado
- ⚠️ **Templates PSD**: Mockados (adicione PSDs reais)

## 🐛 **Solução de Problemas**

### Erro: "CE.SDK license invalid"
- ✅ **Resolvido**: Licença já configurada do imgly_novo

### Erro: "OpenAI API error"  
- ✅ **Resolvido**: Chave já configurada do imgly_novo

### Erro: "Font not found"
- ✅ **Resolvido**: Fontes já copiadas do imgly_novo

### Templates não encontrados
- Execute: `curl -X POST http://localhost:3001/api/templates/initialize`
- Adicione PSDs reais em `backend/templates/`

### Problema de CORS
- ✅ **Resolvido**: CORS já configurado para localhost:4200

## 🔗 **URLs Importantes**

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health
- **Templates Status**: http://localhost:3001/api/templates/status

## ⚡ **Próximos Passos**

1. **Teste o sistema completo** com o frontend
2. **Adicione templates PSD reais** conforme especificação
3. **Customize prompts da IA** em `AIService.ts` se necessário
4. **Configure produção** quando pronto para deploy

---

**Sistema pronto para uso!** 🚀