# ✅ CORREÇÃO - Erro de Inscrição na Fila de Extras

## 🐛 Problema Identificado

**Erro:** `{message: "validation.required", errors: {refeicao_id: ["validation.required"]}}`

**Causa:** O frontend estava tentando enviar `id` quando o backend espera `refeicao_id`.

---

## 🔍 Análise do Problema

### Backend (Correto)
O controller `FilaExtraController.php` retorna:
```php
[
    'refeicao_id' => $refeicao->id,
    'turno' => $turno,
    'turno_label' => 'Almoço/Jantar',
    // ... outros campos
]
```

### Frontend (Estava Incorreto)
O tipo `RefeicaoDisponivel` estava definido com:
```typescript
interface RefeicaoDisponivel {
  id: number  // ❌ ERRADO
  // ...
}
```

E o componente tentava usar:
```typescript
await filaStore.inscrever(refeicaoSelecionada.value.id)  // ❌ ERRADO
```

---

## ✅ Correções Aplicadas

### 1. **Tipo RefeicaoDisponivel** (`src/types/filaExtras.ts`)
```typescript
export interface RefeicaoDisponivel {
  refeicao_id: number  // ✅ CORRETO
  turno: 'almoco' | 'jantar'
  turno_label: string
  horario_inicio: string
  horario_fim: string
  esta_no_horario: boolean
  pode_inscrever: boolean
  vagas_disponiveis: number
  capacidade_total: number
  presencas_confirmadas: number
  inscrito: boolean
  inscricao_id?: number
  posicao_fila?: number
  status_inscricao?: string
  cardapio: {
    id: number
    prato_principal_ptn01: string
    prato_principal_ptn02: string
    guarnicao: string
    acompanhamento_01: string
    acompanhamento_02: string
    salada: string
    ovo_lacto_vegetariano: string
    suco: string
    sobremesa: string
  }
}
```

### 2. **Componente FilaExtrasView.vue**

**a) Função de inscrição:**
```typescript
// ANTES ❌
await filaStore.inscrever(refeicaoSelecionada.value.id)

// DEPOIS ✅
await filaStore.inscrever(refeicaoSelecionada.value.refeicao_id)
```

**b) Template - Coluna de Refeição:**
```vue
<!-- ANTES ❌ -->
<p>{{ formatarData(data.data) }}</p>
<p>{{ data.turno }}</p>

<!-- DEPOIS ✅ -->
<p>Hoje</p>
<p>{{ data.turno_label }}</p>
```

**c) Template - Prato Principal:**
```vue
<!-- ANTES ❌ -->
<Column field="prato_principal" header="Prato Principal" />

<!-- DEPOIS ✅ -->
<Column header="Prato Principal">
  <template #body="{ data }">
    {{ data.cardapio.prato_principal_ptn01 }}
  </template>
</Column>
```

**d) Template - Disponibilidade:**
```vue
<!-- ANTES ❌ -->
<span>Até {{ data.limite_inscricoes }}</span>

<!-- DEPOIS ✅ -->
<span>Até {{ data.horario_fim }}</span>
```

**e) Template - Ações:**
```vue
<!-- ANTES ❌ -->
<Button v-if="data.pode_inscrever && !data.ja_inscrito" />
<div v-else-if="data.ja_inscrito">Inscrito</div>

<!-- DEPOIS ✅ -->
<Button v-if="data.pode_inscrever && !data.inscrito" />
<div v-else-if="data.inscrito">Inscrito</div>
```

**f) Dialog de Confirmação:**
```vue
<!-- ANTES ❌ -->
<span>{{ formatarData(refeicaoSelecionada.data) }}</span>
<span>{{ refeicaoSelecionada.turno }}</span>
<span>{{ refeicaoSelecionada.prato_principal }}</span>

<!-- DEPOIS ✅ -->
<span>Hoje</span>
<span>{{ refeicaoSelecionada.turno_label }}</span>
<span>{{ refeicaoSelecionada.cardapio.prato_principal_ptn01 }}</span>
```

**g) Filtros do DataTable:**
```vue
<!-- ANTES ❌ -->
:globalFilterFields="['data_do_cardapio', 'turno']"

<!-- DEPOIS ✅ -->
:globalFilterFields="['turno', 'turno_label']"
```

### 3. **Imports Limpos**
Removidos imports não utilizados:
- `Card` (não estava sendo usado)
- `Message` (não estava sendo usado)

### 4. **Correções de Tipos**
```typescript
// Proteção contra valores undefined
inscricao.refeicao?.turno ? formatarTurno(inscricao.refeicao.turno) : ''
inscricao.refeicao?.data ? formatarData(inscricao.refeicao.data) : ''
```

---

## 🧪 Como Testar

1. **Abra o navegador e acesse a página de Fila de Extras**
   ```
   http://localhost:5173/dashboard/fila-extras
   ```

2. **Verifique se a lista de refeições disponíveis aparece corretamente**
   - ✅ Turno (Almoço/Jantar)
   - ✅ Prato Principal
   - ✅ Vagas disponíveis
   - ✅ Horário limite

3. **Clique em "Inscrever-se"**
   - ✅ Dialog de confirmação deve abrir
   - ✅ Dados da refeição devem aparecer corretamente

4. **Confirme a inscrição**
   - ✅ Toast de sucesso deve aparecer
   - ✅ Inscrição deve aparecer em "Minhas Inscrições Ativas"
   - ✅ Posição na fila deve ser exibida
   - ✅ Botão deve mudar para "Inscrito"

5. **Verifique o console do navegador (F12)**
   - ✅ Não deve haver erros
   - ✅ Requisição POST deve enviar `refeicao_id` corretamente

---

## 📊 Fluxo Correto Agora

```
Frontend                          Backend
--------                          -------
1. Clica "Inscrever"
   refeicao_id = data.refeicao_id

2. POST /estudante/fila-extras
   Body: { refeicao_id: 123 }  ──→  Validação OK ✅
                                    request->validate([
                                      'refeicao_id' => 'required'
                                    ])

3. Recebe resposta                 Retorna FilaExtra criada
   ←─────────────────────────────

4. Atualiza UI
   - Adiciona em minhasInscricoes
   - Atualiza botões
   - Mostra toast de sucesso ✅
```

---

## 🎯 Resultado Esperado

✅ **ANTES:** Erro de validação ao inscrever
✅ **DEPOIS:** Inscrição funciona perfeitamente

---

## 📁 Arquivos Modificados

1. `ri_ifba_v1_frontend/src/types/filaExtras.ts`
2. `ri_ifba_v1_frontend/src/views/estudante/FilaExtrasView.vue`

---

## 🚀 Próximos Passos

Se ainda houver algum problema:

1. **Limpe o cache do navegador** (Ctrl+Shift+R)
2. **Verifique o console do navegador** para mais detalhes
3. **Verifique o Network tab** para ver a requisição sendo enviada
4. **Confirme que há refeições disponíveis hoje** (execute o seeder de cardápios se necessário)

---

✅ **Correção concluída com sucesso!**
