<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { FilterMatchMode } from '@primevue/core/api'
import { adminExtrasService } from '../../services/adminExtras'
import { useAvatar } from '../../composables/useAvatar'
import PageHeader from '../../components/common/PageHeader.vue'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Avatar from 'primevue/avatar'
import Calendar from 'primevue/calendar'
import Select from 'primevue/select'

const toast = useToast()
const { getInitials, getAvatarStyle } = useAvatar()

// Estado
const inscricoesRaw = ref<any[]>([])
const loading = ref(false)
const loadingExport = ref(false)

// Filtros
const filtroDataInicio = ref<Date | null>(null)
const filtroDataFim = ref<Date | null>(null)
const filtroTurno = ref<string | null>(null)
const filtroStatus = ref<string | null>(null)

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

const turnoOptions = [
  { label: 'Todos', value: null },
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
]

const statusOptions = [
  { label: 'Todos', value: null },
  { label: 'Atendido', value: 'atendido' },
  { label: 'Na Fila', value: 'na_fila' },
  { label: 'Não Atendido', value: 'nao_atendido' },
  { label: 'Não Compareceu', value: 'nao_compareceu' }
]

// Computed - processa os dados para exibir status correto
const inscricoes = computed(() => {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  return inscricoesRaw.value.map(item => {
    const dataRefeicao = item.refeicao?.data ? new Date(item.refeicao.data) : null
    if (dataRefeicao) dataRefeicao.setHours(0, 0, 0, 0)

    let statusFinal = item.status
    let statusLabel = ''
    let statusIcon = ''
    let statusColor = ''

    // Lógica de status baseada na data
    if (item.status === 'aprovado') {
      statusFinal = 'atendido'
      statusLabel = 'Atendido'
      statusIcon = 'pi pi-check-circle'
      statusColor = 'text-emerald-600'
    } else if (item.status === 'rejeitado') {
      statusFinal = 'nao_compareceu'
      statusLabel = 'Não Compareceu'
      statusIcon = 'pi pi-times-circle'
      statusColor = 'text-red-500'
    } else if (item.status === 'inscrito') {
      // Se a data já passou, é "não atendido"
      if (dataRefeicao && dataRefeicao < hoje) {
        statusFinal = 'nao_atendido'
        statusLabel = 'Não Atendido'
        statusIcon = 'pi pi-minus-circle'
        statusColor = 'text-slate-400'
      } else {
        statusFinal = 'na_fila'
        statusLabel = 'Na Fila'
        statusIcon = 'pi pi-clock'
        statusColor = 'text-amber-500'
      }
    }

    return {
      ...item,
      statusFinal,
      statusLabel,
      statusIcon,
      statusColor
    }
  }).filter(item => {
    // Aplicar filtro de status
    if (!filtroStatus.value) return true
    if (filtroStatus.value === 'atendido') return item.statusFinal === 'atendido'
    if (filtroStatus.value === 'na_fila') return item.statusFinal === 'na_fila'
    if (filtroStatus.value === 'nao_atendido') return item.statusFinal === 'nao_atendido'
    if (filtroStatus.value === 'nao_compareceu') return item.statusFinal === 'nao_compareceu'
    return true
  })
})

// Estatísticas
const estatisticas = computed(() => {
  const total = inscricoes.value.length
  const atendidos = inscricoes.value.filter(i => i.statusFinal === 'atendido').length
  const naoAtendidos = inscricoes.value.filter(i => i.statusFinal === 'nao_atendido').length
  const naoCompareceram = inscricoes.value.filter(i => i.statusFinal === 'nao_compareceu').length
  const naFila = inscricoes.value.filter(i => i.statusFinal === 'na_fila').length

  return { total, atendidos, naoAtendidos, naoCompareceram, naFila }
})

// Métodos
const carregarDados = async () => {
  loading.value = true
  try {
    const filtros: any = {}
    if (filtroDataInicio.value) {
      filtros.data_inicio = filtroDataInicio.value.toISOString().split('T')[0]
    }
    if (filtroDataFim.value) {
      filtros.data_fim = filtroDataFim.value.toISOString().split('T')[0]
    }
    if (filtroTurno.value) filtros.turno = filtroTurno.value

    const { data } = await adminExtrasService.listar(filtros)
    inscricoesRaw.value = data
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar dados' })
  } finally {
    loading.value = false
  }
}

const exportarExcel = async () => {
  loadingExport.value = true
  try {
    const filtros: any = {}
    if (filtroDataInicio.value) {
      filtros.data_inicio = filtroDataInicio.value.toISOString().split('T')[0]
    }
    if (filtroDataFim.value) {
      filtros.data_fim = filtroDataFim.value.toISOString().split('T')[0]
    }
    if (filtroTurno.value) filtros.turno = filtroTurno.value
    if (filtroStatus.value) filtros.status = filtroStatus.value

    await adminExtrasService.exportarExcel(filtros)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Relatório exportado!' })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao exportar' })
  } finally {
    loadingExport.value = false
  }
}

const limparFiltros = () => {
  filtroDataInicio.value = null
  filtroDataFim.value = null
  filtroTurno.value = null
  filtroStatus.value = null
  carregarDados()
}

const formatarData = (dataString: string) => {
  if (!dataString) return '-'
  const data = new Date(dataString)
  if (isNaN(data.getTime())) return dataString
  return data.toLocaleDateString('pt-BR')
}

const formatarDataHora = (dataString: string) => {
  if (!dataString) return '-'
  const data = new Date(dataString)
  if (isNaN(data.getTime())) return dataString
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
         data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  // Carregar últimos 30 dias por padrão
  const hoje = new Date()
  const trintaDiasAtras = new Date()
  trintaDiasAtras.setDate(hoje.getDate() - 30)
  filtroDataInicio.value = trintaDiasAtras
  filtroDataFim.value = hoje
  carregarDados()
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader
      title="Relatório de Extras"
      subtitle="Histórico completo de refeições extras."
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Relatórios' }, { label: 'Extras' }]"
    />

    <!-- Cards de Resumo -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
          <i class="pi pi-list text-xl text-slate-600"></i>
        </div>
        <div>
          <p class="text-2xl font-black text-slate-800">{{ estatisticas.total }}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase">Total</p>
        </div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
          <i class="pi pi-check-circle text-xl text-emerald-600"></i>
        </div>
        <div>
          <p class="text-2xl font-black text-emerald-600">{{ estatisticas.atendidos }}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase">Atendidos</p>
        </div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
          <i class="pi pi-clock text-xl text-amber-500"></i>
        </div>
        <div>
          <p class="text-2xl font-black text-amber-500">{{ estatisticas.naFila }}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase">Na Fila</p>
        </div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
          <i class="pi pi-minus-circle text-xl text-slate-400"></i>
        </div>
        <div>
          <p class="text-2xl font-black text-slate-500">{{ estatisticas.naoAtendidos }}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase">Não Atendidos</p>
        </div>
      </div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
          <i class="pi pi-times-circle text-xl text-red-500"></i>
        </div>
        <div>
          <p class="text-2xl font-black text-red-500">{{ estatisticas.naoCompareceram }}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase">Não Compareceram</p>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <div class="flex flex-wrap gap-4 items-end">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold text-slate-500">Data Início</label>
          <Calendar v-model="filtroDataInicio" dateFormat="dd/mm/yy" showIcon class="!rounded-xl" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold text-slate-500">Data Fim</label>
          <Calendar v-model="filtroDataFim" dateFormat="dd/mm/yy" showIcon class="!rounded-xl" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold text-slate-500">Turno</label>
          <Select v-model="filtroTurno" :options="turnoOptions" optionLabel="label" optionValue="value" placeholder="Todos" class="w-36" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold text-slate-500">Status</label>
          <Select v-model="filtroStatus" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Todos" class="w-40" @change="carregarDados" />
        </div>
        <Button icon="pi pi-search" severity="primary" @click="carregarDados" class="!rounded-xl" title="Filtrar" />
        <Button icon="pi pi-times" severity="secondary" text @click="limparFiltros" title="Limpar filtros" />
        <div class="flex-1"></div>
        <Button
          label="Exportar"
          icon="pi pi-file-excel"
          severity="success"
          @click="exportarExcel"
          :loading="loadingExport"
          class="!rounded-xl"
        />
      </div>
    </div>

    <!-- Tabela -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <DataTable
        v-model:filters="filters"
        :value="inscricoes"
        :loading="loading"
        dataKey="id"
        paginator
        :rows="15"
        :globalFilterFields="['user.nome', 'user.matricula']"
        sortField="refeicao.data"
        :sortOrder="-1"
      >
        <template #header>
          <div class="flex justify-between items-center">
            <span class="text-lg font-bold text-slate-700">Histórico de Refeições Extras</span>
            <InputText v-model="filters['global'].value" placeholder="Buscar estudante..." class="!rounded-xl" />
          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center justify-center py-12 text-slate-400">
            <i class="pi pi-inbox text-6xl mb-4 text-slate-200"></i>
            <p class="text-lg font-semibold text-slate-500">Nenhum registro encontrado</p>
            <p class="text-sm text-slate-400 mt-1">Ajuste os filtros ou selecione outro período.</p>
          </div>
        </template>

        <!-- Coluna: Estudante -->
        <Column field="user.nome" header="Estudante" :sortable="true" style="min-width: 200px">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <Avatar
                v-if="data.user?.foto"
                :image="data.user.foto"
                shape="circle"
                size="normal"
              />
              <Avatar
                v-else
                :label="getInitials(data.user?.nome)"
                shape="circle"
                size="normal"
                :style="getAvatarStyle(data.user?.nome)"
              />
              <div>
                <p class="font-bold text-slate-700 leading-tight">{{ data.user?.nome }}</p>
                <p class="text-xs text-slate-400 font-mono">{{ data.user?.matricula }}</p>
              </div>
            </div>
          </template>
        </Column>

        <!-- Coluna: Data -->
        <Column header="Data" :sortable="true" sortField="refeicao.data" style="width: 120px">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <i class="pi pi-calendar text-slate-400"></i>
              <span class="font-semibold text-slate-700">{{ formatarData(data.refeicao?.data) }}</span>
            </div>
          </template>
        </Column>

        <!-- Coluna: Turno -->
        <Column header="Turno" style="width: 100px">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <i :class="[
                data.refeicao?.turno === 'almoco' ? 'pi pi-sun text-amber-500' : 'pi pi-moon text-blue-500',
                'text-lg'
              ]"></i>
              <span class="text-sm font-medium text-slate-600">{{ data.refeicao?.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</span>
            </div>
          </template>
        </Column>

        <!-- Coluna: Inscrito em -->
        <Column header="Inscrito em" style="width: 140px">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <i class="pi pi-clock text-slate-400"></i>
              <span class="text-sm text-slate-600">{{ formatarDataHora(data.inscrito_em) }}</span>
            </div>
          </template>
        </Column>

        <!-- Coluna: Status -->
        <Column header="Status" style="width: 160px">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <i :class="[data.statusIcon, data.statusColor, 'text-lg']"></i>
              <span :class="['font-semibold', data.statusColor]">{{ data.statusLabel }}</span>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
