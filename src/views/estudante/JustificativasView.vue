<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { justificativaService } from '../../services/justificativas'
import { cardapioService } from '../../services/cardapio'
import type { Justificativa, TipoJustificativa } from '../../types/justificativa'
import type { Refeicao } from '../../types/cardapio'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import FileUpload from 'primevue/fileupload'
import Message from 'primevue/message'
import InputNumber from 'primevue/inputnumber'
import Skeleton from 'primevue/skeleton'

const toast = useToast()
const justificativas = ref<Justificativa[]>([])
const loading = ref(false)
const displayDialog = ref(false)
const displayDetails = ref(false)
const selectedJustificativa = ref<Justificativa | null>(null)
const refeicoesDisponiveis = ref<Refeicao[]>([])

const novaJustificativa = ref({
  refeicao_id: null as number | null,
  tipo: 'posterior' as TipoJustificativa,
  motivo: '',
  motivo_categoria: '' as string,
  quantidade_dias: 1,
  anexo: null as File | null
})

const tipos = [
  { label: 'Programada (Antecipada)', value: 'antecipada' },
  { label: 'Posterior', value: 'posterior' }
]

// Categorias de motivo para justificativa posterior
const motivosCategorias = [
  { label: 'Ausência relativa à saúde discente', value: 'saude' },
  { label: 'Cancelamento de todas as aulas do dia', value: 'cancelamento_aulas' },
  { label: 'Atividades curriculares fora do campus', value: 'atividade_externa' },
  { label: 'Falecimento de familiares', value: 'falecimento' },
  { label: 'Questões religiosas', value: 'religioso' },
  { label: 'Outro tipo de ausência (com atestado/declaração)', value: 'outro' }
]

// Computed para verificar se é justificativa posterior
const isPosterior = computed(() => novaJustificativa.value.tipo === 'posterior')
const isAntecipada = computed(() => novaJustificativa.value.tipo === 'antecipada')

// Watch para limpar campos ao mudar tipo
watch(() => novaJustificativa.value.tipo, () => {
  novaJustificativa.value.motivo_categoria = ''
  novaJustificativa.value.anexo = null
  novaJustificativa.value.quantidade_dias = 1
})

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'aprovada': return 'success'
    case 'rejeitada': return 'danger'
    case 'pendente': return 'warn'
    default: return 'info'
  }
}

const carregarJustificativas = async () => {
  loading.value = true
  try {
    justificativas.value = await justificativaService.listarMinhas()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar as justificativas' })
  } finally {
    loading.value = false
  }
}

const carregarRefeicoes = async () => {
  try {
    const data = await cardapioService.semanal()
    refeicoesDisponiveis.value = data.flatMap(c => c.refeicoes || [])
  } catch (err) {
    console.error('Erro ao carregar refeições', err)
  }
}

const abrirNovo = () => {
  novaJustificativa.value = {
    refeicao_id: null,
    tipo: 'posterior',
    motivo: '',
    motivo_categoria: '',
    quantidade_dias: 1,
    anexo: null
  }
  displayDialog.value = true
}

const onFileSelect = (event: any) => {
  novaJustificativa.value.anexo = event.files[0]
}

const enviarJustificativa = async () => {
  // Validações
  if (!novaJustificativa.value.refeicao_id) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Selecione a refeição' })
    return
  }

  if (isPosterior.value) {
    if (!novaJustificativa.value.motivo_categoria) {
      toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Selecione o motivo da ausência' })
      return
    }
    if (!novaJustificativa.value.anexo) {
      toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Anexe a declaração ou atestado' })
      return
    }
  } else {
    if (!novaJustificativa.value.motivo) {
      toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Informe o motivo da ausência programada' })
      return
    }
  }

  try {
    // Montar motivo completo para posterior
    let motivoFinal = novaJustificativa.value.motivo
    if (isPosterior.value) {
      const categoriaLabel = motivosCategorias.find(m => m.value === novaJustificativa.value.motivo_categoria)?.label || ''
      motivoFinal = categoriaLabel + (novaJustificativa.value.motivo ? ` - ${novaJustificativa.value.motivo}` : '')
      if (novaJustificativa.value.quantidade_dias > 1) {
        motivoFinal += ` (${novaJustificativa.value.quantidade_dias} dias)`
      }
    }

    await justificativaService.enviar({
      refeicao_id: novaJustificativa.value.refeicao_id,
      tipo: novaJustificativa.value.tipo,
      motivo: motivoFinal,
      anexo: novaJustificativa.value.anexo
    })
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Justificativa enviada com sucesso' })
    displayDialog.value = false
    carregarJustificativas()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao enviar justificativa' })
  }
}

const verDetalhes = (justificativa: Justificativa) => {
  selectedJustificativa.value = justificativa
  displayDetails.value = true
}

onMounted(() => {
  carregarJustificativas()
  carregarRefeicoes()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-3xl font-bold text-slate-800">Justificativas</h1>
        <p class="text-slate-500 mt-1">Gerencie suas ausências e acompanhe o status das suas solicitações.</p>
      </div>
      <Button 
        label="Nova Justificativa" 
        icon="pi pi-plus" 
        severity="success" 
        class="!rounded-2xl shadow-lg shadow-emerald-200"
        @click="abrirNovo" 
      />
    </div>

    <!-- Informações sobre Justificativas - Card informativo sempre visível -->
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <!-- Header -->
      <div class="bg-blue-50 border-b border-blue-100 px-6 py-4 flex items-center gap-3">
        <i class="pi pi-info-circle text-blue-600 text-xl"></i>
        <span class="font-bold text-blue-800">Informações sobre Justificativas de Ausência - Refeitório 2026</span>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Ausência Posterior -->
        <div class="border-l-4 border-amber-500 pl-4">
          <h3 class="font-bold text-amber-800 mb-2 flex items-center gap-2">
            <i class="pi pi-clock"></i> Ausência Posterior
          </h3>
          <p class="text-sm text-slate-600 mb-3">
            São as justificativas de ausências informadas <strong>posteriormente</strong> à data da ausência.
          </p>
          <p class="text-sm text-slate-700 font-medium mb-2">Para esse tipo, serão aceitas como justificativa:</p>
          <ul class="text-sm text-slate-600 space-y-1 list-disc list-inside ml-2">
            <li>Ausência relativa à <strong>saúde discente</strong>, comprovada por atestado médico</li>
            <li>Ausência devido ao <strong>cancelamento de todas as aulas</strong> do dia, comprovada por declaração da coordenação</li>
            <li>Ausência devido à <strong>atividade curricular fora do campus</strong>, comprovada por declaração da coordenação</li>
            <li>Ausência devido ao <strong>falecimento de familiares</strong>, comprovada por atestado</li>
            <li>Ausência devido à <strong>atividade religiosa</strong>, comprovada por declaração da entidade</li>
          </ul>
          <Message severity="warn" :closable="false" class="!mt-4 !text-xs">
            <strong>IMPORTANTE:</strong> Todas as justificativas devem conter o nome completo do discente e ser coincidente com a data da ausência.
            As ausências devem ser justificadas <strong>até o penúltimo dia letivo de cada mês</strong>.
          </Message>
        </div>

        <!-- Ausência Programada -->
        <div class="border-l-4 border-emerald-500 pl-4">
          <h3 class="font-bold text-emerald-800 mb-2 flex items-center gap-2">
            <i class="pi pi-calendar-plus"></i> Ausência Programada (Antecipada)
          </h3>
          <p class="text-sm text-slate-600 mb-3">
            São as justificativas de ausências informadas <strong>com antecedência</strong> à data da ausência.
            <strong class="text-emerald-700">NÃO PRECISA DE ATESTADO.</strong>
          </p>
          <p class="text-sm text-slate-700 font-medium mb-2">Prazos para registro:</p>
          <ul class="text-sm text-slate-600 space-y-1 list-disc list-inside ml-2">
            <li><strong>Almoço:</strong> até às <strong>13:30</strong> do dia da ausência</li>
            <li><strong>Jantar:</strong> até às <strong>19:00</strong> do dia da ausência</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Lista de Justificativas -->
    <div class="grid gap-4">
      <div v-if="loading && justificativas.length === 0" class="space-y-4">
        <Skeleton v-for="i in 3" :key="i" height="80px" border-radius="1.5rem" />
      </div>

      <div v-else-if="justificativas.length === 0" class="bg-white border border-dashed border-slate-300 rounded-[2.5rem] p-12 text-center">
         <i class="pi pi-file-edit text-5xl text-slate-200 mb-4"></i>
         <p class="text-slate-500 font-medium">Você ainda não enviou nenhuma justificativa.</p>
      </div>

      <div v-else class="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        <DataTable 
          :value="justificativas" 
          :loading="loading" 
          paginator 
          :rows="10" 
          responsiveLayout="stack" 
          breakpoint="960px"
          class="p-datatable-sm"
        >
          <template #empty> Nenhuma justificativa encontrada. </template>
          
          <Column header="Refeição">
            <template #body="{ data }">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                  {{ data.refeicao?.turno === 'almoco' ? '🌅' : '🌙' }}
                </div>
                <div v-if="data.refeicao">
                  <p class="font-bold text-slate-800">{{ data.refeicao.data }}</p>
                  <p class="text-[10px] text-slate-500 uppercase font-black tracking-tighter">{{ data.refeicao.turno }}</p>
                </div>
              </div>
            </template>
          </Column>

          <Column header="Tipo / Envio">
            <template #body="{ data }">
              <div>
                <p class="text-sm font-semibold text-slate-700 capitalize">{{ data.tipo === 'antecipada' ? 'Programada' : 'Posterior' }}</p>
                <p class="text-xs text-slate-400">Enviado em {{ data.enviado_em }}</p>
              </div>
            </template>
          </Column>

          <Column field="status" header="Status">
            <template #body="{ data }">
              <Tag 
                :value="data.status" 
                :severity="getStatusSeverity(data.status)" 
                class="!rounded-full px-3 uppercase text-[10px] font-black" 
              />
            </template>
          </Column>

          <Column header="Ações" class="text-right">
            <template #body="{ data }">
              <Button 
                icon="pi pi-search-plus" 
                outlined 
                rounded 
                severity="secondary" 
                @click="verDetalhes(data)" 
                class="!border-slate-200 !text-slate-500"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <!-- Dialog de Nova Justificativa -->
    <Dialog 
      v-model:visible="displayDialog" 
      header="Nova Justificativa" 
      :style="{ width: '95%', maxWidth: '550px' }"
      modal
      class="p-fluid !rounded-[2.5rem] overflow-hidden"
    >
      <div class="space-y-6 pt-4">
        <!-- Tipo da Justificativa -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-bold text-slate-700">Tipo da Justificativa *</label>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="tipo in tipos"
              :key="tipo.value"
              @click="novaJustificativa.tipo = tipo.value as TipoJustificativa"
              :class="[
                'cursor-pointer p-3 border-2 rounded-2xl text-center transition-all',
                novaJustificativa.tipo === tipo.value
                  ? tipo.value === 'antecipada'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              ]"
            >
              <i :class="['pi mb-1', tipo.value === 'antecipada' ? 'pi-calendar-plus' : 'pi-clock']"></i>
              <span class="text-sm font-bold block">{{ tipo.label }}</span>
            </div>
          </div>
        </div>

        <!-- Mensagem informativa baseada no tipo -->
        <Message v-if="isAntecipada" severity="success" :closable="false" class="!m-0 text-xs">
          <strong>Ausência Programada:</strong> Não precisa de atestado. Registre até às 13:30 (almoço) ou 19:00 (jantar) do dia da ausência.
        </Message>
        <Message v-else severity="warn" :closable="false" class="!m-0 text-xs">
          <strong>Ausência Posterior:</strong> Necessário anexar atestado ou declaração comprobatória.
        </Message>

        <!-- Seleção de Refeição -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-bold text-slate-700 flex items-center gap-2">
            <i class="pi pi-calendar text-emerald-600"></i> Refeição *
          </label>
          <Select
            v-model="novaJustificativa.refeicao_id"
            :options="refeicoesDisponiveis"
            optionLabel="id"
            placeholder="Selecione a refeição"
            optionValue="id"
            class="!rounded-2xl"
          >
            <template #option="slotProps">
              <div class="flex items-center gap-2">
                 <span>{{ slotProps.option.turno === 'almoco' ? '🌅' : '🌙' }}</span>
                 <span>{{ new Date(slotProps.option.data_do_cardapio).toLocaleDateString('pt-BR') }} - </span>
                 <span class="capitalize">{{ slotProps.option.turno }}</span>
              </div>
            </template>
          </Select>
        </div>

        <!-- CAMPOS PARA JUSTIFICATIVA POSTERIOR -->
        <template v-if="isPosterior">
          <!-- Categoria do Motivo -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-bold text-slate-700 flex items-center gap-2">
              <i class="pi pi-list text-amber-600"></i> Justificativa da Ausência *
            </label>
            <Select
              v-model="novaJustificativa.motivo_categoria"
              :options="motivosCategorias"
              optionLabel="label"
              optionValue="value"
              placeholder="Selecione o motivo"
              class="!rounded-2xl"
            />
          </div>

          <!-- Anexo (obrigatório para posterior) -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-bold text-slate-700 flex items-center gap-2">
              <i class="pi pi-paperclip text-amber-600"></i> Declaração ou Atestado *
            </label>
            <p class="text-xs text-slate-500 -mt-1">
              Anexar declaração ou atestado que comprove a justificativa de ausência.
            </p>
            <FileUpload
              mode="basic"
              name="anexo"
              accept="image/*,application/pdf"
              :maxFileSize="10485760"
              customUpload
              @select="onFileSelect"
              chooseLabel="Anexar PDF ou Imagem"
              class="!rounded-2xl w-full"
              severity="secondary"
            />
            <small class="text-slate-400">Aceito: PDF ou imagem. Tamanho máximo: 10MB.</small>
            <div v-if="novaJustificativa.anexo" class="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <i class="pi pi-check-circle text-emerald-600"></i>
              <span class="text-sm text-emerald-700">{{ novaJustificativa.anexo.name }}</span>
            </div>
          </div>

          <!-- Quantidade de dias -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-bold text-slate-700">Quantidade de dias</label>
            <p class="text-xs text-slate-500 -mt-1">
              Se o atestado for para mais de um dia, indique aqui a quantidade.
            </p>
            <InputNumber
              v-model="novaJustificativa.quantidade_dias"
              :min="1"
              :max="30"
              showButtons
              class="!rounded-2xl"
            />
          </div>

          <!-- Observações adicionais (opcional) -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-bold text-slate-700">Observações adicionais (opcional)</label>
            <Textarea
              v-model="novaJustificativa.motivo"
              rows="2"
              autoResize
              placeholder="Informações adicionais, se necessário..."
              class="!rounded-2xl"
            />
          </div>
        </template>

        <!-- CAMPOS PARA JUSTIFICATIVA ANTECIPADA -->
        <template v-else>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-bold text-slate-700">Motivo da ausência programada *</label>
            <Textarea
              v-model="novaJustificativa.motivo"
              rows="4"
              autoResize
              placeholder="Descreva o motivo da sua ausência programada..."
              class="!rounded-2xl"
            />
          </div>
        </template>
      </div>
      
      <template #footer>
        <div class="flex gap-3 w-full pt-4">
          <Button label="Cancelar" text class="flex-1 !rounded-xl" @click="displayDialog = false" />
          <Button
            label="Enviar Justificativa"
            :severity="isPosterior ? 'warning' : 'success'"
            class="flex-1 !rounded-xl"
            @click="enviarJustificativa"
          />
        </div>
      </template>
    </Dialog>

    <!-- Dialog de Detalhes -->
    <Dialog 
      v-model:visible="displayDetails" 
      header="Detalhes da Justificativa" 
      :style="{ width: '90%', maxWidth: '450px' }" 
      modal
      class="!rounded-[2.5rem] overflow-hidden"
    >
      <div v-if="selectedJustificativa" class="space-y-6 py-4">
        <div class="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Status atual</span>
            <Tag :value="selectedJustificativa.status" :severity="getStatusSeverity(selectedJustificativa.status)" class="!rounded-full px-3 uppercase text-[10px] font-black" />
          </div>
          <div class="text-right">
            <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Tipo</span>
            <span class="text-sm font-bold text-slate-700 capitalize">{{ selectedJustificativa.tipo === 'antecipada' ? 'Programada' : 'Posterior' }}</span>
          </div>
        </div>

        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Motivo do Estudante</span>
          <p class="text-slate-700 text-sm leading-relaxed">{{ selectedJustificativa.motivo }}</p>
        </div>

        <div v-if="selectedJustificativa.motivo_rejeicao" class="bg-red-50 p-4 rounded-2xl border border-red-100">
          <span class="text-[10px] text-red-400 font-black uppercase tracking-widest block mb-2">Observação do Administrador</span>
          <p class="text-red-700 text-sm leading-relaxed">{{ selectedJustificativa.motivo_rejeicao }}</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Enviado em</span>
            <span class="text-xs font-bold text-slate-700">{{ selectedJustificativa.enviado_em }}</span>
          </div>
          <div v-if="selectedJustificativa.avaliado_em" class="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Avaliado em</span>
            <span class="text-xs font-bold text-slate-700">{{ selectedJustificativa.avaliado_em }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Fechar" class="w-full !rounded-xl" severity="secondary" @click="displayDetails = false" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.capitalize {
  text-transform: capitalize;
}
</style>
