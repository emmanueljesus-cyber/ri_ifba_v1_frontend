<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { adminPresencaService } from '../../services/adminPresenca'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'

const toast = useToast()
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
    resultadosBusca.value = await adminPresencaService.buscarBolsista(buscaTermo.value)
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
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">Controle de Presenças</h1>
      <p class="text-slate-500">Valide QR Codes ou confirme presenças manualmente.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Filtros e Lista do Dia -->
      <Card class="lg:col-span-2">
        <template #title>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
<!--            botar a busca aqui. -->
<!--            ajustar tamanho da tabela-->
<!--            ajustar estilo, usar datatable botão de almoço/jantar-->
            <span>Lista de Presença do Dia</span>
            <div class="flex gap-2">
              <DatePicker v-model="dataFiltro" dateFormat="dd/mm/yy" showIcon class="w-40" />
              <Select v-model="turnoFiltro" :options="turnos" optionLabel="label" optionValue="value" class="w-32" />
            </div>
          </div>
        </template>
        <template #content>
          <DataTable :value="listaDia" :loading="loadingDia" paginator :rows="10" class="p-datatable-sm">
            <template #empty> <p class="text-center p-4">Nenhum bolsista para este dia/turno.</p> </template>
            <Column header="Aluno">
              <template #body="{ data }">
                <div class="flex flex-col">
                  <span class="font-bold text-slate-700">{{ data.nome }}</span>
                  <span class="text-[10px] text-slate-400 font-black uppercase">{{ data.matricula }}</span>
                </div>
              </template>
            </Column>
            <Column header="Status">
              <template #body="{ data }">
                <div class="flex flex-col gap-1">
                  <Tag
                    :value="getStatusLabel(data.presenca_atual?.status_da_presenca, data.tem_falta_antecipada)"
                    :severity="getStatusSeverity(data.presenca_atual?.status_da_presenca, data.tem_falta_antecipada)"
                    class="!rounded-full px-3 text-[10px]"
                  />
                  <span v-if="data.tem_falta_antecipada && data.justificativa_antecipada" class="text-[9px] text-slate-400 italic">
                    {{ data.justificativa_antecipada.motivo?.substring(0, 40) }}{{ data.justificativa_antecipada.motivo?.length > 40 ? '...' : '' }}
                  </span>
                </div>
              </template>
            </Column>
            <Column header="Ações">
              <template #body="{ data }">
                <!-- Se tem falta antecipada, ações desabilitadas -->
                <div v-if="data.tem_falta_antecipada" class="text-xs text-slate-400 italic">
                  <i class="pi pi-lock mr-1"></i> Justificado antecipadamente
                </div>
                <!-- Se já está presente, só mostra indicador -->
                <div v-else-if="data.presenca_atual?.status_da_presenca === 'presente'" class="text-xs text-green-600">
                  <i class="pi pi-check-circle mr-1"></i> Presente
                </div>
                <!-- Se já está com falta marcada, mostra status -->
                <div v-else-if="data.presenca_atual?.status_da_presenca === 'falta_justificada' || data.presenca_atual?.status_da_presenca === 'falta_injustificada'" class="text-xs text-slate-500">
                  <i class="pi pi-info-circle mr-1"></i> Falta registrada
                </div>
                <!-- Ações disponíveis -->
                <div v-else class="flex gap-1 flex-wrap">
                  <Button
                    icon="pi pi-check"
                    severity="success" 
                    text 
                    rounded
                    size="small"
                    @click="confirmarPresencaManual(data.id)"
                    title="Confirmar Presença"
                  />
                  <Button 
                    icon="pi pi-times"
                    severity="danger" 
                    text 
                    rounded
                    size="small"
                    title="Marcar Falta Injustificada"
                    @click="marcarFaltaManual(data.id, false)"
                  />
                  <Button
                    icon="pi pi-file-check"
                    severity="info"
                    text
                    rounded
                    size="small"
                    title="Marcar Falta Justificada"
                    @click="marcarFaltaManual(data.id, true)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>

      <div class="space-y-6">
        <!-- Busca Manual -->
        <Card>
          <template #title> Busca Manual </template>
          <template #content>
            <div class="space-y-4">
              <div class="flex gap-2">
                <InputText v-model="buscaTermo" placeholder="Nome ou Matrícula..." class="flex-1" @keyup.enter="buscarAlunos" />
                <Button icon="pi pi-search" @click="buscarAlunos" :loading="loadingBusca" />
              </div>

              <DataTable :value="resultadosBusca" scrollable scrollHeight="200px" class="p-datatable-sm">
                <template #empty> <p class="text-center p-2 text-xs text-slate-400">Pesquise para listar.</p> </template>
                <Column field="nome" header="Aluno">
                  <template #body="{ data }">
                    <span class="text-xs font-bold">{{ data.nome }}</span>
                  </template>
                </Column>
                <Column header="Ação">
                  <template #body="{ data }">
                    <Button icon="pi pi-user-plus" severity="success" text rounded @click="confirmarPresencaManual(data.id)" />
                  </template>
                </Column>
              </DataTable>
            </div>
          </template>
        </Card>
        <!-- Validação de QR Code -->
        <Card>
          <template #title> Validação de QR Code </template>
          <template #content>
            <div class="space-y-4">
              <div class="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center">
                <i class="pi pi-qrcode text-6xl text-slate-300 mb-4"></i>
                <p class="text-slate-500 mb-4 text-sm">Aponte a câmera para o QR Code</p>
                <Button label="Ativar Câmera" icon="pi pi-camera" severity="success" disabled class="w-full" />
              </div>

              <div class="flex gap-2">
                <InputText v-model="tokenManual" placeholder="Token manual..." class="flex-1" @keyup.enter="validarToken" />
                <Button icon="pi pi-check" @click="validarToken" :loading="loadingValidacao" />
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>
