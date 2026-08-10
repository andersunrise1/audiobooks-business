const CONTACT_EMAIL = 'suporte@techspeaking.dev';
const LAST_UPDATED = '10 de agosto de 2026';

// Grounded in the real, current product: R$57 one-time Vitalicio (not a
// subscription — PRICING.md/Dia 46-50), 2 free audiobooks, the CDC Art. 49
// 7-day withdrawal right the app already implements as a real self-service
// refund flow (HelpCenterPage.jsx / POST /api/payment/refund), and the
// plan-aware AI daily rate limit (Dia 37/49) rather than "unlimited AI".
function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-sm text-slate-600 dark:text-stone-300 flex flex-col gap-2 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function TermsOfUsePage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Termos de Uso</h1>
        <p className="text-slate-500 dark:text-stone-400 mt-1 text-sm">
          Última atualização: {LAST_UPDATED}
        </p>
      </div>

      <p className="text-sm text-slate-600 dark:text-stone-300 leading-relaxed">
        Ao criar uma conta ou usar o TECHSPEAKING (site, app desktop ou app mobile), você concorda
        com estes termos. Leia com atenção — escrevemos em português direto, sem "juridiquês"
        desnecessário.
      </p>

      <Section title="O que é o TECHSPEAKING">
        <p>
          Uma plataforma de audiobooks para aprender inglês técnico: você ouve capítulos narrados,
          clica em qualquer palavra para traduzir e entender o contexto, pratica com flashcards de
          repetição espaçada, e conta com um tutor de IA para explicações extras.
        </p>
      </Section>

      <Section title="Sua conta">
        <p>
          Você é responsável por manter sua senha em sigilo e por tudo que acontecer na sua conta.
          Avise a gente imediatamente em{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>{' '}
          se suspeitar de uso não autorizado. Uma conta é de uso pessoal — não deve ser
          compartilhada entre várias pessoas.
        </p>
      </Section>

      <Section title="Planos e pagamento">
        <p>
          <strong>Plano gratuito:</strong> acesso permanente a 2 audiobooks do catálogo ("Daily
          Standup" e "Remote Work Communication"), sem necessidade de pagamento.
        </p>
        <p>
          <strong>TECHSPEAKING Vitalício (R$ 57):</strong> pagamento único — não é uma assinatura
          recorrente — que dá acesso permanente a todos os audiobooks do catálogo atual, mais
          flashcards e tradução sem limite de audiobooks acessíveis. Audiobooks futuros lançados
          depois da sua compra podem ser vendidos separadamente como pacotes adicionais.
        </p>
        <p>
          <strong>Uso da IA:</strong> mesmo no plano Vitalício, o tutor de IA tem um limite diário
          de uso — isso existe porque cada resposta de IA tem um custo real para nós, e um pagamento
          único não cobre uso ilimitado e contínuo ao longo do tempo.
        </p>
      </Section>

      <Section title="Direito de arrependimento (reembolso)">
        <p>
          Como a compra é feita pela internet, você tem direito de se arrepender e pedir reembolso
          integral em até <strong>7 dias corridos</strong> a partir da compra, sem precisar
          justificar o motivo — garantido pelo Art. 49 da Lei nº 8.078/1990 (Código de Defesa do
          Consumidor). O pedido pode ser feito diretamente pela Central de Ajuda dentro do app, ou
          por{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          , e o acesso Vitalício é encerrado assim que o reembolso é confirmado. Depois desse prazo,
          o pagamento único não é reembolsável, exceto por defeito comprovado do serviço.
        </p>
      </Section>

      <Section title="Uso aceitável">
        <p>Ao usar o TECHSPEAKING, você concorda em não:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Compartilhar sua conta ou senha com outras pessoas;</li>
          <li>
            Copiar, redistribuir ou revender o conteúdo dos audiobooks (áudio, transcrições,
            traduções) fora da plataforma;
          </li>
          <li>
            Usar automação, scraping ou engenharia reversa para extrair o catálogo ou abusar dos
            limites de uso da IA;
          </li>
          <li>Usar a plataforma para qualquer atividade ilegal.</li>
        </ul>
        <p>
          O descumprimento pode levar à suspensão ou encerramento da conta, sem reembolso, nos casos
          de uso indevido comprovado.
        </p>
      </Section>

      <Section title="Propriedade intelectual">
        <p>
          Todo o conteúdo do catálogo (áudio, transcrições, traduções, explicações técnicas) é de
          propriedade do TECHSPEAKING ou licenciado para uso na plataforma. Sua compra dá direito de
          uso pessoal, não de redistribuição.
        </p>
      </Section>

      <Section title="Sobre as respostas de inteligência artificial">
        <p>
          As traduções, explicações e o conteúdo de reforço são gerados por um modelo de linguagem
          (Claude, da Anthropic) e, embora revisados no design do produto, podem ocasionalmente
          conter erros ou imprecisões. Não trate essas respostas como consultoria profissional de
          nenhum tipo — é uma ferramenta de apoio ao aprendizado de idioma.
        </p>
      </Section>

      <Section title="Disponibilidade do serviço">
        <p>
          Fazemos o possível para manter o TECHSPEAKING disponível, mas não garantimos funcionamento
          ininterrupto — manutenções, falhas de provedores externos (hospedagem, processamento de
          pagamento, IA) ou eventos fora do nosso controle podem causar indisponibilidade
          temporária.
        </p>
      </Section>

      <Section title="Encerramento de conta">
        <p>
          Você pode pedir o encerramento da sua conta a qualquer momento pelo{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          . Nós podemos suspender ou encerrar contas que violem estes termos, especialmente em casos
          de uso indevido comprovado.
        </p>
      </Section>

      <Section title="Alterações nestes termos">
        <p>
          Podemos atualizar estes termos conforme o produto evolui. Mudanças relevantes serão
          comunicadas nesta mesma página, com a data de atualização revisada no topo. O uso
          continuado da plataforma depois de uma atualização significa que você concorda com os
          novos termos.
        </p>
      </Section>

      <Section title="Lei aplicável">
        <p>
          Estes termos são regidos pelas leis do Brasil. Qualquer disputa será resolvida no foro da
          comarca do consumidor, conforme o Código de Defesa do Consumidor.
        </p>
      </Section>

      <Section title="Contato">
        <p>
          Dúvidas sobre estes termos:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </div>
  );
}

export default TermsOfUsePage;
