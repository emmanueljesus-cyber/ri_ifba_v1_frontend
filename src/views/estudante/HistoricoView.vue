<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { FilterMatchMode, FilterService } from '@primevue/core/api'
import { useAuthStore } from '../../stores/auth'
import { historicoService } from '../../services/historico'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
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
  data: { value: null, matchMode: 'dateFilter' },
  turno: { value: null, matchMode: FilterMatchMode.EQUALS },
  presente: { value: null, matchMode: FilterMatchMode.EQUALS }
})

// Função para comparar data do filtro (Date) com data do registro (string YYYY-MM-DD)
const dateFilterFunction = (value: string, filter: Date | null) => {
  if (!filter) return true
  if (!value) return false

  // Converte a data do filtro para string YYYY-MM-DD
  const filterYear = filter.getFullYear()
  const filterMonth = String(filter.getMonth() + 1).padStart(2, '0')
  const filterDay = String(filter.getDate()).padStart(2, '0')
  const filterDateStr = `${filterYear}-${filterMonth}-${filterDay}`

  return value === filterDateStr
}

// Registra o filtro customizado no PrimeVue
FilterService.register('dateFilter', dateFilterFunction)

const statusOptions = [
  { label: 'Presente', value: true },
  { label: 'Ausente', value: false }
]

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

    <!-- Tabela de Histórico (Visual Clean) -->
    <section>
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
          :loading="loading"
        >
          <template #loading>
            <div class="flex items-center justify-center py-12">
              <i class="pi pi-spinner pi-spin text-4xl text-primary-500"></i>
            </div>
          </template>
          <template #header>
            <div class="flex flex-wrap justify-between items-center gap-4 mb-2">
              <span class="text-sm font-black text-slate-400 uppercase tracking-widest">Histórico de Refeições</span>
              <InputText v-model="filters['global'].value" placeholder="Buscar..." class="!rounded-xl" />
            </div>
          </template>
          <Column header="Data" field="data" :sortable="true" :showFilterMenu="false" :filterMatchModeOptions="[{ label: 'Data', value: 'dateFilter' }]">
            <template #body="{ data }">
              <span class="font-semibold text-slate-700">{{ formatarData(data.data) }}</span>
            </template>
            <template #filter="{ filterModel, filterCallback }">
              <DatePicker
                v-model="filterModel.value"
                dateFormat="dd/mm/yy"
                @date-select="filterCallback()"
                placeholder="Filtrar data"
                showIcon
                showButtonBar
                class="!text-sm w-full"
                @clear-click="filterCallback()"
              />
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
