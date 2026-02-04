<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { relatorioService } from '../../services/relatorios'
import { adminExtrasService } from '../../services/adminExtras'
import api from '../../services/api'
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
import Card from 'primevue/card'
import Button from 'primevue/button'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import ProgressSpinner from 'primevue/progressspinner'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import Chart from 'primevue/chart'
import { useToast } from 'primevue/usetoast'
import Skeleton from 'primevue/skeleton'
const toast = useToast()
const loading = ref(false)
const loadingExtras = ref(false)
const relatorio = ref<any>(null)
const relatorioPresencas = ref<any>(null)
const relatorioExtras = ref<any[]>([])
const estatisticasExtras = ref<any>(null)
const statsDashboard = ref<any>(null)

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

const filtersExtras = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

const dataAtual = new Date()
const mesSelecionado = ref(dataAtual.getMonth() + 1)
const anoSelecionado = ref(dataAtual.getFullYear())

// Filtros para Relatório de Presenças/Extras
const filtroDataInicio = ref(new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1))
const filtroDataFim = ref(new Date())
const filtroTurno = ref('todos')

const turnos = [
  { label: 'Todos', value: 'todos' },
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
]

const chartTypeGeral = ref('bar')
const chartTypePresencas = ref('bar')
const chartTypeExtras = ref('bar')

const chartTypeOptions = [
  { icon: 'pi pi-chart-bar', value: 'bar', label: 'Barras' },
  { icon: 'pi pi-chart-pie', value: 'doughnut', label: 'Donut' },
  { icon: 'pi pi-chart-scatter', value: 'pie', label: 'Pizza' }
]

const carregarRelatorio = async () => {
  loading.value = true
  try {
    relatorio.value = await relatorioService.semanal(mesSelecionado.value, anoSelecionado.value)
    // Se o relatório vir vazio ou sem semanas, forçamos um estado limpo
    if (relatorio.value && (!relatorio.value.semanas || relatorio.value.semanas.length === 0)) {
       relatorio.value = null
    }
    // Carregar estatísticas do dashboard para os cards do topo na aba geral
    const inicio = `${anoSelecionado.value}-${String(mesSelecionado.value).padStart(2, '0')}-01`
    const fim = new Date(anoSelecionado.value, mesSelecionado.value, 0).toISOString().split('T')[0]
    statsDashboard.value = await relatorioService.dashboard({ data_inicio: inicio, data_fim: fim })
  } catch (error) {
    console.error('Erro ao carregar relatório:', error)
    relatorio.value = null
  } finally {
    loading.value = false
  }
}

const carregarPresencas = async () => {
  loading.value = true
  try {
    if (!validarIntervaloDatas(filtroDataInicio.value, filtroDataFim.value)) {
      loading.value = false
      return
    }
    
    const inicio = filtroDataInicio.value.toISOString().split('T')[0] ?? ''
    const fim = filtroDataFim.value.toISOString().split('T')[0] ?? ''
    const turno = filtroTurno.value === 'todos' ? undefined : filtroTurno.value

    relatorioPresencas.value = await relatorioService.presencas(inicio, fim, turno)
  } catch (error) {
    console.error('Erro ao carregar presenças:', error)
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: 'Não foi possível carregar os dados. Verifique o intervalo de datas.',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

const carregarExtras = async () => {
  loadingExtras.value = true
  try {
    const inicio = filtroDataInicio.value.toISOString().split('T')[0] ?? ''
    const fim = filtroDataFim.value.toISOString().split('T')[0] ?? ''
    const turno = filtroTurno.value === 'todos' ? undefined : (filtroTurno.value as 'almoco' | 'jantar')

    const response = await adminExtrasService.listar({ data_inicio: inicio, data_fim: fim, turno })
    relatorioExtras.value = response.data
    const stats = await adminExtrasService.estatisticas(inicio, fim)
    estatisticasExtras.value = stats
    
    // Log para depuração se os gráficos não aparecerem
    console.log('Estatísticas Extras carregadas:', stats)
  } catch (error) {
    console.error('Erro ao carregar extras:', error)
  } finally {
    loadingExtras.value = false
  }
}

const carregarDashboard = async () => {
  loading.value = true
  try {
    const inicio = filtroDataInicio.value.toISOString().split('T')[0]
    const fim = filtroDataFim.value.toISOString().split('T')[0]
    statsDashboard.value = await relatorioService.dashboard({ data_inicio: inicio, data_fim: fim })
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error)
  } finally {
    loading.value = false
  }
}

const downloadTemplate = async (tipo: string) => {
  try {
    const url = `/admin/${tipo}/template`

    const response = await api.get(url, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    })

    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })

    const contentDisposition = response.headers['content-disposition']
    let filename = `template_${tipo}.xlsx`
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1]
      }
    }

    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)

    toast.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: 'Template baixado com sucesso!',
      life: 3000
    })
  } catch (error) {
    console.error('Erro ao baixar template:', error)
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: 'Erro ao baixar template. Tente novamente.',
      life: 5000
    })
  }
}

// Validação de intervalo de datas (máximo 30 dias)
const validarIntervaloDatas = (dataInicio: Date, dataFim: Date): boolean => {
  const diferencaDias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diferencaDias < 0) {
    toast.add({
      severity: 'warn',
      summary: 'Intervalo Inválido',
      detail: 'A data de início deve ser anterior à data de fim.',
      life: 5000
    })
    return false
  }
  
  if (diferencaDias > 30) {
    toast.add({
      severity: 'warn',
      summary: 'Intervalo Muito Grande',
      detail: 'O intervalo máximo permitido é de 30 dias.',
      life: 5000
    })
    return false
  }
  
  return true
}

const exportarExcel = async () => {
  try {
    const blob = await relatorioService.exportarSemanal(mesSelecionado.value, anoSelecionado.value)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `relatorio_semanal_${mesSelecionado.value}_${anoSelecionado.value}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('Erro ao exportar:', error)
  }
}

const exportarGeral = async () => {
  try {
    if (!validarIntervaloDatas(filtroDataInicio.value, filtroDataFim.value)) {
      return
    }
    
    const inicio = filtroDataInicio.value.toISOString().split('T')[0] ?? ''
    const fim = filtroDataFim.value.toISOString().split('T')[0] ?? ''
    const turno = filtroTurno.value === 'todos' ? undefined : filtroTurno.value

    const blob = await relatorioService.exportarGeral(inicio, fim, turno)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `relatorio_geral_${inicio}_${fim}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    
    toast.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: 'Relatório exportado com sucesso!',
      life: 3000
    })
  } catch (error: any) {
    console.error('Erro ao exportar geral:', error)
    toast.add({
      severity: 'error',
      summary: 'Erro ao Exportar',
      detail: error?.response?.data?.message || 'Não foi possível exportar o relatório. Verifique se o backend está rodando.',
      life: 5000
    })
  }
}

// ===== RELATÓRIO DE EXTRAS =====
const exportarExtras = async () => {
  try {
    if (!validarIntervaloDatas(filtroDataInicio.value, filtroDataFim.value)) {
      return
    }
    
    const inicio = filtroDataInicio.value.toISOString().split('T')[0]
    const fim = filtroDataFim.value.toISOString().split('T')[0]
    const turno = filtroTurno.value === 'todos' ? undefined : filtroTurno.value

    await adminExtrasService.exportarRelatorio({
      data_inicio: inicio,
      data_fim: fim,
      turno
    })
    
    toast.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: 'Relatório exportado com sucesso!',
      life: 3000
    })
  } catch (error: any) {
    console.error('Erro ao exportar extras:', error)
    toast.add({
      severity: 'error',
      summary: 'Erro ao Exportar',
      detail: error?.response?.data?.message || 'Não foi possível exportar o relatório. Verifique se o backend está rodando.',
      life: 5000
    })
  }
}

const getStatusExtras = (status: string) => {
  switch (status) {
    case 'aprovado': return { label: 'Aprovado', severity: 'success' }
    case 'inscrito': return { label: 'Aguardando', severity: 'warning' }
    case 'rejeitado': return { label: 'Rejeitado', severity: 'danger' }
    default: return { label: status, severity: 'secondary' }
  }
}

onMounted(() => {
  carregarRelatorio()
  carregarPresencas()
  carregarDashboard()
  carregarExtras()
})

const meses = [
  { label: 'Janeiro', value: 1 },
  { label: 'Fevereiro', value: 2 },
  { label: 'Março', value: 3 },
  { label: 'Abril', value: 4 },
  { label: 'Maio', value: 5 },
  { label: 'Junho', value: 6 },
  { label: 'Julho', value: 7 },
  { label: 'Agosto', value: 8 },
  { label: 'Setembro', value: 9 },
  { label: 'Outubro', value: 10 },
  { label: 'Novembro', value: 11 },
  { label: 'Dezembro', value: 12 }
]

const anos = computed(() => {
  const anoAtual = new Date().getFullYear()
  const lista = []
  for (let i = anoAtual - 2; i <= anoAtual + 1; i++) {
    lista.push(i)
  }
  return lista
})

const categorias = [
  { key: 'presente', label: 'Presente', color: 'bg-emerald-50 text-emerald-700' },
  { key: 'extra', label: 'Extra', color: 'bg-blue-50 text-blue-700' },
  { key: 'ausente', label: 'Ausente', color: 'bg-red-50 text-red-700' },
  { key: 'atestado', label: 'Atestado', color: 'bg-orange-50 text-orange-700' },
  { key: 'justificado', label: 'Justificado', color: 'bg-amber-50 text-amber-700' },
  { key: 'n_frequenta', label: 'Ñ Frequenta', color: 'bg-slate-50 text-slate-700' }
]

const chartPalette = [
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#f97316',
  '#f59e0b'
]

const presencasPorDiaChartData = computed(() => {
  const dados = relatorioPresencas.value?.data
  if (!dados || !Array.isArray(dados)) return null

  // Filtrar apenas dias úteis (Segunda a Sexta)
  const diasUteisMap: Record<string, string> = {
    'Segunda': 'Seg',
    'Terça': 'Ter',
    'Quarta': 'Qua',
    'Quinta': 'Qui',
    'Sexta': 'Sex'
  }

  // Se a API retornar o nome do dia em português, filtramos por ele
  // Ou se retornar data ISO, precisamos calcular o dia da semana
  const labels: string[] = []
  const presentes: number[] = []
  const faltas: number[] = []

  dados.forEach(d => {
    // Tenta converter string de data (DD/MM/YYYY ou YYYY-MM-DD) em objeto Date
    let dataObj: Date | null = null
    
    if (d.data.includes('/')) {
      const partes = d.data.split('/')
      if (partes.length === 3) {
        dataObj = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]))
      }
    } else if (d.data.includes('-')) {
      dataObj = new Date(d.data + 'T12:00:00')
    }

    if (dataObj && !isNaN(dataObj.getTime())) {
      const diaSemana = dataObj.getDay() // 0=Dom, 1=Seg...
      
      // FILTRO RIGOROSO: Apenas Segunda (1) a Sexta (5)
      if (diaSemana >= 1 && diaSemana <= 5) {
        const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        labels.push(nomesDias[diaSemana] || '')
        presentes.push(d.presentes || 0)
        faltas.push((d.falta_justificada || 0) + (d.falta_injustificada || 0))
      }
    }
  })

  if (labels.length === 0) return null

  return {
    labels,
    datasets: [
      {
        label: 'Presentes',
        data: presentes,
        backgroundColor: '#10b981',
        borderRadius: 4
      },
      {
        label: 'Faltas',
        data: faltas,
        backgroundColor: '#ef4444',
        borderRadius: 4
      }
    ]
  }
})

const presencasPorDiaChartOptions = {
  plugins: {
    legend: { position: 'top', labels: { usePointStyle: true, font: { weight: '600' } } }
  },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1 } },
    x: { grid: { display: false } }
  },
  responsive: true,
  maintainAspectRatio: false
}

const geralChartData = computed(() => {
  if (!relatorio.value?.totais) return null

  return {
    labels: categorias.map(cat => cat.label),
    datasets: [
      {
        data: categorias.map(cat => relatorio.value?.totais?.[cat.key] || 0),
        backgroundColor: chartPalette,
        borderWidth: 0
      }
    ]
  }
})

const geralChartOptions = {
  plugins: {
    legend: {
      position: 'right',
      labels: {
        usePointStyle: true,
        padding: 15,
        font: { size: 13, weight: '600' },
        generateLabels: (chart: any) => {
          const data = chart.data
          if (data.labels.length && data.datasets.length) {
            const dataset = data.datasets[0]
            const total = dataset.data.reduce((a: number, b: number) => a + b, 0)
            
            return data.labels.map((label: string, i: number) => {
              const value = dataset.data[i]
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
              
              return {
                text: `${label}: ${value} (${percentage}%)`,
                fillStyle: dataset.backgroundColor[i],
                hidden: false,
                index: i
              }
            })
          }
          return []
        }
      }
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const value = context.raw
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    }
  },
  cutout: '65%',
  responsive: true,
  maintainAspectRatio: false
}

// Gráfico de Pizza (sem cutout)
const geralPizzaChartOptions = {
  plugins: {
    legend: {
      position: 'right',
      labels: {
        usePointStyle: true,
        padding: 15,
        font: { size: 13, weight: '600' },
        generateLabels: (chart: any) => {
          const data = chart.data
          if (data.labels.length && data.datasets.length) {
            const dataset = data.datasets[0]
            const total = dataset.data.reduce((a: number, b: number) => a + b, 0)
            
            return data.labels.map((label: string, i: number) => {
              const value = dataset.data[i]
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
              
              return {
                text: `${label}: ${value} (${percentage}%)`,
                fillStyle: dataset.backgroundColor[i],
                hidden: false,
                index: i
              }
            })
          }
          return []
        }
      }
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const value = context.raw
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    }
  },
  responsive: true,
  maintainAspectRatio: false
}

// Gráfico de Barras para aba geral
const geralBarChartData = computed(() => {
  if (!relatorio.value?.totais) return null

  return {
    labels: categorias.map(cat => cat.label),
    datasets: [
      {
        label: 'Quantidade',
        data: categorias.map(cat => relatorio.value?.totais?.[cat.key] || 0),
        backgroundColor: chartPalette,
        borderWidth: 0,
        borderRadius: 6
      }
    ]
  }
})

const geralBarChartOptions = {
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0)
          const value = context.raw
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { font: { size: 12, weight: '600' }, color: '#64748b' },
      grid: { color: '#e2e8f0' }
    },
    x: {
      ticks: { font: { size: 12, weight: '600' }, color: '#64748b' },
      grid: { display: false }
    }
  },
  responsive: true,
  maintainAspectRatio: false
}

// Legendas externas customizadas
const geralLegendasComPorcentagem = computed(() => {
  if (!relatorio.value?.totais) return []
  
  const total = categorias.reduce((acc, cat) => acc + (relatorio.value?.totais?.[cat.key] || 0), 0)
  
  return categorias.map((cat, i) => {
    const value = relatorio.value?.totais?.[cat.key] || 0
    return {
      label: cat.label,
      value,
      color: chartPalette[i],
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0'
    }
  })
})

const presencasChartData = computed(() => {
  const totais = relatorioPresencas.value?.meta?.totais
  if (!totais) return null

  const total = (totais.presentes || 0) + (totais.falta_justificada || 0) +
                (totais.falta_injustificada || 0) + (totais.cancelados || 0)

  if (total === 0) return null

  return {
    labels: ['Presentes', 'Falta Justificada', 'Falta Injustificada', 'Cancelados'],
    datasets: [
      {
        data: [
          totais.presentes || 0,
          totais.falta_justificada || 0,
          totais.falta_injustificada || 0,
          totais.cancelados || 0
        ],
        backgroundColor: ['#10b981', '#3b82f6', '#ef4444', '#f59e0b'],
        hoverBackgroundColor: ['#059669', '#2563eb', '#dc2626', '#d97706'],
        borderWidth: 0,
        borderRadius: 4
      }
    ]
  }
})

const presencasChartOptions = {
  plugins: {
    legend: {
      position: 'right',
      labels: {
        usePointStyle: true,
        padding: 15,
        font: { size: 13, weight: '600' },
        generateLabels: (chart: any) => {
          const data = chart.data
          if (data.labels.length && data.datasets.length) {
            const dataset = data.datasets[0]
            const total = dataset.data.reduce((a: number, b: number) => a + b, 0)
            
            return data.labels.map((label: string, i: number) => {
              const value = dataset.data[i]
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
              
              return {
                text: `${label}: ${value} (${percentage}%)`,
                fillStyle: dataset.backgroundColor[i],
                hidden: false,
                index: i
              }
            })
          }
          return []
        }
      }
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const value = context.raw
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    }
  },
  cutout: '65%',
  responsive: true,
  maintainAspectRatio: false
}

// Gráfico de Pizza para presenças
const presencasPizzaChartOptions = {
  plugins: {
    legend: {
      position: 'right',
      labels: {
        usePointStyle: true,
        padding: 15,
        font: { size: 13, weight: '600' },
        generateLabels: (chart: any) => {
          const data = chart.data
          if (data.labels.length && data.datasets.length) {
            const dataset = data.datasets[0]
            const total = dataset.data.reduce((a: number, b: number) => a + b, 0)
            
            return data.labels.map((label: string, i: number) => {
              const value = dataset.data[i]
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
              
              return {
                text: `${label}: ${value} (${percentage}%)`,
                fillStyle: dataset.backgroundColor[i],
                hidden: false,
                index: i
              }
            })
          }
          return []
        }
      }
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const value = context.raw
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    }
  },
  responsive: true,
  maintainAspectRatio: false
}

// Gráfico de Barras para presenças
const presencasBarChartData = computed(() => {
  const totais = relatorioPresencas.value?.meta?.totais
  if (!totais) return null

  const total = (totais.presentes || 0) + (totais.falta_justificada || 0) +
                (totais.falta_injustificada || 0) + (totais.cancelados || 0)

  if (total === 0) return null

  return {
    labels: ['Presentes', 'Falta Justificada', 'Falta Injustificada', 'Cancelados'],
    datasets: [
      {
        label: 'Quantidade',
        data: [
          totais.presentes || 0,
          totais.falta_justificada || 0,
          totais.falta_injustificada || 0,
          totais.cancelados || 0
        ],
        backgroundColor: ['#10b981', '#3b82f6', '#ef4444', '#f59e0b'],
        borderWidth: 0,
        borderRadius: 6
      }
    ]
  }
})

const presencasBarChartOptions = {
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0)
          const value = context.raw
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { font: { size: 12, weight: '600' }, color: '#64748b' },
      grid: { color: '#e2e8f0' }
    },
    x: {
      ticks: { font: { size: 12, weight: '600' }, color: '#64748b' },
      grid: { display: false }
    }
  },
  responsive: true,
  maintainAspectRatio: false
}

const presencasLegendasComPorcentagem = computed(() => {
  const totais = relatorioPresencas.value?.meta?.totais
  if (!totais) return []
  
  const labels = ['Presentes', 'Falta Justificada', 'Falta Injustificada', 'Cancelados']
  const values = [
    totais.presentes || 0,
    totais.falta_justificada || 0,
    totais.falta_injustificada || 0,
    totais.cancelados || 0
  ]
  const colors = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b']
  
  const total = values.reduce((acc, v) => acc + v, 0)
  
  return labels.map((label, i) => ({
    label,
    value: values[i],
    color: colors[i],
    percentage: total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0'
  }))
})


const extrasChartData = computed(() => {
  const resumo = estatisticasExtras.value?.resumo
  if (!resumo) return null

  const total = (resumo.aprovados || 0) + (resumo.aguardando || 0) + (resumo.rejeitados || 0)
  if (total === 0) return null

  return {
    labels: ['Aprovados', 'Aguardando', 'Rejeitados'],
    datasets: [
      {
        data: [resumo.aprovados || 0, resumo.aguardando || 0, resumo.rejeitados || 0],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        hoverBackgroundColor: ['#059669', '#d97706', '#dc2626'],
        borderWidth: 0
      }
    ]
  }
})

const extrasChartOptions = {
  plugins: {
    legend: {
      position: 'right',
      labels: {
        usePointStyle: true,
        padding: 15,
        font: { size: 13, weight: '600' },
        generateLabels: (chart: any) => {
          const data = chart.data
          if (data.labels.length && data.datasets.length) {
            const dataset = data.datasets[0]
            const total = dataset.data.reduce((a: number, b: number) => a + b, 0)
            
            return data.labels.map((label: string, i: number) => {
              const value = dataset.data[i]
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
              
              return {
                text: `${label}: ${value} (${percentage}%)`,
                fillStyle: dataset.backgroundColor[i],
                hidden: false,
                index: i
              }
            })
          }
          return []
        }
      }
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const value = context.raw
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    }
  },
  cutout: '65%',
  responsive: true,
  maintainAspectRatio: false
}

// Gráfico de Pizza para extras
const extrasPizzaChartOptions = {
  plugins: {
    legend: {
      position: 'right',
      labels: {
        usePointStyle: true,
        padding: 15,
        font: { size: 13, weight: '600' },
        generateLabels: (chart: any) => {
          const data = chart.data
          if (data.labels.length && data.datasets.length) {
            const dataset = data.datasets[0]
            const total = dataset.data.reduce((a: number, b: number) => a + b, 0)
            
            return data.labels.map((label: string, i: number) => {
              const value = dataset.data[i]
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
              
              return {
                text: `${label}: ${value} (${percentage}%)`,
                fillStyle: dataset.backgroundColor[i],
                hidden: false,
                index: i
              }
            })
          }
          return []
        }
      }
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const value = context.raw
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    }
  },
  responsive: true,
  maintainAspectRatio: false
}

// Gráfico de Barras para extras
const extrasBarChartData = computed(() => {
  const resumo = estatisticasExtras.value?.resumo
  if (!resumo) return null

  const total = (resumo.aprovados || 0) + (resumo.aguardando || 0) + (resumo.rejeitados || 0)
  if (total === 0) return null

  return {
    labels: ['Aprovados', 'Aguardando', 'Rejeitados'],
    datasets: [
      {
        label: 'Quantidade',
        data: [resumo.aprovados || 0, resumo.aguardando || 0, resumo.rejeitados || 0],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0,
        borderRadius: 6
      }
    ]
  }
})

const extrasBarChartOptions = {
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0)
          const value = context.raw
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { font: { size: 12, weight: '600' }, color: '#64748b' },
      grid: { color: '#e2e8f0' }
    },
    x: {
      ticks: { font: { size: 12, weight: '600' }, color: '#64748b' },
      grid: { display: false }
    }
  },
  responsive: true,
  maintainAspectRatio: false
}

const extrasLegendasComPorcentagem = computed(() => {
  const resumo = estatisticasExtras.value?.resumo
  if (!resumo) return []
  
  const labels = ['Aprovados', 'Aguardando', 'Rejeitados']
  const values = [resumo.aprovados || 0, resumo.aguardando || 0, resumo.rejeitados || 0]
  const colors = ['#10b981', '#f59e0b', '#ef4444']
  
  const total = values.reduce((acc, v) => acc + v, 0)
  
  return labels.map((label, i) => ({
    label,
    value: values[i],
    color: colors[i],
    percentage: total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0'
  }))
})

const activeTab = ref('geral')

const tabOptions = [
  { label: 'Geral Mensal', value: 'geral', icon: 'pi pi-chart-bar' },
  { label: 'Presenças', value: 'presencas', icon: 'pi pi-users' },
  { label: 'Extras', value: 'extras', icon: 'pi pi-user-plus' },
  { label: 'Modelos', value: 'modelos', icon: 'pi pi-download' }
]

watch(activeTab, (newTab) => {
  if (newTab === 'geral') carregarRelatorio()
  if (newTab === 'presencas') {
    carregarPresencas()
    carregarDashboard()
  }
  if (newTab === 'extras') {
    carregarExtras()
  }
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader 
      title="Relatórios e Modelos" 
      subtitle="Acompanhamento de consumo e ferramentas de importação"
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Relatórios' }]"
    />

    <!-- Seletor de Aba usando SelectButton -->
    <div class="flex justify-center mb-6 px-2 sm:px-4">
      <div class="w-full max-w-4xl overflow-x-auto no-scrollbar pb-2">
        <SelectButton
          v-model="activeTab"
          :options="tabOptions"
          optionLabel="label"
          optionValue="value"
          :allowEmpty="false"
          class="tab-select-button flex-nowrap whitespace-nowrap"
        >
          <template #option="slotProps">
            <div class="flex items-center gap-2 px-2 sm:px-4 whitespace-nowrap py-1">
              <i :class="slotProps.option.icon" class="text-xs sm:text-base"></i>
              <span class="font-bold text-[10px] sm:text-sm uppercase">{{ slotProps.option.label }}</span>
            </div>
          </template>
        </SelectButton>
      </div>
    </div>

    <!-- ABA: RELATÓRIO GERAL MENSAL -->
    <div v-if="activeTab === 'geral'">
      <Card class="!rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <template #content>
              <div class="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
                <div class="flex flex-wrap gap-2 items-center justify-center lg:justify-start">
                  <Select v-model="mesSelecionado" :options="meses" optionLabel="label" optionValue="value" class="w-full sm:w-40" @change="carregarRelatorio" />
                  <Select v-model="anoSelecionado" :options="anos" class="w-full sm:w-24" @change="carregarRelatorio" />
                  <Button icon="pi pi-refresh" text rounded @click="carregarRelatorio" :loading="loading" class="hidden sm:inline-flex" />
                  <Button label="Atualizar" icon="pi pi-refresh" severity="secondary" @click="carregarRelatorio" :loading="loading" class="w-full sm:hidden !rounded-xl" />
                </div>
                <Button label="Exportar Excel" icon="pi pi-file-excel" severity="success" class="!rounded-xl w-full lg:w-auto shadow-sm" @click="exportarExcel" />
              </div>

              <div v-if="loading" class="space-y-6">
                <!-- Skeleton Resumo -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Skeleton v-for="i in 4" :key="i" height="80px" border-radius="12px" />
                </div>
                <!-- Skeleton Grafico -->
                <div class="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                   <div class="flex justify-between mb-4">
                     <Skeleton width="150px" height="20px" />
                     <Skeleton width="100px" height="30px" />
                   </div>
                   <Skeleton height="300px" border-radius="12px" />
                </div>
                <!-- Skeleton Tabela -->
                <Skeleton height="400px" border-radius="12px" />
              </div>

              <div v-else-if="relatorio" class="overflow-x-auto">
                <!-- Resumo Rápido -->
                <div v-if="statsDashboard" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                   <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors">
                      <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Presentes</p>
                      <p class="text-3xl font-black text-slate-800">{{ statsDashboard.resumo?.total_presentes || 0 }}</p>
                   </div>
                   <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                      <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Extras</p>
                      <p class="text-3xl font-black text-slate-800">{{ statsDashboard.extras?.total || 0 }}</p>
                   </div>
                   <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-red-200 transition-colors">
                      <p class="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Faltas</p>
                      <p class="text-3xl font-black text-slate-800">{{ statsDashboard.resumo?.total_faltas || 0 }}</p>
                   </div>
                   <div class="p-4 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl border border-primary-600 shadow-lg">
                      <p class="text-[10px] font-black text-white/80 uppercase tracking-widest mb-1">Aproveitamento</p>
                      <p class="text-3xl font-black text-white">{{ statsDashboard.taxa_presenca?.porcentagem || '0%' }}</p>
                   </div>
                </div>

                <div v-if="geralChartData" class="space-y-6 mb-8">
                  <!-- Título da Seção e Seletor de Tipo -->
                    <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                      <h3 class="text-lg font-black text-slate-700 uppercase tracking-wide flex items-center gap-2 text-center sm:text-left">
                        <i class="pi pi-chart-line text-primary-500"></i>
                        Visualizações Gráficas
                      </h3>
                      <div class="overflow-x-auto no-scrollbar max-w-full pb-1">
                        <SelectButton v-model="chartTypeGeral" :options="chartTypeOptions" optionLabel="label" optionValue="value" :allowEmpty="false" class="custom-select-button scale-90 sm:scale-100 flex-nowrap whitespace-nowrap">
                          <template #option="slotProps">
                            <i :class="slotProps.option.icon"></i>
                          </template>
                        </SelectButton>
                      </div>
                    </div>
                  
                  <!-- Container do Gráfico Único e Otimizado -->
                  <div class="p-4 sm:p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div class="flex justify-between items-center mb-6">
                      <h4 class="text-sm font-black text-slate-400 uppercase tracking-widest">
                        Distribuição de Frequência Mensal
                      </h4>
                      <Tag :value="chartTypeGeral.toUpperCase()" severity="secondary" class="!rounded-full px-3 text-[10px]" />
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <!-- Área do Gráfico -->
                      <div class="lg:col-span-2 min-h-[320px]">
                        <Chart v-if="chartTypeGeral === 'bar'" type="bar" :data="geralBarChartData" :options="geralBarChartOptions" class="h-full" />
                        <Chart v-else-if="chartTypeGeral === 'doughnut'" type="doughnut" :data="geralChartData" :options="geralChartOptions" class="h-full" />
                        <Chart v-else type="pie" :data="geralChartData" :options="geralPizzaChartOptions" class="h-full" />
                      </div>

                      <!-- Legendas Customizadas e Estatísticas -->
                      <div class="flex flex-col justify-center gap-2">
                        <div v-for="item in geralLegendasComPorcentagem" :key="item.label" class="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                          <div class="flex items-center gap-3">
                            <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: item.color }"></div>
                            <span class="text-xs font-bold text-slate-600">{{ item.label }}</span>
                          </div>
                          <div class="flex items-center gap-3">
                            <span class="text-sm font-black text-slate-800">{{ item.value }}</span>
                            <span class="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{{ item.percentage }}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Estado Vazio para Gráficos -->
                <div v-else class="p-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 mb-8">
                  <i class="pi pi-chart-bar text-5xl text-slate-300 mb-4"></i>
                  <p class="text-slate-500 font-medium">Nenhum dado estatístico disponível para este período.</p>
                </div>

                <div class="min-w-[800px]">
                  <table class="w-full border-collapse">
                    <thead>
                      <tr class="bg-slate-800 text-white">
                        <th class="p-4 text-left font-black uppercase tracking-widest text-xs border border-slate-700 w-48">
                          {{ relatorio.mes_ano }}
                        </th>
                        <th v-for="(_, index) in relatorio.semanas" :key="index" class="p-4 text-center font-black uppercase tracking-widest text-xs border border-slate-700">
                          Semana {{ Number(index) + 1 }}
                        </th>
                        <th class="p-4 text-center font-black uppercase tracking-widest text-xs border border-slate-700 bg-slate-700">
                          Total Mês
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="cat in categorias" :key="cat.key" class="hover:bg-slate-50 transition-colors">
                        <td :class="['p-4 border border-slate-200 font-bold text-sm', cat.color]">
                          {{ cat.label }}
                        </td>
                        <td v-for="(val, index) in relatorio.dados[cat.key]" :key="index" class="p-4 border border-slate-200 text-center text-sm font-medium">
                          <span v-if="val.tipo === 'texto'" class="text-[10px] text-slate-400 font-black uppercase">{{ val.valor }}</span>
                          <span v-else>{{ val.valor }}</span>
                        </td>
                        <td class="p-4 border border-slate-200 text-center text-sm font-black bg-slate-50">
                          {{ relatorio.totais[cat.key] }}
                        </td>
                      </tr>
                      <tr class="bg-slate-100 font-black">
                        <td class="p-4 border border-slate-200 text-sm">Total Mensal de Refeições</td>
                        <td :colspan="relatorio.semanas.length" class="p-4 border border-slate-200 text-center text-slate-400">------</td>
                        <td class="p-4 border border-slate-200 text-center text-lg text-emerald-700">
                          {{ relatorio.total_mensal_refeicoes }}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div class="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês de Referência</p>
                          <p class="text-xl font-black text-slate-800 capitalize">{{ relatorio.mes_texto }}</p>
                      </div>
                      <div>
                          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semanas Ativas</p>
                          <p class="text-xl font-black text-slate-800">{{ relatorio.semanas.length }}</p>
                      </div>
                      <div class="col-span-2 text-right">
                          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consumo Total Acumulado</p>
                          <p class="text-3xl font-black text-emerald-600">{{ relatorio.total_mensal_refeicoes }} <span class="text-sm font-medium text-slate-400">refeições</span></p>
                      </div>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- ABA: RELATÓRIO DE PRESENÇAS -->
        <div v-else-if="activeTab === 'presencas'">
          <Card class="!rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <template #content>
              <!-- Filtros -->
              <div class="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
                <div class="flex flex-wrap gap-4 items-end justify-center lg:justify-start w-full lg:w-auto">
                  <div class="flex flex-col gap-1 w-full sm:w-36">
                    <label class="text-[10px] font-bold uppercase text-slate-500 text-center lg:text-left">Início</label>
                    <DatePicker v-model="filtroDataInicio" dateFormat="dd/mm/yy" class="w-full" :locale="ptBR" showIcon />
                  </div>
                  <div class="flex flex-col gap-1 w-full sm:w-36">
                    <label class="text-[10px] font-bold uppercase text-slate-500 text-center lg:text-left">Fim</label>
                    <DatePicker v-model="filtroDataFim" dateFormat="dd/mm/yy" class="w-full" :locale="ptBR" showIcon />
                  </div>
                  <div class="flex flex-col gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
                    <label class="text-[10px] font-bold uppercase text-slate-500 text-center lg:text-left">Turno</label>
                    <SelectButton
                      v-model="filtroTurno" 
                      :options="turnos" 
                      optionLabel="label" 
                      optionValue="value" 
                      :allowEmpty="false"
                      class="custom-select-button w-full sm:w-auto flex-nowrap whitespace-nowrap"
                    />
                  </div>
                  <Button icon="pi pi-search" label="Buscar" severity="primary" @click="carregarPresencas" :loading="loading" class="!rounded-xl w-full lg:w-auto shadow-sm" />
                </div>
                <Button label="Exportar Excel" icon="pi pi-file-excel" severity="success" outlined class="!rounded-xl w-full lg:w-auto" @click="exportarGeral" />
              </div>

              <!-- Resumo -->
              <div v-if="relatorioPresencas?.meta?.totais" class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Presentes</p>
                  <p class="text-2xl font-black text-slate-800">{{ relatorioPresencas.meta.totais.presentes }}</p>
                </div>
                <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <p class="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Faltas Just.</p>
                  <p class="text-2xl font-black text-slate-800">{{ relatorioPresencas.meta.totais.falta_justificada }}</p>
                </div>
                <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <p class="text-[10px] font-bold text-red-600 uppercase tracking-widest">Faltas Injust.</p>
                  <p class="text-2xl font-black text-slate-800">{{ relatorioPresencas.meta.totais.falta_injustificada }}</p>
                </div>
                <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <p class="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Cancelados</p>
                  <p class="text-2xl font-black text-slate-800">{{ relatorioPresencas.meta.totais.cancelados }}</p>
                </div>
                <div class="p-4 bg-slate-800 rounded-xl border border-slate-900 shadow-lg text-center">
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                  <p class="text-2xl font-black text-white">{{ relatorioPresencas.meta.totais.total_registros }}</p>
                </div>
              </div>

                <div v-if="presencasChartData" class="space-y-6 mb-8">
                  <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 class="text-lg font-black text-slate-700 uppercase tracking-wide flex items-center gap-2 text-center sm:text-left">
                      <i class="pi pi-chart-bar text-primary-500"></i>
                      Visualizações Gráficas - Presenças
                    </h3>
                    <div class="overflow-x-auto no-scrollbar max-w-full pb-1">
                      <SelectButton v-model="chartTypePresencas" :options="chartTypeOptions" optionLabel="label" optionValue="value" :allowEmpty="false" class="custom-select-button scale-90 sm:scale-100 flex-nowrap whitespace-nowrap">
                        <template #option="slotProps">
                          <i :class="slotProps.option.icon"></i>
                        </template>
                      </SelectButton>
                    </div>
                  </div>
                  
                  <div class="p-4 sm:p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <!-- Gráfico de Presenças por Categoria -->
                      <div class="lg:col-span-2 min-h-[320px]">
                        <Chart v-if="chartTypePresencas === 'bar'" type="bar" :data="presencasBarChartData" :options="presencasBarChartOptions" class="h-full" />
                        <Chart v-else-if="chartTypePresencas === 'doughnut'" type="doughnut" :data="presencasChartData" :options="presencasChartOptions" class="h-full" />
                        <Chart v-else type="pie" :data="presencasChartData" :options="presencasPizzaChartOptions" class="h-full" />
                      </div>

                      <div class="flex flex-col justify-center gap-2">
                        <div v-for="item in presencasLegendasComPorcentagem" :key="item.label" class="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <div class="flex items-center gap-3">
                            <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: item.color }"></div>
                            <span class="text-xs font-bold text-slate-600">{{ item.label }}</span>
                          </div>
                          <div class="flex items-center gap-3">
                            <span class="text-sm font-black text-slate-800">{{ item.value }}</span>
                            <span class="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{{ item.percentage }}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Gráfico de Presenças por Dia (Seg-Sex) -->
                  <div v-if="presencasPorDiaChartData" class="p-4 sm:p-6 bg-white rounded-xl border border-slate-200 shadow-sm mt-6">
                    <h4 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Frequência Diária (Dias Úteis)</h4>
                    <div class="h-[300px]">
                      <Chart type="bar" :data="presencasPorDiaChartData" :options="presencasPorDiaChartOptions" class="h-full" />
                    </div>
                  </div>
                </div>

              <div v-else-if="!loading" class="p-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 mb-8">
                <i class="pi pi-inbox text-5xl text-slate-300 mb-4"></i>
                <p class="text-slate-500 font-medium">Nenhum dado de presenças para o período selecionado.</p>
              </div>

                <!-- Tabela de dados -->
                <div v-if="loading" class="space-y-4">
                  <Skeleton v-for="i in 10" :key="i" height="50px" border-radius="8px" />
                </div>
                <DataTable
                  v-else
                  v-model:filters="filters"
                  :value="relatorioPresencas?.data || []" 
                  :loading="loading" 
                  paginator 
                  :rows="15"
                  :rowsPerPageOptions="[10, 15, 25, 50]"
                  class="p-datatable-sm"
                  responsiveLayout="stack"
                  breakpoint="960px"
                  :globalFilterFields="['data', 'turno']"
                  stripedRows
                >
                <template #header>
                  <div class="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <span class="text-lg font-bold text-slate-700">Registro de Presenças por Dia</span>
                    <InputText v-model="filters['global'].value" placeholder="Buscar..." class="!rounded-xl w-full sm:w-60" />
                  </div>
                </template>
                <template #empty>
                  <div class="text-center py-8 text-slate-400">
                    <i class="pi pi-inbox text-4xl mb-2"></i>
                    <p>Nenhum registro encontrado para o período.</p>
                  </div>
                </template>

                <Column header="Data" field="data" :sortable="true" :style="{ width: '120px' }">
                  <template #body="{ data }">
                    <span class="font-bold text-slate-800">{{ data.data }}</span>
                  </template>
                </Column>

                <Column header="Turno" field="turno" :sortable="true" :style="{ width: '120px' }">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <div :class="data.turno === 'almoco' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'" class="w-8 h-8 rounded-lg flex items-center justify-center">
                        <i :class="data.turno === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'"></i>
                      </div>
                      <span class="font-medium">{{ data.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</span>
                    </div>
                  </template>
                </Column>

                <Column header="Presentes" field="presentes" :sortable="true" :style="{ width: '100px' }">
                  <template #body="{ data }">
                    <Tag :value="data.presentes.toString()" severity="success" class="!rounded-full !px-3 !font-bold" />
                  </template>
                </Column>

                <Column header="Falta Just." field="falta_justificada" :sortable="true" :style="{ width: '100px' }">
                  <template #body="{ data }">
                    <Tag :value="data.falta_justificada.toString()" severity="info" class="!rounded-full !px-3" />
                  </template>
                </Column>

                <Column header="Falta Injust." field="falta_injustificada" :sortable="true" :style="{ width: '110px' }">
                  <template #body="{ data }">
                    <Tag :value="data.falta_injustificada.toString()" severity="danger" class="!rounded-full !px-3" />
                  </template>
                </Column>

                <Column header="Cancelados" field="cancelados" :sortable="true" :style="{ width: '100px' }">
                  <template #body="{ data }">
                    <Tag :value="data.cancelados.toString()" severity="warn" class="!rounded-full !px-3" />
                  </template>
                </Column>

                <Column header="Total" field="total" :sortable="true" :style="{ width: '80px' }">
                  <template #body="{ data }">
                    <span class="font-black text-slate-700">{{ data.total }}</span>
                  </template>
                </Column>
              </DataTable>
            </template>
          </Card>
        </div>

        <!-- ABA: RELATÓRIO DE EXTRAS -->
        <div v-else-if="activeTab === 'extras'">
          <Card class="!rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <template #content>
              <!-- Filtros -->
              <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div class="flex flex-wrap gap-4 items-end justify-center md:justify-start">
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 text-center md:text-left">Início</label>
                    <DatePicker v-model="filtroDataInicio" dateFormat="dd/mm/yy" class="w-full sm:w-36" :locale="ptBR" showIcon />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 text-center md:text-left">Fim</label>
                    <DatePicker v-model="filtroDataFim" dateFormat="dd/mm/yy" class="w-full sm:w-36" :locale="ptBR" showIcon />
                  </div>
                  <div class="flex flex-col gap-1 w-full sm:w-auto">
                    <label class="text-[10px] font-bold uppercase text-slate-500 text-center md:text-left">Turno</label>
                    <SelectButton
                      v-model="filtroTurno"
                      :options="turnos"
                      optionLabel="label"
                      optionValue="value"
                      :allowEmpty="false"
                      class="custom-select-button w-full sm:w-auto"
                    />
                  </div>
                  <Button icon="pi pi-search" label="Buscar" severity="primary" @click="carregarExtras" :loading="loadingExtras" class="!rounded-xl w-full sm:w-auto" />
                </div>
                <Button label="Exportar Excel" icon="pi pi-file-excel" severity="success" outlined class="!rounded-xl w-full md:w-auto" @click="exportarExtras" />
              </div>

              <!-- Estatísticas -->
              <div v-if="estatisticasExtras?.resumo" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Inscritos</p>
                  <p class="text-2xl font-black text-slate-800">{{ estatisticasExtras.resumo.total_inscritos || 0 }}</p>
                </div>
                <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Aprovados</p>
                  <p class="text-2xl font-black text-slate-800">{{ estatisticasExtras.resumo.aprovados || 0 }}</p>
                </div>
                <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <p class="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Aguardando</p>
                  <p class="text-2xl font-black text-slate-800">{{ estatisticasExtras.resumo.aguardando || 0 }}</p>
                </div>
                <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <p class="text-[10px] font-bold text-red-600 uppercase tracking-widest">Rejeitados</p>
                  <p class="text-2xl font-black text-slate-800">{{ estatisticasExtras.resumo.rejeitados || 0 }}</p>
                </div>
              </div>

              <div v-if="extrasChartData" class="space-y-6 mb-8">
                <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h3 class="text-lg font-black text-slate-700 uppercase tracking-wide flex items-center gap-2 text-center sm:text-left">
                    <i class="pi pi-ticket text-primary-500"></i>
                    Visualizações Gráficas - Extras
                  </h3>
                  <div class="overflow-x-auto no-scrollbar max-w-full pb-1">
                    <SelectButton v-model="chartTypeExtras" :options="chartTypeOptions" optionLabel="label" optionValue="value" :allowEmpty="false" class="custom-select-button scale-90 sm:scale-100 flex-nowrap whitespace-nowrap">
                      <template #option="slotProps">
                        <i :class="slotProps.option.icon"></i>
                      </template>
                    </SelectButton>
                  </div>
                </div>
                
                <div class="p-4 sm:p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-2 min-h-[320px]">
                      <Chart v-if="chartTypeExtras === 'bar'" type="bar" :data="extrasBarChartData" :options="extrasBarChartOptions" class="h-full" />
                      <Chart v-else-if="chartTypeExtras === 'doughnut'" type="doughnut" :data="extrasChartData" :options="extrasChartOptions" class="h-full" />
                      <Chart v-else type="pie" :data="extrasChartData" :options="extrasPizzaChartOptions" class="h-full" />
                    </div>

                    <div class="flex flex-col justify-center gap-2">
                      <div v-for="item in extrasLegendasComPorcentagem" :key="item.label" class="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                        <div class="flex items-center gap-3">
                          <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: item.color }"></div>
                          <span class="text-xs font-bold text-slate-600">{{ item.label }}</span>
                        </div>
                        <div class="flex items-center gap-3">
                          <span class="text-sm font-black text-slate-800">{{ item.value }}</span>
                          <span class="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{{ item.percentage }}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else-if="!loadingExtras" class="p-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 mb-8">
                <i class="pi pi-chart-pie text-5xl text-slate-300 mb-4"></i>
                <p class="text-slate-500 font-medium">Nenhum dado de fila extra para o período selecionado.</p>
              </div>

              <!-- Tabela -->
              <div v-if="loadingExtras" class="space-y-4">
                <Skeleton v-for="i in 10" :key="i" height="50px" border-radius="8px" />
              </div>
              <DataTable
                v-else
                v-model:filters="filtersExtras"
                :value="relatorioExtras"
                :loading="loadingExtras"
                paginator
                :rows="15"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                class="p-datatable-sm"
                responsiveLayout="stack"
                breakpoint="960px"
                :globalFilterFields="['user.nome', 'user.matricula', 'status']"
                stripedRows
              >
                <template #header>
                  <div class="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <span class="text-lg font-bold text-slate-700">Inscrições na Fila de Extras</span>
                    <InputText v-model="filtersExtras['global'].value" placeholder="Buscar..." class="!rounded-xl w-full sm:w-60" />
                  </div>
                </template>
                <template #empty>
                  <div class="text-center py-8 text-slate-400">
                    <i class="pi pi-user-plus text-4xl mb-2"></i>
                    <p>Nenhuma inscrição encontrada para o período.</p>
                  </div>
                </template>

                <Column header="Estudante" field="user.nome" :sortable="true">
                  <template #body="{ data }">
                    <div class="flex items-center gap-3">
                      <Avatar 
                        v-if="data.user?.foto" 
                        :image="data.user.foto" 
                        shape="circle" 
                        class="hidden sm:flex" 
                      />
                      <div class="flex flex-col">
                        <span class="font-bold text-slate-800">{{ data.user?.nome || '-' }}</span>
                        <span class="text-[10px] text-slate-400 font-black uppercase">{{ data.user?.matricula || '-' }}</span>
                      </div>
                    </div>
                  </template>
                </Column>

                <Column header="Data" field="refeicao.data" :sortable="true" :style="{ width: '120px' }">
                  <template #body="{ data }">
                    <span class="font-medium text-slate-700">{{ data.refeicao?.data || '-' }}</span>
                  </template>
                </Column>

                <Column header="Turno" field="refeicao.turno" :sortable="true" :style="{ width: '120px' }">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <div :class="data.refeicao?.turno === 'almoco' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'" class="w-8 h-8 rounded-lg flex items-center justify-center">
                        <i :class="data.refeicao?.turno === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'"></i>
                      </div>
                      <span class="font-medium">{{ data.refeicao?.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</span>
                    </div>
                  </template>
                </Column>

                <Column header="Status" field="status" :sortable="true" :style="{ width: '130px' }">
                  <template #body="{ data }">
                    <Tag
                      :value="getStatusExtras(data.status).label"
                      :severity="getStatusExtras(data.status).severity as any"
                      class="!rounded-full !px-3 !font-bold"
                    />
                  </template>
                </Column>

                <Column header="Inscrito em" field="inscrito_em" :sortable="true" :style="{ width: '150px' }">
                  <template #body="{ data }">
                    <span class="text-sm text-slate-600">{{ data.inscrito_em || '-' }}</span>
                  </template>
                </Column>

                <Column header="Posição" field="posicao" :sortable="true" :style="{ width: '90px' }">
                  <template #body="{ data }">
                    <span v-if="data.posicao" class="font-black text-slate-700">#{{ data.posicao }}</span>
                    <span v-else class="text-slate-400">-</span>
                  </template>
                </Column>
              </DataTable>

              <!-- Top estudantes -->
              <div v-if="estatisticasExtras?.top_estudantes?.length" class="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 class="text-sm font-bold text-slate-700 mb-3">
                  <i class="pi pi-star-fill text-amber-500 mr-2"></i>
                  Top Estudantes (mais inscrições)
                </h4>
                <div class="flex flex-wrap gap-3">
                  <div
                    v-for="(est, idx) in estatisticasExtras.top_estudantes.slice(0, 5)"
                    :key="idx"
                    class="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200"
                  >
                    <span class="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                      {{ Number(idx) + 1 }}
                    </span>
                    <div>
                      <p class="text-sm font-semibold text-slate-700">{{ est.nome }}</p>
                      <p class="text-[10px] text-slate-400">{{ est.total_inscricoes }} inscrições</p>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- ABA: MODELOS DE IMPORTAÇÃO -->
        <div v-else-if="activeTab === 'modelos'" class="grid md:grid-cols-2 gap-6">
            <Card class="!rounded-xl border border-slate-200 shadow-sm">
              <template #title>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <i class="pi pi-users"></i>
                  </div>
                  <span class="text-lg font-bold">Importação de Bolsistas</span>
                </div>
              </template>
              <template #content>
                <p class="text-sm text-slate-500 mb-6">
                  Use este modelo para importar a lista de estudantes aprovados no programa de bolsas. 
                  O sistema criará automaticamente as contas ou vinculará aos usuários existentes.
                </p>
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
                  <h4 class="text-xs font-black uppercase text-slate-400 mb-2">Colunas Necessárias:</h4>
                  <ul class="text-xs text-slate-600 space-y-1">
                    <li>• <strong>Matrícula:</strong> Número de identificação do aluno.</li>
                    <li>• <strong>Turno:</strong> almoco ou jantar.</li>
                    <li>• <strong>Dias:</strong> Lista de dias da semana (ex: 1,2,3,4,5).</li>
                  </ul>
                </div>
                <Button 
                  label="Baixar Modelo de Bolsistas" 
                  icon="pi pi-file-excel" 
                  class="w-full !rounded-xl" 
                  severity="success"
                  @click="downloadTemplate('bolsistas')"
                />
              </template>
            </Card>

            <Card class="!rounded-xl border border-slate-200 shadow-sm">
              <template #title>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <i class="pi pi-calendar"></i>
                  </div>
                  <span class="text-lg font-bold">Importação de Cardápios</span>
                </div>
              </template>
              <template #content>
                <p class="text-sm text-slate-500 mb-6">
                  Modelo para importação em lote de cardápios. Ideal para planejar o mês inteiro de uma só vez. 
                  O sistema gera as refeições para os turnos selecionados.
                </p>
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
                  <h4 class="text-xs font-black uppercase text-slate-400 mb-2">Colunas Necessárias:</h4>
                  <ul class="text-xs text-slate-600 space-y-1">
                    <li>• <strong>Data:</strong> Data do cardápio (DD/MM/AAAA).</li>
                    <li>• <strong>Prato Principal:</strong> Nome do prato principal.</li>
                    <li>• <strong>Acompanhamentos:</strong> Arroz, feijão, guarnição, etc.</li>
                  </ul>
                </div>
                <Button 
                  label="Baixar Modelo de Cardápio" 
                  icon="pi pi-file-excel" 
                  class="w-full !rounded-xl" 
                  severity="info"
                  @click="downloadTemplate('cardapios')"
                />
              </template>
            </Card>
        </div>
  </div>
</template>

<style scoped>
table th, table td {
  border-width: 1px;
}

/* Estilo para SelectButton de abas */
.tab-select-button :deep(.p-togglebutton) {
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  margin: 0 4px;
  transition: all 0.2s ease;
}

.tab-select-button :deep(.p-togglebutton:hover:not(.p-togglebutton-checked)) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.tab-select-button :deep(.p-togglebutton.p-togglebutton-checked) {
  background: var(--ifba-verde, #32a041);
  border-color: var(--ifba-verde, #32a041);
  color: white;
  box-shadow: 0 2px 8px rgba(50, 160, 65, 0.3);
}

.custom-select-button :deep(.p-togglebutton) {
  border: 0;
  background: transparent;
  color: #64748b;
  font-weight: 700;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
}

.custom-select-button :deep(.p-button) {
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  font-weight: 600;
  padding: 0.5rem 1rem;
  transition: all 0.2s;
}

.custom-select-button :deep(.p-button.p-highlight) {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.custom-select-button :deep(.p-button:first-child) {
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

.custom-select-button :deep(.p-button:last-child) {
  border-top-right-radius: 12px;
  border-bottom-right-radius: 12px;
}
</style>
