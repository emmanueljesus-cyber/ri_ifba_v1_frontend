<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { adminExtrasService, type FilaExtraAdmin, type EstatisticasExtras } from '../../services/adminExtras'
import { useAvatar } from '../../composables/useAvatar'
import PageHeader from '../../components/common/PageHeader.vue'

// Locale pt-BR para DatePicker
const ptBR = {
  firstDayOfWeek: 0,
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
  monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  today: 'Hoje',
  clear: 'Limpar'
}
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Card from 'primevue/card'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Calendar from 'primevue/calendar'
import Avatar from 'primevue/avatar'

const toast = useToast()
const router = useRouter()
const { getInitials, getAvatarStyle } = useAvatar()

// Estado
const inscricoes = ref<FilaExtraAdmin[]>([])
const inscricoesHoje = ref<FilaExtraAdmin[]>([])
const estatisticasHojeBackend = ref<{total_inscritos: number, aprovados: number, aguardando: number, rejeitados: number} | null>(null)
const estatisticas = ref<EstatisticasExtras | null>(null)
const loading = ref(false)
const loadingHoje = ref(false)
const loadingEstatisticas = ref(false)

const filtersHoje = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

const filtersHistorico = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

// Filtro de turno para hoje
const turnoHojeFiltro = ref<'almoco' | 'jantar'>('almoco')

// Filtros
const filtroData = ref<Date | null>(null)
const filtroTurno = ref<string | null>(null)
const filtroStatus = ref<string | null>(null)

// Dialogs
const displayRejeitar = ref(false)
const motivoRejeicao = ref('')
const inscricaoSelecionada = ref<FilaExtraAdmin | null>(null)
const displayRelatorio = ref(false)

// Controle de Tabs
const tabAtiva = ref('0')

// Filtros para relatório
const relatorioDataInicio = ref<Date | null>(null)
const relatorioDataFim = ref<Date | null>(null)
const relatorioTurno = ref<string | null>(null)
const loadingExport = ref(false)

// Seleção para ações em lote
const inscricoesSelecionadas = ref<FilaExtraAdmin[]>([])

const turnoOptions = [
  { label: 'Todos', value: null },
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
]

const statusOptions = [
  { label: 'Todos', value: null },
  { label: 'Aguardando', value: 'inscrito' },
  { label: 'Aprovado', value: 'aprovado' },
  { label: 'Rejeitado', value: 'rejeitado' }
]

// Computed
// Helper para extrair turno (pode vir de refeicao.turno ou diretamente de turno)
const getTurno = (inscricao: FilaExtraAdmin): string => {
  return inscricao.refeicao?.turno || (inscricao as any).turno || ''
}

const inscricoesHojeFiltradas = computed(() => {
  return inscricoesHoje.value.filter(i => getTurno(i) === turnoHojeFiltro.value)
})

const estatisticasHoje = computed(() => {
  const lista = inscricoesHojeFiltradas.value
  if (!lista.length) return { total: 0, confirmados: 0, aguardando: 0, rejeitados: 0 }
  return {
    total: lista.length,
    confirmados: lista.filter(i => i.status === 'aprovado').length,
    aguardando: lista.filter(i => i.status === 'inscrito').length,
    rejeitados: lista.filter(i => i.status === 'rejeitado').length
  }
})

const estatisticasAlmoco = computed(() => {
  const lista = inscricoesHoje.value.filter(i => getTurno(i) === 'almoco')
  return {
    total: lista.length,
    aguardando: lista.filter(i => i.status === 'inscrito').length
  }
})

const estatisticasJantar = computed(() => {
  const lista = inscricoesHoje.value.filter(i => getTurno(i) === 'jantar')
  return {
    total: lista.length,
    aguardando: lista.filter(i => i.status === 'inscrito').length
  }
})

// Métodos
const carregarInscricoes = async () => {
  loading.value = true
  try {
    const filtros: any = {}
    if (filtroData.value) {
      filtros.data = filtroData.value.toISOString().split('T')[0]
    }
    if (filtroTurno.value) filtros.turno = filtroTurno.value
    if (filtroStatus.value) filtros.status = filtroStatus.value

    const { data } = await adminExtrasService.listar(filtros)
    inscricoes.value = data
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar inscrições' })
  } finally {
    loading.value = false
  }
}

const carregarInscricoesHoje = async () => {
  loadingHoje.value = true
  try {
    const { data, meta } = await adminExtrasService.listarHoje()
    inscricoesHoje.value = data
    // Salvar estatísticas do backend (inclui rejeitados que não vêm na lista)
    if (meta?.estatisticas) {
      estatisticasHojeBackend.value = meta.estatisticas
    }
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar inscrições do dia' })
  } finally {
    loadingHoje.value = false
  }
}

const carregarEstatisticas = async () => {
  loadingEstatisticas.value = true
  try {
    estatisticas.value = await adminExtrasService.estatisticas()
  } catch (err) {
    console.error('Erro ao carregar estatísticas:', err)
  } finally {
    loadingEstatisticas.value = false
  }
}

const confirmar = async (inscricao: FilaExtraAdmin) => {
  try {
    await adminExtrasService.aprovar(inscricao.id)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Inscrição confirmada' })
    carregarInscricoesHoje()
    carregarInscricoes()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao confirmar inscrição' })
  }
}

const abrirDialogRejeitar = (inscricao: FilaExtraAdmin) => {
  inscricaoSelecionada.value = inscricao
  motivoRejeicao.value = ''
  displayRejeitar.value = true
}

const confirmarRejeicao = async () => {
  if (!inscricaoSelecionada.value) return
  try {
    await adminExtrasService.rejeitar(inscricaoSelecionada.value.id, motivoRejeicao.value)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Inscrição rejeitada' })
    displayRejeitar.value = false
    carregarInscricoesHoje()
    carregarInscricoes()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao rejeitar inscrição' })
  }
}

const confirmarPresenca = async (inscricao: FilaExtraAdmin) => {
  try {
    await adminExtrasService.confirmarPresenca(inscricao.id)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Presença confirmada' })
    carregarInscricoesHoje()
    carregarInscricoes()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao confirmar presença' })
  }
}

const remover = async (inscricao: FilaExtraAdmin) => {
  try {
    await adminExtrasService.remover(inscricao.id)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Inscrição removida' })
    carregarInscricoesHoje()
    carregarInscricoes()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao remover inscrição' })
  }
}

const confirmarSelecionados = async () => {
  if (!inscricoesSelecionadas.value.length) return
  const ids = inscricoesSelecionadas.value
    .filter(i => i.status === 'inscrito')
    .map(i => i.id)

  if (!ids.length) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Nenhuma inscrição pendente selecionada' })
    return
  }

  try {
    const result = await adminExtrasService.aprovarLote(ids)
    toast.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: `${result.aprovados} inscrições confirmadas`
    })
    inscricoesSelecionadas.value = []
    carregarInscricoesHoje()
    carregarInscricoes()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao confirmar em lote' })
  }
}

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'aprovado': return 'success'
    case 'rejeitado': return 'danger'
    case 'inscrito': return 'warn'
    default: return 'secondary'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'aprovado': return 'Confirmado'
    case 'rejeitado': return 'Rejeitado'
    case 'inscrito': return 'Aguardando'
    default: return status
  }
}

const formatarTurno = (turno: string) => {
  return turno === 'almoco' ? 'Almoço' : 'Jantar'
}

const abrirRelatorio = () => {
  router.push('/admin/relatorios')
}

const formatarDataHora = (dataString: string) => {
  if (!dataString) return '-'
  
  // Se for apenas uma string de hora (HH:mm:ss ou HH:mm)
  if (dataString.includes(':') && !dataString.includes('-') && !dataString.includes('T')) {
    return dataString.substring(0, 5) // Retorna HH:mm
  }

  // Se já estiver no formato brasileiro DD/MM/YYYY HH:mm:ss
  if (dataString.includes('/') && dataString.includes(':')) {
    return dataString.substring(0, 16) // Retorna DD/MM/YYYY HH:mm
  }

  const data = new Date(dataString)
  if (isNaN(data.getTime())) return dataString

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const exportarRelatorioExcel = async () => {
  loadingExport.value = true
  try {
    const params: any = {}
    if (relatorioDataInicio.value) {
      params.data_inicio = relatorioDataInicio.value.toISOString().split('T')[0]
    }
    if (relatorioDataFim.value) {
      params.data_fim = relatorioDataFim.value.toISOString().split('T')[0]
    }
    if (relatorioTurno.value) {
      params.turno = relatorioTurno.value
    }

    await adminExtrasService.exportarRelatorio(params)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Relatório exportado com sucesso!' })
    displayRelatorio.value = false
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao exportar relatório' })
  } finally {
    loadingExport.value = false
  }
}

onMounted(() => {
  carregarInscricoesHoje()
  carregarInscricoes()
  carregarEstatisticas()
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <!-- Cabeçalho -->
    <PageHeader
      title="Fila de Extras"
      subtitle="Gerencie as inscrições de estudantes não-bolsistas para refeições extras."
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Fila de Extras' }]"
    />

    <div class="flex justify-end -mt-16 mb-4 relative z-10">
      <Button
        label="Gerar Relatório"
        icon="pi pi-file-excel"
        severity="success"
        class="!rounded-xl shadow-md"
        @click="abrirRelatorio"
      />
    </div>

    <!-- Seletor de Turno B -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar Turno</label>
      <SelectButton
        v-model="turnoHojeFiltro"
        :options="[
          { label: 'Almoço', value: 'almoco', icon: 'pi pi-sun', total: estatisticasAlmoco.total },
          { label: 'Jantar', value: 'jantar', icon: 'pi pi-moon', total: estatisticasJantar.total }
        ]"
        optionLabel="label"
        optionValue="value"
        aria-labelledby="basic"
        class="w-full"
      >
        <template #option="slotProps">
          <div class="flex items-center gap-2">
            <i :class="slotProps.option.icon"></i>
            <span class="font-bold">{{ slotProps.option.label }} ({{ slotProps.option.total }})</span>
          </div>
        </template>
      </SelectButton>
    </div>

    <!-- Cards de Estatísticas do Turno Selecionado -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
        <p class="text-3xl font-black text-primary-600 lato-black">{{ estatisticasHoje.total }}</p>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Inscritos ({{ turnoHojeFiltro === 'almoco' ? 'Almoço' : 'Jantar' }})</p>
      </div>
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
        <p class="text-3xl font-black text-amber-600 lato-black">{{ estatisticasHoje.aguardando }}</p>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Aguardando</p>
      </div>
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
        <p class="text-3xl font-black text-primary-500 lato-black">{{ estatisticasHoje.confirmados }}</p>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Confirmados</p>
      </div>
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
        <p class="text-3xl font-black text-red-600 lato-black">{{ estatisticasHojeBackend?.rejeitados || 0 }}</p>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Rejeitados (Total)</p>
      </div>
    </div>

    <Tabs v-model:value="tabAtiva">
      <!-- Navegação de Tabs -->
      <div class="flex bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-slate-200 w-fit mb-6">
        <SelectButton
          v-model="tabAtiva"
          :options="[
            { label: 'Inscrições de Hoje', value: '0', icon: 'pi pi-list', count: inscricoesHoje.length },
            { label: 'Histórico', value: '1', icon: 'pi pi-history' }
          ]"
          optionLabel="label"
          optionValue="value"
          :allowEmpty="false"
          class="custom-select-button"
        >
          <template #option="slotProps">
            <div class="flex items-center gap-2 px-2">
              <i :class="slotProps.option.icon"></i>
              <span class="text-xs font-bold uppercase tracking-tight">{{ slotProps.option.label }}</span>
              <span v-if="slotProps.option.count !== undefined" class="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">{{ slotProps.option.count }}</span>
            </div>
          </template>
        </SelectButton>
      </div>

      <TabPanels>
        <!-- Tab: Inscrições de Hoje -->
        <TabPanel value="0">
          <div class="card bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-slate-700">
                Fila do {{ turnoHojeFiltro === 'almoco' ? 'Almoço' : 'Jantar' }}
              </h3>
              <Button
                v-if="inscricoesSelecionadas.length > 0"
                :label="`Confirmar Selecionados (${inscricoesSelecionadas.filter(i => i.status === 'inscrito').length})`"
                icon="pi pi-check-circle"
                severity="success"
                @click="confirmarSelecionados"
              />
            </div>

              <DataTable
                v-model:filters="filtersHoje"
                :value="inscricoesHojeFiltradas"
                :loading="loadingHoje"
                v-model:selection="inscricoesSelecionadas"
                dataKey="id"
                paginator
                :rows="10"
                :globalFilterFields="['user.nome', 'user.matricula']"
                emptyMessage="Nenhuma inscrição para este turno"
              >
                <template #header>
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-lg font-black text-slate-700 uppercase tracking-wider">Fila do Turno</span>
                    <InputText v-model="filtersHoje['global'].value" placeholder="Buscar aluno..." />
                  </div>
                </template>
                <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
                <Column field="posicao" header="Posição" :sortable="true">
                  <template #body="{ data }">
                    <span v-if="data.posicao && data.status === 'inscrito'" class="font-bold text-lg text-emerald-600">#{{ data.posicao }}</span>
                    <span v-else-if="data.status === 'aprovado'" class="text-sm text-green-600 font-medium">
                      <i class="pi pi-check-circle mr-1"></i>OK
                    </span>
                    <span v-else class="text-slate-400">-</span>
                  </template>
                </Column>
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
                    <div class="flex flex-col">
                      <p class="font-bold text-slate-700 leading-tight">{{ data.user.nome }}</p>
                      <p class="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{{ data.user.matricula }}</p>
                    </div>
                  </div>
                </template>
              </Column>
              <Column field="inscrito_em" header="Inscrito em" :sortable="true">
                <template #body="{ data }">
                  {{ formatarDataHora(data.inscrito_em) }}
                </template>
              </Column>
              <Column field="status" header="Status" :sortable="true">
                <template #body="{ data }">
                  <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
                </template>
              </Column>
              <Column header="Ações" headerStyle="width: 10rem">
                <template #body="{ data }">
                  <div class="flex gap-1">
                    <Button
                      v-if="data.status === 'inscrito'"
                      icon="pi pi-check"
                      severity="success"
                      variant="outlined"
                      rounded
                      title="Confirmar"
                      @click="confirmar(data)"
                      class="!border-emerald-200"
                    />
                    <Button
                      v-if="data.status === 'inscrito'"
                      icon="pi pi-times"
                      severity="danger"
                      variant="outlined"
                      rounded
                      title="Rejeitar"
                      @click="abrirDialogRejeitar(data)"
                      class="!border-red-200"
                    />
                    <Button
                      v-if="data.status === 'aprovado'"
                      icon="pi pi-user-check"
                      severity="info"
                      variant="outlined"
                      rounded
                      title="Registrar Presença"
                      @click="confirmarPresenca(data)"
                      class="!border-blue-200"
                    />
                    <Button
                      icon="pi pi-trash"
                      severity="secondary"
                      variant="outlined"
                      rounded
                      title="Remover"
                      @click="remover(data)"
                      class="!border-slate-200"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </TabPanel>

        <!-- Tab: Histórico Geral -->
        <TabPanel value="1">
          <div class="card bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <!-- Filtros -->
            <div class="flex gap-4 mb-4 flex-wrap">
              <div class="flex flex-col gap-1">
                <label class="text-sm text-slate-600">Data</label>
                <Calendar v-model="filtroData" dateFormat="dd/mm/yy" showIcon :locale="ptBR" @update:modelValue="carregarInscricoes" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm text-slate-600">Turno</label>
                <Select v-model="filtroTurno" :options="turnoOptions" optionLabel="label" optionValue="value" placeholder="Todos" @update:modelValue="carregarInscricoes" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm text-slate-600">Status</label>
                <Select v-model="filtroStatus" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Todos" @update:modelValue="carregarInscricoes" />
              </div>
              <div class="flex items-end">
                <Button label="Limpar Filtros" severity="secondary" text @click="filtroData = null; filtroTurno = null; filtroStatus = null; carregarInscricoes()" />
              </div>
            </div>

            <DataTable
              v-model:filters="filtersHistorico"
              :value="inscricoes"
              :loading="loading"
              paginator
              :rows="15"
              :globalFilterFields="['user.nome', 'user.matricula']"
              emptyMessage="Nenhuma inscrição encontrada"
            >
              <template #header>
                <div class="flex justify-between items-center mb-2">
                  <span class="text-lg font-black text-slate-700 uppercase tracking-wider">Histórico</span>
                  <InputText v-model="filtersHistorico['global'].value" placeholder="Buscar no histórico..." />
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
                    <div class="flex flex-col">
                      <p class="font-bold text-slate-700 leading-tight">{{ data.user.nome }}</p>
                      <p class="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{{ data.user.matricula }}</p>
                    </div>
                  </div>
                </template>
              </Column>
              <Column header="Refeição">
                <template #body="{ data }">
                  <div class="flex items-center gap-3" v-if="data.refeicao">
                    <div :class="data.refeicao.turno === 'almoco' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'" class="w-10 h-10 rounded-xl flex items-center justify-center">
                      <i :class="data.refeicao.turno === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'" class="text-xl"></i>
                    </div>
                    <div>
                      <p class="font-bold text-slate-800 leading-tight">{{ data.refeicao.data ? data.refeicao.data.split('-').reverse().join('/') : '-' }}</p>
                      <p class="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{{ data.refeicao.turno }}</p>
                    </div>
                  </div>
                </template>
              </Column>
              <Column field="status" header="Status" :sortable="true">
                <template #body="{ data }">
                  <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
                </template>
              </Column>
              <Column header="Ações" headerStyle="width: 8rem">
                <template #body="{ data }">
                  <div class="flex gap-1">
                    <Button
                      v-if="data.status === 'inscrito'"
                      icon="pi pi-check"
                      severity="success"
                      variant="outlined"
                      rounded
                      size="small"
                      title="Aprovar"
                      @click="confirmar(data)"
                      class="!border-emerald-200"
                    />
                    <Button
                      v-if="data.status === 'inscrito'"
                      icon="pi pi-times"
                      severity="danger"
                      variant="outlined"
                      rounded
                      size="small"
                      title="Rejeitar"
                      @click="abrirDialogRejeitar(data)"
                      class="!border-red-200"
                    />
                    <Button
                      icon="pi pi-trash"
                      severity="secondary"
                      variant="outlined"
                      rounded
                      size="small"
                      title="Remover"
                      @click="remover(data)"
                      class="!border-slate-200"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <!-- Dialog: Rejeitar Inscrição -->
    <Dialog v-model:visible="displayRejeitar" header="Rejeitar Inscrição" modal :style="{ width: '400px' }">
      <div class="space-y-4">
        <p class="text-slate-600">
          Você está prestes a rejeitar a inscrição de
          <strong>{{ inscricaoSelecionada?.user?.nome }}</strong>.
        </p>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Motivo (opcional)</label>
          <InputText v-model="motivoRejeicao" class="w-full" placeholder="Informe o motivo da rejeição" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="displayRejeitar = false" />
        <Button label="Rejeitar" severity="danger" @click="confirmarRejeicao" />
      </template>
    </Dialog>

  </div>
</template>

<style scoped>
.custom-select-button :deep(.p-togglebutton) {
  border: 0;
  background: transparent;
  color: #64748b;
  font-weight: 700;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
}

.custom-select-button :deep(.p-togglebutton.p-togglebutton-selected) {
  background: #f1f5f9;
  color: #1e293b;
}

.custom-select-button :deep(.p-togglebutton:not(.p-togglebutton-selected):hover) {
  background: #f8fafc;
}
</style>
