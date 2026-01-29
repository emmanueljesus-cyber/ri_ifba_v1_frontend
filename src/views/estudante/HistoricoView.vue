<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { FilterMatchMode } from '@primevue/core/api'
import { useAuthStore } from '../../stores/auth'
import { historicoService } from '../../services/historico'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Message from 'primevue/message'
import type { HistoricoRefeicao, ResumoHistorico } from '../../types/historico'

const router = useRouter()

const auth = useAuthStore()
const historico = ref<HistoricoRefeicao[]>([])
const resumo = ref<ResumoHistorico | null>(null)
const loading = ref(false)

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  data: { value: null, matchMode: FilterMatchMode.CONTAINS },
  turno: { value: null, matchMode: FilterMatchMode.EQUALS },
  presente: { value: null, matchMode: FilterMatchMode.EQUALS }
})

const turnoOptions = [
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
]

const statusOptions = [
  { label: 'Presente', value: true },
  { label: 'Ausente', value: false }
]

// safer: use the boolean field `bolsista` if available on the authenticated user
const isBolsista = computed(() => !!auth.user?.bolsista)
const temDados = computed(() => historico.value && historico.value.length > 0)

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

    <!-- Resumo (Cards Estilizados) - Apenas se houver dados -->
    <div v-if="resumo && temDados" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
        <div class="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
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

      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
        <div class="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
           <i class="pi pi-calendar text-2xl"></i>
        </div>
        <div>
          <p class="text-2xl font-black text-slate-800 leading-tight">
            {{ isBolsista ? resumo.mes_atual?.extras : resumo.mes_atual?.refeicoes }}
          </p>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Neste Mês
          </p>
        </div>
      </div>

      <div class="hidden lg:flex bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-6 shadow-md  items-center gap-4 text-white">
        <div class="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
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
        <div class="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <i class="pi pi-history text-6xl text-slate-200 mb-4"></i>
          <h3 class="text-xl font-bold text-slate-700 mb-2">Nenhum registro encontrado</h3>
          <p class="text-slate-500 mb-6">Você ainda não possui registros de refeições.</p>
          
          <!-- Mensagem específica para não-bolsistas -->
          <Message v-if="!isBolsista" severity="info" :closable="false" class="text-left mb-6">
            <div class="space-y-2">
              <p class="font-semibold">Como funciona para estudantes não bolsistas:</p>
              <ul class="list-disc list-inside space-y-1 text-sm ml-2">
                <li>Inscreva-se na <strong>Fila de Extras</strong> para concorrer às vagas remanescentes</li>
                <li>As inscrições são liberadas no dia da refeição</li>
                <li>Após ser aprovado e consumir a refeição, ela aparecerá no seu histórico</li>
              </ul>
            </div>
          </Message>

          <!-- Mensagem específica para bolsistas -->
          <Message v-else severity="info" :closable="false" class="text-left mb-6">
            <div class="space-y-2">
              <p class="font-semibold">Como funciona para bolsistas:</p>
              <ul class="list-disc list-inside space-y-1 text-sm ml-2">
                <li>Suas refeições são registradas quando você confirma presença no refeitório</li>
                <li>Apresente sua carteirinha digital ao servidor</li>
                <li>Após a confirmação, a refeição aparecerá no seu histórico</li>
              </ul>
            </div>
          </Message>

          <div class="flex gap-3 justify-center flex-wrap">
            <Button
              v-if="!isBolsista"
              label="Ir para Fila de Extras"
              icon="pi pi-ticket"
              severity="success"
              @click="router.push('/dashboard/fila-extras')"
              class="!rounded-xl"
            />
            <Button
              v-else
              label="Ver Minha Carteirinha"
              icon="pi pi-qrcode"
              severity="success"
              @click="router.push('/dashboard/carteirinha')"
              class="!rounded-xl"
            />
            <Button
              label="Ver Cardápio"
              icon="pi pi-calendar"
              outlined
              @click="router.push('/dashboard/cardapio')"
              class="!rounded-xl"
            />
          </div>
        </div>
      </div>

      <div v-else class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-4">
        <DataTable
          v-model:filters="filters"
          :value="historico"
          :rows="10"
          :paginator="historico.length > 10"
          :globalFilterFields="['data', 'turno', 'prato_principal']"
          filterDisplay="row"
          stripedRows
          class="p-datatable-sm"
          responsiveLayout="stack"
          breakpoint="768px"
        >
          <template #header>
            <div class="flex flex-wrap justify-between items-center gap-4 mb-2">
              <span class="text-sm font-black text-slate-400 uppercase tracking-widest">Histórico de Refeições</span>
              <InputText v-model="filters['global'].value" placeholder="Buscar..." class="!rounded-xl" />
            </div>
          </template>
          <Column header="Data" field="data" :sortable="true" :showFilterMenu="false">
            <template #body="{ data }">
              <span class="font-semibold text-slate-700">{{ formatarData(data.data) }}</span>
            </template>
            <template #filter="{ filterModel, filterCallback }">
              <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="Filtrar data" class="!text-sm !py-1.5 !rounded-lg" />
            </template>
          </Column>

          <Column header="Turno" field="turno" :showFilterMenu="false">
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <i :class="data.turno === 'almoco' ? 'pi pi-sun text-amber-500' : 'pi pi-moon text-indigo-500'"></i>
                <span class="capitalize font-medium">{{ data.turno === 'almoco' ? 'Almoço' : 'Jantar' }}</span>
              </div>
            </template>
            <template #filter="{ filterModel, filterCallback }">
              <Select v-model="filterModel.value" :options="turnoOptions" optionLabel="label" optionValue="value" placeholder="Todos" @change="filterCallback()" class="!text-sm" showClear />
            </template>
          </Column>

          <Column header="Refeição" field="prato_principal">
            <template #body="{ data }">
              <span class="text-sm text-slate-600">{{ data.prato_principal || 'Refeição RI' }}</span>
            </template>
          </Column>

          <Column header="Status" field="presente" :showFilterMenu="false">
            <template #body="{ data }">
              <Tag
                :value="data.presente ? 'Presente' : 'Ausente'"
                :severity="data.presente ? 'success' : 'danger'"
                class="!rounded-full px-3 uppercase text-[10px] font-black"
              />
            </template>
            <template #filter="{ filterModel, filterCallback }">
              <Select v-model="filterModel.value" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Todos" @change="filterCallback()" class="!text-sm" showClear />
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
