# 📚 Plano de Desenvolvimento - AudioBook Técnico em Inglês

**Status:** Pronto para começar  
**Data de Início:** 22 de Julho de 2026  
**Data Estimada de Launch:** Maio de 2027  
**Tempo Dedicado:** 1-2 horas por dia  

---

## 🎯 Visão Geral do Projeto

**Nome:** TechSpeak (ou similar)

**Tagline:** "Aprenda o inglês que engenheiros de software realmente usam no trabalho."

**Objetivo:** Plataforma de aprendizado de inglês técnico com audiobooks contextualizados para profissionais de TI.

**Plataformas:** Web (React) + Desktop (Electron) + Mobile (React Native - fase posterior)

---

## 🏗️ Arquitetura Geral

```
Frontend
├── Web (React)
├── Desktop (Electron + React)
└── Mobile (React Native - futuro)

Backend
├── API (Node.js + Express)
├── Database (PostgreSQL)
└── Cache (Redis)

Serviços Externos
├── OpenAI API (IA/Chat)
├── Deepgram/Web Speech (Pronúncia)
├── ElevenLabs (Text-to-Speech)
└── Stripe (Pagamentos)

Storage
├── AWS S3 (Áudio)
└── CDN (CloudFront)
```

---

## 💡 Melhorias Implementadas

### 1. **Abordagem Desktop-First + Web Simultânea**
- Desktop (Electron) para usuarios mais sérios que vão usar diariamente
- Web para acesso rápido/mobile browser
- Sincronização automática entre plataformas

### 2. **Offline-First Architecture**
- SQLite local em Desktop para cache de audiobooks
- Sincronização com backend quando online
- Economiza banda de internet

### 3. **Modularização Agressiva**
- Componentes React reutilizáveis
- Lógica de negócio separada (services)
- Fácil manutenção e teste

### 4. **Analytics desde o MVP**
- Rastrear comportamento de usuários
- Validar hipóteses rápido
- Dados para monetização

### 5. **CI/CD Automático**
- GitHub Actions
- Deploy automático em staging
- Testes rodam antes de merge

### 6. **Sistema de Feature Flags**
- Ativar/desativar features sem deploy
- A/B testing desde o início

---

## 📅 Cronograma por Etapas

### **ETAPA 1: Setup & Infraestrutura (Semanas 1-2 | ~10 dias de trabalho)**

**Objetivo:** Ter ambiente pronto para desenvolver

#### Semana 1 - Dia 1-5

**Dia 1: Preparação do Repositório**
```bash
# Criar estrutura base
mkdir techspeak
cd techspeak

# Inicializar monorepo
npm init -w packages/backend -w packages/web -w packages/desktop

# .gitignore global
# package.json root com workspaces
# README.md base
```

**Commits esperados:**
- `init: setup monorepo structure`
- `init: add global gitignore`
- `docs: add project README`

**Dia 2: Backend Setup**
```
packages/backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── utils/
│   └── index.js
├── tests/
├── .env.example
└── package.json
```

**Commits:**
- `backend: init express server`
- `backend: setup database config (PostgreSQL)`
- `backend: add environment variables`

**Dia 3: Web Setup (React)**
```
packages/web/
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── pages/
│   │   └── features/
│   ├── hooks/
│   ├── services/
│   ├── store/ (Redux ou Context)
│   ├── styles/
│   ├── App.jsx
│   └── main.jsx
├── public/
├── .env.example
└── vite.config.js (usar Vite, não CRA)
```

**Commits:**
- `web: init vite + react project`
- `web: setup routing (React Router)`
- `web: add tailwind CSS`

**Dia 4: Desktop Setup (Electron)**
```
packages/desktop/
├── public/
│   ├── preload.js
│   └── main.js (processo main)
├── src/
│   └── (reutiliza código React de web/)
├── electron.vite.config.js
└── package.json
```

**Commits:**
- `desktop: init electron with react`
- `desktop: setup IPC communication`
- `desktop: configure window manager`

**Dia 5: DevOps & CI/CD**

**GitHub Actions (.github/workflows/):**
```yaml
- test.yml (roda testes)
- lint.yml (eslint + prettier)
- deploy-staging.yml (deploy automático)
```

**Commits:**
- `ci: add github actions workflows`
- `ci: setup husky + pre-commit hooks`
- `docs: add development guidelines`

---

#### Semana 2 - Dia 6-10

**Dia 6: Banco de Dados Schema**

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  name VARCHAR,
  plan VARCHAR DEFAULT 'free', -- free, pro, corporate
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Audiobooks
CREATE TABLE audiobooks (
  id UUID PRIMARY KEY,
  title VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR, -- Software Engineering, Data Science, etc
  duration_minutes INT,
  level VARCHAR, -- beginner, intermediate, advanced
  created_at TIMESTAMP
);

-- Chapters
CREATE TABLE chapters (
  id UUID PRIMARY KEY,
  audiobook_id UUID REFERENCES audiobooks,
  title VARCHAR NOT NULL,
  order_index INT,
  audio_url VARCHAR,
  duration_seconds INT,
  transcript TEXT,
  created_at TIMESTAMP
);

-- Words (para tradução)
CREATE TABLE words (
  id UUID PRIMARY KEY,
  word VARCHAR NOT NULL,
  pronunciation VARCHAR,
  portuguese_translation VARCHAR,
  technical_explanation TEXT,
  chapter_id UUID REFERENCES chapters,
  example_sentence TEXT,
  created_at TIMESTAMP
);

-- User Progress
CREATE TABLE user_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  chapter_id UUID REFERENCES chapters,
  words_learned INT DEFAULT 0,
  listening_count INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  last_accessed TIMESTAMP,
  created_at TIMESTAMP
);

-- Flashcards
CREATE TABLE flashcards (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  word_id UUID REFERENCES words,
  learning_status VARCHAR DEFAULT 'new', -- new, learning, mastered
  review_count INT DEFAULT 0,
  last_reviewed TIMESTAMP,
  next_review TIMESTAMP,
  created_at TIMESTAMP
);

-- Chat History (IA)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  chapter_id UUID REFERENCES chapters,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  message_type VARCHAR, -- vocabulary, grammar, pronunciation
  created_at TIMESTAMP
);
```

**Commits:**
- `database: create schema v1`
- `backend: add database migrations`

**Dia 7: Backend API Base**

**Rotas iniciais:**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token

GET    /api/audiobooks
GET    /api/audiobooks/:id
GET    /api/audiobooks/:id/chapters

GET    /api/user/progress
POST   /api/user/progress/:chapterId
GET    /api/user/flashcards

POST   /api/health (para monitoramento)
```

**Commits:**
- `backend: add auth endpoints`
- `backend: add audiobook endpoints`
- `backend: add progress tracking`
- `backend: add error handling middleware`

**Dia 8: Authentication & JWT**

**Funcionalidades:**
- Registro com email
- Login com JWT
- Refresh token
- Proteção de rotas

**Commits:**
- `backend: implement JWT authentication`
- `backend: add bcrypt password hashing`
- `backend: add auth middleware`

**Dia 9: Frontend - Layout Base**

**Componentes principais:**
```
Layout/
├── Navbar
├── Sidebar
└── Main Content

Pages/
├── Login
├── Register
├── Dashboard
├── AudiobookList
└── Player (shell)
```

**Commits:**
- `web: create main layout`
- `web: add authentication pages`
- `web: add navigation structure`
- `web: add placeholder pages`

**Dia 10: Desktop - Sincronização Base**

**Funcionalidades:**
- Comunicação Frontend <-> Main Process
- Cache local SQLite
- Sync automático com backend

**Commits:**
- `desktop: implement IPC handlers`
- `desktop: setup sqlite caching`
- `desktop: add auto-sync mechanism`

---

### **ETAPA 2: Player de Áudio & Tradução (Semanas 3-5 | ~15 dias)**

**Objetivo:** Ter um audiobook playável com tradução funcional

#### Semana 3 - Dia 11-15

**Dia 11: Audio Player Component**

```jsx
// AudioPlayer.jsx
- Play/Pause
- Progress bar
- Current time / Duration
- Volume control
- Speed control (0.7x, 0.8x, 1.0x, 1.2x, 1.5x)
- Timestamp display
```

**Commits:**
- `web: create audio player component`
- `web: implement playback controls`
- `web: add progress tracking`

**Dia 12: Word Highlighting & Sync**

**Funcionalidades:**
- Carregar transcript
- Sincronizar palavras com áudio (timestamps)
- Highlight da palavra sendo reproduzida em tempo real

**Arquivo de dados (exemplo):**
```json
{
  "words": [
    {
      "id": "w1",
      "text": "deployed",
      "start": 2.5,
      "end": 3.2,
      "pronunciation": "/dee-plóid/"
    }
  ]
}
```

**Commits:**
- `web: add word highlighting system`
- `web: implement audio-text synchronization`
- `web: create transcript display`

**Dia 13: Translation Popup**

**Funcionalidades:**
```
User clicks "deployed" →
Popup appears:
├── English word
├── Portuguese translation
├── Pronunciation
├── Technical explanation
├── Example sentence
└── Auto-close after 3s
```

**Commits:**
- `web: create translation popup component`
- `web: implement word click handler`
- `web: add popup animations`

**Dia 14: Armazenar Palavras Clicadas**

**Backend:**
```
POST /api/user/words-learned
{
  "chapterId": "...",
  "wordId": "...",
  "timestamp": "..."
}
```

**Commits:**
- `backend: add endpoint to save learned words`
- `web: implement word saving on click`
- `backend: add analytics tracking`

**Dia 15: Testar Fluxo Completo**

**Checklist:**
- [ ] Upload audiobook de teste
- [ ] Abrir player
- [ ] Clicar em palavras
- [ ] Ver tradução
- [ ] Salvar progresso
- [ ] Verificar BD

**Commits:**
- `test: add e2e tests for player`
- `docs: add player documentation`

---

#### Semana 4 - Dia 16-20

**Dia 16: Explicação Técnica**

**Melhorar popup com:**
```
deployed (palavra)
└── Verbo
    ├── Tradução: "Implantar"
    ├── Explicação técnica: "No contexto de software, significa colocar código em produção"
    ├── Exemplo: "We deployed the backend yesterday"
    └── Contextos: ["DevOps", "CI/CD"]
```

**Backend (seed dados):**
```javascript
// Criar dicionário técnico base
const technicalDictionary = [
  {
    word: "deployed",
    translation: "Implantado/Deployado",
    explanation: "Colocar código em produção",
    examples: [...],
    contexts: ["DevOps", "CI/CD"]
  }
  // +300 palavras técnicas
];
```

**Commits:**
- `backend: add technical dictionary service`
- `backend: seed initial technical words`
- `web: enhance translation popup with explanations`

**Dia 17: Flashcards Automáticos**

**Funcionalidades:**
- Todas as palavras clicadas entram automaticamente em deck
- Algoritmo SRS (Spaced Repetition) básico

**Modelo de dados:**
```javascript
flashcard: {
  id: "...",
  userId: "...",
  wordId: "...",
  status: "new" | "learning" | "mastered",
  easeFactor: 2.5, // Começar com padrão
  interval: 1, // dias até próxima revisão
  nextReview: Date,
  reviewCount: 0
}
```

**Commits:**
- `backend: implement flashcard creation`
- `backend: add SRS algorithm (SM-2)`
- `web: create flashcard review interface`

**Dia 18: Pronúncia - Gravação**

**Funcionalidades:**
- Botão: "Gravem a frase"
- Mostrar wave form
- Comparar com pronúncia correta

**Usar:** Web Speech API (MVP simples) + Deepgram (futuro)

**Commits:**
- `web: add audio recording component`
- `web: implement pronunciation checker (Web Speech API)`

**Dia 19: Página de Dashboard**

**Mostrar:**
- Audiobooks em progresso
- Palavras aprendidas (hoje, semana, mês)
- Flashcards para revisar
- Tempo total estudado
- Streak de dias

**Commits:**
- `web: create user dashboard`
- `web: add statistics components`
- `backend: add statistics endpoints`

**Dia 20: Integração Desktop**

**Sincronizar:**
- Progresso de leitura
- Palavras aprendidas
- Flashcards

**Commits:**
- `desktop: implement progress sync`
- `desktop: add offline playback capability`

---

#### Semana 5 - Dia 21-25

**Dia 21: Testes Automatizados - Backend**

```javascript
// tests/auth.test.js
describe('Authentication', () => {
  it('should register new user', () => {});
  it('should login with valid credentials', () => {});
  it('should reject invalid credentials', () => {});
});

// tests/player.test.js
describe('Audio Player', () => {
  it('should sync words with audio', () => {});
  it('should save clicked words', () => {});
});
```

**Commits:**
- `test: add backend unit tests`
- `test: add API integration tests`
- `ci: add test coverage reporting`

**Dia 22: Testes Automatizados - Frontend**

```javascript
// Tests com React Testing Library + Vitest
```

**Commits:**
- `test: add frontend component tests`
- `test: add integration tests`

**Dia 23: Performance Optimization**

**Melhorias:**
- Lazy loading de audiobooks
- Caching de imagens
- Compressão de áudio
- Code splitting React

**Commits:**
- `perf: optimize audio loading`
- `perf: add lazy loading`
- `perf: implement code splitting`

**Dia 24: Responsividade Mobile**

**Testar em:**
- iPhone 12/14
- Android (Samsung, Google Pixel)
- Tablets

**Commits:**
- `ui: improve mobile responsiveness`
- `ui: optimize touch interactions`

**Dia 25: Review & Bug Fixes**

**Checklist:**
- [ ] Testar fluxo completo
- [ ] Checar performance
- [ ] Verificar segurança
- [ ] Cross-browser testing

**Commits:**
- `fix: resolve audio sync issues`
- `fix: improve error handling`
- `docs: update API documentation`

---

### **ETAPA 3: IA & Chat (Semanas 6-8 | ~15 dias)**

**Objetivo:** Adicionar inteligência artificial para dúvidas

#### Semana 6 - Dia 26-30

**Dia 26: Integração OpenAI API**

```javascript
// services/ai.service.js
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function explainTechnicalTerm(word, context) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "Você é um professor de inglês técnico especializado em software. Respostas curtas e diretas."
      },
      {
        role: "user",
        content: `Explique a palavra "${word}" no contexto de: ${context}`
      }
    ],
    max_tokens: 150
  });
  
  return response.choices[0].message.content;
}
```

**Commits:**
- `backend: setup OpenAI integration`
- `backend: add AI explanation endpoint`
- `.env: add OPENAI_API_KEY to example`

**Dia 27: Chat Interface**

**Funcionalidades:**
```
Chat com IA
├── Histórico de mensagens
├── Typing indicator
├── Copy response
└── Flag as helpful/not helpful
```

**Commits:**
- `web: create chat component`
- `web: add message history display`
- `web: implement real-time chat`

**Dia 28: Context-Aware Chat**

**Enviar para IA:**
```json
{
  "userMessage": "Por que usaram 'would' nessa frase?",
  "chapterId": "...",
  "wordId": "...",
  "previousMessages": [...]
}
```

**IA lê contexto do audiobook e responde melhor.**

**Commits:**
- `backend: add context-aware AI responses`
- `backend: implement chat message storage`

**Dia 29: Feedback do Capítulo**

**Após terminar capítulo:**
```
"Você entendeu este capítulo?"
├── Sim
├── Mais ou menos
└── Não entendi
```

**Se não entendeu:**
- IA oferece resumo
- Sugere palavras-chave
- Oferece exercício

**Commits:**
- `web: add chapter feedback form`
- `backend: add AI remedial content`

**Dia 30: Cache de Respostas IA**

**Melhorias de performance:**
- Cache em Redis
- Reutilizar respostas para mesmas perguntas

**Commits:**
- `backend: add redis caching for AI responses`
- `backend: implement cache invalidation`

---

#### Semana 7 - Dia 31-35

**Dia 31: Análise de Dificuldades**

**IA detecta:**
- Palavras que usuário clica repetidamente
- Capítulos com taxa baixa de conclusão
- Tópicos de dúvidas frequentes

**Commits:**
- `backend: add difficulty analysis`
- `backend: create user difficulty profile`

**Dia 32: Repetição Inteligente**

**Sistema:**
- Palavras difíceis aparecem em capítulos futuros
- Ordem customizada por dificuldade
- Sugestões de prioridade de estudo

**Commits:**
- `backend: implement intelligent scheduling`
- `backend: add word repetition algorithm`

**Dia 33: Pronúncia com IA**

**Melhorar com Deepgram (ou similar):**
```
User: Grava "We need to optimize the query"
Sistema:
├── Transcreve com Deepgram
├── Compara com pronúncia padrão
├── Dá feedback detalhado
└── Score: 92% (excelente!)
```

**Commits:**
- `backend: integrate Deepgram API`
- `web: enhance pronunciation feedback`

**Dia 34: Recomendações Personalizadas**

**IA sugere:**
- Próximo capítulo ideal
- Audiobook recomendado
- Horário melhor para estudar

**Commits:**
- `backend: add recommendation engine`
- `web: create recommendations feed`

**Dia 35: Testes IA**

**Testar:**
- Qualidade das respostas
- Latência
- Custo (OpenAI é caro!)

**Commits:**
- `test: add AI response quality tests`
- `test: benchmark AI latency`
- `docs: add AI usage guidelines`

---

#### Semana 8 - Dia 36-40

**Dia 36: Voice Assistant (MVP)**

**Comando de voz:**
- "Explain deployed"
- "Play next chapter"
- "Check my progress"

**Usar:** Web Speech API

**Commits:**
- `web: add voice command interface`
- `backend: add voice endpoint`

**Dia 37: Otimização de Custos IA**

**Estratégias:**
- Prompt engineering melhorado
- Cache agressivo
- Usar GPT-3.5 para respostas simples, GPT-4 para complexas
- Rate limiting por usuário

**Commits:**
- `backend: optimize AI prompt templates`
- `backend: implement cost tracking`

**Dia 38: Analytics IA**

**Rastrear:**
- Quantas perguntas por capítulo?
- Tempo de resposta
- User satisfaction
- Custo por usuário

**Commits:**
- `backend: add AI analytics tracking`
- `web: create admin analytics dashboard`

**Dia 39: Fallbacks & Error Handling**

**Se IA falhar:**
- Mostrar FAQ relacionada
- Sugerir documentação externa
- Oferecer contato com suporte humano

**Commits:**
- `backend: add graceful AI fallbacks`
- `web: improve error messages`

**Dia 40: Review & Optimize**

**Checklist:**
- [ ] IA funciona em 95% dos casos
- [ ] Custo é sustentável
- [ ] Usuários acham útil
- [ ] Performance está boa

**Commits:**
- `refactor: optimize AI service architecture`
- `docs: document AI limitations`

---

### **ETAPA 4: Conteúdo & Monetização (Semanas 9-12 | ~20 dias paralelos)**

**Objetivo:** Criar conteúdo e sistema de pagamento

#### Semana 9 - Dia 41-45

**Dia 41: Criar Audiobook Template**

**Estrutura padrão:**
```
Audiobook: Daily Standup
├── Chapter 1: Opening
│   └── "Yesterday I deployed..."
├── Chapter 2: Updates
│   └── "Today I'm working on..."
├── Chapter 3: Blockers
│   └── "We're facing..."
├── Chapter 4: Planning
│   └── "Sprint priorities..."
└── Chapter 5: Closing
    └── "Any questions?"

Total: 12-15 minutos
Palavras-chave: 80-100
```

**Commits:**
- `content: add audiobook structure template`
- `docs: add content guidelines`

**Dia 42: Primeira Série de Audiobooks**

**Criar 5 audiobooks iniciais:**

1. **Daily Standup** (15 min)
   - Frases de reunião diária
   - Vocabulário: deployed, blockers, priorities

2. **Git & Code Review** (18 min)
   - Pull requests, commits, branches
   - Vocabulário: merge, refactor, reviewed

3. **API Design** (20 min)
   - Endpoints, requests, responses
   - Vocabulário: payload, schema, deprecate

4. **Cloud & DevOps** (18 min)
   - AWS, Docker, Kubernetes
   - Vocabulário: container, cluster, instance

5. **Interview Preparation** (25 min)
   - Perguntas técnicas em inglês
   - Vocabulário: architecture, complexity, trade-off

**Commits:**
- `content: add "Daily Standup" audiobook`
- `content: add "Git & Code Review" audiobook`
- `content: add "API Design" audiobook`
- `content: add "Cloud & DevOps" audiobook`
- `content: add "Interview Preparation" audiobook`

**Dia 43: Sistema de Upload de Áudio**

**Backend:**
```
POST /api/admin/audiobooks
├── title
├── description
├── category
├── audio_file (S3)
├── transcript
├── words_metadata (JSON com timestamps)
└── thumbnail
```

**Funcionalidades:**
- Upload para AWS S3
- Processamento de áudio (converter formatos)
- Gerar timestamps automaticamente (Deepgram)

**Commits:**
- `backend: add audiobook upload endpoint`
- `backend: integrate AWS S3`
- `backend: add audio processing`

**Dia 44: Admin Dashboard**

**Funcionalidades:**
```
Admin Panel
├── Upload Audiobooks
├── Ver Analytics
├── Gerenciar Usuários
├── Monitor IA Costs
└── View Revenue
```

**Commits:**
- `web: create admin dashboard`
- `backend: add admin endpoints`
- `backend: add role-based access control`

**Dia 45: Sistema de Transcrição Automática**

**Process:**
1. Upload áudio
2. Enviar para Deepgram API
3. Transcrição automática
4. Review manual
5. Sincronizar com player

**Commits:**
- `backend: integrate Deepgram transcription`
- `backend: add transcript review workflow`

---

#### Semana 10 - Dia 46-50

**Dia 46: Plano de Preços**

**3 Tiers:**

```
Free
├── 2 audiobooks
├── Flashcards básicos
├── 1 chat por dia
└── R$ 0

Pro ($9.99/mês ou R$50/mês)
├── Unlimited audiobooks
├── Flashcards ilimitados
├── IA ilimitada
├── Pronúncia feedback
├── Offline mode
└── Sem anúncios

Corporate (Custom)
├── Team management
├── Progress tracking
├── Customização de conteúdo
├── SSO integration
├── Dedicated support
└── Contato direto
```

**Commits:**
- `docs: add pricing strategy`
- `backend: document monetization model`

**Dia 47: Sistema de Pagamento (Stripe)**

**Backend:**
```javascript
// Criar subscription
POST /api/payment/create-subscription
{
  "priceId": "price_pro_monthly",
  "paymentMethod": "..."
}

// Webhook
POST /api/webhooks/stripe
// Atualizar DB quando pagamento confirma
```

**Commits:**
- `backend: integrate Stripe API`
- `backend: add subscription management`
- `backend: add webhook handlers`

**Dia 48: Página de Checkout**

**Fluxo:**
```
User clicks "Upgrade to Pro"
    ↓
Redireciona para Stripe Checkout
    ↓
Paga e retorna para app
    ↓
Ativa Pro features
```

**Commits:**
- `web: create pricing page`
- `web: add Stripe checkout integration`
- `web: add subscription status display`

**Dia 49: Feature Flags para Paywall**

**Sistema:**
```javascript
if (user.plan === 'free') {
  // Mostrar limite
  // Sugerir upgrade
}

if (user.plan === 'pro') {
  // Desbloquear tudo
}
```

**Commits:**
- `backend: add feature flags system`
- `web: implement paywall logic`

**Dia 50: Teste de Pagamento (Sandbox)**

**Checklist:**
- [ ] Criar subscription
- [ ] Processar pagamento
- [ ] Webhook funciona
- [ ] Acesso liberado
- [ ] Cancelamento funciona

**Commits:**
- `test: add payment integration tests`
- `docs: add payment troubleshooting guide`

---

#### Semana 11-12 - Dia 51-60

**Dia 51-52: CMS para Conteúdo**

**Funcionalidade:**
- Interface amigável para criar audiobooks
- Preview
- Agendamento de lançamento

**Commits:**
- `backend: add CMS endpoints`
- `web: create content management interface`

**Dia 53-54: Análise de Receptividade**

**Tracking:**
- Quantos usuários completam cada audiobook?
- Qual é a taxa de churn?
- Qual é o LTV (Lifetime Value)?

**Commits:**
- `backend: add advanced analytics`
- `web: create metrics dashboard`

**Dia 55-56: Testes A/B**

**Testar:**
- Preço Pro: $9.99 vs $12.99
- Copy de desconto
- UI do paywall

**Commits:**
- `backend: implement A/B testing framework`
- `web: add variant tracking`

**Dia 57-58: Suporte ao Cliente**

**Funcionalidades:**
- FAQ section
- Chat com suporte (mínimo: email)
- Help center

**Commits:**
- `web: add help center`
- `web: add FAQ section`
- `backend: add support ticket system`

**Dia 59-60: Review & Otimização**

**Checklist:**
- [ ] Conversão aceitável?
- [ ] Churn baixo?
- [ ] Custo de aquisição? (CAC)
- [ ] Lifetime value? (LTV)
- [ ] LTV > 3x CAC?

**Commits:**
- `docs: add monetization report`
- `refactor: optimize conversion funnel`

---

### **ETAPA 5: App Desktop Polido (Semanas 13-16 | ~20 dias)**

**Objetivo:** App desktop de qualidade profissional

#### Semana 13 - Dia 61-65

**Dia 61-62: Sincronização Robusta**

**Funcionalidades:**
- Sync bidirecional com backend
- Conflitos resolvidos automaticamente
- Offline mode completo

**Commits:**
- `desktop: implement robust sync`
- `desktop: add conflict resolution`

**Dia 63-64: Notificações Desktop**

**Tipos:**
- Novo audiobook disponível
- Flashcard para revisar
- Streak quebrado (motivação)
- Conversa IA aguardando resposta

**Commits:**
- `desktop: add native notifications`
- `desktop: implement notification center`

**Dia 65: Atalhos de Teclado**

```
Cmd+Space: Buscar audiobook
Cmd+P: Play/Pause
Cmd+L: Show library
Cmd+R: Flashcard review
```

**Commits:**
- `desktop: add keyboard shortcuts`
- `desktop: add shortcuts help menu`

---

#### Semana 14 - Dia 66-70

**Dia 66-67: Dark Mode**

**Implementação:**
- Detecção automática de preferência do SO
- Toggle manual
- Persistir escolha

**Commits:**
- `web: add dark mode support`
- `desktop: add dark mode support`

**Dia 68-69: Temas Customizáveis**

**Opções:**
- Light/Dark
- Cores primárias
- Tamanho de fonte

**Commits:**
- `web: add theme customization`
- `backend: save user theme preferences`

**Dia 70: Acessibilidade (a11y)**

**Checklist:**
- [ ] ARIA labels
- [ ] Contraste de cores (WCAG AA)
- [ ] Navegação por teclado
- [ ] Screen reader compatibility

**Commits:**
- `ui: improve accessibility`
- `test: add a11y tests`

---

#### Semana 15 - Dia 71-75

**Dia 71-72: Testes de Carga**

**Simular:**
- 1000 usuários simultâneos
- Servidor aguenta?
- IA ainda funciona?

**Tools:** K6, JMeter

**Commits:**
- `test: add load testing suite`
- `docs: add performance benchmarks`

**Dia 73-74: Otimização de Performance**

**Pontos:**
- Image optimization
- Minification
- Service Worker (PWA)
- Database indexing

**Commits:**
- `perf: optimize bundle size`
- `perf: add service worker`
- `perf: improve database queries`

**Dia 75: Segurança**

**Checklist:**
- [ ] HTTPS apenas
- [ ] CORS configurado
- [ ] Rate limiting
- [ ] Input validation
- [ ] SQL injection protection
- [ ] XSS protection

**Commits:**
- `security: add HTTPS enforcement`
- `security: add rate limiting`
- `security: improve input validation`

---

#### Semana 16 - Dia 76-80

**Dia 76-77: Beta Tester Program**

**Processo:**
1. Recrutar 50-100 beta testers
2. Dar acesso Pro grátis
3. Coletar feedback
4. Iterar rapidamente

**Commits:**
- `backend: add beta program management`
- `web: create beta feedback form`

**Dia 78-79: Bug Fixing Sprint**

**Focar em:**
- Crashes
- Data loss
- Performance issues
- Security issues

**Commits:**
- `fix: resolve critical bugs from beta`
- `fix: improve error handling`

**Dia 80: Pre-Launch Checklist**

```
□ Todas as features funcionam
□ Testes passam (95%+ cobertura)
□ Segurança auditada
□ Performance aceita
□ Documentação completa
□ Suporte pronto
□ Backup system testado
□ Disaster recovery plan
□ Analytics funcionando
□ Payment system testado
□ Email service testado
```

**Commits:**
- `release: prepare for launch`
- `docs: add launch day checklist`

---

### **ETAPA 6: Mobile (React Native) - Semanas 17-20 | ~20 dias**

**Nota:** Paralelo às etapas anteriores é possível, mas melhor após MVP estável.

#### Semana 17-18 - Dia 81-90

**Dia 81-85: Setup React Native**

```
packages/mobile/
├── app.json
├── App.jsx
├── src/
│   ├── screens/
│   ├── components/
│   ├── services/
│   └── navigation/
└── eas.json (Expo)
```

**Commits:**
- `mobile: init react native with expo`
- `mobile: setup navigation`
- `mobile: add authentication flow`

**Dia 86-90: Port Features**

**Prioridade:**
1. Player
2. Flashcards
3. Dashboard
4. Chat IA

**Commits:**
- `mobile: implement audio player`
- `mobile: port flashcard system`
- `mobile: add offline support`

---

#### Semana 19-20 - Dia 91-100

**Dia 91-95: iOS Build & Testing**

**Processos:**
- Testflight
- Configurar push notifications
- App Store Connect

**Commits:**
- `mobile: configure iOS build`
- `mobile: add push notifications`

**Dia 96-100: Android Build & Testing**

**Processos:**
- Google Play internal testing
- Configurar push notifications
- Google Play Console

**Commits:**
- `mobile: configure android build`
- `mobile: test on real devices`

---

## 📊 Padrão de Commits Git

### **Convenção Commit Semântico:**

```
<tipo>(<escopo>): <descrição>

<corpo>

<rodapé>
```

### **Tipos:**
- `feat:` Nova feature
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação (sem mudança lógica)
- `refactor:` Refatoração
- `test:` Testes
- `perf:` Performance
- `ci:` CI/CD
- `chore:` Dependências, setup
- `security:` Segurança
- `content:` Conteúdo (audiobooks, etc)

### **Exemplos:**

```bash
# Feature
git commit -m "feat(player): add playback speed control"

# Bug fix
git commit -m "fix(auth): resolve JWT refresh token expiration"

# Documentation
git commit -m "docs(api): add endpoint examples"

# Com corpo
git commit -m "feat(payment): integrate Stripe subscription

- Add subscription creation endpoint
- Implement webhook handlers
- Add subscription status tracking

Closes #42"
```

---

## 🌿 Estratégia de Branches

### **Main branches:**
```
main              (Production-ready)
  ↑
staging           (Pre-production testing)
  ↑
develop           (Integration branch)
  ↑
feature/*         (Feature development)
fix/*             (Bug fixes)
refactor/*        (Refactoring)
```

### **Fluxo de trabalho:**

```bash
# 1. Criar feature branch
git checkout -b feature/player-speed-control

# 2. Trabalhar localmente
# ... múltiplos commits pequenos

# 3. Push para GitHub
git push origin feature/player-speed-control

# 4. Criar Pull Request
# - Add description
# - Link related issues
# - Request review

# 5. Code review
# - Feedback
# - Iterações

# 6. Merge para develop
# - Squash commits (opcional)
# - Delete branch

# 7. Deploy para staging
# - Testes automáticos
# - Manual testing

# 8. Merge para main (release)
git checkout main
git merge --no-ff develop
git tag v1.0.0
```

---

## 📝 Template Pull Request

```markdown
## Descrição
Breve descrição do que foi feito.

## Tipo de Mudança
- [ ] Nova feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentação

## Como foi testado?
Descrever os testes executados.

## Screenshots (se aplicável)
Adicionar screenshots.

## Checklist
- [ ] Código segue o style guide
- [ ] Self-review do código
- [ ] Comentários adicionados para código complexo
- [ ] Documentação atualizada
- [ ] Testes adicionados
- [ ] Testes locais passam
- [ ] Sem mensagens de erro no console

## Issues relacionadas
Closes #123
```

---

## 🧪 Testes - Estrutura

```
tests/
├── unit/                 # Testes unitários
│   ├── auth.test.js
│   ├── player.test.js
│   └── ai.test.js
├── integration/          # Testes de integração
│   ├── payment.test.js
│   └── sync.test.js
├── e2e/                  # Testes end-to-end
│   ├── auth-flow.test.js
│   ├── player-flow.test.js
│   └── purchase-flow.test.js
└── fixtures/            # Dados de teste
    └── mock-data.js
```

### **Executar testes:**
```bash
npm test                    # Todos
npm run test:unit          # Unitários
npm run test:integration   # Integração
npm run test:e2e          # End-to-end
npm run test:coverage     # Com cobertura
```

---

## 📈 Métricas de Progresso

### **Rastrear:**
- **Commits/dia:** Meta 1-3 commits focados
- **Pull Requests/semana:** 3-5 PRs
- **Testes:** Manter 80%+ cobertura
- **Performance:** Lighthouse 90+
- **Bugs:** < 5% de defect rate

### **Dashboard (criar no final):**
```
Week 1-2: 12 commits, 100% coverage ✓
Week 3-5: 25 commits, 85% coverage ✓
Week 6-8: 28 commits, 88% coverage ✓
...
```

---

## 🚀 Deploy Strategy

### **Staging:**
```bash
# Automático a cada merge em develop
GitHub Actions → Build → Test → Deploy AWS (staging)
```

### **Production:**
```bash
# Manual após aprovação
1. Merge develop → main
2. Create release tag
3. GitHub Actions → Build → Test → Deploy AWS (prod)
4. Run smoke tests
5. Monitor errors (Sentry)
```

---

## 🔐 Segurança - Checklist por Etapa

### **Etapa 1:**
- [ ] .env.example criado
- [ ] Secrets não em código
- [ ] HTTPS habilitado

### **Etapa 2:**
- [ ] CORS configurado
- [ ] Rate limiting
- [ ] Input validation

### **Etapa 3:**
- [ ] API keys rotacionadas
- [ ] Logs seguros
- [ ] Audit trail de ações IA

### **Etapa 4:**
- [ ] PCI compliance (Stripe)
- [ ] Criptografia de dados sensíveis

### **Etapa 5:**
- [ ] Penetration testing
- [ ] Security audit completo

---

## 📊 Recursos Humanos

### **Ideal (Full-time):**
- 1 Backend Engineer (Node.js/DB)
- 1 Frontend Engineer (React)
- 1 DevOps/Infrastructure
- 1 Product Manager
- 1 Content Creator

### **Solo Developer (você):**
- Focar em 1 etapa por vez
- Terceirizar: Áudio (ElevenLabs), DevOps (deploy simples)
- Usar templates/boilerplates para acelerar

### **Outsource:**
- Produção de áudio: Fiverr/Upwork
- Design: Figma templates
- DevOps: AWS RDS gerenciado + S3

---

## 💰 Orçamento Estimado (3 meses MVP)

| Item | Custo | Notas |
|------|-------|-------|
| AWS (EC2, S3, RDS) | $200-400/mês | Escalável |
| OpenAI API | $100-300/mês | Depende uso |
| Stripe | 2.9% + $0.30 | Por transação |
| Deepgram | $50-100/mês | Transcrição |
| Domínio + SSL | $12/ano | GoDaddy/Namecheap |
| GitHub Pro | $4/mês | Opcional |
| Figma | $12/mês | Design |
| **Total** | **~$900-1500/mês** | Bare minimum |

---

## ✅ Milestones Principais

```
Milestone 1 (Semana 2): Setup completo ✓
Milestone 2 (Semana 5): MVP Player funcional ✓
Milestone 3 (Semana 8): IA integrada ✓
Milestone 4 (Semana 12): Monetização ativa ✓
Milestone 5 (Semana 16): Launch Beta ✓
Milestone 6 (Semana 20): Mobile ready ✓
Milestone 7 (Semana 25): Public Launch 🚀
```

---

## 📚 Referências & Recursos

### **Frontend:**
- React Docs: https://react.dev
- Vite: https://vitejs.dev
- Tailwind: https://tailwindcss.com
- React Router: https://reactrouter.com

### **Backend:**
- Node.js: https://nodejs.org
- Express: https://expressjs.com
- PostgreSQL: https://postgresql.org
- Prisma ORM: https://prisma.io

### **DevOps:**
- AWS: https://aws.amazon.com
- Docker: https://docker.com
- GitHub Actions: https://github.com/features/actions

### **APIs:**
- OpenAI: https://platform.openai.com
- Stripe: https://stripe.com
- Deepgram: https://deepgram.com

### **Testing:**
- Vitest: https://vitest.dev
- React Testing Library: https://testing-library.com
- Playwright: https://playwright.dev

---

## 🎓 Resumo Executivo

**Este plano é seu roteiro para construir uma plataforma de aprendizado de inglês técnico de classe mundial.**

**Pontos-chave:**
1. ✅ **Etapas claras:** 6 etapas bem definidas
2. ✅ **Cronograma realista:** 20 semanas até MVP
3. ✅ **Escalável:** Arquitetura pronta para crescimento
4. ✅ **Focado:** Nicho específico com grande potencial
5. ✅ **Monetização clara:** 3 planos de preço

**Próximo passo:** Comece pela Etapa 1 - Setup & Infraestrutura. Dedique 1-2 horas por dia e você estará com um MVP robusto em 4-5 meses.

**Boa sorte! 🚀**

---

*Documento criado em: 22 de Julho de 2026*  
*Versão: 1.0*  
*Próxima revisão: Semana 2 do desenvolvimento*
