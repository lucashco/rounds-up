# Monetização do Rounds Up

O aplicativo continua gratuito e funcional sem monetização. Não há login, planos,
assinaturas, checkout, coleta de dados de pagamento ou backend.

## Configuração pública

Copie `.env.example` para `.env` (ignorado pelo Git) ou defina as mesmas variáveis
no ambiente de build da hospedagem. Não há valores padrão, IDs de demonstração ou
URLs de pagamento no aplicativo.

| Variável | Valor fornecido pelo responsável |
| --- | --- |
| `PUBLIC_ADSENSE_CLIENT_ID` | ID real do editor, no formato `ca-pub-` seguido por 16 dígitos |
| `PUBLIC_ADSENSE_SLOT_ID` | ID real da unidade manual, com 10 dígitos |
| `PUBLIC_SUPPORT_URL` | URL HTTPS absoluta do provedor externo de doação |

Esses dados são públicos e podem aparecer no HTML/JavaScript. Nunca coloque tokens,
credenciais, chaves privadas ou outros segredos em variáveis `PUBLIC_*`. A validação
confere formato; não verifica propriedade da conta, aprovação do Google ou legitimidade
do destino. Obtenha os valores na sua própria conta e revise o destino antes de publicar.

A configuração fica em `src/features/monetization/config.ts`. Valores ausentes ou
inválidos desativam somente o recurso correspondente. As variáveis são incorporadas
no build: reinicie o servidor em desenvolvimento e gere/publique um novo build em
produção depois de alterá-las. O lockfile e as dependências não precisam mudar.

## Ativar apoio voluntário

1. Escolha e configure sua própria página externa de doações.
2. Defina `PUBLIC_SUPPORT_URL` com a URL HTTPS real dessa página e faça novo build.
3. Na configuração do treino, confira o destino de “Apoie o Rounds Up”.

O link abre em nova aba, avisa leitores de tela e usa `noopener`, `noreferrer` e
`referrerpolicy="no-referrer"`. URLs relativas, HTTP, outros protocolos e credenciais
embutidas são rejeitados. Nenhum dado do treino é anexado ao link; nenhum script de
pagamento é carregado. O provedor externo controla a coleta e o pagamento após o clique.
Sem URL válida, o componente não produz HTML nem espaço vazio, inclusive em produção.

## Estado atual do AdSense

**A integração de veiculação não está ativada.** `AdSlot` prepara uma unidade manual
com `data-ad-client`/`data-ad-slot`, mas não carrega o loader do Google e não executa
`adsbygoogle.push`. Configurar os IDs por si só **não** inicia requisições de anúncios.
Não há anúncios falsos, conteúdo de exemplo, CMP simulada ou consentimento presumido.

Sem os dois IDs com formato válido, o componente retorna `null`, sem placeholder
publicitário ou espaço reservado. Com IDs configurados, reserva uma área rotulada
“Publicidade”, ainda vazia até a futura integração de veiculação.

A reserva tem 314 px de altura, com uma unidade fixa de 250×250 centralizada em um
contêiner fluido. Esse tamanho cabe na área útil da tela móvel mínima atual (320 px)
e não muda quando o anúncio carregar. O futuro adaptador deve respeitar esse tamanho;
não expandir, recortar ou sobrepor criativos para encaixá-los. Se outro formato for
necessário, ajustar a reserva antes de carregar o anúncio e validar o layout.

`AdSlot` e `SupportLink` são montados somente no ramo de configuração de `WorkoutApp`,
fora do formulário e dos controles. São desmontados ao iniciar a sessão e continuam
ausentes durante execução, pausa, reinício e conclusão. Não estão no layout global.

## Antes de integrar e veicular anúncios reais

1. Obter aprovação da conta/site no AdSense e criar uma unidade **Display manual**
   com tamanho fixo de 250×250. Configurar os IDs reais nas variáveis acima.
2. Revisar público atendido, tratamento de dados, terceiros e regras aplicáveis às
   regiões dos visitantes. Publicar uma política de privacidade acessível com as
   informações exigidas pelo Google e pelos tratamentos efetivamente realizados.
3. Implementar uma solução de consentimento adequada antes de integrar scripts e
   requisições de publicidade. Para anúncios personalizados no EEE, Reino Unido e
   Suíça, o Google exige CMP certificada integrada ao IAB TCF. Não substituir isso
   por um checkbox próprio, variável de ambiente ou consentimento salvo sem validação.
4. Para o público brasileiro, revisar a LGPD e as orientações da ANPD para cookies:
   finalidades, base legal, transparência, escolha e revogação. Esta preparação
   técnica não constitui certificação de conformidade nem dispensa essa avaliação.
5. Anúncios não personalizados também podem usar cookies para outras finalidades;
   não presumir que essa escolha elimina requisitos de consentimento.
6. Implementar o adaptador AdSense somente depois dessa revisão: carregar a tag e
   solicitar a unidade apenas com IDs reais e o sinal de consentimento aplicável.
   Bloquear requisições em recusa/estado desconhecido e suportar retirada da escolha.
   Tratar Strict Mode, unidade sem preenchimento, ad blocker, falha de rede e cleanup
   sem duplicar solicitações. Nenhum script global foi adicionado nesta etapa.
7. Manter **Auto ads e formatos automáticos** (âncoras/intersticiais) desligados para
   preservar a regra de treino sem publicidade. Carregar uma tag global numa SPA pode
   manter código do provedor ativo depois de remover o slot: validar essa transição
   no adaptador futuro, incluindo operações assíncronas pendentes. Não basta ocultar
   um anúncio com CSS ou remover a tag de script já executada.
8. Verificar o `ads.txt` exigido pela conta/provedor e usar exclusivamente as linhas
   reais fornecidas, se aplicável. Não foi criado `ads.txt` com identificadores fictícios.
9. Fazer testes com IDs reais em ambiente autorizado, sem clicar nos próprios anúncios.
   Confirmar ausência de publicidade/overlays durante execução, pausa e conclusão.

## Verificações

```sh
npm run check
npm run build
npm run test
```

Os testes usam valores sintéticos somente nos arquivos de teste, sem carregamento do
provedor. Cobrem configuração ausente/inválida, segurança do link, dimensões reservadas,
ausência de scripts e isolamento de publicidade na configuração, inclusive em Strict Mode.
O preenchimento real, consentimento/CMP e políticas do provedor permanecem parte da
ativação futura. Sem configuração, a interface existente permanece igual.

## Fontes oficiais consultadas

- [Criar unidade Display](https://support.google.com/adsense/answer/9274025?hl=en)
- [Regras para unidades de tamanho fixo](https://support.google.com/adsense/answer/9185043?hl=en-GB)
- [CMP certificada e requisitos regionais](https://support.google.com/adsense/answer/13554116?hl=en)
- [Conteúdo obrigatório da política de privacidade](https://support.google.com/adsense/answer/1348695?hl=en)
- [Anúncios personalizados e não personalizados](https://support.google.com/adsense/answer/9007336?hl=en)
- [ANPD: guia de cookies e proteção de dados pessoais](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais)
- [Variáveis de ambiente do Astro](https://docs.astro.build/en/guides/environment-variables/)
