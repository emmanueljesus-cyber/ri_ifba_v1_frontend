<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { adminDashboardService } from '../../services/adminDashboard'
import { adminPresencaService } from '../../services/adminPresenca'
import { useAvatar } from '../../composables/useAvatar'
import { useToast } from 'primevue/usetoast'
import PageHeader from '../../components/common/PageHeader.vue'
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
const validandoToken = ref(false)

const turnoOptions = [
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
]

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

    <!-- Métricas Rápidas -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div class="p-3 bg-emerald-50 rounded-xl text-emerald-600">
          <i class="pi pi-users text-2xl"></i>
        </div>
        <div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bolsistas Ativos</p>
          <p class="text-2xl font-black text-slate-800 leading-tight lato-black">{{ resumo?.metricas.bolsistas_ativos || 0 }}</p>
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div class="p-3 bg-blue-50 rounded-xl text-blue-600">
          <i class="pi pi-check-circle text-2xl"></i>
        </div>
        <div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Presenças Hoje</p>
          <p class="text-2xl font-black text-slate-800 leading-tight lato-black">{{ resumo?.metricas.presencas_hoje || 0 }}</p>
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div class="p-3 bg-orange-50 rounded-xl text-orange-600">
          <i class="pi pi-file-edit text-2xl"></i>
        </div>
        <div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Justificativas</p>
          <p class="text-2xl font-black text-slate-800 leading-tight lato-black">{{ resumo?.metricas.justificativas_pendentes || 0 }}</p>
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div class="p-3 bg-red-50 rounded-xl text-red-600">
          <i class="pi pi-times-circle text-2xl"></i>
        </div>
        <div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faltas Hoje</p>
          <p class="text-2xl font-black text-slate-800 leading-tight lato-black">{{ resumo?.metricas.faltas_hoje || 0 }}</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Bolsistas do Dia -->
      <div class="lg:col-span-2">
        <Card class="!rounded-xl !border-slate-200 overflow-hidden shadow-sm">
          <template #title>
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-lg font-black text-slate-700 uppercase tracking-wider">Bolsistas do Dia</h3>
                <p class="text-xs text-slate-500 font-medium mt-1">Lista de quem tem direito à refeição hoje.</p>
              </div>
              <SelectButton 
                v-model="turnoSelecionado" 
                :options="turnoOptions" 
                optionLabel="label" 
                optionValue="value" 
                :unselectable="false"
                class="!rounded-xl"
              />
            </div>
          </template>
          <template #content>
            <DataTable 
              :value="bolsistasHoje" 
              :loading="loadingBolsistas" 
              paginator 
              :rows="10" 
              class="p-datatable-sm"
              :rowsPerPageOptions="[5, 10, 20]"
              paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            >
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
                      class="flex-shrink-0" 
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
              class="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex justify-between items-center" 
              v-if="resumo?.refeicao_atual"
            >
              <div class="flex items-center gap-2">
                <i class="pi pi-chart-bar text-emerald-600"></i>
                <span class="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                  Ocupação do {{ resumo.refeicao_atual.turno }}:
                </span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-sm font-black text-emerald-800">
                  {{ resumo.refeicao_atual.confirmados }} / {{ resumo.refeicao_atual.capacidade }}
                </span>
                <div class="w-32 h-2.5 bg-emerald-200 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300" 
                    :style="{ width: Math.min(100, (resumo.refeicao_atual.confirmados / resumo.refeicao_atual.capacidade) * 100) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Ações Rápidas -->
      <div class="space-y-6">
        <Card class="!rounded-xl !border-slate-200 overflow-hidden shadow-sm">
          <template #title>
             <span class="text-base font-black text-slate-700 uppercase tracking-wider">Validação Rápida</span>
          </template>
          <template #content>
            <div class="space-y-4">
              <p class="text-xs text-slate-500">Digite a matrícula para confirmar presença manualmente.</p>
              <div class="flex flex-col gap-3">
                <IconField iconPosition="left">
                  <InputIcon class="pi pi-user" />
                  <InputText v-model="buscaRapida" placeholder="Matrícula..." class="w-full !rounded-xl" @keyup.enter="validarMatriculaRapida" />
                </IconField>
                <Button label="Validar Matrícula" icon="pi pi-check" class="w-full !rounded-xl shadow-md" severity="success" :loading="validandoToken" @click="validarMatriculaRapida" />
              </div>
              
              <div class="relative py-2">
                <div class="absolute inset-0 flex items-center"><span class="w-full border-t border-slate-100"></span></div>
                <div class="relative flex justify-center text-[10px] font-black text-slate-400 uppercase"><span class="bg-white px-2">ou</span></div>
              </div>
              
              <Button label="Escanear QR Code" icon="pi pi-qrcode" class="w-full !rounded-xl" severity="secondary" outlined @click="$router.push('/admin/presencas')" />
            </div>
          </template>
        </Card>

        <Card class="!rounded-xl !border-slate-200 overflow-hidden shadow-sm">
          <template #title>
             <span class="text-base font-black text-slate-700 uppercase tracking-wider">Outras Ações</span>
          </template>
          <template #content>
            <div class="flex flex-col gap-2">
              <Button label="Gerenciar Cardápios" icon="pi pi-calendar-plus" text class="!justify-start !text-slate-600 hover:!bg-slate-50 !rounded-xl" @click="$router.push('/admin/cardapios')" />
              <Button label="Relatórios Gerais" icon="pi pi-file-pdf" text class="!justify-start !text-slate-600 hover:!bg-slate-50 !rounded-xl" @click="$router.push('/admin/relatorios')" />
              <Button label="Gestão de Bolsistas" icon="pi pi-users" text class="!justify-start !text-slate-600 hover:!bg-slate-50 !rounded-xl" @click="$router.push('/admin/bolsistas')" />
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
