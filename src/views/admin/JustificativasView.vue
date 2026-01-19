<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { justificativaService } from '../../services/justificativas'
import type { Justificativa } from '../../types/justificativa'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'

const toast = useToast()
const justificativas = ref<Justificativa[]>([])
const loading = ref(false)
const displayDialog = ref(false)
const selectedJustificativa = ref<Justificativa | null>(null)
const motivoRejeicao = ref('')
const loadingAction = ref(false)

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'aprovada': return 'success'
    case 'rejeitada': return 'danger'
    case 'pendente': return 'warn'
    default: return 'info'
  }
}

const carregarJustificativas = async () => {
  loading.value = true
  try {
    justificativas.value = await justificativaService.listarTodasAdmin()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar justificativas' })
  } finally {
    loading.value = false
  }
}

const abrirDetalhes = (justificativa: Justificativa) => {
  selectedJustificativa.value = justificativa
  motivoRejeicao.value = ''
  displayDialog.value = true
}

const abrirAnexo = (id: number) => {
  window.open(`${import.meta.env.VITE_API_BASE_URL}/admin/justificativas/${id}/anexo`, '_blank')
}

const aprovar = async () => {
  if (!selectedJustificativa.value) return
  loadingAction.value = true
  try {
    await justificativaService.aprovarAdmin(selectedJustificativa.value.id)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Justificativa aprovada' })
    displayDialog.value = false
    carregarJustificativas()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao aprovar' })
  } finally {
    loadingAction.value = false
  }
}

const rejeitar = async () => {
  if (!selectedJustificativa.value || !motivoRejeicao.value) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Informe o motivo da rejeição' })
    return
  }
  loadingAction.value = true
  try {
    await justificativaService.rejeitarAdmin(selectedJustificativa.value.id, motivoRejeicao.value)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Justificativa rejeitada' })
    displayDialog.value = false
    carregarJustificativas()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao rejeitar' })
  } finally {
    loadingAction.value = false
  }
}

onMounted(() => {
  carregarJustificativas()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">Gerenciar Justificativas</h1>
      <p class="text-slate-500">Analise e decida sobre as justificativas dos alunos.</p>
    </div>

    <div class="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
      <DataTable :value="justificativas" :loading="loading" paginator :rows="10" class="p-datatable-sm">
        <Column header="Aluno">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                {{ data.usuario?.nome?.charAt(0) }}
              </div>
              <div class="flex flex-col">
                <span class="font-bold text-slate-700">{{ data.usuario?.nome }}</span>
                <span class="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{{ data.usuario?.matricula }}</span>
              </div>
            </div>
          </template>
        </Column>
        <Column header="Refeição">
          <template #body="{ data }">
            <div class="flex items-center gap-2" v-if="data.refeicao">
              <span class="text-lg">{{ data.refeicao.turno === 'almoco' ? '🌅' : '🌙' }}</span>
              <div>
                <p class="text-sm font-bold text-slate-800">{{ data.refeicao.data }}</p>
                <p class="text-[10px] text-slate-400 font-black uppercase">{{ data.refeicao.turno }}</p>
              </div>
            </div>
          </template>
        </Column>
        <Column header="Status">
          <template #body="{ data }">
            <Tag :value="data.status_justificativa" :severity="getStatusSeverity(data.status_justificativa)" class="!rounded-full px-3 uppercase text-[10px] font-black" />
          </template>
        </Column>
        <Column header="Ações" class="text-right">
          <template #body="{ data }">
            <Button icon="pi pi-search-plus" outlined rounded severity="secondary" @click="abrirDetalhes(data)" class="!border-slate-200 !text-slate-500" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog 
      v-model:visible="displayDialog" 
      header="Analisar Justificativa" 
      :style="{ width: '90%', maxWidth: '500px' }" 
      modal
      class="!rounded-[2.5rem] overflow-hidden"
    >
      <div v-if="selectedJustificativa" class="space-y-6 py-4">
        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Motivo do Aluno:</p>
          <p class="text-slate-800 text-sm leading-relaxed">{{ selectedJustificativa.motivo }}</p>
        </div>

        <div v-if="selectedJustificativa.tem_anexo" class="flex justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl">
          <Button 
            label="Visualizar Documento" 
            icon="pi pi-external-link" 
            text 
            severity="info"
            @click="abrirAnexo(selectedJustificativa.id)" 
          />
        </div>

        <div v-if="selectedJustificativa.status_justificativa === 'pendente'" class="space-y-4 pt-4 border-t border-slate-100">
          <div class="flex flex-col gap-2">
            <label class="text-xs font-black text-red-500 uppercase tracking-widest">Motivo da Rejeição (se aplicável)</label>
            <Textarea 
              v-model="motivoRejeicao" 
              rows="3" 
              placeholder="Descreva o motivo caso vá rejeitar..." 
              class="w-full !rounded-2xl" 
            />
          </div>
          <div class="flex gap-3 pt-2">
            <Button label="Rejeitar" icon="pi pi-times" severity="danger" outlined @click="rejeitar" :loading="loadingAction" class="flex-1 !rounded-xl" />
            <Button label="Aprovar" icon="pi pi-check" severity="success" @click="aprovar" :loading="loadingAction" class="flex-1 !rounded-xl" />
          </div>
        </div>
        <div v-else class="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
          <p class="text-blue-700 text-sm font-medium italic">Esta justificativa já foi {{ selectedJustificativa.status_justificativa }}.</p>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.capitalize {
  text-transform: capitalize;
}
</style>
