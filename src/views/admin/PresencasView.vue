<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { useToast } from 'primevue/usetoast'
import { adminPresencaService } from '../../services/adminPresenca'
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
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Avatar from 'primevue/avatar'

const toast = useToast()
const { getInitials, getAvatarStyle } = useAvatar()
const tokenManual = ref('')
const buscaTermo = ref('')
const resultadosBusca = ref<any[]>([])
const loadingBusca = ref(false)
const loadingValidacao = ref(false)

// Lista do dia
const dataFiltro = ref(new Date())
const turnoFiltro = ref<'almoco' | 'jantar'>('almoco')
const listaDia = ref<any[]>([])
const loadingDia = ref(false)

const filters = ref()

const initFilters = () => {
  filters.value = {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
  }
}

initFilters()

const clearFilter = () => {
  initFilters()
}

type TurnoType = 'almoco' | 'jantar'
const turnos: Array<{label: string, value: TurnoType}> = [
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
]

const getTurnoAtual = (): string => turnoFiltro.value || 'almoco'

const carregarListaDia = async () => {
  loadingDia.value = true
  try {
    const dataIso = dataFiltro.value.toISOString().split('T')[0]
    listaDia.value = await adminPresencaService.listarDoDia(dataIso, getTurnoAtual())
  } catch (err) {
    console.error('Erro ao carregar lista do dia', err)
  } finally {
    loadingDia.value = false
  }
}

watch([dataFiltro, turnoFiltro], () => {
  carregarListaDia()
})

onMounted(() => {
  carregarListaDia()
})

const getStatusSeverity = (status: string | null, temFaltaAntecipada = false) => {
  if (temFaltaAntecipada) return 'info'
  if (!status) return 'secondary'
  switch (status) {
    case 'presente': return 'success'
    case 'falta_justificada': return 'info'
    case 'falta_injustificada': return 'danger'
    case 'cancelado': return 'warn'
    default: return 'secondary'
  }
}

const getStatusLabel = (status: string | null, temFaltaAntecipada = false) => {
  if (temFaltaAntecipada) return 'FALTA ANTECIPADA'
  if (!status) return 'Pendente'
  switch (status) {
    case 'presente': return 'PRESENTE'
    case 'falta_justificada': return 'FALTA JUSTIFICADA'
    case 'falta_injustificada': return 'FALTA'
    case 'cancelado': return 'CANCELADO'
    default: return status.replace('_', ' ').toUpperCase()
  }
}

const validarToken = async () => {
  if (!tokenManual.value) return
  
  loadingValidacao.value = true
  try {
    const res = await adminPresencaService.validarQrCode(tokenManual.value)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: res.message || 'Presença confirmada!' })
    tokenManual.value = ''
    carregarListaDia()
  } catch (err: any) {
    toast.add({
      severity: 'error', 
      summary: 'Erro', 
      detail: err.response?.data?.message || 'Falha ao validar token' 
    })
  } finally {
    loadingValidacao.value = false
  }
}

const buscarAlunos = async () => {
  if (buscaTermo.value.length < 3) return
  
  loadingBusca.value = true
  try {
    const dataIso = dataFiltro.value.toISOString().split('T')[0]
    resultadosBusca.value = await adminPresencaService.buscarBolsista(
      buscaTermo.value, 
      turnoFiltro.value,
      dataIso
    )
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha na busca' })
  } finally {
    loadingBusca.value = false
  }
}

const confirmarPresencaManual = async (userId: number) => {
  try {
    const dataIso = dataFiltro.value.toISOString().split('T')[0]
    await adminPresencaService.confirmarPorId(userId, dataIso, turnoFiltro.value)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Presença confirmada manualmente' })
    carregarListaDia()
    resultadosBusca.value = resultadosBusca.value.filter(a => a.id !== userId)
  } catch (err: any) {
    toast.add({ 
      severity: 'error', 
      summary: 'Erro', 
      detail: err.response?.data?.message || 'Falha ao confirmar' 
    })
  }
}

const marcarFaltaManual = async (userId: number, justificada = false) => {
  try {
    const dataIso = dataFiltro.value.toISOString().split('T')[0]
    await adminPresencaService.marcarFalta(userId, dataIso, getTurnoAtual(), justificada)
    toast.add({
      severity: justificada ? 'info' : 'warn',
      summary: 'Sucesso',
      detail: justificada ? 'Falta justificada registrada' : 'Falta injustificada registrada'
    })
    carregarListaDia()
  } catch (err: any) {
    toast.add({ 
      severity: 'error', 
      summary: 'Erro', 
      detail: err.response?.data?.message || 'Falha ao registrar falta' 
    })
  }
}
</script>

<template>
  <div class="space-y-6 animate-fadein">
    <PageHeader
      title="Controle de Presenças"
      subtitle="Valide QR Codes ou confirme presenças manualmente."
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Controle de Presença' }]"
    />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Filtros e Lista do Dia -->
      <Card class="lg:col-span-2 overflow-hidden !rounded-xl border border-slate-200 shadow-sm">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-list text-primary-600"></i>
            <span class="text-xl font-bold text-slate-700">Lista de Presença do Dia</span>
          </div>
        </template>
        <template #content>
          <DataTable
            v-model:filters="filters"
            :value="listaDia"
            paginator
            :rows="10"
            dataKey="id"
            filterDisplay="menu"
            :loading="loadingDia"
            :globalFilterFields="['nome', 'matricula']"
            class="p-datatable-sm custom-table"
          >
            <template #header>
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div class="flex gap-2">
                  <Button type="button" icon="pi pi-filter-slash" label="Limpar" variant="outlined" @click="clearFilter()" size="small" class="!rounded-xl" />
                  <InputText v-model="filters['global'].value" placeholder="Buscar aluno..." size="small" class="!rounded-xl" />
                </div>
                <div class="flex gap-2 items-center">
                  <DatePicker v-model="dataFiltro" dateFormat="dd/mm/yy" showIcon class="w-36" :locale="ptBR" size="small" />
                  <SelectButton 
                    v-model="turnoFiltro" 
                    :options="turnos" 
                    optionLabel="label" 
                    optionValue="value" 
                    :allowEmpty="false"
                    class="custom-select-button"
                  >
                    <template #option="slotProps">
                      <div class="flex items-center gap-1 px-1">
                        <i :class="slotProps.option.value === 'almoco' ? 'pi pi-sun' : 'pi pi-moon'" class="text-xs"></i>
                        <span class="text-[10px] font-bold uppercase tracking-tight">{{ slotProps.option.label }}</span>
                      </div>
                    </template>
                  </SelectButton>
                </div>
              </div>
            </template>
            <template #empty> <p class="text-center p-4">Nenhum bolsista para este dia/turno.</p> </template>
            <Column header="Aluno" sortable field="nome">
              <template #body="{ data }">
                <div class="flex items-center gap-3">
                  <Avatar
                    v-if="data.foto"
                    :image="data.foto"
                    shape="circle"
                    class="flex-shrink-0"
                  />
                  <Avatar
                    v-else
                    :label="getInitials(data.nome)"
                    shape="circle"
                    class="flex-shrink-0"
                    :style="getAvatarStyle(data.nome)"
                  />
                  <div class="flex flex-col">
                    <span class="font-bold text-slate-700">{{ data.nome }}</span>
                    <span class="text-[10px] text-slate-400 font-black uppercase">{{ data.matricula }}</span>
                  </div>
                </div>
              </template>
            </Column>
            <Column header="Status" sortable field="presenca_atual.status_da_presenca">
              <template #body="{ data }">
                <div class="flex flex-col gap-1">
                  <Tag
                    :value="getStatusLabel(data.presenca_atual?.status_da_presenca, data.tem_falta_antecipada)"
                    :severity="getStatusSeverity(data.presenca_atual?.status_da_presenca, data.tem_falta_antecipada)"
                    class="!rounded-full px-3 text-[10px] font-black uppercase"
                  />
                  <span v-if="data.tem_falta_antecipada && data.justificativa_antecipada" class="text-[9px] text-slate-400 italic">
                    {{ data.justificativa_antecipada.motivo?.substring(0, 40) }}{{ data.justificativa_antecipada.motivo?.length > 40 ? '...' : '' }}
                  </span>
                </div>
              </template>
            </Column>
            <Column header="Ações" class="text-center">
              <template #body="{ data }">
                <!-- Se tem falta antecipada, ações desabilitadas -->
                <div v-if="data.tem_falta_antecipada" class="text-xs text-slate-400 italic">
                  <i class="pi pi-lock mr-1"></i> Justificado
                </div>
                <!-- Se já está presente, só mostra indicador -->
                <div v-else-if="data.presenca_atual?.status_da_presenca === 'presente'" class="text-xs text-green-600 font-bold">
                  <i class="pi pi-check-circle mr-1"></i> Presente
                </div>
                <!-- Se já está com falta marcada, mostra status -->
                <div v-else-if="data.presenca_atual?.status_da_presenca === 'falta_justificada' || data.presenca_atual?.status_da_presenca === 'falta_injustificada'" class="text-xs text-slate-500 font-bold">
                  <i class="pi pi-info-circle mr-1"></i> Registrada
                </div>
                <!-- Ações disponíveis -->
                <div v-else class="flex justify-center gap-1">
                  <Button
                    icon="pi pi-check-circle"
                    severity="success" 
                    outlined
                    @click="confirmarPresencaManual(data.id)"
                    v-tooltip.top="'Confirmar Presença'"
                    class="!rounded-lg"
                  />
                  <Button 
                    icon="pi pi-times-circle"
                    severity="danger" 
                    outlined
                    v-tooltip.top="'Marcar Falta'"
                    @click="marcarFaltaManual(data.id, false)"
                    class="!rounded-lg"
                  />
                  <Button
                    icon="pi pi-file-edit"
                    severity="info"
                    outlined
                    v-tooltip.top="'Falta Justificada'"
                    @click="marcarFaltaManual(data.id, true)"
                    class="!rounded-lg"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>

      <div class="space-y-6">
        <!-- Busca Manual -->
        <Card class="!rounded-xl border border-slate-200 shadow-sm">
          <template #title>
             <div class="flex items-center gap-2">
                <i class="pi pi-search text-primary-600"></i>
                <span class="text-lg font-bold text-slate-700">Busca Rápida</span>
             </div>
          </template>
          <template #content>
            <div class="space-y-4">
              <div class="flex gap-2">
                <InputText v-model="buscaTermo" placeholder="Nome ou Matrícula..." class="flex-1 !rounded-xl" @keyup.enter="buscarAlunos" />
                <Button icon="pi pi-search" @click="buscarAlunos" :loading="loadingBusca" class="!rounded-xl" />
              </div>

              <DataTable :value="resultadosBusca" scrollable scrollHeight="200px" class="p-datatable-sm custom-table">
                <template #empty> <p class="text-center p-2 text-xs text-slate-400">Pesquise para listar.</p> </template>
                <Column field="nome" header="Aluno">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <Avatar
                        v-if="data.foto"
                        :image="data.foto"
                        shape="circle"
                        size="small"
                      />
                      <Avatar
                        v-else
                        :label="getInitials(data.nome)"
                        shape="circle"
                        size="small"
                        :style="getAvatarStyle(data.nome)"
                      />
                      <div class="flex flex-col">
                        <span class="text-xs font-bold text-slate-700">{{ data.nome }}</span>
                        <span class="text-[9px] text-slate-400">{{ data.matricula }}</span>
                      </div>
                    </div>
                  </template>
                </Column>
                <Column header="Ação" class="text-right">
                  <template #body="{ data }">
                    <Button icon="pi pi-user-plus" severity="success" text rounded @click="confirmarPresencaManual(data.id)" v-tooltip.left="'Adicionar Presença'" />
                  </template>
                </Column>
              </DataTable>
            </div>
          </template>
        </Card>
        <!-- Validação de QR Code -->
        <Card class="!rounded-xl border border-slate-200 shadow-sm">
          <template #title>
             <div class="flex items-center gap-2">
                <i class="pi pi-qrcode text-primary-600"></i>
                <span class="text-lg font-bold text-slate-700">Validação de QR Code</span>
             </div>
          </template>
          <template #content>
            <div class="space-y-4">
              <div class="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                <i class="pi pi-qrcode text-6xl text-slate-200 mb-4"></i>
                <p class="text-slate-400 mb-4 text-xs font-medium">Aponte a câmera para o QR Code do estudante</p>
                <Button label="Ativar Câmera" icon="pi pi-camera" severity="success" disabled class="w-full !rounded-xl" v-tooltip.bottom="'Está sendo implementado'" />
              </div>

              <div class="relative py-2">
                <div class="absolute inset-0 flex items-center" aria-hidden="true">
                  <div class="w-full border-t border-slate-100"></div>
                </div>
                <div class="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                  <span class="bg-white px-2 text-slate-300">ou use o token</span>
                </div>
              </div>

              <div class="flex gap-2">
                <InputText v-model="tokenManual" placeholder="Token manual..." class="flex-1 !rounded-xl" @keyup.enter="validarToken" />
                <Button icon="pi pi-check" @click="validarToken" :loading="loadingValidacao" severity="primary" class="!rounded-xl" />
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-table :deep(.p-datatable-thead > tr > th) {
  border-top: 0;
  border-left: 0;
  border-right: 0;
  background: transparent;
}

.custom-table :deep(.p-datatable-tbody > tr > td) {
  border-left: 0;
  border-right: 0;
}

.custom-select-button :deep(.p-button) {
  border: 0;
  background: transparent;
  color: #64748b;
  font-weight: 700;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
}

.custom-select-button :deep(.p-button.p-highlight) {
  background: #f1f5f9;
  color: #1e293b;
}

.custom-select-button :deep(.p-button:not(.p-highlight):hover) {
  background: #f8fafc;
}
</style>