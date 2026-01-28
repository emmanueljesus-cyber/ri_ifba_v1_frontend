<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { FilterMatchMode } from '@primevue/core/api'
import api from '../../services/api'
import { useAvatar } from '../../composables/useAvatar'
import PageHeader from '../../components/common/PageHeader.vue'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Avatar from 'primevue/avatar'
import Calendar from 'primevue/calendar'
import Select from 'primevue/select'

const toast = useToast()
const { getInitials, getAvatarStyle } = useAvatar()

// Estado
const bolsistas = ref<any[]>([])
const presencas = ref<any[]>([])
const loading = ref(false)
const loadingExport = ref(false)
const tabAtiva = ref<'bolsistas' | 'presencas'>('bolsistas')

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

const statusPresencaOptions = [
  { label: 'Todos', value: null },
  { label: 'Presente', value: 'presente' },
  { label: 'Falta Justificada', value: 'falta_justificada' },
  { label: 'Ausente', value: 'falta_injustificada' }
]

// Métodos
const carregarBolsistas = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/admin/bolsistas')
    bolsistas.value = data.data || []
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar bolsistas' })
  } finally {
    loading.value = false
  }
}

const carregarPresencas = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (filtroDataInicio.value) {
      params.data_inicio = filtroDataInicio.value.toISOString().split('T')[0]
    }
    if (filtroDataFim.value) {
      params.data_fim = filtroDataFim.value.toISOString().split('T')[0]
    }
    if (filtroTurno.value) params.turno = filtroTurno.value
    if (filtroStatus.value) params.status = filtroStatus.value

    const { data } = await api.get('/admin/presencas', { params })
    presencas.value = data.data || []
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar presenças' })
  } finally {
    loading.value = false
  }
}

const exportarBolsistas = async () => {
  loadingExport.value = true
  try {
    const response = await api.get('/admin/bolsistas/export', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `bolsistas_${new Date().toISOString().split('T')[0]}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Relatório exportado!' })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao exportar' })
  } finally {
    loadingExport.value = false
  }
}

const exportarPresencas = async () => {
  loadingExport.value = true
  try {
    const params: any = {}
    if (filtroDataInicio.value) {
      params.data_inicio = filtroDataInicio.value.toISOString().split('T')[0]
    }
    if (filtroDataFim.value) {
      params.data_fim = filtroDataFim.value.toISOString().split('T')[0]
    }
    if (filtroTurno.value) params.turno = filtroTurno.value
    if (filtroStatus.value) params.status = filtroStatus.value

    const response = await api.get('/admin/presencas/export', { params, responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `presencas_bolsistas_${new Date().toISOString().split('T')[0]}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
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
  carregarPresencas()
}

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'presente': return 'success'
    case 'falta_justificada': return 'info'
    case 'falta_injustificada':
    case 'ausente': return 'danger'
    default: return 'secondary'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'presente': return 'Presente'
    case 'falta_justificada': return 'Falta Justificada'
    case 'falta_injustificada':
    case 'ausente': return 'Ausente'
    default: return status
  }
}

const formatarData = (dataString: string) => {
  if (!dataString) return '-'
  const data = new Date(dataString)
  if (isNaN(data.getTime())) return dataString
  return data.toLocaleDateString('pt-BR')
}

const getDiasSemana = (dias: number[]) => {
  const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return dias?.map(d => nomes[d]).join(', ') || '-'
}

onMounted(() => {
  carregarBolsistas()
  // Configurar filtros padrão para presenças
  const hoje = new Date()
  const trintaDiasAtras = new Date()
  trintaDiasAtras.setDate(hoje.getDate() - 30)
  filtroDataInicio.value = trintaDiasAtras
  filtroDataFim.value = hoje
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader
      title="Relatório de Bolsistas"
      subtitle="Dados e histórico de presenças dos bolsistas."
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Relatórios' }, { label: 'Bolsistas' }]"
    />

    <!-- Tabs -->
    <div class="flex gap-2">
      <Button
        :label="'Lista de Bolsistas'"
        :severity="tabAtiva === 'bolsistas' ? 'primary' : 'secondary'"
        :outlined="tabAtiva !== 'bolsistas'"
        @click="tabAtiva = 'bolsistas'; carregarBolsistas()"
        class="!rounded-xl"
      />
      <Button
        :label="'Histórico de Presenças'"
        :severity="tabAtiva === 'presencas' ? 'primary' : 'secondary'"
        :outlined="tabAtiva !== 'presencas'"
        @click="tabAtiva = 'presencas'; carregarPresencas()"
        class="!rounded-xl"
      />
    </div>

    <!-- Tab: Lista de Bolsistas -->
    <template v-if="tabAtiva === 'bolsistas'">
      <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div class="flex justify-between items-center mb-4">
          <span class="text-lg font-bold text-slate-700">Bolsistas Ativos</span>
          <Button
            label="Exportar Excel"
            icon="pi pi-file-excel"
            severity="success"
            @click="exportarBolsistas"
            :loading="loadingExport"
            class="!rounded-xl"
          />
        </div>

        <DataTable
          v-model:filters="filters"
          :value="bolsistas"
          :loading="loading"
          dataKey="id"
          paginator
          :rows="15"
          :globalFilterFields="['user.nome', 'user.matricula', 'user.curso']"
        >
          <template #header>
            <div class="flex justify-end">
              <InputText v-model="filters['global'].value" placeholder="Buscar bolsista..." class="!rounded-xl" />
            </div>
          </template>

          <template #empty>
            <div class="flex flex-col items-center justify-center py-12 text-slate-400">
              <i class="pi pi-users text-6xl mb-4 text-slate-200"></i>
              <p class="text-lg font-semibold text-slate-500">Nenhum bolsista encontrado</p>
            </div>
          </template>

          <Column field="user.nome" header="Estudante" :sortable="true">
            <template #body="{ data }">
              <div class="flex items-center gap-3">
                <Avatar
                  v-if="data.user?.foto"
                  :image="data.user.foto"
                  shape="circle"
                />
                <Avatar
                  v-else
                  :label="getInitials(data.user?.nome)"
                  shape="circle"
                  :style="getAvatarStyle(data.user?.nome)"
                />
                <div>
                  <p class="font-bold text-slate-700">{{ data.user?.nome }}</p>
                  <p class="text-xs text-slate-400 font-mono">{{ data.user?.matricula }}</p>
                </div>
              </div>
            </template>
          </Column>

          <Column field="user.curso" header="Curso" :sortable="true">
            <template #body="{ data }">
              <span class="text-slate-600">{{ data.user?.curso || '-' }}</span>
            </template>
          </Column>

          <Column field="turno_refeicao" header="Turno" :sortable="true">
            <template #body="{ data }">
              <Tag
                :value="data.turno_refeicao === 'almoco' ? 'Almoço' : data.turno_refeicao === 'jantar' ? 'Jantar' : 'Ambos'"
                :severity="data.turno_refeicao === 'almoco' ? 'warn' : data.turno_refeicao === 'jantar' ? 'info' : 'secondary'"
              />
            </template>
          </Column>

          <Column header="Dias da Semana">
            <template #body="{ data }">
              <span class="text-sm text-slate-600">{{ getDiasSemana(data.dias_semana) }}</span>
            </template>
          </Column>

          <Column field="total_faltas" header="Faltas" :sortable="true">
            <template #body="{ data }">
              <span :class="data.total_faltas > 3 ? 'text-red-600 font-bold' : 'text-slate-600'">
                {{ data.total_faltas || 0 }}
              </span>
            </template>
          </Column>
        </DataTable>
      </div>
    </template>

    <!-- Tab: Histórico de Presenças -->
    <template v-if="tabAtiva === 'presencas'">
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
            <Select v-model="filtroTurno" :options="turnoOptions" optionLabel="label" optionValue="value" placeholder="Todos" class="w-40" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-slate-500">Status</label>
            <Select v-model="filtroStatus" :options="statusPresencaOptions" optionLabel="label" optionValue="value" placeholder="Todos" class="w-40" />
          </div>
          <Button label="Filtrar" icon="pi pi-search" @click="carregarPresencas" class="!rounded-xl" />
          <Button label="Limpar" icon="pi pi-times" severity="secondary" text @click="limparFiltros" />
          <div class="flex-1"></div>
          <Button
            label="Exportar Excel"
            icon="pi pi-file-excel"
            severity="success"
            @click="exportarPresencas"
            :loading="loadingExport"
            class="!rounded-xl"
          />
        </div>
      </div>

      <!-- Tabela de Presenças -->
      <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <DataTable
          v-model:filters="filters"
          :value="presencas"
          :loading="loading"
          dataKey="id"
          paginator
          :rows="15"
          :globalFilterFields="['user.nome', 'user.matricula']"
        >
          <template #header>
            <div class="flex justify-between items-center">
              <span class="text-lg font-bold text-slate-700">Histórico de Presenças</span>
              <InputText v-model="filters['global'].value" placeholder="Buscar..." class="!rounded-xl" />
            </div>
          </template>

          <template #empty>
            <div class="flex flex-col items-center justify-center py-12 text-slate-400">
              <i class="pi pi-inbox text-6xl mb-4 text-slate-200"></i>
              <p class="text-lg font-semibold text-slate-500">Nenhum registro encontrado</p>
              <p class="text-sm text-slate-400 mt-1">Ajuste os filtros ou selecione outro período.</p>
            </div>
          </template>

          <Column field="user.nome" header="Bolsista" :sortable="true">
            <template #body="{ data }">
              <div class="flex items-center gap-3">
                <Avatar
                  :label="getInitials(data.user?.nome)"
                  shape="circle"
                  :style="getAvatarStyle(data.user?.nome)"
                />
                <div>
                  <p class="font-bold text-slate-700">{{ data.user?.nome }}</p>
                  <p class="text-xs text-slate-400 font-mono">{{ data.user?.matricula }}</p>
                </div>
              </div>
            </template>
          </Column>

          <Column header="Data/Turno">
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <i :class="data.refeicao?.turno === 'almoco' ? 'pi pi-sun text-amber-500' : 'pi pi-moon text-blue-500'"></i>
                <div>
                  <p class="font-semibold text-slate-700">{{ formatarData(data.refeicao?.data) }}</p>
                  <p class="text-xs text-slate-400 uppercase">{{ data.refeicao?.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</p>
                </div>
              </div>
            </template>
          </Column>

          <Column field="status_da_presenca" header="Status" :sortable="true">
            <template #body="{ data }">
              <Tag :value="getStatusLabel(data.status_da_presenca)" :severity="getStatusSeverity(data.status_da_presenca)" />
            </template>
          </Column>

          <Column field="registrado_em" header="Registrado em" :sortable="true">
            <template #body="{ data }">
              <span class="text-sm text-slate-600">{{ formatarData(data.registrado_em) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </div>
</template>
