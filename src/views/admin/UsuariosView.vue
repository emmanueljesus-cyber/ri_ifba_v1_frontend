<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import { useToast } from 'primevue/usetoast'
import { adminUsuarioService } from '../../services/adminUsuario'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'

const toast = useToast()
const usuarios = ref<any[]>([])
const loading = ref(false)
const displayDialog = ref(false)
const submetendo = ref(false)

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  nome: { value: null, matchMode: FilterMatchMode.CONTAINS },
  matricula: { value: null, matchMode: FilterMatchMode.CONTAINS },
  email: { value: null, matchMode: FilterMatchMode.CONTAINS },
  perfil: { value: null, matchMode: FilterMatchMode.EQUALS }
})

const form = ref({
  id: null,
  nome: '',
  email: '',
  matricula: '',
  perfil: 'admin',
  password: ''
})

const perfis = [
  { label: 'Administrador', value: 'admin' },
  { label: 'Estudante', value: 'estudante' }
]

const carregarUsuarios = async () => {
  loading.value = true
  try {
    const res = await adminUsuarioService.listar({ desligado: false })// Suporta tanto res.data.items quanto res.data diretamente
    usuarios.value = res.data?.items || res.data || []
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar usuários' })
  } finally {
    loading.value = false
  }
}

const abrirNovo = () => {
  form.value = {
    id: null,
    nome: '',
    email: '',
    matricula: '',
    perfil: 'admin',
    password: ''
  }
  displayDialog.value = true
}

const salvarUsuario = async () => {
  submetendo.value = true
  try {
    if (form.value.id) {
      await adminUsuarioService.atualizar(form.value.id, form.value)
      toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Usuário atualizado com sucesso' })
    } else {
      await adminUsuarioService.criar(form.value)
      toast.add({ 
        severity: 'success', 
        summary: 'Sucesso', 
        detail: form.value.perfil === 'admin' 
          ? 'Administrador criado! Um e-mail com a senha foi enviado.' 
          : 'Usuário criado com sucesso' 
      })
    }
    displayDialog.value = false
    carregarUsuarios()
  } catch (err: any) {
    toast.add({ 
      severity: 'error', 
      summary: 'Erro', 
      detail: err?.response?.data?.message || 'Erro ao salvar usuário' 
    })
  } finally {
    submetendo.value = false
  }
}

const editarUsuario = (dados: any) => {
  form.value = { ...dados, password: '' }
  displayDialog.value = true
}

const confirmarDesativar = async (id: number) => {
  if (confirm('Deseja realmente desativar este usuário?')) {
    try {
      await adminUsuarioService.desativar(id)
      toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Usuário desativado' })
      carregarUsuarios()
    } catch (err) {
      toast.add({ severity: 'error', summary: 'Erro', detail: 'Erro ao desativar usuário' })
    }
  }
}

onMounted(() => {
  carregarUsuarios()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Gestão de Usuários"
      subtitle="Gerencie administradores e estudantes do sistema."
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Admin', route: '/admin' }, { label: 'Usuários' }]"
    />

    <div class="card bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <DataTable :value="usuarios" :loading="loading" paginator :rows="10" 
        v-model:filters="filters"
        filterDisplay="menu"
        :globalFilterFields="['nome', 'matricula', 'email', 'perfil']"
        class="p-datatable-sm" responsiveLayout="stack" breakpoint="960px">
        <template #header>
          <div class="flex flex-col md:flex-row justify-between gap-4 mb-2">
            <div class="flex flex-col">
              <span class="text-xl font-bold text-slate-700">Usuários do Sistema</span>
              <p class="text-xs text-slate-500">Gerencie todos os acessos ao sistema.</p>
            </div>
            <div class="flex gap-2">
              <InputText v-model="filters['global'].value" placeholder="Buscar usuário..." class="!rounded-xl" />
              <Button label="Novo Usuário" icon="pi pi-plus" @click="abrirNovo" severity="success" class="!rounded-xl shadow-md" />
            </div>
          </div>
        </template>

        <Column field="nome" header="Nome" :sortable="true">
          <template #body="{ data }">
            <span class="font-bold text-slate-700">{{ data.nome }}</span>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" type="text" @input="filterCallback()" class="p-column-filter" placeholder="Filtrar por nome" />
          </template>
        </Column>
        <Column field="matricula" header="Matrícula" :sortable="true">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" type="text" @input="filterCallback()" class="p-column-filter" placeholder="Filtrar por matrícula" />
          </template>
        </Column>
        <Column field="email" header="E-mail" :sortable="true">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" type="text" @input="filterCallback()" class="p-column-filter" placeholder="Filtrar por e-mail" />
          </template>
        </Column>
        <Column field="perfil" header="Perfil">
          <template #body="{ data }">
            <Tag :value="data.perfil === 'admin' ? 'Administrador' : 'Estudante'" 
              :severity="data.perfil === 'admin' ? 'danger' : 'info'" class="!rounded-full px-3" />
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <Dropdown v-model="filterModel.value" @change="filterCallback()" :options="perfis" optionLabel="label" optionValue="value" placeholder="Selecionar Perfil" class="p-column-filter" style="min-width: 12rem" :showClear="true">
              <template #option="slotProps">
                <Tag :value="slotProps.option.label" :severity="slotProps.option.value === 'admin' ? 'danger' : 'info'" />
              </template>
            </Dropdown>
          </template>
        </Column>
        <Column header="Saúde / Restrições" :style="{ minWidth: '180px' }">
          <template #body="{ data }">
            <div v-if="data.perfil === 'estudante'" class="flex flex-col gap-1">
              <div v-if="data.is_ovolactovegetariano" class="flex items-center gap-1">
                <i class="pi pi-heart-fill text-pink-500 text-xs"></i>
                <span class="text-xs font-medium text-pink-700">Vegetariano</span>
              </div>
              <div v-if="data.alergias" class="flex items-start gap-1">
                <i class="pi pi-exclamation-triangle text-amber-500 text-xs mt-0.5"></i>
                <span class="text-xs text-amber-700 line-clamp-2" :title="data.alergias">{{ data.alergias }}</span>
              </div>
              <span v-if="!data.is_ovolactovegetariano && !data.alergias" class="text-xs text-slate-400">-</span>
            </div>
            <span v-else class="text-xs text-slate-400">N/A</span>
          </template>
        </Column>
        <Column header="Ações" class="text-right">
          <template #body="{ data }">
            <div class="flex gap-2 justify-end">
              <Button icon="pi pi-pencil" text rounded severity="secondary" @click="editarUsuario(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" @click="confirmarDesativar(data.id)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="displayDialog" :header="form.id ? 'Editar Usuário' : 'Novo Usuário'" 
      modal :style="{ width: '450px' }" class="!rounded-xl">
      <div class="space-y-4 pt-4">
        <div class="flex flex-col gap-2">
          <label for="nome" class="font-bold">Nome Completo</label>
          <InputText id="nome" v-model="form.nome" placeholder="Ex: João Silva" class="!rounded-xl" />
        </div>
        <div class="flex flex-col gap-2">
          <label for="email" class="font-bold">E-mail</label>
          <InputText id="email" v-model="form.email" type="email" placeholder="email@exemplo.com" class="!rounded-xl" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label for="matricula" class="font-bold">Matrícula</label>
            <InputText id="matricula" v-model="form.matricula" placeholder="Login SUAP" class="!rounded-xl" />
          </div>
          <div class="flex flex-col gap-2">
            <label for="perfil" class="font-bold">Perfil</label>
            <Dropdown id="perfil" v-model="form.perfil" :options="perfis" optionLabel="label" optionValue="value" class="!rounded-xl" />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <label for="password" class="font-bold">
            Senha {{ form.id ? '(Deixe em branco para manter)' : '(Opcional para Admin)' }}
          </label>
          <InputText id="password" v-model="form.password" type="password" placeholder="Mínimo 6 caracteres" class="!rounded-xl" />
          <p v-if="!form.id && form.perfil === 'admin'" class="text-xs text-slate-500 italic">
            Se deixado em branco, uma senha temporária será gerada e enviada por e-mail.
          </p>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" icon="pi pi-times" text @click="displayDialog = false" />
        <Button label="Salvar" icon="pi pi-check" :loading="submetendo" @click="salvarUsuario" severity="primary" class="!rounded-xl" />
      </template>
    </Dialog>
  </div>
</template>
