# Rounds Up

Seu treino. Seu ritmo. Seus rounds.

Timer para qualquer treino em rounds, em Astro, React e TypeScript strict, com Tailwind
CSS e Vitest. Modos FREE (rounds de duração fixa) e GUIDED (circuito de exercícios
com durações individuais).

## Executar

Use Node >=22.23.4 e pnpm 10.28.2, preservando o lockfile existente:

```sh
pnpm install --frozen-lockfile
npm run dev
```

O servidor inicia em background. Abra o endereço informado no terminal
(normalmente http://localhost:4321).

```sh
npm run astro -- dev status
npm run astro -- dev logs
npm run astro -- dev stop
```

## Verificar

```sh
npm run check
npm run build
npm run test
```

Os testes do domínio rodam em Node. Os testes de interação usam jsdom, React
Strict Mode e relógios controlados, com o gerador, motor e hook reais.

## Cloudflare Workers Builds

A aplicação continua estática: Astro gera `dist/`, e `wrangler.toml` publica esse
diretório como Workers Static Assets, sem script Worker, adaptador SSR ou backend.

Configure o projeto Workers Builds com a raiz do repositório (`.`), nome do Worker
`rounds-up` e estes comandos:

- Build: `pnpm run build`
- Deploy: `npx wrangler deploy`

`packageManager` fixa pnpm 10.28.2, e `.node-version` seleciona Node 22.23.4.
Se houver variáveis de build `PNPM_VERSION` ou `NODE_VERSION` já configuradas no
painel, alinhe-as com essas versões ou remova os overrides. Preserve
`pnpm-lock.yaml` e a extensão `@astrojs/astro2tsx` em `package.json`; não desative
o frozen lockfile para contornar divergências de configuração.

Antes de publicar, valide localmente:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

O deploy ocorre apenas quando solicitado explicitamente ou acionado pela
integração de builds configurada no painel. As opções de versão do ambiente estão
documentadas em [Workers Builds — Build image](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).

## Testar manualmente

1. Em FREE, configure 2 rounds de 3 segundos, preparação de 1 segundo e descanso
   entre rounds de 2 segundos. O resumo deve indicar `00:09`.
2. Inicie e confira preparação, round 1, descanso, round 2 e conclusão.
3. Pause durante uma fase, espere e continue: o período pausado não deve contar.
4. Use Próximo durante exercício e descanso. O restante deve diminuir; na última
   fase, o treino deve concluir. Próximo durante pausa deve manter a pausa.
5. Reinicie e confira o retorno à primeira fase. Ao concluir, use Repetir treino.
6. Encerre e edite: os campos preenchidos devem ser preservados.
7. Em GUIDED, adicione dois exercícios com nomes e durações diferentes. Reordene
   com Subir/Descer, remova um e adicione outro. Confira a sequência no timer.
8. Envie nome vazio, rounds fracionários ou duração de exercício/round igual a
   zero: deve aparecer um erro e a sessão não deve iniciar.
9. Teste com teclado (Tab, Shift+Tab, setas nos modos, Enter e Espaço) e com uma
   viewport de 320 px. Os controles devem permanecer acessíveis sem rolagem lateral.

## Organização

- `src/features/workout/domain`: modelos, validação, timeline e motor puro.
- `src/features/workout/hooks`: conexão do motor com React e `performance.now()`.
- `src/features/workout/form`: rascunho, conversão de minutos/segundos para ms e mensagens.
- `src/features/workout/components`: WorkoutBuilder, TimerDisplay, TimerControls,
  WorkoutSession e WorkoutApp.
- `src/pages/index.astro`: montagem da aplicação com `client:load`.

A configuração editável e a sessão em execução têm estados separados. A sessão
recebe a timeline validada; componentes apenas exibem o estado do motor. Reiniciar
executa reset/start; encerrar desmonta o hook e seus intervalos.

A interface aceita até 100 rounds e 50 exercícios para limitar o tamanho da
timeline gerada. Campos opcionais vazios equivalem a zero. Tempos são editados em
minutos/segundos e armazenados no domínio em milissegundos; o visor usa MM:SS e arredonda
frações para cima.

## Experiência durante o treino

- **Sinais sonoros:** habilitados por padrão, com controle no formulário e no timer.
  O AudioContext só é criado/retomado após Iniciar, ativar sons ou outro comando do
  usuário. Não há voz. Os últimos 3 segundos têm bipes; exercício usa dois tons
  agudos, descanso um tom grave e conclusão três tons ascendentes. Em uma fase
  curta, o sinal de entrada substitui o bip daquele segundo para evitar sobreposição.
  Alertas são deduplicados por execução, fase e segundo. Pausar preserva esse
  registro; reiniciar o limpa. Atrasos só produzem o sinal atual, sem fila de alertas.
  Sons são cancelados ao pausar, silenciar, ocultar a aba ou sair. Eventos ocorridos
  enquanto o som está desativado/aba oculta são consumidos, sem replay ao retornar.
- **DurationInput:** minutos inteiros não negativos e segundos de 0 a 59
  (frações dentro dessa faixa são permitidas). Zero é aceito para preparação e descansos, mas não para
  exercício/round. Valores inválidos permanecem editáveis e bloqueiam iniciar/salvar.
- **Timeline:** a visão resumida continua padrão. “Ver timeline completa” expande
  todas as fases, com round e duração, tanto no formulário como no timer.
- **Wake Lock:** a opção “Manter tela ligada durante o treino” vem ativada por
  padrão e pode ser desligada no formulário ou no timer. A preferência é mantida
  durante a visita, sem persistência. A solicitação só ocorre durante sessão ativa
  iniciada pelo usuário, em contexto seguro e quando a API existe. É liberado ao pausar, reiniciar, concluir, sair ou ocultar
  a aba. Ao voltar à aba visível, tenta recuperar se o treino continua rodando.
  Requisições que chegam após cleanup são liberadas; falhas não interrompem o timer.
  Pedidos pendentes são serializados, inclusive entre efeitos do Strict Mode e resets.
  A interface informa discretamente falta de suporte, conexão insegura, rejeição ou
  liberação pelo sistema. Não há garantia de tela ligada em todos os dispositivos.

### Progresso e tempo restante

O percentual mede **avanço temporal na timeline**, incluindo preparação, exercícios
e descansos: `100 × (duração original − restante do motor) / duração original`.
Ele é contínuo dentro da fase e atinge 100% ao concluir. Ao pular uma fase, o trecho
pulado avança o percentual e reduz o restante. Esse trecho **não** é tempo treinado:
`totalElapsedMs` continua medindo apenas tempo ativo. O visor “Restante estimado”
mostra a duração ainda executável; não uma previsão por relógio de parede, pois
pausas e futuros saltos podem alterá-la. O motor não foi modificado.

### Treinos salvos

Use **Salvar treino** com o nome desejado e abra **Treinos salvos** para carregar
ou excluir. Salvar um nome já existente (ignorando maiúsculas/espaços externos)
exige **Confirmar substituição**; Cancelar preserva o original. Uma revisão do
conteúdo impede reutilizar uma confirmação se os dados mudaram em outra aba.

Somente nome e configuração são persistidos no localStorage, na chave
`roundfit.workouts` (chave legada preservada para compatibilidade), schema `version: 1`. Sessão, progresso, timeline calculada e
preferência sonora não são persistidos. Configurações são validadas antes de salvar
ou carregar. JSON inválido, versão desconhecida, configuração inválida, bloqueio e
falta de espaço apresentam mensagem e preservam os dados; não há migração automática.
O acesso ocorre em effects/eventos, sem localStorage no SSR. Limites: 100 treinos,
100 rounds e 50 exercícios por treino, arquivo de até 1.000.000 de caracteres.
Recarregar a página encerra a sessão; treinos explicitamente salvos permanecem.

## Checklist adicional — desktop e celular

- Preencha 1 minuto e 30 segundos; confira a estimativa. Tente segundos 60,
  minutos negativos e zero em um exercício: iniciar/salvar deve ser bloqueado.
- Expanda/recolha a timeline e confira duração e round de todas as fases.
- Inicie uma fase de 5 segundos: ouça os últimos 3 segundos e os sons de transição
  e conclusão. Pause/continue e use Próximo sem esperar bipes duplicados. Desative e
  reative sons; trocar de aba não deve produzir uma sequência de sinais atrasados.
- Observe o percentual avançar durante preparação, exercício e descanso. Pule uma
  fase e confira o salto do percentual, a redução do restante e o tempo ativo final.
- Salve um treino, recarregue e carregue-o. Tente salvar o mesmo nome, cancele e
  depois confirme a substituição. Exclua e confira a remoção após recarregar.
- Durante treino ativo em dispositivo compatível, confira que a tela permanece
  acesa; pause e confirme a liberação. Volte à aba e reinicie para testar recuperação.
- No celular, confira tamanho do relógio/controles, rolagem e ausência de overflow
  em 320 px e orientação paisagem. Teste teclado no desktop e leitor de tela.

Wake Lock requer contexto seguro (HTTPS ou localhost) e pode ser recusado por
políticas do navegador/economia de bateria. Para testá-lo em um celular acessando
outro computador, use uma origem HTTPS; HTTP por IP da rede não é contexto seguro.
O áudio também depende das políticas do navegador/dispositivo. As APIs são testadas
com simulações; som audível, tela física e layout em aparelhos reais exigem teste
manual. Não há backend nem pausa automática ao perder visibilidade.

## Identidade e compatibilidade

O nome público é Rounds Up e o pacote se chama `rounds-up`. FREE/GUIDED atendem
qualquer treino em rounds, com ou sem equipamentos. O exemplo inicial guiado usa
Polichinelos. Diretórios, contratos do domínio e chave de armazenamento não foram
renomeados, preservando treinos existentes. Não há PWA, backend ou hacks de tela.

Para testar a preferência de tela, desligue a opção antes de iniciar: nenhuma
solicitação deve acontecer. Ative durante o treino, pause/continue, reinicie e
conclua. Ao voltar à configuração, a escolha é preservada. Se houver falha, o timer
continua; voltar a uma aba visível permite nova tentativa quando o treino estiver
ativo e a opção habilitada. Rejeições não causam tentativas em loop.


## Monetização opcional

Apoio voluntário e espaço AdSense estão preparados exclusivamente na configuração do
treino. Sem configuração, não aparecem placeholders/botões nem são carregados scripts.
Copie `.env.example` para `.env` e use apenas IDs/URL públicos reais. A URL de apoio
HTTPS ativa o link externo após rebuild. Os IDs do AdSense preparam o slot manual;
**o script/veiculação ainda dependem da integração futura do provedor e consentimento**.

Consulte [configuração e ativação de monetização](docs/monetization.md) para variáveis,
privacidade/CMP, tamanho reservado, limites da integração e verificações. O timer e
os demais recursos continuam gratuitos e independentes da monetização.
