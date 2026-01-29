<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { useToast } from 'primevue/usetoast'
import { adminPresencaService } from '../../services/adminPresenca'
import { useAvatar } from '../../composables/useAvatar'
import { useErrorMessage } from '../../composables/useErrorMessage'
import PageHeader from '../../components/common/PageHeader.vue'
import QrScanner from '../../components/common/QrScanner.vue'

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
import SelectButton from 'primevue/selectbutton'
import Avatar from 'primevue/avatar'

const toast = useToast()
const { getInitials, getAvatarStyle } = useAvatar()
const { extractErrorMessage } = useErrorMessage()
const tokenManual = ref('')
const buscaTermo = ref('')
const resultadosBusca = ref<any[]>([])
const loadingBusca = ref(false)
const loadingValidacao = ref(false)

// Lista do dia - com persistência
const dataFiltro = ref(
  localStorage.getItem('presencas_data') 
    ? new Date(localStorage.getItem('presencas_data')!) 
    : new Date()
)
const turnoFiltro = ref<'almoco' | 'jantar'>(
  (localStorage.getItem('presencas_turno') as 'almoco' | 'jantar') || 'almoco'
)
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

const getTurnoAtual = (): 'almoco' | 'jantar' => turnoFiltro.value || 'almoco'

const semRefeicao = ref(false)
const mensagemSemRefeicao = ref('')

const carregarListaDia = async () => {
  loadingDia.value = true
  semRefeicao.value = false
  mensagemSemRefeicao.value = ''
  try {
    const dataIso = dataFiltro.value.toISOString().split('T')[0]
    listaDia.value = await adminPresencaService.listarDoDia(dataIso, getTurnoAtual())
  } catch (err: any) {
    console.error('Erro ao carregar lista do dia', err)
    const errorMsg = extractErrorMessage(err, '')
    if (errorMsg.toLowerCase().includes('refeição') || errorMsg.toLowerCase().includes('refeicao')) {
      semRefeicao.value = true
      mensagemSemRefeicao.value = 'Não há refeição cadastrada para este dia e turno. Cadastre o cardápio primeiro.'
      listaDia.value = []
    }
  } finally {
    loadingDia.value = false
  }
}

watch([dataFiltro, turnoFiltro], () => {
  // Salvar no localStorage para persistência
  if (dataFiltro.value) {
    localStorage.setItem('presencas_data', dataFiltro.value.toISOString())
  }
  localStorage.setItem('presencas_turno', turnoFiltro.value)
  
  carregarListaDia()
})

onMounted(() => {
  carregarListaDia()
})

const isRefeicaoPassada = () => {
  const agora = new Date()
  const hoje = new Date()
  hoje.setHours(0,0,0,0)
  
  const filtro = new Date(dataFiltro.value)
  filtro.setHours(0,0,0,0)

  // Se data futura -> não passou
  if (filtro > hoje) return false 
  // Se data passada -> passou
  if (filtro < hoje) return true 

  // Se é hoje, verifica hora
  const hora = agora.getHours()
  // Almoço até 15h, Jantar até 21h (dando uma margem)
  if (turnoFiltro.value === 'almoco') return hora >= 15
  if (turnoFiltro.value === 'jantar') return hora >= 21
  
  return false
}

const getStatusSeverity = (status: string | null, temFaltaAntecipada = false) => {
  if (temFaltaAntecipada) return 'info'
  
  // Se não tem status, verifica se já passou
  if (!status) {
    return isRefeicaoPassada() ? 'danger' : 'secondary'
  }

  switch (status) {
    case 'presente': return 'success'
    case 'falta_justificada': return 'info'
    case 'falta_injustificada': return 'danger'
    case 'cancelado': return 'warn'
    default: return 'secondary'
  }
}

const getStatusLabel = (status: string | null, temFaltaAntecipada = false) => {
  if (temFaltaAntecipada) return 'JUSTIFICATIVA ANTECIPADA'
  
  // Se não tem status, verifica se já passou
  if (!status) {
    return isRefeicaoPassada() ? 'AUSENTE' : 'PENDENTE'
  }

  switch (status) {
    case 'presente': return 'PRESENTE'
    case 'falta_justificada': return 'FALTA JUSTIFICADA'
    case 'falta_injustificada': return 'AUSENTE' // Falta injustificada = Ausente
    case 'ausente': return 'AUSENTE'
    case 'cancelado': return 'CANCELADO'
    default: return status.replace('_', ' ').toUpperCase()
  }
}

const validarToken = async () => {
  if (!tokenManual.value) return
  if (loadingValidacao.value) return
  
  loadingValidacao.value = true
  try {
    const dataIso = dataFiltro.value.toISOString().split('T')[0]
    const token = tokenManual.value.trim()
    const isTokenFixo = token.startsWith('IFBA-') || token.length <= 20

    const res = isTokenFixo
      ? await adminPresencaService.validarQrCodeFixo(token, turnoFiltro.value, dataIso)
      : await adminPresencaService.validarQrCode(token)

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

const validarTokenQr = async (token: string) => {
  if (!token) return
  if (loadingValidacao.value) return
  
  loadingValidacao.value = true
  try {
    // Detectar se é token fixo (matrícula) ou temporário (hash)
    const isTokenFixo = token.startsWith('IFBA-') || token.length <= 20
    const dataIso = dataFiltro.value.toISOString().split('T')[0]
    
    const res = isTokenFixo
      ? await adminPresencaService.validarQrCodeFixo(token, turnoFiltro.value, dataIso)
      : await adminPresencaService.validarQrCode(token)
    
    toast.add({ 
      severity: 'success', 
      summary: 'Sucesso', 
      detail: res.meta?.message || res.message || 'Presença confirmada!',
      life: 3000
    })
    carregarListaDia()
  } catch (err: any) {
    toast.add({
      severity: 'error', 
      summary: 'Erro', 
      detail: err.response?.data?.message || 'Falha ao validar QR Code',
      life: 5000
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

    // Atualizar status localmente imediatamente
    const aluno = listaDia.value.find((a: any) => a.id === userId || a.user_id === userId)
    if (aluno) {
      aluno.status_presenca = 'presente'
      aluno.presente = true
      if (aluno.presenca_atual) {
        aluno.presenca_atual.status_da_presenca = 'presente'
      } else {
        aluno.presenca_atual = { status_da_presenca: 'presente' }
      }
    }

    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Presença confirmada!' })
    resultadosBusca.value = resultadosBusca.value.filter(a => a.id !== userId)

    // Recarregar lista do servidor em background
    carregarListaDia()
  } catch (err: any) {
    const errorMsg = extractErrorMessage(err, 'Falha ao confirmar')

    // Se já foi confirmada, atualizar o status local e mostrar info
    if (errorMsg.toLowerCase().includes('já') || errorMsg.toLowerCase().includes('confirmada')) {
      const aluno = listaDia.value.find((a: any) => a.id === userId || a.user_id === userId)
      if (aluno) {
        aluno.status_presenca = 'presente'
        aluno.presente = true
        if (aluno.presenca_atual) {
          aluno.presenca_atual.status_da_presenca = 'presente'
        } else {
          aluno.presenca_atual = { status_da_presenca: 'presente' }
        }
      }
      toast.add({ severity: 'info', summary: 'Info', detail: 'Presença já estava confirmada' })
      carregarListaDia()
    } else {
      toast.add({ severity: 'error', summary: 'Erro', detail: errorMsg })
    }
  }
}

const marcarFaltaManual = async (userId: number, justificada = false) => {
  try {
    const dataIso = dataFiltro.value.toISOString().split('T')[0]
    console.log('Marcando falta:', { userId, data: dataIso, turno: getTurnoAtual(), justificada })

    await adminPresencaService.marcarFalta(userId, dataIso, getTurnoAtual(), justificada)

    // Atualizar status localmente imediatamente
    const aluno = listaDia.value.find((a: any) => a.id === userId || a.user_id === userId)
    if (aluno) {
      aluno.status_presenca = justificada ? 'falta_justificada' : 'falta_injustificada'
      aluno.presente = false
      if (aluno.presenca_atual) {
        aluno.presenca_atual.status_da_presenca = justificada ? 'falta_justificada' : 'falta_injustificada'
      } else {
        aluno.presenca_atual = { status_da_presenca: justificada ? 'falta_justificada' : 'falta_injustificada' }
      }
    }

    toast.add({
      severity: justificada ? 'info' : 'warn',
      summary: 'Sucesso',
      detail: justificada ? 'Falta justificada registrada' : 'Falta injustificada registrada'
    })

    // Recarregar lista do servidor após um pequeno delay para garantir persistência
    setTimeout(() => carregarListaDia(), 500)
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Erro', 
      detail: extractErrorMessage(err, 'Falha ao registrar falta')
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
            <template #empty>
              <div v-if="semRefeicao" class="text-center p-6">
                <i class="pi pi-calendar-times text-4xl text-orange-400 mb-3"></i>
                <p class="text-orange-600 font-semibold">{{ mensagemSemRefeicao }}</p>
                <Button
                  label="Ir para Cardápios"
                  icon="pi pi-arrow-right"
                  class="mt-4 !rounded-xl"
                  severity="warning"
                  @click="$router.push('/admin/cardapios')"
                />
              </div>
              <p v-else class="text-center p-4">Nenhum bolsista para este dia/turno.</p>
            </template>
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
                <div v-if="data.tem_falta_antecipada" class="flex justify-center gap-1">
                  <Tag severity="info" class="!rounded-full px-2 text-[9px]">
                    <i class="pi pi-lock mr-1"></i> Justificado
                  </Tag>
                </div>
                <!-- Se já está presente, mostrar botão para desfazer -->
                <div v-else-if="data.presenca_atual?.status_da_presenca === 'presente'" class="flex justify-center gap-1">
                  <Button
                    icon="pi pi-times"
                    severity="secondary"
                    text
                    size="small"
                    @click="marcarFaltaManual(data.id, false)"
                    v-tooltip.top="'Desfazer Presença'"
                    class="!rounded-lg"
                  />
                </div>
                <!-- Se já está com falta marcada, mostrar botão para confirmar presença -->
                <div v-else-if="data.presenca_atual?.status_da_presenca === 'falta_justificada' || data.presenca_atual?.status_da_presenca === 'falta_injustificada'" class="flex justify-center gap-1">
                  <Button
                    icon="pi pi-check-circle"
                    severity="success"
                    text
                    size="small"
                    @click="confirmarPresencaManual(data.id)"
                    v-tooltip.top="'Confirmar Presença'"
                    class="!rounded-lg"
                  />
                </div>
                <!-- Ações disponíveis (pendente/sem registro) -->
                <div v-else class="flex justify-center gap-1">
                  <Button
                    icon="pi pi-check-circle"
                    severity="success" 
                    outlined
                    size="small"
                    @click="confirmarPresencaManual(data.id)"
                    v-tooltip.top="'Confirmar Presença'"
                    class="!rounded-lg"
                  />
                  <Button 
                    icon="pi pi-times-circle"
                    severity="danger" 
                    outlined
                    size="small"
                    v-tooltip.top="'Marcar Falta'"
                    @click="marcarFaltaManual(data.id, false)"
                    class="!rounded-lg"
                  />
                  <Button
                    icon="pi pi-file-edit"
                    severity="info"
                    outlined
                    size="small"
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
        <!-- Validação de QR Code -->
        <Card class="!rounded-xl border border-slate-200 shadow-sm">
          <template #title>
             <div class="flex items-center gap-2">
                <i class="pi pi-qrcode text-primary-600"></i>
                <span class="text-lg font-bold text-slate-700">Presença por QR Code</span>
             </div>
          </template>
          <template #content>
            <div class="space-y-4">
              <!-- QR Scanner Component -->
              <QrScanner 
                @scan="validarTokenQr"
                @error="(err) => toast.add({ severity: 'error', summary: 'Erro', detail: err })"
                :fps="10"
                :qrbox="250"
              />
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
