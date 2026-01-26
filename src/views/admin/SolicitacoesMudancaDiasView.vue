<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { FilterMatchMode } from '@primevue/core/api'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Avatar from 'primevue/avatar'
import InputText from 'primevue/inputtext'
import { useAvatar } from '../../composables/useAvatar'
import { useErrorMessage } from '../../composables/useErrorMessage'

const toast = useToast()
const { getInitials, getAvatarStyle } = useAvatar()
const { extractErrorMessage } = useErrorMessage()
const solicitacoes = ref([])
const loading = ref(false)
const displayRejeicao = ref(false)
const solicitacaoSelecionada = ref<any>(null)
const motivoRejeicao = ref('')
const processando = ref(false)

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

const carregarSolicitacoes = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/admin/solicitacoes-mudanca-dias?status=pendente')
    solicitacoes.value = data.data || []
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: extractErrorMessage(err, 'Falha ao carregar solicitações') })
  } finally {
    loading.value = false
  }
}

const aprovar = async (id: number) => {
  if (!confirm('Deseja realmente aprovar esta mudança de dias?')) return
  
  processando.value = true
  try {
    await api.patch(`/admin/solicitacoes-mudanca-dias/${id}/aprovar`)
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Mudança aprovada com sucesso' })
    carregarSolicitacoes()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: extractErrorMessage(err, 'Erro ao aprovar solicitação') })
  } finally {
    processando.value = false
  }
}

const abrirRejeicao = (solicitacao: any) => {
  solicitacaoSelecionada.value = solicitacao
  motivoRejeicao.value = ''
  displayRejeicao.value = true
}

const rejeitar = async () => {
  if (!motivoRejeicao.value) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Informe o motivo da rejeição' })
    return
  }

  processando.value = true
  try {
    await api.patch(`/admin/solicitacoes-mudanca-dias/${solicitacaoSelecionada.value.id}/rejeitar`, {
      motivo_rejeicao: motivoRejeicao.value
    })
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Solicitação rejeitada' })
    displayRejeicao.value = false
    carregarSolicitacoes()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: extractErrorMessage(err, 'Erro ao rejeitar solicitação') })
  } finally {
    processando.value = false
  }
}

onMounted(() => {
  carregarSolicitacoes()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Solicitações de Mudança de Dias"
      subtitle="Analise os pedidos de alteração de frequência dos bolsistas."
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/dashboard' }, { label: 'Solicitações' }]"
    />

    <div class="card bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <DataTable :value="solicitacoes" :loading="loading" paginator :rows="10" 
        v-model:filters="filters"
        :globalFilterFields="['user.nome', 'user.matricula']"
        class="p-datatable-sm" responsiveLayout="stack" breakpoint="960px">
        
        <template #header>
          <div class="flex flex-col md:flex-row justify-between gap-4 mb-2">
            <span class="text-xl font-bold text-slate-700">Solicitações Pendentes</span>
            <InputText v-model="filters['global'].value" placeholder="Buscar por nome ou matrícula..." class="!rounded-xl" />
          </div>
        </template>

        <Column header="Estudante">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <Avatar :label="getInitials(data.user.nome)" shape="circle" :style="getAvatarStyle(data.user.nome)" />
              <div class="flex flex-col">
                <span class="font-bold text-slate-700 leading-none">{{ data.user.nome }}</span>
                <span class="text-xs text-slate-400 font-mono mt-1">{{ data.user.matricula }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column header="Novos Dias">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-1">
              <Tag v-for="dia in data.dias_semana" :key="dia" 
                :value="['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dia]" 
                severity="secondary" class="!rounded-md" />
            </div>
          </template>
        </Column>

        <Column field="created_at" header="Data do Pedido" :sortable="true">
          <template #body="{ data }">
            {{ new Date(data.created_at).toLocaleDateString('pt-BR') }}
          </template>
        </Column>

        <Column header="Ações" class="text-right">
          <template #body="{ data }">
            <div class="flex gap-2 justify-end">
              <Button icon="pi pi-check" label="Aprovar" severity="success" size="small" 
                class="!rounded-lg" @click="aprovar(data.id)" :loading="processando" />
              <Button icon="pi pi-times" label="Rejeitar" severity="danger" size="small" 
                class="!rounded-lg" @click="abrirRejeicao(data)" :loading="processando" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="displayRejeicao" header="Rejeitar Solicitação" modal :style="{ width: '400px' }" class="!rounded-xl">
      <div class="space-y-4 pt-2">
        <p class="text-sm text-slate-600">Informe o motivo da rejeição para o estudante.</p>
        <div class="flex flex-col gap-2">
          <label class="font-bold">Motivo *</label>
          <Textarea v-model="motivoRejeicao" rows="4" autoResize class="!rounded-xl" placeholder="Descreva o motivo..." />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="displayRejeicao = false" />
        <Button label="Rejeitar Solicitação" severity="danger" @click="rejeitar" :loading="processando" class="!rounded-xl" />
      </template>
    </Dialog>
  </div>
</template>
