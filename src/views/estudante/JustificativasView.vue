<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import FileUpload from 'primevue/fileupload'
import Message from 'primevue/message'

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
  anexo: null as File | null
})

const tipos = [
  { label: 'Antecipada', value: 'antecipada' },
  { label: 'Posterior', value: 'posterior' }
]

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
    anexo: null
  }
  displayDialog.value = true
}

const onFileSelect = (event: any) => {
  novaJustificativa.value.anexo = event.files[0]
}

const enviarJustificativa = async () => {
  if (!novaJustificativa.value.refeicao_id || !novaJustificativa.value.motivo) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Preencha todos os campos obrigatórios' })
    return
  }

  try {
    await justificativaService.enviar({
      refeicao_id: novaJustificativa.value.refeicao_id,
      tipo: novaJustificativa.value.tipo,
      motivo: novaJustificativa.value.motivo,
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
  <div class="space-y-8">
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
                <p class="text-sm font-semibold text-slate-700 capitalize">{{ data.tipo }}</p>
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
      :style="{ width: '90%', maxWidth: '500px' }" 
      modal 
      class="p-fluid !rounded-[2.5rem] overflow-hidden"
    >
      <div class="space-y-6 pt-4">
        <Message severity="info" :closable="false" class="!m-0 text-sm">
          Justificativas <strong>antecipadas</strong> são aprovadas automaticamente. Justificativas <strong>posteriores</strong> passam por análise.
        </Message>

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

        <div class="flex flex-col gap-2">
          <label class="text-sm font-bold text-slate-700">Tipo da Justificativa *</label>
          <div class="grid grid-cols-2 gap-2">
            <div 
              v-for="tipo in tipos" 
              :key="tipo.value"
              @click="novaJustificativa.tipo = tipo.value"
              :class="[
                'cursor-pointer p-3 border-2 rounded-2xl text-center transition-all',
                novaJustificativa.tipo === tipo.value 
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                  : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              ]"
            >
              <span class="text-sm font-bold">{{ tipo.label }}</span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-bold text-slate-700">Motivo / Explicação *</label>
          <Textarea 
            v-model="novaJustificativa.motivo" 
            rows="4" 
            autoResize 
            placeholder="Descreva o motivo da sua ausência..."
            class="!rounded-2xl"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-bold text-slate-700">Documento Comprobatório</label>
          <FileUpload
            mode="basic"
            name="anexo"
            accept="image/*,application/pdf"
            :maxFileSize="5242880"
            customUpload
            @select="onFileSelect"
            chooseLabel="Anexar Foto ou PDF"
            class="!rounded-2xl w-full"
            severity="secondary"
          />
          <small class="text-slate-400">Tamanho máximo: 5MB.</small>
        </div>
      </div>
      
      <template #footer>
        <div class="flex gap-3 w-full pt-4">
          <Button label="Cancelar" text class="flex-1 !rounded-xl" @click="displayDialog = false" />
          <Button label="Enviar Justificativa" severity="success" class="flex-1 !rounded-xl" @click="enviarJustificativa" />
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
            <span class="text-sm font-bold text-slate-700 capitalize">{{ selectedJustificativa.tipo }}</span>
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
