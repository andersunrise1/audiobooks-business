# Pricing Strategy

TECHSPEAKING's pricing model. **Supersedes an earlier subscription-tier draft**
(Free/Pro monthly/annual) from Dia 46 — on 2026-07-25 the user chose a
lifetime-access model instead, deliberately departing from the plan's
original 3-tier SaaS structure. This is a strategy document — **no billing
is implemented yet** (that's Dia 47+, Stripe integration); see
`packages/backend/MONETIZATION.md` for how this maps onto the actual
codebase and what still needs to be built to enforce it.

## Why lifetime access instead of a subscription

Two deliberate reasons, not just a preference:

- **Market fit.** Brazilian digital products (Hotmart/Kiwify-style
  "infoprodutos") convert far better as a one-time purchase than a
  recurring subscription — less commitment anxiety, less subscription
  fatigue, and it matches how people already buy audiobooks/courses
  (Audible, Kindle, Udemy: buy once, own it), not a SaaS mental model.
- **Goal is volume, not margin per user.** The explicit intent is to stay
  accessible and sell in quantity, not maximize revenue per subscriber.

The one real structural risk of "pay once, use forever" is that the AI
tutor has a genuine ongoing per-use cost (Dia 37's cost tracking:
~R$0,002-0,02 per call) while lifetime revenue is captured once. The model
below resolves that by splitting **content** (audiobooks, flashcards,
pronunciation, word translation — all free or near-free to serve) from
**AI usage** (capped, regardless of plan).

## Free — R$ 0 (trial)

- **2 audiobooks** — enough to complete one real 5-chapter audiobook
  (Dia 41's template) and start a second.
- **Flashcards** for words learned from those 2 audiobooks.
- **1 chat com o tutor por dia.**

## TECHSPEAKING Vitalício — R$ 57 (pagamento único)

- **Todos os audiobooks, para sempre** — inclui o catálogo atual (25
  audiobooks, ~7 horas de conteúdo) e qualquer audiobook adicionado no
  futuro ao catálogo principal (não confundir com pacotes pagos à parte,
  abaixo).
- **Flashcards ilimitados**, sem restrição de audiobook de origem.
- **Tradução ao clicar na palavra, ilimitada** — não usa IA (consulta ao
  `technical_dictionary`), custo zero, sem motivo pra limitar.
- **Prática de pronúncia ilimitada** — usa a Web Speech API do navegador
  (Dia 18), sem custo de servidor.
- **Modo offline** (desktop, Dia 20).
- **Chat com o tutor: 10 mensagens/dia.** Não é "IA ilimitada" — é o
  limite deliberado que mantém o custo por comprador previsível mesmo
  numa compra única (ver a conta no `MONETIZATION.md`).

## Pacotes de novos livros — R$ 19-29 cada (futuro)

Depois do catálogo inicial, novos audiobooks temáticos são vendidos
separadamente como expansões — quem já comprou o Vitalício paga só pelo
conteúdo novo, não por acesso de novo. É o mecanismo que sustenta receita
recorrente sem reintroduzir assinatura.

### Pricing rationale (decisão de 2026-07-25)

Só em reais — não é um produto multi-moeda. R$ 57 fica na faixa clássica
de infoproduto acessível no Brasil (âncoras comuns: R$47/57/67/97) — barato
o bastante pra reduzir a barreira de compra de um produto sem prova social
ainda, mas não tão barato a ponto de parecer de baixa qualidade.

Isso é raciocínio por comparáveis, não um estudo de mercado — não há dados
reais de conversão ainda (a mesma revisão honesta da Etapa 3 já sinalizou
essa lacuna de "não verificável sem usuários reais"). Trate R$ 57 como
preço de lançamento a validar por conversão real, não como número
definitivo.

## Corporate — Custom

- **Team management** — inviting/managing a roster of company learners.
- **Progress tracking** — an aggregate, team-level view built on top of the
  existing per-user stats (`GET /api/user/stats`, Dia 19) and the admin
  analytics groundwork (Dia 38), not a new tracking mechanism from scratch.
- **Customização de conteúdo** — company-specific audiobooks (e.g. a
  company's own onboarding vocabulary), reusing Dia 41's content template.
- **SSO integration** — enterprise auth, doesn't exist yet (current auth is
  email/password + JWT only, Dia 1-5).
- **Dedicated support / contato direto** — a support process, not a
  software feature.

No public price — Corporate is sales-assisted, priced per team size and
customization scope, matching the plan.

## What this document does _not_ do

It doesn't implement the AI chat limit, one-time-purchase checks, or
the payment provider (Mercado Pago, since 2026-08-11) — see
`packages/backend/MONETIZATION.md` for the honest gap list and what Dia 47+
needs to build to make this real.
