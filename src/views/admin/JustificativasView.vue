<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { useToast } from 'primevue/usetoast'
import { justificativaService } from '../../services/justificativas'
import { useAvatar } from '../../composables/useAvatar'
import PageHeader from '../../components/common/PageHeader.vue'
import type { Justificativa } from '../../types/justificativa'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Avatar from 'primevue/avatar'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'

const toast = useToast()
const { getInitials, getAvatarStyle } = useAvatar()
const justificativas = ref<any[]>([])
const stats = ref<any>(null)
const loading = ref(false)
const displayDialog = ref(false)
const selectedJustificativa = ref<any>(null)
const motivoRejeicao = ref('')
const loadingAction = ref(false)

const tipoOptions = ref([
  { label: 'Todos os Tipos', value: null },
  { label: 'Antecipada', value: 'antecipada' },
  { label: 'Posterior', value: 'posterior' }
])

const statusOptions = ref([
  { label: 'Todos Status', value: null },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Aprovada', value: 'aprovada' },
  { label: 'Rejeitada', value: 'rejeitada' }
])

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  tipo: { value: null, matchMode: FilterMatchMode.EQUALS },
  status: { value: null, matchMode: FilterMatchMode.EQUALS }
})

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'aprovada': return 'success'
    case 'rejeitada': return 'danger'
    case 'pendente': return 'warn'
    default: return 'info'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'aprovada': return 'Aprovada'
    case 'rejeitada': return 'Rejeitada'
    case 'pendente': return 'Pendente'
    default: return status
  }
}

const getTipoSeverity = (tipo: string) => {
  return tipo === 'antecipada' ? 'info' : 'warn'
}

const carregarJustificativas = async () => {
  loading.value = true
  try {
    const params = {
      tipo: filters.value.tipo.value,
      status: filters.value.status.value
    }
    const res = await justificativaService.listarTodasAdmin(params)
    justificativas.value = res.data
    stats.value = res.meta.stats
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar justificativas' })
  } finally {
    loading.value = false
  }
}

watch([() => filters.value.tipo.value, () => filters.value.status.value], () => {
  carregarJustificativas()
})

const abrirDetalhes = (justificativa: Justificativa) => {
  selectedJustificativa.value = justificativa
  motivoRejeicao.value = ''
  displayDialog.value = true
}

const abrirAnexo = (id: number) => {
  const url = `${import.meta.env.VITE_API_BASE_URL}/admin/justificativas/${id}/anexo`
  window.open(url, '_blank')
}

const aprovar = async () => {
  if (!selectedJustificativa.value) return
  loadingAction.value = true
  try {
    await justificativaService.aprovarAdmin(selectedJustificativa.value.id)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Justificativa aprovada' })
    displayDialog.value = false
    carregarJustificativas()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao aprovar' })
  } finally {
    loadingAction.value = false
  }
}

const rejeitar = async () => {
  if (!selectedJustificativa.value || !motivoRejeicao.value) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Informe o motivo da rejeição' })
    return
  }
  loadingAction.value = true
  try {
    await justificativaService.rejeitarAdmin(selectedJustificativa.value.id, motivoRejeicao.value)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Justificativa rejeitada' })
    displayDialog.value = false
    carregarJustificativas()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao rejeitar' })
  } finally {
    loadingAction.value = false
  }
}

onMounted(() => {
  carregarJustificativas()
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader
      title="Gerenciar Justificativas"
      subtitle="Analise e decida sobre as justificativas dos alunos."
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Justificativas' }]"
    />

    <!-- Cards de Resumo -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div 
        @click="filters.status.value = 'pendente'"
        class="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center transition-all hover:shadow-md cursor-pointer"
        :class="{'ring-4 ring-amber-200': filters.status.value === 'pendente'}"
      >
        <span class="text-4xl font-black text-amber-600 mb-1 leading-none">{{ stats?.pendentes || 0 }}</span>
        <div class="flex items-center gap-2 text-amber-700">
          <i class="pi pi-hourglass text-sm"></i>
          <span class="text-xs font-black uppercase tracking-widest">Pendentes</span>
        </div>
      </div>

      <div 
        @click="filters.status.value = 'aprovada'"
        class="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center transition-all hover:shadow-md cursor-pointer"
        :class="{'ring-4 ring-emerald-200': filters.status.value === 'aprovada'}"
      >
        <span class="text-4xl font-black text-emerald-600 mb-1 leading-none">{{ stats?.aprovadas || 0 }}</span>
        <div class="flex items-center gap-2 text-emerald-700">
          <i class="pi pi-check-circle text-sm"></i>
          <span class="text-xs font-black uppercase tracking-widest">Aprovadas</span>
        </div>
      </div>

      <div 
        @click="filters.status.value = 'rejeitada'"
        class="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center transition-all hover:shadow-md cursor-pointer"
        :class="{'ring-4 ring-red-200': filters.status.value === 'rejeitada'}"
      >
        <span class="text-4xl font-black text-red-600 mb-1 leading-none">{{ stats?.rejeitadas || 0 }}</span>
        <div class="flex items-center gap-2 text-red-700">
          <i class="pi pi-times-circle text-sm"></i>
          <span class="text-xs font-black uppercase tracking-widest">Rejeitadas</span>
        </div>
      </div>
    </div>

    <!-- Barra de Filtros -->
    <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-end gap-4">
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
        <Select v-model="filters.status.value" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Status" class="w-44 !rounded-xl" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
        <Select v-model="filters.tipo.value" :options="tipoOptions" optionLabel="label" optionValue="value" placeholder="Tipo" class="w-44 !rounded-xl" />
      </div>
      <Button icon="pi pi-refresh" label="Atualizar" class="!rounded-xl px-6 h-11" @click="carregarJustificativas" :loading="loading" />
      
      <div class="flex-1"></div>
      
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pesquisa</label>
        <InputText v-model="filters.global.value" placeholder="Buscar aluno ou motivo..." class="!rounded-xl w-64" />
      </div>
    </div>

    <!-- Lista de Justificativas -->
    <div class="space-y-4">
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="h-48 bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>
      </div>

      <div v-else-if="justificativas.length === 0" class="py-20 text-center bg-white rounded-xl border-2 border-dashed border-slate-200">
        <i class="pi pi-file-edit text-5xl text-slate-200 mb-4"></i>
        <p class="text-slate-500 font-medium">Nenhuma justificativa encontrada com os filtros selecionados.</p>
      </div>

      <div v-for="just in justificativas" :key="just.id" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm transition-all hover:shadow-md hover:border-primary-200 relative overflow-hidden group">
        <!-- Badge de Status no topo direito -->
        <div class="absolute top-6 right-6 flex items-center gap-3">
          <div v-if="just.status_justificativa === 'pendente'" class="flex gap-2">
            <Button label="Aprovar" icon="pi pi-check" severity="success" size="small" class="!rounded-xl !px-4" @click="selectedJustificativa = just; aprovar()" :loading="loadingAction && selectedJustificativa?.id === just.id" />
            <Button label="Rejeitar" icon="pi pi-times" severity="danger" size="small" outlined class="!rounded-xl !px-4" @click="abrirDetalhes(just)" />
          </div>
          <Tag :value="getStatusLabel(just.status_justificativa)" :severity="getStatusSeverity(just.status_justificativa)" class="!rounded-full px-4 uppercase text-[10px] font-black shadow-sm" />
        </div>

          <!-- Avatar e Info Aluno -->
          <div class="flex-1 space-y-4">
            <div class="flex items-center gap-3">
              <Avatar :label="getInitials(just.usuario.nome)" shape="circle" size="normal" class="shadow-sm flex-shrink-0" :style="getAvatarStyle(just.usuario.nome)" />
              <div class="flex items-baseline gap-2">
                <span class="text-lg font-black text-slate-700">{{ just.usuario.nome }}</span>
                <span class="text-xs text-slate-400 font-bold">({{ just.usuario.matricula }})</span>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="space-y-1">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Refeição:</p>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-slate-700">{{ just.refeicao?.data || '-' }}</span>
                  <span class="text-xs text-slate-400 font-medium"> - {{ just.refeicao?.turno }}</span>
                </div>
              </div>
              <div class="space-y-1">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo:</p>
                <span class="text-sm font-bold text-slate-700">{{ just.tipo }}</span>
              </div>
            </div>

            <div class="space-y-1">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo:</p>
              <p class="text-slate-600 text-sm leading-relaxed">{{ just.motivo }}</p>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-50">
              <div class="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Enviado em: {{ just.criado_em }}</span>
                <button v-if="just.tem_anexo" class="text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors" @click="abrirAnexo(just.id)">
                  <i class="pi pi-paperclip text-xs"></i>
                  Possui anexo
                </button>
              </div>
              
              <Button v-if="just.status_justificativa !== 'pendente'" label="Ver Detalhes" icon="pi pi-search-plus" text severity="secondary" size="small" class="!rounded-xl" @click="abrirDetalhes(just)" />
            </div>
          </div>
        </div>
      </div>

    <Dialog 
      v-model:visible="displayDialog" 
      header="Analisar Justificativa" 
      :style="{ width: '90%', maxWidth: '500px' }" 
      modal
      class="!rounded-xl overflow-hidden"
    >
      <div v-if="selectedJustificativa" class="space-y-6 py-4">
        <div class="flex items-center justify-between px-1">
          <div class="flex flex-col">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Falta</span>
            <Tag :value="selectedJustificativa.tipo" :severity="getTipoSeverity(selectedJustificativa.tipo)" class="!rounded-full px-3 uppercase text-[10px] font-black w-fit mt-1" />
          </div>
          <div class="flex flex-col items-end">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual</span>
            <Tag :value="selectedJustificativa.status_justificativa" :severity="getStatusSeverity(selectedJustificativa.status_justificativa)" class="!rounded-full px-3 uppercase text-[10px] font-black w-fit mt-1" />
          </div>
        </div>

        <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Motivo do Aluno:</p>
          <p class="text-slate-800 text-sm leading-relaxed">{{ selectedJustificativa.motivo }}</p>
        </div>

        <div v-if="selectedJustificativa.tem_anexo" class="flex justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl">
          <Button 
            label="Visualizar Documento" 
            icon="pi pi-external-link" 
            text 
            severity="info"
            @click="abrirAnexo(selectedJustificativa.id)" 
          />
        </div>

        <div v-if="selectedJustificativa.status_justificativa === 'pendente'" class="space-y-4 pt-4 border-t border-slate-100">
          <div class="flex flex-col gap-2">
            <label class="text-xs font-black text-red-500 uppercase tracking-widest">Motivo da Rejeição (se aplicável)</label>
            <Textarea 
              v-model="motivoRejeicao" 
              rows="3" 
              placeholder="Descreva o motivo caso vá rejeitar..." 
              class="w-full !rounded-xl" 
            />
          </div>
          <div class="flex gap-3 pt-2">
            <Button label="Rejeitar" icon="pi pi-times" severity="danger" outlined @click="rejeitar" :loading="loadingAction" class="flex-1 !rounded-xl" />
            <Button label="Aprovar" icon="pi pi-check" severity="success" @click="aprovar" :loading="loadingAction" class="flex-1 !rounded-xl" />
          </div>
        </div>
        <div v-else class="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
          <p class="text-blue-700 text-sm font-medium italic">Esta justificativa já foi {{ selectedJustificativa.status_justificativa }}.</p>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.capitalize {
  text-transform: capitalize;
}
</style>
