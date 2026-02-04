<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { useFilaExtrasStore } from '../../stores/filaExtras'
import { useToast } from 'primevue/usetoast'
import PageHeader from '../../components/common/PageHeader.vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Skeleton from 'primevue/skeleton'
import InputText from 'primevue/inputtext'

const filaStore = useFilaExtrasStore()
const toast = useToast()
const errorMessage = ref('')



const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

const dialogInscricao = ref(false)
const refeicaoSelecionada = ref<any>(null)
const loadingAcao = ref(false)



const abrirDialogInscricao = (refeicao: any) => {
  refeicaoSelecionada.value = refeicao
  dialogInscricao.value = true
}

const confirmarInscricao = async () => {
  if (!refeicaoSelecionada.value) return

  loadingAcao.value = true
  try {
    await filaStore.inscrever(refeicaoSelecionada.value.refeicao_id)
    toast.add({
      severity: 'success',
      summary: 'Sucesso!',
      detail: 'Inscrição realizada com sucesso',
      life: 3000
    })
    dialogInscricao.value = false
    // Recarregar dados para sincronizar UI
    await Promise.all([
      filaStore.carregarMinhasInscricoes(),
      filaStore.carregarRefeicoesDisponiveis(),
      filaStore.carregarPosicoes()
    ])
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: err?.response?.data?.message || 'Erro ao realizar inscrição',
      life: 5000
    })
  } finally {
    loadingAcao.value = false
  }
}

const cancelarInscricao = async (inscricaoId: number) => {
  loadingAcao.value = true
  try {
    await filaStore.cancelar(inscricaoId)
    toast.add({
      severity: 'success',
      summary: 'Sucesso!',
      detail: 'Inscrição cancelada',
      life: 3000
    })
    // Recarregar dados para sincronizar UI
    await Promise.all([
      filaStore.carregarMinhasInscricoes(),
      filaStore.carregarRefeicoesDisponiveis(),
      filaStore.carregarPosicoes()
    ])
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: err?.response?.data?.message || 'Erro ao cancelar inscrição',
      life: 5000
    })
  } finally {
    loadingAcao.value = false
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      filaStore.carregarRefeicoesDisponiveis(),
      filaStore.carregarMinhasInscricoes(),
      filaStore.carregarPosicoes()
    ])
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Erro ao carregar dados'
    console.error('❌ Erro ao carregar dados da fila de extras:', err)
    toast.add({
      severity: 'error',
      summary: 'Erro ao Carregar',
      detail: errorMessage.value,
      life: 5000
    })
  }
})
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <PageHeader
      title="Fila de Extras"
      subtitle="Garanta sua refeição inscrevendo-se nas vagas remanescentes"
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Dashboard', route: '/dashboard' }, { label: 'Fila de Extras' }]"
    />


    <!-- Refeições Disponíveis -->
    <section>
      <div class="flex items-center gap-2 mb-4">
        <div class="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
          <i class="pi pi-list text-primary-600"></i>
        </div>
        <h2 class="text-xl font-black text-slate-800 lato-black">Refeições Disponíveis</h2>
      </div>

      <div v-if="filaStore.loading && filaStore.refeicoesDisponiveis.length === 0" class="space-y-4">
         <Skeleton height="80px" border-radius="1.5rem" v-for="i in 3" :key="i" />
      </div>

      <div v-else-if="filaStore.refeicoesDisponiveis.length === 0">
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
           <i class="pi pi-calendar-times text-4xl text-slate-300 mb-4"></i>
           <p class="text-slate-600 font-medium mb-2">Não há refeições disponíveis para inscrição no momento</p>
           <p class="text-slate-400 text-sm mb-3">As inscrições só estão disponíveis no dia da refeição, dentro do horário permitido:</p>
           <div class="space-y-2 mb-4">
             <p class="text-slate-500 text-sm font-medium">
               <i class="pi pi-sun text-amber-500 mr-2"></i>
               Almoço: disponível até 13:30
             </p>
             <p class="text-slate-500 text-sm font-medium">
               <i class="pi pi-moon text-indigo-500 mr-2"></i>
               Jantar: disponível até 19:00
             </p>
           </div>
           <p class="text-slate-400 text-xs">
             💡 Volte mais tarde ou verifique se há cardápio cadastrado para hoje
           </p>
        </div>
      </div>

      <div v-else class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-4">
        <DataTable
          v-model:filters="filters"
          :value="filaStore.refeicoesDisponiveis"
          :rows="10"
          :paginator="filaStore.refeicoesDisponiveis.length > 10"
          :globalFilterFields="['turno', 'turno_label']"
          class="p-datatable-sm"
          responsiveLayout="stack"
          breakpoint="768px"
          :loading="filaStore.loading"
        >
          <template #loading>
            <div class="p-4 space-y-6">
              <div v-for="i in 5" :key="i" class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-50 pb-4 last:border-0">
                <div class="flex items-center gap-3 w-full md:w-1/3">
                  <Skeleton width="2rem" height="2rem" border-radius="0.5rem" class="flex-shrink-0" />
                  <div class="space-y-2 w-full">
                    <Skeleton width="60%" height="1rem" />
                    <Skeleton width="40%" height="0.75rem" />
                  </div>
                </div>
                <div class="w-full md:w-1/3 flex md:justify-center">
                  <Skeleton width="80px" height="1.5rem" border-radius="20px" />
                </div>
                <div class="flex justify-end w-full md:w-auto">
                  <Skeleton width="120px" height="2rem" border-radius="0.75rem" />
                </div>
              </div>
            </div>
          </template>
          <template #header>
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-black text-slate-400 uppercase tracking-widest">Vagas Disponíveis</span>
              <InputText v-model="filters['global'].value" placeholder="Filtrar..." />
            </div>
          </template>
          <Column header="Refeição" style="min-width: 150px">
            <template #body="{ data }">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                  <i :class="data.turno === 'almoco' ? 'pi pi-sun text-amber-500' : 'pi pi-moon text-indigo-500'"></i>
                </div>
                <div>
                  <p class="font-bold text-slate-800">Hoje</p>
                  <p class="text-xs text-slate-500">{{ data.turno_label }}</p>
                </div>
              </div>
            </template>
          </Column>
          <Column header="Disponibilidade" style="min-width: 120px">
            <template #body="{ data }">
              <div class="flex flex-col gap-1">
                 <Tag
                  :value="`${data.vagas_disponiveis} vagas`"
                  :severity="data.vagas_disponiveis > 10 ? 'success' : 'warn'"
                  class="!rounded-full w-fit"
                />
                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Até {{ data.horario_fim }}</span>
              </div>
            </template>
          </Column>
          <Column header="Posição" style="min-width: 100px; text-align: center" headerStyle="text-align: center">
            <template #body="{ data }">
              <div v-if="data.inscrito" class="flex flex-col items-center">
                <span class="text-2xl font-black text-primary-600">{{ data.posicao_fila }}º</span>
                <span class="text-[9px] text-slate-400 uppercase font-bold">na fila</span>
              </div>
              <span v-else class="text-slate-300 text-sm">—</span>
            </template>
          </Column>
          <Column header="Status" style="min-width: 120px">
            <template #body="{ data }">
              <Tag
                v-if="data.inscrito && data.status_inscricao === 'aprovado'"
                value="Confirmado"
                severity="success"
                class="!rounded-full"
              />
              <Tag
                v-else-if="data.inscrito && data.status_inscricao === 'rejeitado'"
                value="Cancelado"
                severity="danger"
                class="!rounded-full"
              />
              <Tag
                v-else-if="data.inscrito"
                value="Aguardando"
                severity="warn"
                class="!rounded-full"
              />
              <span v-else class="text-slate-300 text-sm">—</span>
            </template>
          </Column>
          <Column header="Ações" style="min-width: 150px; text-align: right" headerStyle="text-align: right">
            <template #body="{ data }">
              <Button
                v-if="data.pode_inscrever && !data.inscrito"
                label="Inscrever-se"
                icon="pi pi-plus"
                size="small"
                class="!rounded-xl"
                severity="success"
                :loading="loadingAcao"
                @click="abrirDialogInscricao(data)"
              />
              <Button
                v-else-if="data.inscrito && data.status_inscricao === 'inscrito'"
                label="Cancelar"
                icon="pi pi-times"
                size="small"
                class="!rounded-xl"
                severity="danger"
                outlined
                :loading="loadingAcao"
                @click="cancelarInscricao(data.inscricao_id)"
              />
              <div v-else-if="data.inscrito && data.status_inscricao === 'aprovado'" class="flex items-center justify-end gap-2 text-green-600 font-bold text-sm">
                 <i class="pi pi-check-circle"></i>
                 Confirmado
              </div>
              <Tag v-else value="Expirado" severity="danger" class="!rounded-full" />
            </template>
          </Column>
        </DataTable>
      </div>
    </section>

    <!-- Dialog de Confirmação (Estilo Refinado) -->
    <Dialog
      v-model:visible="dialogInscricao"
      modal
      header="Confirmar Inscrição"
      :style="{ width: '90%', maxWidth: '400px' }"
      :draggable="false"
      class="!rounded-xl overflow-hidden"
    >
      <div v-if="refeicaoSelecionada" class="space-y-6 py-4">
        <div class="p-4 bg-primary-50 rounded-xl border border-primary-100">
           <p class="text-primary-800 text-sm leading-relaxed">
             Deseja confirmar sua inscrição para esta refeição? Sua posição será gerada por ordem de chegada na fila virtual.
           </p>
        </div>

        <div class="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
          <div class="flex justify-between">
            <span class="text-slate-500">Data:</span>
            <span class="font-bold text-slate-800">Hoje</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Turno:</span>
            <span class="font-bold text-slate-800">{{ refeicaoSelecionada.turno_label }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Prato:</span>
            <span class="font-bold text-slate-800">{{ refeicaoSelecionada.cardapio.prato_principal_ptn01 }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3 w-full">
          <Button label="Voltar" text class="flex-1 !rounded-xl" @click="dialogInscricao = false" />
          <Button
            label="Confirmar"
            class="flex-1 !rounded-xl"
            severity="success"
            :loading="loadingAcao"
            @click="confirmarInscricao"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
