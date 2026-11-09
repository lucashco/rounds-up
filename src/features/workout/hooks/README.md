# Hooks

`useWorkoutTimer(initialTimeline)` conecta o motor puro ao React. Retorna:

- `state`: o `TimerState` derivado pelo motor.
- `start()`, `pause()`, `resume()`, `next()`, `reset()`: comandos estáveis e tipados.

O hook mantém a timeline inicial por toda a sessão. Para carregar outro treino,
remonte o componente consumidor com uma nova `key`. `reset()` reutiliza a timeline
inicial. Alterar a prop da timeline sem remontar não substitui o treino em curso.

O reducer e o inicializador são puros e não acessam APIs do navegador durante
renderização/SSR. Os timestamps de `performance.now()` são capturados antes do
dispatch, permitindo replay seguro do reducer no Strict Mode. O intervalo de
50 ms apenas solicita atualização; não determina o avanço nem acumula duração.
Seu callback usa apenas dispatch, sem capturar estado antigo. O efeito remove o
intervalo ao pausar, concluir ou desmontar; o ciclo extra de cleanup/setup do
Strict Mode não reinicia o motor nem deixa intervalos anteriores ativos.

A interface pode atualizar com menor frequência em abas em segundo plano. No
próximo update ou comando, o motor recupera o progresso pelo timestamp recebido.
Não há auto-pausa ao perder visibilidade nem persistência da sessão em execução.


## Experiência e persistência

- `useWorkoutAlerts`: política pura de alertas + Web Audio adapter. O cursor em ref
  deduplica efeitos/replay do Strict Mode, pausas e retomadas; epoch diferencia
  reinícios. Eventos mudos/ocultos são consumidos. Só o alerta atual é reproduzido.
- `useScreenWakeLock(active, epoch, enabled = true)`: retorna um status discreto e
  respeita a preferência de tela. Detecta suporte/contexto seguro apenas no cliente.
  Usado por sessão iniciada por gesto do usuário; efeito ativo
  adquire a tela e instala visibilitychange. Cleanup libera, inclusive requisições
  ainda pendentes. Mudar epoch força liberação e nova aquisição no reinício. O
  controlador em ref serializa pedidos entre ciclos de efeito/Strict Mode e reporta
  falha ou liberação externa, sem interferir no estado do timer.
- `useSavedWorkouts`: leitura no effect, escrita somente em ações explícitas,
  resultados validados pelo adaptador e confirmação por revisão antes de substituir.

Os controladores em `browser/` isolam APIs do navegador do motor puro. Nenhum desses
hooks altera o cálculo ou a semântica temporal de `useWorkoutTimer`.
