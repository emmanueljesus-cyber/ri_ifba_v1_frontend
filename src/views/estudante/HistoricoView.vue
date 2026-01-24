<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { useAuthStore } from '../../stores/auth'
import { historicoService } from '../../services/historico'
import PageHeader from '../../components/common/PageHeader.vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import Message from 'primevue/message'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import type { HistoricoRefeicao, ResumoHistorico } from '../../types/historico'

const auth = useAuthStore()
const historico = ref<HistoricoRefeicao[]>([])
const resumo = ref<ResumoHistorico | null>(null)
const loading = ref(false)

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

// safer: use the boolean field `bolsista` if available on the authenticated user
const isBolsista = computed(() => !!auth.user?.bolsista)

const formatarData = (data: string) => {
  if (!data) return '-'
  return data.split('-').reverse().join('/')
}

const formatarHora = (dataString: string) => {
  if (!dataString) return '-'
  try {
    const data = new Date(dataString)
    if (isNaN(data.getTime())) {
      // Se já for uma string de hora HH:mm:ss
      if (dataString.includes(':') && dataString.length >= 5) {
        return dataString.substring(0, 5)
      }
      return dataString
    }
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return '-'
  }
}

const formatarTurno = (turno: string) => {
  return turno === 'almoco' ? 'Almoco' : 'Jantar'
}

const carregarDados = async () => {
  loading.value = true
  try {
    const [historicoResp, resumoResp] = await Promise.all([
      historicoService.listar(),
      historicoService.resumo()
    ])
    historico.value = historicoResp.data
    resumo.value = resumoResp
  } catch (err) {
    console.error('Erro ao carregar histórico:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  carregarDados()
})
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <PageHeader
      title="Meu Histórico"
      :subtitle="isBolsista ? 'Registros das suas refeições bolsistas e extras' : 'Registros do seu histórico de alimentação'"
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Dashboard', route: '/dashboard' }, { label: 'Histórico' }]"
    />

    <!-- Resumo (Cards Estilizados) -->
    <div v-if="resumo" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div class="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600">
           <i class="pi pi-check-circle text-2xl"></i>
        </div>
        <div>
          <p class="text-2xl font-black text-slate-800 leading-tight">
            {{ isBolsista ? resumo.total_extras : resumo.total_refeicoes }}
          </p>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Total Consumido
          </p>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
           <i class="pi pi-calendar text-2xl"></i>
        </div>
        <div>
          <p class="text-2xl font-black text-slate-800 leading-tight">
            {{ isBolsista ? resumo.mes_atual.extras : resumo.mes_atual.refeicoes }}
          </p>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Neste Mês
          </p>
        </div>
      </div>

      <div class="hidden lg:flex bg-gradient-to-br from-primary-600 to-primary-700 rounded-[2rem] p-6 shadow-md shadow-primary-100 items-center gap-4 text-white">
        <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
           <i class="pi pi-bolt text-2xl"></i>
        </div>
        <div>
          <p class="text-lg font-bold leading-tight">Frequência</p>
          <p class="text-[10px] font-medium opacity-80 uppercase tracking-widest">
            Excelente aproveitamento
          </p>
        </div>
      </div>
    </div>

    <!-- Tabela de Histórico (Visual Clean) -->
    <section>
      <div class="flex items-center gap-2 mb-4 px-2">
        <div class="w-2 h-6 bg-primary-500 rounded-full"></div>
        <h2 class="text-xl font-black text-slate-800 lato-black">Detalhamento</h2>
      </div>

      <div v-if="loading && historico.length === 0" class="space-y-4">
        <Skeleton v-for="i in 3" :key="i" height="70px" border-radius="1.5rem" />
      </div>

      <div v-else-if="historico.length === 0">
        <div class="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-12 text-center">
           <i class="pi pi-history text-4xl text-slate-300 mb-4"></i>
           <p class="text-slate-500 font-medium">Você ainda não possui registros de refeições.</p>
        </div>
      </div>

      <div v-else class="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm p-4">
        <DataTable
          v-model:filters="filters"
          :value="historico"
          :rows="10"
          :paginator="historico.length > 10"
          :globalFilterFields="['data', 'turno', 'prato_principal']"
          stripedRows
          class="p-datatable-sm"
          responsiveLayout="stack"
          breakpoint="768px"
        >
          <template #header>
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-black text-slate-400 uppercase tracking-widest">Histórico de Refeições</span>
              <IconField iconPosition="left">
                <InputIcon class="pi pi-search" />
                <InputText v-model="filters['global'].value" placeholder="Filtrar histórico..." class="!rounded-xl" />
              </IconField>
            </div>
          </template>
          <Column header="Data" field="data">
            <template #body="{ data }">
              <span class="font-semibold text-slate-700">{{ formatarData(data.data) }}</span>
            </template>
          </Column>

          <Column header="Turno" field="turno">
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <i :class="data.turno === 'almoco' ? 'pi pi-sun text-amber-500' : 'pi pi-moon text-indigo-500'"></i>
                <span class="capitalize font-medium">{{ data.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</span>
              </div>
            </template>
          </Column>

          <Column header="Refeição" field="prato_principal">
            <template #body="{ data }">
              <span class="text-sm text-slate-600">{{ data.prato_principal || 'Refeição RI' }}</span>
            </template>
          </Column>

          <Column header="Status" field="presente">
            <template #body="{ data }">
              <Tag
                :value="data.presente ? 'Presente' : 'Ausente'"
                :severity="data.presente ? 'success' : 'danger'"
                class="!rounded-full px-3 uppercase text-[10px] font-black"
              />
            </template>
          </Column>

          <Column header="Hora de Entrada">
            <template #body="{ data }">
              <div v-if="data.confirmado_em" class="flex items-center gap-2 text-slate-600">
                <i class="pi pi-clock text-xs"></i>
                <span class="text-xs font-medium">{{ formatarHora(data.confirmado_em) }}</span>
              </div>
              <span v-else class="text-slate-300 text-xs">-</span>
            </template>
          </Column>
        </DataTable>
      </div>
    </section>
  </div>
</template>
