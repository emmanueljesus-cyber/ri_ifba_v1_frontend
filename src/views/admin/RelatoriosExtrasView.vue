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
import Chart from 'primevue/chart'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import AutoComplete from 'primevue/autocomplete'
import Skeleton from 'primevue/skeleton'

const toast = useToast()
const { getInitials, getAvatarStyle } = useAvatar()

const inscricoesRaw = ref<any[]>([])
const loading = ref(false)
const loadingExport = ref(false)
const activeTab = ref(0)
const filtroDataInicio = ref<Date | null>(null)
const filtroDataFim = ref<Date | null>(null)
const filtroTurno = ref<string | null>(null)
const filtroStatus = ref<string | null>(null)
const filtroUsuario = ref<any>(null) // Pode ser objeto completo do usuário
const filters = ref({ global: { value: null, matchMode: FilterMatchMode.CONTAINS } })

const turnoOptions = [{ label: 'Todos', value: null }, { label: 'Almoço', value: 'almoco' }, { label: 'Jantar', value: 'jantar' }]
const statusOptions = [{ label: 'Todos', value: null }, { label: 'Atendido', value: 'atendido' }, { label: 'Na Fila', value: 'na_fila' }, { label: 'Não Atendido', value: 'nao_atendido' }, { label: 'Não Compareceu', value: 'nao_compareceu' }]

const inscricoes = computed(() => {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return inscricoesRaw.value.map(item => {
    const dataRef = item.refeicao?.data ? new Date(item.refeicao.data) : null
    if (dataRef) dataRef.setHours(0, 0, 0, 0)
    let statusFinal = 'na_fila', statusLabel = 'Na Fila', statusIcon = 'pi pi-clock', statusColor = 'text-amber-500'
    if (item.status === 'aprovado') { statusFinal = 'atendido'; statusLabel = 'Atendido'; statusIcon = 'pi pi-check-circle'; statusColor = 'text-emerald-600' }
    else if (item.status === 'rejeitado') { statusFinal = 'nao_compareceu'; statusLabel = 'Não Compareceu'; statusIcon = 'pi pi-times-circle'; statusColor = 'text-red-500' }
    else if (item.status === 'inscrito' && dataRef && dataRef < hoje) { statusFinal = 'nao_atendido'; statusLabel = 'Não Atendido'; statusIcon = 'pi pi-minus-circle'; statusColor = 'text-slate-400' }
    return { ...item, statusFinal, statusLabel, statusIcon, statusColor, diaSemana: dataRef ? dias[dataRef.getDay()] : '-' }
  })
  .filter(item => !filtroStatus.value || item.statusFinal === filtroStatus.value)
  .filter(item => !filtroTurno.value || item.refeicao?.turno === filtroTurno.value)
})

const estatisticas = computed(() => {
  const t = inscricoes.value.length, a = inscricoes.value.filter(i => i.statusFinal === 'atendido').length
  const na = inscricoes.value.filter(i => i.statusFinal === 'nao_atendido').length, nc = inscricoes.value.filter(i => i.statusFinal === 'nao_compareceu').length
  const nf = inscricoes.value.filter(i => i.statusFinal === 'na_fila').length
  return { total: t, atendidos: a, naoAtendidos: na, naoCompareceram: nc, naFila: nf, taxa: t > 0 ? ((a / t) * 100).toFixed(1) : '0' }
})

const rankingUsuarios = computed(() => {
  const c: Record<string, any> = {}
  inscricoes.value.forEach(i => { 
    if (!i.user?.id) return; 
    if (!c[i.user.id]) c[i.user.id] = { 
      id: i.user.id, // <--- ADICIONADO: ID explícito aqui
      nome: i.user.nome, 
      matricula: i.user.matricula, 
      foto: i.user.foto, 
      total: 0, 
      atendidos: 0 
    }; 
    c[i.user.id].total++; 
    if (i.statusFinal === 'atendido') c[i.user.id].atendidos++ 
  })
  return Object.values(c).sort((a: any, b: any) => b.total - a.total).slice(0, 10)
})

const usuariosUnicos = computed(() => {
  const u = new Map(); inscricoesRaw.value.forEach(i => { if (i.user?.id && !u.has(i.user.id)) u.set(i.user.id, { id: i.user.id, nome: i.user.nome, matricula: i.user.matricula }) })
  return Array.from(u.values())
})

const usuariosAutoComplete = ref<any[]>([])
const filtrarUsuarios = (event: any) => {
  const query = event.query.toLowerCase()
  usuariosAutoComplete.value = usuariosUnicos.value.filter(u => 
    u.nome.toLowerCase().includes(query) || u.matricula.toLowerCase().includes(query)
  )
}

const inscricoesPorUsuario = computed(() => {
  if (!filtroUsuario.value) return inscricoes.value
  const userId = typeof filtroUsuario.value === 'object' ? filtroUsuario.value.id : filtroUsuario.value
  return inscricoes.value.filter(i => i.user?.id === userId)
})

const estatsDiaSemana = computed(() => {
  const diasMap = new Map<number, { dia: string, total: number, atendidos: number, almoco: number, jantar: number }>()
  const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  
  // Filtrar apenas dados dentro do período selecionado
  const dataInicioTimestamp = filtroDataInicio.value ? new Date(filtroDataInicio.value).setHours(0, 0, 0, 0) : null
  const dataFimTimestamp = filtroDataFim.value ? new Date(filtroDataFim.value).setHours(23, 59, 59, 999) : null

  inscricoes.value.forEach(i => {
    const d = i.refeicao?.data ? new Date(i.refeicao.data) : null
    if (!d) return
    
    // Verificar se a data está dentro do período filtrado
    const dataTimestamp = d.getTime()
    if (dataInicioTimestamp && dataTimestamp < dataInicioTimestamp) return
    if (dataFimTimestamp && dataTimestamp > dataFimTimestamp) return

    const idx = d.getDay()

    // ✅ FILTRAR APENAS DIAS ÚTEIS: Segunda (1) a Sexta (5)
    if (idx === 0 || idx === 6) return // Ignora Domingo (0) e Sábado (6)

    if (!diasMap.has(idx)) {
      diasMap.set(idx, { dia: diasNomes[idx] ?? '', total: 0, atendidos: 0, almoco: 0, jantar: 0 })
    }
    
    const diaStats = diasMap.get(idx)!
    diaStats.total++
    if (i.statusFinal === 'atendido') diaStats.atendidos++
    i.refeicao?.turno === 'almoco' ? diaStats.almoco++ : diaStats.jantar++
  })
  
  // Retornar apenas os dias que têm dados, ordenados por dia da semana
  return Array.from(diasMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([_, stats]) => stats)
})

const chartStatusData = computed(() => {
  const dados = [estatisticas.value.atendidos, estatisticas.value.naFila, estatisticas.value.naoAtendidos, estatisticas.value.naoCompareceram]
  const total = dados.reduce((a, b) => a + b, 0)
  const labels = ['Atendidos', 'Na Fila', 'Não Atendidos', 'Não Compareceram'].map((label, i) => {
    const valor = dados[i] || 0
    const percentual = total > 0 ? ((valor / total) * 100).toFixed(1) : '0'
    return `${label}: ${valor} (${percentual}%)`
  })
  return {
    labels,
    datasets: [{ data: dados, backgroundColor: ['#10b981', '#f59e0b', '#94a3b8', '#ef4444'] }]
  }
})

const chartTurnoData = computed(() => {
  const almoco = inscricoes.value.filter(i => i.refeicao?.turno === 'almoco').length
  const jantar = inscricoes.value.filter(i => i.refeicao?.turno === 'jantar').length
  const total = almoco + jantar
  const labels = [
    `Almoço: ${almoco} (${total > 0 ? ((almoco / total) * 100).toFixed(1) : '0'}%)`,
    `Jantar: ${jantar} (${total > 0 ? ((jantar / total) * 100).toFixed(1) : '0'}%)`
  ]
  return {
    labels,
    datasets: [{ data: [almoco, jantar], backgroundColor: ['#f59e0b', '#3b82f6'] }]
  }
})

const chartDiaData = computed(() => ({ labels: estatsDiaSemana.value.map(d => d.dia), datasets: [{ label: 'Almoço', backgroundColor: '#f59e0b', data: estatsDiaSemana.value.map(d => d.almoco) }, { label: 'Jantar', backgroundColor: '#3b82f6', data: estatsDiaSemana.value.map(d => d.jantar) }] }))

const chartOpts = {
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        boxWidth: 15,
        padding: 10,
        font: {
          size: 11
        }
      }
    },
    tooltip: {
      enabled: true
    }
  },
  maintainAspectRatio: false
}
const chartBarOpts = {
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        boxWidth: 20,
        padding: 15,
        font: {
          size: 13,
          weight: '600'
        }
      }
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      padding: 12,
      callbacks: {
        label: function(context: any) {
          const label = context.dataset.label || ''
          const value = context.parsed.y || 0
          return `${label}: ${value}`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 1000,
      ticks: {
        stepSize: 100,
        font: {
          size: 12
        },
        padding: 8
      },
      grid: {
        color: '#e2e8f0'
      }
    },
    x: {
      ticks: {
        font: {
          size: 13,
          weight: '600'
        },
        padding: 8
      },
      grid: {
        display: false
      }
    }
  },
  barPercentage: 0.7,
  categoryPercentage: 0.8,
  maintainAspectRatio: false
}

const carregarDados = async () => {
  loading.value = true
  try {
    const f: any = {}; if (filtroDataInicio.value) f.data_inicio = filtroDataInicio.value.toISOString().split('T')[0]; if (filtroDataFim.value) f.data_fim = filtroDataFim.value.toISOString().split('T')[0]; if (filtroTurno.value) f.turno = filtroTurno.value; f.per_page = 1000
    const { data } = await adminExtrasService.listar(f); inscricoesRaw.value = data
  } catch { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar' }) } finally { loading.value = false }
}

// Validação de intervalo de datas (máximo 30 dias)
const validarIntervaloDatas = (dataInicio: Date | null, dataFim: Date | null): boolean => {
  if (!dataInicio || !dataFim) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Selecione o período de início e fim.', life: 5000 })
    return false
  }
  
  const diferencaDias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diferencaDias < 0) {
    toast.add({ severity: 'warn', summary: 'Intervalo Inválido', detail: 'A data de início deve ser anterior à data de fim.', life: 5000 })
    return false
  }
  
  if (diferencaDias > 30) {
    toast.add({ severity: 'warn', summary: 'Intervalo Muito Grande', detail: 'O intervalo máximo permitido é de 30 dias.', life: 5000 })
    return false
  }
  
  return true
}

// Exportação principal - Todos os dados
const exportarGeral = async () => {
  console.log('🔷 exportarGeral chamada')
  loadingExport.value = true
  try {
    if (!validarIntervaloDatas(filtroDataInicio.value, filtroDataFim.value)) {
      loadingExport.value = false
      return
    }
    
    const params: any = {}
    if (filtroDataInicio.value) params.data_inicio = filtroDataInicio.value.toISOString().split('T')[0]
    if (filtroDataFim.value) params.data_fim = filtroDataFim.value.toISOString().split('T')[0]
    if (filtroTurno.value) params.turno = filtroTurno.value
    params.tipo_relatorio = 'geral'
    
    console.log('📦 Parâmetros exportarGeral:', params)
    await adminExtrasService.exportarRelatorio(params)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Relatório geral exportado com sucesso!', life: 3000 })
  } catch (error: any) {
    console.error('❌ Erro ao exportar:', error)
    toast.add({ severity: 'error', summary: 'Erro', detail: error?.response?.data?.message || 'Falha ao exportar relatório.', life: 5000 })
  } finally {
    loadingExport.value = false
  }
}

// Exportação por usuário
const exportarPorUsuario = async () => {
  console.log('👤 exportarPorUsuario chamada')
  loadingExport.value = true
  try {
    if (!validarIntervaloDatas(filtroDataInicio.value, filtroDataFim.value)) {
      loadingExport.value = false
      return
    }
    
    if (!filtroUsuario.value) {
      toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Selecione um usuário para exportar.', life: 4000 })
      loadingExport.value = false
      return
    }
    
    const params: any = {}
    if (filtroDataInicio.value) params.data_inicio = filtroDataInicio.value.toISOString().split('T')[0]
    if (filtroDataFim.value) params.data_fim = filtroDataFim.value.toISOString().split('T')[0]
    if (filtroTurno.value) params.turno = filtroTurno.value
    
    // Extrai ID do usuário (pode ser objeto ou número)
    const userId = typeof filtroUsuario.value === 'object' ? filtroUsuario.value.id: filtroUsuario.value
    params.user_id = userId
    params.tipo_relatorio = 'por_usuario'
    
    console.log('📦 Parâmetros exportarPorUsuario:', params)
    console.warn('⚠️ ATENÇÃO: Backend pode estar ignorando user_id!')
    await adminExtrasService.exportarRelatorio(params)
    toast.add({ 
      severity: 'success', 
      summary: 'Exportado', 
      detail: `Relatório do usuário ID ${userId} exportado. Verifique se o Excel contém apenas dados deste usuário.`, 
      life: 5000 
    })
  } catch (error: any) {
    console.error('❌ Erro ao exportar:', error)
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao exportar.', life: 5000 })
  } finally {
    loadingExport.value = false
  }
}

// Exportação por dia
const exportarPorDia = async () => {
  loadingExport.value = true
  try {
    if (!validarIntervaloDatas(filtroDataInicio.value, filtroDataFim.value)) {
      loadingExport.value = false
      return
    }
    
    const params: any = {}
    if (filtroDataInicio.value) params.data_inicio = filtroDataInicio.value.toISOString().split('T')[0]
    if (filtroDataFim.value) params.data_fim = filtroDataFim.value.toISOString().split('T')[0]
    if (filtroTurno.value) params.turno = filtroTurno.value
    params.agrupamento = 'dia'
    params.tipo_relatorio = 'por_dia'
    
    console.log('📦 Parâmetros exportarPorDia:', params)
    console.warn('⚠️ ATENÇÃO: Backend pode estar ignorando agrupamento!')
    await adminExtrasService.exportarRelatorio(params)
    toast.add({ 
      severity: 'success', 
      summary: 'Exportado', 
      detail: 'Relatório por dia exportado. Verifique se está agrupado por dia.', 
      life: 5000 
    })
  } catch (error: any) {
    console.error('Erro ao exportar:', error)
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao exportar.', life: 5000 })
  } finally {
    loadingExport.value = false
  }
}

// Exportação detalhada
const exportarDetalhado = async () => {
  loadingExport.value = true
  try {
    if (!validarIntervaloDatas(filtroDataInicio.value, filtroDataFim.value)) {
      loadingExport.value = false
      return
    }
    
    const params: any = {}
    if (filtroDataInicio.value) params.data_inicio = filtroDataInicio.value.toISOString().split('T')[0]
    if (filtroDataFim.value) params.data_fim = filtroDataFim.value.toISOString().split('T')[0]
    if (filtroTurno.value) params.turno = filtroTurno.value
    if (filtroStatus.value) params.status_final = filtroStatus.value
    params.detalhado = 1
    params.tipo_relatorio = 'detalhado'
    
    console.log('📦 Parâmetros exportarDetalhado:', params)
    console.warn('⚠️ ATENÇÃO: Backend pode estar ignorando detalhado e status_final!')
    await adminExtrasService.exportarRelatorio(params)
    toast.add({ 
      severity: 'success', 
      summary: 'Exportado', 
      detail: 'Relatório detalhado exportado. Verifique se contém todos os campos.', 
      life: 5000 
    })
  } catch (error: any) {
    console.error('Erro ao exportar:', error)
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao exportar.', life: 5000 })
  } finally {
    loadingExport.value = false
  }
}

// Função dinâmica que chama a exportação correta baseada na aba ativa
const exportarExcel = async () => {
  console.log('📊 exportarExcel chamada. Aba ativa:', activeTab.value)
  switch (activeTab.value) {
    case 0: // Visão Geral
      console.log('➡️ Exportando Visão Geral')
      await exportarGeral()
      break
    case 1: // Por Usuário
      console.log('➡️ Exportando Por Usuário')
      await exportarPorUsuario()
      break
    case 2: // Por Dia
      console.log('➡️ Exportando Por Dia')
      await exportarPorDia()
      break
    default:
      console.log('➡️ Exportando Geral (default)')
      await exportarGeral()
  }
}
const selecionarUsuario = (usuario: any) => {
  filtroUsuario.value = usuario
}

const periodoSelecionado = computed(() => {
  if (!filtroDataInicio.value || !filtroDataFim.value) return null
  const inicio = filtroDataInicio.value.toLocaleDateString('pt-BR')
  const fim = filtroDataFim.value.toLocaleDateString('pt-BR')
  return `${inicio} a ${fim}`
})

const limparFiltros = () => { filtroDataInicio.value = null; filtroDataFim.value = null; filtroTurno.value = null; filtroStatus.value = null; filtroUsuario.value = null; carregarDados() }
const formatarData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'
const formatarDataHora = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'

onMounted(() => { const h = new Date(), t = new Date(); t.setDate(h.getDate() - 30); filtroDataInicio.value = t; filtroDataFim.value = h; carregarDados() })
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Relatório de Extras" subtitle="Análise completa com gráficos e estatísticas" :show-back-button="true" :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Relatórios' }, { label: 'Extras' }]" />

    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
      <div class="w-full sm:w-auto flex flex-col sm:flex-row gap-4">
        <div class="flex flex-col gap-1 w-full sm:w-auto"><label class="text-xs font-bold text-slate-500">Início</label><Calendar v-model="filtroDataInicio" dateFormat="dd/mm/yy" showIcon placeholder="dd/mm/aa" class="w-full sm:w-36" :pt="{ root: { class: '!bg-white' }, input: { class: '!bg-white' } }" /></div>
        <div class="flex flex-col gap-1 w-full sm:w-auto"><label class="text-xs font-bold text-slate-500">Fim</label><Calendar v-model="filtroDataFim" dateFormat="dd/mm/yy" showIcon placeholder="dd/mm/aa" class="w-full sm:w-36" :pt="{ root: { class: '!bg-white' }, input: { class: '!bg-white' } }" /></div>
      </div>
      <div class="flex flex-col gap-1 w-full sm:w-auto"><label class="text-xs font-bold text-slate-500">Turno</label><Select v-model="filtroTurno" :options="turnoOptions" optionLabel="label" optionValue="value" placeholder="Selecione" class="w-full sm:w-32" /></div>
      <div class="flex flex-col gap-1 w-full sm:w-auto"><label class="text-xs font-bold text-slate-500">Status</label><Select v-model="filtroStatus" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Selecione" class="w-full sm:w-40" /></div>
      <div class="flex gap-2 w-full sm:w-auto">
        <Button icon="pi pi-search" @click="carregarDados" class="flex-1 sm:flex-none" /><Button icon="pi pi-times" severity="secondary" text @click="limparFiltros" class="flex-1 sm:flex-none" />
      </div>
      <div class="hidden sm:block flex-1"></div>
      <Button label="Exportar" icon="pi pi-file-excel" severity="success" @click="exportarExcel" :loading="loadingExport" class="w-full sm:w-auto" />
    </div>

    <div v-if="periodoSelecionado" class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 shadow-sm">
      <i class="pi pi-calendar text-lg"></i>
      <span class="font-semibold">Período analisado:</span>
      <span class="font-bold">{{ periodoSelecionado }}</span>
      <span v-if="filtroTurno" class="ml-2 px-2 py-1 bg-white/20 rounded-lg text-xs font-bold">
        {{ filtroTurno === 'almoco' ? '🍽️ Almoço' : '🌙 Jantar' }}
      </span>
    </div>

    <div v-if="loading" class="grid grid-cols-3 md:grid-cols-6 gap-3">
      <Skeleton v-for="i in 6" :key="i" height="60px" borderRadius="12px" />
    </div>
    <div v-else class="grid grid-cols-3 md:grid-cols-6 gap-3">
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><i class="pi pi-list text-slate-600"></i></div><div><p class="text-xl font-black">{{ estatisticas.total }}</p><p class="text-[9px] text-slate-400 uppercase">Total</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><i class="pi pi-check-circle text-emerald-600"></i></div><div><p class="text-xl font-black text-emerald-600">{{ estatisticas.atendidos }}</p><p class="text-[9px] text-slate-400 uppercase">Atendidos</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><i class="pi pi-clock text-amber-500"></i></div><div><p class="text-xl font-black text-amber-500">{{ estatisticas.naFila }}</p><p class="text-[9px] text-slate-400 uppercase">Na Fila</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><i class="pi pi-minus-circle text-slate-400"></i></div><div><p class="text-xl font-black text-slate-500">{{ estatisticas.naoAtendidos }}</p><p class="text-[9px] text-slate-400 uppercase">Não Atend.</p></div></div>
      <div class="bg-white p-3 rounded-xl border flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center"><i class="pi pi-times-circle text-red-500"></i></div><div><p class="text-xl font-black text-red-500">{{ estatisticas.naoCompareceram }}</p><p class="text-[9px] text-slate-400 uppercase">Não Comp.</p></div></div>
      <div class="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl text-white flex items-center gap-2"><div class="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center"><i class="pi pi-percentage"></i></div><div><p class="text-xl font-black">{{ estatisticas.taxa }}%</p><p class="text-[9px] uppercase opacity-80">Taxa</p></div></div>
    </div>


    <TabView 
      v-model:activeIndex="activeTab" 
      class="bg-white rounded-xl shadow-sm border"
      :pt="{
        nav: { class: 'bg-slate-50 border-b-2 border-slate-200' },
        inkbar: { class: 'bg-indigo-600 h-1' },
        panelContainer: { class: 'bg-white' }
      }"
    >
      <TabPanel value="0" header="Visão Geral">
        <div v-if="loading" class="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton height="250px" borderRadius="12px" />
          <Skeleton height="250px" borderRadius="12px" />
        </div>
        <div v-else class="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-chart-pie text-indigo-500 mr-2"></i>Status</h3><div class="h-56"><Chart type="pie" :data="chartStatusData" :options="chartOpts" class="h-full" /></div></div>
          <div class="bg-slate-50 p-4 rounded-xl"><h3 class="text-sm font-bold mb-3"><i class="pi pi-sun text-amber-500 mr-2"></i>Turno</h3><div class="h-56"><Chart type="doughnut" :data="chartTurnoData" :options="chartOpts" class="h-full" /></div></div>
        </div>
        <div class="px-4 pb-4">
          <div class="bg-white p-4 rounded-xl border border-slate-200 mt-4">
            <DataTable v-model:filters="filters" :value="inscricoes" :loading="loading" paginator :rows="15" :globalFilterFields="['user.nome', 'user.matricula']">
              <template #header><div class="flex justify-between"><span class="font-bold">Histórico Completo</span><InputText v-model="filters['global'].value" placeholder="Buscar..." class="w-64" /></div></template>
              <template #empty><div class="text-center py-8 text-slate-400"><i class="pi pi-inbox text-4xl mb-2"></i><p>Nenhum registro</p></div></template>
              <Column field="user.nome" header="Estudante" :sortable="true"><template #body="{ data }"><div class="flex items-center gap-2"><Avatar v-if="data.user?.foto" :image="data.user.foto" shape="circle" size="small" /><Avatar v-else :label="getInitials(data.user?.nome)" shape="circle" size="small" :style="getAvatarStyle(data.user?.nome)" /><div><p class="font-bold text-sm">{{ data.user?.nome }}</p><p class="text-[10px] text-slate-400">{{ data.user?.matricula }}</p></div></div></template></Column>
              <Column header="Data" :sortable="true" sortField="refeicao.data"><template #body="{ data }"><i class="pi pi-calendar text-slate-400 mr-1"></i>{{ formatarData(data.refeicao?.data) }}</template></Column>
              <Column header="Dia"><template #body="{ data }">{{ data.diaSemana }}</template></Column>
              <Column header="Turno"><template #body="{ data }"><i :class="data.refeicao?.turno === 'almoco' ? 'pi pi-sun text-amber-500' : 'pi pi-moon text-blue-500'" class="mr-1"></i>{{ data.refeicao?.turno === 'almoco' ? 'Alm' : 'Jan' }}</template></Column>
              <Column header="Inscrito"><template #body="{ data }"><i class="pi pi-clock text-slate-400 mr-1"></i>{{ formatarDataHora(data.inscrito_em) }}</template></Column>
              <Column header="Status"><template #body="{ data }"><i :class="[data.statusIcon, data.statusColor]" class="mr-1"></i><span :class="data.statusColor" class="font-semibold text-sm">{{ data.statusLabel }}</span></template></Column>
            </DataTable>
          </div>
        </div>
      </TabPanel>

      <TabPanel value="1" header="Por Usuário">
        <div class="p-4 space-y-4">
          <div class="flex flex-col gap-2">
            <label class="text-xs font-bold text-slate-500">Selecione um estudante</label>
            <AutoComplete 
              v-model="filtroUsuario" 
              :suggestions="usuariosAutoComplete" 
              @complete="filtrarUsuarios"
              optionLabel="nome"
              placeholder="Digite o nome ou matrícula..."
              class="w-full"
              forceSelection
              :pt="{
                input: { class: 'w-full' },
                panel: { class: 'max-h-80 overflow-auto' }
              }"
            >
              <template #option="{ option }">
                <div class="flex items-center gap-2 p-2">
                  <Avatar v-if="option.foto" :image="option.foto" shape="circle" size="small" />
                  <Avatar v-else :label="getInitials(option.nome)" shape="circle" size="small" :style="getAvatarStyle(option.nome)" />
                  <div>
                    <p class="font-bold text-sm">{{ option.nome }}</p>
                    <p class="text-xs text-slate-400">{{ option.matricula }}</p>
                  </div>
                </div>
              </template>
            </AutoComplete>
          </div>
            <div v-if="filtroUsuario" class="bg-indigo-50 p-3 rounded-xl flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <Avatar v-if="filtroUsuario.foto" :image="filtroUsuario.foto" shape="circle" size="small" />
                <Avatar v-else :label="getInitials(filtroUsuario.nome)" shape="circle" size="small" :style="getAvatarStyle(filtroUsuario.nome)" />
                <div>
                  <p class="font-bold text-indigo-700">{{ filtroUsuario.nome }}</p>
                  <p class="text-xs text-indigo-600">{{ filtroUsuario.matricula }} - {{ inscricoesPorUsuario.length }} inscrições</p>
                </div>
              </div>
              <Button label="Limpar" size="small" text @click="filtroUsuario = null" />
            </div>
          <div v-if="!filtroUsuario" class="bg-slate-50 p-4 rounded-xl">
            <h3 class="text-sm font-bold mb-3"><i class="pi pi-trophy text-amber-500 mr-2"></i>Top 10 Usuários (Clique para selecionar)</h3>
            <div class="space-y-2">
              <div 
                v-for="(u, i) in rankingUsuarios" 
                :key="i" 
                class="flex items-center gap-3 p-2 bg-white rounded-lg border hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer"
                @click="selecionarUsuario({ id: u.id, nome: u.nome, matricula: u.matricula, foto: u.foto })"
              >
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold" :class="i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300'">{{ i + 1 }}</span>
                <Avatar v-if="u.foto" :image="u.foto" shape="circle" size="small" /><Avatar v-else :label="getInitials(u.nome)" shape="circle" size="small" :style="getAvatarStyle(u.nome)" />
                <div class="flex-1"><p class="font-bold text-sm">{{ u.nome }}</p><p class="text-[10px] text-slate-400">{{ u.matricula }}</p></div>
                <div class="text-right"><p class="text-lg font-black text-indigo-600">{{ u.total }}</p><p class="text-[10px] text-slate-400">{{ u.atendidos }} atend.</p></div>
              </div>
            </div>
          </div>
          <div v-else>
            <div class="bg-indigo-50 p-3 rounded-xl flex items-center justify-between mb-4"><p class="font-bold text-indigo-700">{{ inscricoesPorUsuario.length }} inscrições</p><Button label="Ver Todos" size="small" text @click="filtroUsuario = null" /></div>
            <DataTable :value="inscricoesPorUsuario" paginator :rows="10">
              <Column header="Data"><template #body="{ data }"><i class="pi pi-calendar text-slate-400 mr-1"></i>{{ formatarData(data.refeicao?.data) }}</template></Column>
              <Column header="Dia"><template #body="{ data }">{{ data.diaSemana }}</template></Column>
              <Column header="Turno"><template #body="{ data }"><i :class="data.refeicao?.turno === 'almoco' ? 'pi pi-sun text-amber-500' : 'pi pi-moon text-blue-500'" class="mr-1"></i>{{ data.refeicao?.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</template></Column>
              <Column header="Status"><template #body="{ data }"><i :class="[data.statusIcon, data.statusColor]" class="mr-1"></i><span :class="data.statusColor">{{ data.statusLabel }}</span></template></Column>
            </DataTable>
          </div>
        </div>
      </TabPanel>

      <TabPanel value="2" header="Por Dia">
        <div class="p-6">
          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 class="text-base font-bold mb-4 text-slate-700"><i class="pi pi-chart-bar text-blue-500 mr-2"></i>Distribuição por Dia da Semana (Seg-Sex)</h3>
            <div style="height: 400px"><Chart type="bar" :data="chartDiaData" :options="chartBarOpts" class="h-full" /></div>
          </div>
        </div>
      </TabPanel>
    </TabView>
  </div>
</template>
