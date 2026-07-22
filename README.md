# TechSpeak

Plataforma de aprendizado de inglês técnico para profissionais de software: audiobooks com tradução palavra a palavra, chat com IA, flashcards (SM-2) e feedback de pronúncia.

## Estrutura

```
packages/backend/   Node.js + Express, PostgreSQL, Redis
packages/web/       React + Vite + Tailwind
packages/desktop/   Electron + React, cache local SQLite, offline-first
```

## Setup

```bash
npm install
```

Cada workspace terá seu próprio `.env` (ver `.env.example` quando disponível).

## Documentação

- [Plano de desenvolvimento completo](Projeto_detalhado/PROJETO_AUDIOBOOK_PLANO_DETALHADO.md)
- [Posicionamento / pitch](Audiobooks_English_Business.txt)
