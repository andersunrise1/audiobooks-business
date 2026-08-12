const CONTACT_EMAIL = 'suporte@techspeaking.dev';
const LAST_UPDATED = '11 de agosto de 2026';

// Grounded in what the app actually does today, not generic boilerplate:
// every data category and every third party listed below corresponds to a
// real table/integration in this codebase (users, word_clicks, flashcards,
// ai_usage_log, support_tickets, experiment_events, Mercado Pago, Anthropic,
// Resend, Railway, Vercel). Two honest gaps called out explicitly rather
// than glossed over: there's no self-service data export/delete yet (both
// go through suporte@techspeaking.dev manually), and the AI chat tutor
// route still exists on the backend but no current screen calls it.
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

function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Política de Privacidade</h1>
        <p className="text-slate-500 dark:text-stone-400 mt-1 text-sm">
          Última atualização: {LAST_UPDATED}
        </p>
      </div>

      <p className="text-sm text-slate-600 dark:text-stone-300 leading-relaxed">
        Esta política explica, de forma direta, quais dados o TECHSPEAKING coleta, para que servem,
        com quem são compartilhados e como você pode exercer seus direitos sobre eles, conforme a
        Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).
      </p>

      <Section title="Quem somos">
        <p>
          O TECHSPEAKING é operado por uma pessoa jurídica individual (MEI) sediada no Brasil. Para
          qualquer assunto sobre privacidade, dados pessoais ou esta política, fale com a gente em{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="Quais dados coletamos">
        <p>
          <strong>Dados de cadastro:</strong> nome, e-mail e senha (armazenada com hash, nunca em
          texto simples) quando você cria uma conta.
        </p>
        <p>
          <strong>Dados de uso do produto:</strong> progresso de escuta por capítulo, palavras que
          você clicou para traduzir, seus flashcards e o histórico de revisão deles (método de
          repetição espaçada), e se você é usuário Vitalício ou gratuito.
        </p>
        <p>
          <strong>Dados de pagamento:</strong> quando você compra o Vitalício, o número do seu
          cartão nunca passa pelos nossos servidores — ele vai direto para o Mercado Pago, nosso
          processador de pagamentos. Nós guardamos apenas a confirmação da compra (data, e se foi
          reembolsada).
        </p>
        <p>
          <strong>Interações com a IA:</strong> quando você clica em uma palavra para traduzir ou
          pede uma explicação de reforço sobre um capítulo, o texto da palavra e um trecho do
          capítulo são enviados para gerar a resposta (veja "Com quem compartilhamos" abaixo).
          Registramos também métricas de uso (quantidade de chamadas, tempo de resposta, custo
          aproximado) para controlar limites diários de uso — não o conteúdo completo de cada
          resposta.
        </p>
        <p>
          <strong>Suporte e feedback:</strong> se você envia uma mensagem pela Central de Ajuda ou
          participa do nosso programa de beta testers, guardamos o conteúdo enviado e, se você
          estiver logado, seu e-mail para poder responder.
        </p>
        <p>
          <strong>Notificações push (app mobile):</strong> o app pode pedir permissão para enviar
          notificações, mas hoje nós ainda não guardamos esse identificador em nosso servidor — na
          prática, nenhuma notificação é enviada por enquanto.
        </p>
        <p>
          <strong>Cookies e armazenamento local:</strong> usamos o armazenamento local do seu
          navegador (localStorage) ou do app (AsyncStorage/SQLite) para guardar sua sessão de login
          e preferências como tema claro/escuro — não usamos cookies de rastreamento de terceiros
          nem pixels de publicidade.
        </p>
      </Section>

      <Section title="Como usamos os dados">
        <p>
          Para fazer o produto funcionar: autenticar sua conta, salvar seu progresso, gerar
          traduções e explicações, processar pagamentos, responder ao suporte e cumprir obrigações
          legais e fiscais. Também usamos dados agregados e anônimos (por exemplo, quantos usuários
          completam um capítulo) para decidir o que melhorar no catálogo — nunca para vender a
          terceiros ou fazer publicidade direcionada.
        </p>
      </Section>

      <Section title="Com quem compartilhamos">
        <p>Só compartilhamos dados com os prestadores de serviço necessários para operar:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>
            <strong>Mercado Pago</strong> (pagamentos) — recebe seus dados de pagamento diretamente;
            nunca passam pelo nosso servidor.
          </li>
          <li>
            <strong>Anthropic</strong> (o modelo de IA Claude) — recebe o texto da palavra/trecho do
            capítulo quando você pede uma tradução ou explicação, para gerar a resposta.
          </li>
          <li>
            <strong>Resend</strong> (envio de e-mail) — usado para responder tickets de suporte.
          </li>
          <li>
            <strong>Railway e Vercel</strong> (hospedagem) — hospedam nosso banco de dados, backend
            e o site; têm acesso técnico aos dados armazenados como parte da infraestrutura.
          </li>
        </ul>
        <p>
          Nenhum desses serviços recebe mais dados do que o necessário para a função específica
          dele, e nenhum tem autorização para usar seus dados para fins próprios de publicidade.
        </p>
      </Section>

      <Section title="Por quanto tempo guardamos seus dados">
        <p>
          Enquanto sua conta existir. Se você pedir a exclusão da conta (veja "Seus direitos"
          abaixo), removemos os dados pessoais identificáveis, mantendo apenas o mínimo exigido por
          obrigação legal ou fiscal (por exemplo, registros de uma compra, pelo prazo que a lei
          brasileira exige para fins contábeis).
        </p>
      </Section>

      <Section title="Seus direitos (LGPD)">
        <p>
          Você pode pedir a qualquer momento: acesso aos dados que temos sobre você, correção de
          dados incorretos, exclusão da sua conta e dados associados, ou uma cópia portável dos seus
          dados. Hoje esse processo é feito manualmente — ainda não existe um botão de
          autoatendimento para isso no app — então basta escrever para{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>{' '}
          descrevendo o pedido; respondemos o quanto antes.
        </p>
      </Section>

      <Section title="Segurança">
        <p>
          Senhas são armazenadas com hash (nunca em texto simples), a comunicação entre seu
          dispositivo e nossos servidores é sempre criptografada (HTTPS), e o acesso a dados de
          pagamento é feito inteiramente pelo Mercado Pago — nós nunca vemos nem guardamos o número
          do seu cartão.
        </p>
      </Section>

      <Section title="Menores de idade">
        <p>
          O TECHSPEAKING não é direcionado a menores de 18 anos e não coletamos intencionalmente
          dados de crianças. Se você é responsável por um menor que criou uma conta sem sua
          autorização, entre em contato para que possamos excluí-la.
        </p>
      </Section>

      <Section title="Alterações nesta política">
        <p>
          Podemos atualizar esta política conforme o produto evolui. Mudanças relevantes serão
          comunicadas nesta mesma página, com a data de atualização revisada no topo.
        </p>
      </Section>

      <Section title="Contato">
        <p>
          Dúvidas, pedidos ou reclamações sobre privacidade:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </div>
  );
}

export default PrivacyPolicyPage;
