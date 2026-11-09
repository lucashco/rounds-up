# Domain

Domínio puro em TypeScript, sem React, relógio ou APIs do navegador.

- `types.ts`: configurações FREE/GUIDED, exercícios TIMED e fases discriminadas.
- `validateWorkoutConfig.ts`: valida dados `unknown` e lança `WorkoutConfigError`
  com `field` e mensagem explícita. IDs de exercício devem ser únicos no circuito.
- `buildTimeline.ts`: valida a entrada e retorna `{ phases, totalDurationMs }`.
  Fases possuem `startMs`, `endMs` e `durationMs`; intervalos são [início, fim).
  Rounds começam em 1. Descansos referenciam o round/exercício anterior.

Todas as durações são números finitos em milissegundos. Apenas preparação e
descansos aceitam zero; campos opcionais ausentes equivalem a zero. Durações e
total acumulado não podem exceder `Number.MAX_SAFE_INTEGER`. A geração rejeita
incrementos que não possam avançar o offset por perda de precisão numérica.

O gerador preserva a ordem e os IDs dos exercícios em todos os rounds, omite
fases de duração zero e não adiciona descanso depois do último exercício nem do
último round. Não modifica a entrada nem compartilha objetos de exercícios com
a saída. Testes ficam junto aos módulos (`*.test.ts`).

## Timer engine

`createTimerEngine(timeline)` cria uma sessão em `idle` com uma cópia congelada
da timeline. `transitionTimer(engine, command)` é uma função pura que retorna
outro valor imutável. Nenhum comando lê relógios ou agenda tarefas.

```ts
let engine = createTimerEngine(timeline);
engine = transitionTimer(engine, { type: 'start', now: 100 });
engine = transitionTimer(engine, { type: 'update', now: 350 });
engine = transitionTimer(engine, { type: 'pause', now: 400 });
engine = transitionTimer(engine, { type: 'resume', now: 2_000 });
engine = transitionTimer(engine, { type: 'next', now: 2_100 });
engine = transitionTimer(engine, { type: 'reset' });
```

`engine.state` contém status, índice e objeto da fase atual, tempos decorridos e
restantes da fase e do treino. Índices começam em zero. Ao concluir, fase e índice
são `null` e os tempos da fase são zero. `totalElapsedMs` mede tempo efetivamente
ativo; trechos pulados são registrados em `skippedDurationMs` e removidos do
restante. Portanto, após um salto, decorrido + restante pode ser menor que a
duração original. Os offsets da timeline original não são reescritos.

Todos os comandos com timestamp sincronizam primeiro o tempo ativo. `start` só
inicia `idle`; `pause` só pausa `running`; `resume` só retoma `paused`. Comandos
incompatíveis não alteram a execução além da sincronização temporal. `next` pula
a fase vigente após sincronizar (inclusive se o timestamp atravessou uma fronteira)
e preserva `paused`. Chamadas repetidas de `next` pulam uma fase por chamada.
Em `idle` ou `completed`, `next` não faz nada. Para reiniciar após concluir, use
`reset` e `start`.

Timestamps devem ser finitos, não negativos, até `Number.MAX_SAFE_INTEGER` e não
decrescentes, mesmo em comandos incompatíveis ou pausados. Timestamps iguais são
permitidos. `reset` limpa progresso, saltos e a referência temporal. Erros lançam
`TimerEngineError` e preservam o estado anterior. Uma timeline vazia é válida:
`start` a conclui imediatamente. Durações/offsets inconsistentes são rejeitados.

A busca da fase atual é binária; uma atualização atrasada atravessa todas as
fases necessárias sem depender da quantidade de ticks recebidos.
