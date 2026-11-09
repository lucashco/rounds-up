# Storage

`savedWorkouts.ts` persiste apenas `{ name, config }` em `roundfit.workouts`, schema
`{ version: 1, workouts: [...] }`. A chave legada é mantida no Rounds Up para
preservar treinos salvos antes do rebranding. Exporta `readSavedWorkouts`, `saveWorkout`,
`deleteWorkout` e `validateSavedWorkout`. O adaptador recebe um storage injetado e
não acessa window/localStorage durante import ou SSR.

Dados externos entram como `unknown`, são validados pelo domínio e serializados
por allowlist. Versão desconhecida, JSON inválido ou configuração inválida bloqueiam
leitura/escrita sem apagar o conteúdo. Não há migração automática. Falhas de acesso
ou quota retornam resultados explícitos, sem quebrar o treino.

Sobrescrever nome existente exige a revisão retornada por um conflito anterior,
após confirmação explícita na interface. A revisão é revalidada ao escrever.
Mudanças em outras abas atualizam a lista e cancelam confirmações pendentes.
LocalStorage não oferece transações entre abas; a revisão é uma proteção otimista.
Limites compatíveis com a interface: 100 treinos, 100 rounds/50 exercícios por treino
e payload de até 1.000.000 de caracteres. Estado de execução nunca é salvo.
