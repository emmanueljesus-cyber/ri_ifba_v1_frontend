<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { adminDashboardService } from '../../services/adminDashboard'
import { adminPresencaService } from '../../services/adminPresenca'
import { useAvatar } from '../../composables/useAvatar'
import { useToast } from 'primevue/usetoast'
import PageHeader from '../../components/common/PageHeader.vue'
import Skeleton from 'primevue/skeleton'
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Avatar from 'primevue/avatar'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'

const toast = useToast()
const { getInitials, getAvatarStyle } = useAvatar()
const resumo = ref<any>(null)
const loading = ref(true)
const loadingBolsistas = ref(false)
const bolsistasHoje = ref<any[]>([])
const turnoSelecionado = ref('almoco')
const buscaRapida = ref('')
const buscaBolsista = ref('')
const validandoToken = ref(false)

const turnoOptions = [
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
]

// Filtrar bolsistas por nome ou matrícula
const bolsistasFiltrados = computed(() => {
  if (!buscaBolsista.value) return bolsistasHoje.value

  const termo = buscaBolsista.value.toLowerCase()
  return bolsistasHoje.value.filter(b =>
    b.nome?.toLowerCase().includes(termo) ||
    b.matricula?.toLowerCase().includes(termo)
  )
})

const carregarDados = async () => {
  loading.value = true
  try {
    resumo.value = await adminDashboardService.getResumo()
  } catch (err) {
    console.error('Erro ao carregar dashboard', err)
  } finally {
    loading.value = false
  }
}

const carregarBolsistasHoje = async () => {
  loadingBolsistas.value = true
  try {
    const hoje = new Date().toLocaleDateString('en-CA') // Garante data local YYYY-MM-DD
    bolsistasHoje.value = await adminPresencaService.listarDoDia(hoje, turnoSelecionado.value)
  } catch (err) {
    console.error('Erro ao carregar bolsistas de hoje', err)
  } finally {
    loadingBolsistas.value = false
  }
}

const validarMatriculaRapida = async () => {
  if (!buscaRapida.value) return
  validandoToken.value = true
  try {
    const hoje = new Date().toLocaleDateString('en-CA')
    await adminPresencaService.confirmarPresenca({
      matricula: buscaRapida.value,
      turno: turnoSelecionado.value,
      data: hoje
    })
    toast.add({ severity: 'success', summary: 'Sucesso', detail: `Presença confirmada para ${buscaRapida.value}`, life: 3000 })
    buscaRapida.value = ''
    carregarBolsistasHoje()
    carregarDados()
  } catch (err: any) {
    const msg = err.response?.data?.message || 'Falha ao validar'
    toast.add({ severity: 'error', summary: 'Erro', detail: msg, life: 3000 })
  } finally {
    validandoToken.value = false
  }
}

const getStatusSeverity = (status: string | null) => {
  if (!status) return 'secondary'
  switch (status) {
    case 'presente': return 'success'
    case 'falta_justificada': return 'info'
    case 'falta_injustificada': return 'danger'
    default: return 'secondary'
  }
}

watch(turnoSelecionado, () => {
  carregarBolsistasHoje()
})

onMounted(() => {
  carregarDados()
  carregarBolsistasHoje()
})
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader
      title="Painel Administrativo"
      subtitle="Visão geral do Restaurante Institucional."
      :breadcrumbs="[{ label: 'Admin' }]"
    />

    <div class="flex justify-end -mt-16 mb-4 relative z-10">
      <Button icon="pi pi-refresh" rounded outlined @click="carregarDados(); carregarBolsistasHoje()" :loading="loading || loadingBolsistas" severity="secondary" />
    </div>

    <!-- Métricas Rápidas - Redesenhadas para Elegância e Profissionalismo -->
    <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <Skeleton v-for="i in 4" :key="i" height="110px" border-radius="16px" />
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <!-- 1. Bolsistas Ativos -->
      <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all duration-300 relative overflow-hidden">
        <div class="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
        <div class="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
          <i class="pi pi-users text-2xl sm:text-3xl"></i>
        </div>
        <div class="flex-1">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bolsistas Ativos</p>
          <p class="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">{{ resumo?.metricas.bolsistas_ativos || 0 }}</p>
        </div>
      </div>

      <!-- 2. Presenças Hoje -->
      <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all duration-300 relative overflow-hidden">
        <div class="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
        <div class="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
          <i class="pi pi-check-circle text-2xl sm:text-3xl"></i>
        </div>
        <div class="flex-1">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Presenças Hoje</p>
          <div class="flex items-baseline gap-2">
            <p class="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">{{ resumo?.refeicao_atual?.confirmados || 0 }}</p>
            <span class="text-xs text-slate-400 font-bold">/ {{ resumo?.refeicao_atual?.total_esperados || 0 }}</span>
          </div>
          <div class="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
             <div class="bg-blue-500 h-full rounded-full transition-all duration-500" 
                  :style="{ width: (resumo?.refeicao_atual?.total_esperados > 0 ? (resumo.refeicao_atual.confirmados / resumo.refeicao_atual.total_esperados) * 100 : 0) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 3. Justificativas -->
      <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all duration-300 relative overflow-hidden cursor-pointer" @click="$router.push('/admin/justificativas')">
        <div class="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
        <div class="p-3 bg-orange-50 rounded-2xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
          <i class="pi pi-exclamation-triangle text-2xl sm:text-3xl"></i>
        </div>
        <div class="flex-1">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pendências</p>
          <p class="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">
            {{ (resumo?.metricas.justificativas_pendentes || 0) + (resumo?.refeicao_atual?.total_esperados - resumo?.refeicao_atual?.confirmados > 0 ? resumo?.refeicao_atual?.total_esperados - resumo?.refeicao_atual?.confirmados : 0) }}
          </p>
        </div>
        <i class="pi pi-chevron-right text-slate-300"></i>
      </div>

      <!-- 4. Aproveitamento -->
      <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all duration-300 relative overflow-hidden">
        <div class="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
        <div class="p-3 bg-purple-50 rounded-2xl text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
          <i class="pi pi-chart-line text-2xl sm:text-3xl"></i>
        </div>
        <div class="flex-1">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aproveitamento</p>
          <div class="flex items-baseline gap-1">
            <p class="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">
              {{ (resumo?.refeicao_atual?.total_esperados > 0)
                ? Math.round((resumo.refeicao_atual.confirmados / resumo.refeicao_atual.total_esperados) * 100)
                : 0 }}%
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- Bolsistas do Dia -->
      <div class="xl:col-span-2">
        <Card class="!rounded-2xl !border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <template #title>
            <div class="flex flex-col gap-5 p-2">
              <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div class="flex items-center gap-3">
                  <div class="w-1.5 h-10 bg-primary-500 rounded-full"></div>
                  <div>
                    <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                      <h3 class="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">Bolsistas do Dia</h3>
                      <Tag severity="info" class="!rounded-full px-3 py-1 text-[10px] font-black tracking-widest uppercase">
                        {{ resumo?.refeicao_atual?.total_esperados || bolsistasHoje.length }} esperados
                      </Tag>
                    </div>
                    <p class="text-xs text-slate-500 font-medium mt-0.5">Controle de acesso em tempo real (RF09)</p>
                  </div>
                </div>
                <SelectButton
                  v-model="turnoSelecionado"
                  :options="turnoOptions"
                  optionLabel="label"
                  optionValue="value"
                  :unselectable="false"
                  class="!rounded-xl shadow-sm border-slate-100"
                />
              </div>
              <!-- Filtro de busca -->
              <div class="flex flex-col sm:flex-row items-center gap-3">
                <IconField class="flex-1 w-full">
                  <InputIcon class="pi pi-search" />
                  <InputText
                    v-model="buscaBolsista"
                    placeholder="Pesquisar por nome, matrícula ou curso..."
                    class="w-full !rounded-xl !bg-slate-50/50 border-slate-200 focus:!bg-white"
                  />
                </IconField>
              </div>
            </div>
          </template>
          <template #content>
            <DataTable 
              :value="bolsistasFiltrados"
              :loading="loadingBolsistas"
              paginator 
              :rows="10" 
              class="p-datatable-sm"
              responsiveLayout="stack"
              breakpoint="960px"
              :rowsPerPageOptions="[5, 10, 20, 50]"
              paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            >
              <template #loading>
                <div class="flex items-center justify-center py-12">
                  <i class="pi pi-spinner pi-spin text-4xl text-primary-500"></i>
                </div>
              </template>
              <template #empty>
                <div class="flex flex-col items-center justify-center py-12 text-slate-400">
                  <i class="pi pi-users text-6xl mb-4 text-slate-200"></i>
                  <p class="text-sm font-medium text-slate-500">Não foi possível carregar os dados.</p>
                  <p class="text-xs text-slate-400 mt-1">Verifique se há cardápio cadastrado para hoje.</p>
                </div>
              </template>
              <Column header="Bolsista" style="min-width: 250px">
                <template #body="{ data }">
                  <div class="flex items-center gap-3">
                    <Avatar 
                      :label="getInitials(data.nome)" 
                      shape="circle" 
                      size="large"
                      class="flex-shrink-0 hidden sm:flex" 
                      :style="getAvatarStyle(data.nome)" 
                    />
                    <div class="flex flex-col">
                      <span class="font-bold text-slate-700 leading-tight">{{ data.nome }}</span>
                      <span class="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-0.5">{{ data.matricula }}</span>
                    </div>
                  </div>
                </template>
              </Column>
              <Column field="curso" header="Curso" style="min-width: 200px">
                <template #body="{ data }">
                  <span class="text-sm text-slate-600">{{ data.curso }}</span>
                </template>
              </Column>
              <Column header="Status" style="min-width: 120px" class="text-right">
                <template #body="{ data }">
                  <Tag 
                    :value="data.presenca_atual?.status_da_presenca || 'Pendente'" 
                    :severity="getStatusSeverity(data.presenca_atual?.status_da_presenca)" 
                    class="!rounded-full px-3 py-1 uppercase text-[10px] font-black tracking-wider" 
                  />
                </template>
              </Column>
            </DataTable>
            
            <div 
              class="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3" 
              v-if="resumo?.refeicao_atual"
            >
              <div class="flex items-center gap-2">
                <i class="pi pi-chart-bar text-emerald-600"></i>
                <span class="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                  Presenças do {{ resumo.refeicao_atual.turno }}:
                </span>
              </div>
              <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <span class="text-sm font-black text-emerald-800 whitespace-nowrap">
                  {{ resumo.refeicao_atual.confirmados }} / {{ resumo.refeicao_atual.total_esperados || bolsistasHoje.length }} confirmados
                </span>
                <div class="flex-1 sm:w-32 h-2.5 bg-emerald-200 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300" 
                    :style="{ width: (resumo.refeicao_atual.total_esperados || bolsistasHoje.length) > 0 ? Math.min(100, (resumo.refeicao_atual.confirmados / (resumo.refeicao_atual.total_esperados || bolsistasHoje.length)) * 100) + '%' : '0%' }"
                  ></div>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Ações Rápidas -->
      <div class="space-y-6">
        <Card class="!rounded-2xl !border-slate-200 overflow-hidden shadow-sm border-t-4 border-t-success-500 bg-gradient-to-b from-white to-slate-50">
          <template #title>
             <div class="flex items-center gap-2">
               <div class="w-2 h-6 bg-success-500 rounded-full"></div>
               <span class="text-base font-black text-slate-700 uppercase tracking-wider">Registrar Presença</span>
             </div>
          </template>
          <template #content>
            <div class="space-y-5">
              <p class="text-xs text-slate-500 font-medium">Digite a matrícula do bolsista para registro manual ultra-rápido.</p>
              <div class="flex flex-col gap-3">
                <IconField>
                  <InputIcon class="pi pi-user text-slate-400" />
                  <InputText 
                    v-model="buscaRapida" 
                    placeholder="Digite a matrícula..." 
                    class="w-full !rounded-xl !py-4 !px-10 text-lg font-bold shadow-inner border-slate-200 focus:!border-success-500" 
                    :class="{ 'p-invalid': !buscaRapida && validandoToken }" 
                    @keyup.enter="validarMatriculaRapida" 
                  />
                </IconField>
                <small v-if="!buscaRapida && validandoToken" class="p-error ml-1 block -mt-2 font-bold animate-shake">Matrícula é necessária</small>
                <Button label="Confirmar Presença" icon="pi pi-check" class="w-full !rounded-xl !py-4 shadow-lg font-black uppercase tracking-widest transform active:scale-95 transition-all" severity="success" :loading="validandoToken" @click="validarMatriculaRapida" />
              </div>
              
              <div class="relative py-4">
                <div class="absolute inset-0 flex items-center"><span class="w-full border-t border-slate-200"></span></div>
                <div class="relative flex justify-center text-[10px] font-black text-slate-400 uppercase"><span class="bg-white px-3 tracking-[0.2em]">ou se preferir</span></div>
              </div>
              
              <Button label="Escanear QR Code" icon="pi pi-qrcode" class="w-full !rounded-xl !py-3 font-bold" severity="secondary" outlined @click="$router.push('/admin/presencas')" />
            </div>
          </template>
        </Card>

        <Card class="!rounded-2xl !border-slate-200 overflow-hidden shadow-sm">
          <template #title>
             <div class="flex items-center gap-2">
               <div class="w-2 h-6 bg-slate-400 rounded-full"></div>
               <span class="text-base font-black text-slate-700 uppercase tracking-wider">Acesso Rápido</span>
             </div>
          </template>
          <template #content>
            <div class="grid grid-cols-1 gap-2">
              <button 
                @click="$router.push('/admin/cardapios')"
                class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group"
              >
                <div class="p-2 bg-primary-50 text-primary-600 rounded-lg group-hover:bg-primary-600 group-hover:text-white transition-all">
                  <i class="pi pi-calendar-plus"></i>
                </div>
                <div class="text-left text-sm">
                  <p class="font-bold text-slate-700">Cardápios</p>
                  <p class="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Gerenciar semana</p>
                </div>
              </button>

              <button 
                @click="$router.push('/admin/relatorios')"
                class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group"
              >
                <div class="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <i class="pi pi-file-pdf"></i>
                </div>
                <div class="text-left text-sm">
                  <p class="font-bold text-slate-700">Relatórios</p>
                  <p class="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Exportar dados</p>
                </div>
              </button>

              <button 
                @click="$router.push('/admin/bolsistas')"
                class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group"
              >
                <div class="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <i class="pi pi-users"></i>
                </div>
                <div class="text-left text-sm">
                  <p class="font-bold text-slate-700">Bolsistas</p>
                  <p class="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Lista completa</p>
                </div>
              </button>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.p-datatable-thead > tr > th) {
  background: transparent;
  color: #94a3b8;
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: 0.05em;
  padding: 1rem 1.5rem;
}

:deep(.p-datatable-tbody > tr > td) {
  padding: 1rem 1.5rem;
}
</style>
