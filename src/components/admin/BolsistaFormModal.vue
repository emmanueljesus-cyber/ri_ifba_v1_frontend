<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Checkbox from 'primevue/checkbox'
import Textarea from 'primevue/textarea'
import Chip from 'primevue/chip'

interface BolsistaFormData {
  nome: string
  matricula: string
  curso: string
  email: string
  turno_refeicao: string | null
  dias_semana: number[]
  is_ovolactovegetariano: boolean
  restricoes_alimentares: string[]
  alergias: string
}

interface Props {
  visible: boolean
  bolsista?: any
  mode: 'create' | 'edit'
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create'
})

const emit = defineEmits<Emits>()
const toast = useToast()

const loading = ref(false)
const formData = ref<BolsistaFormData>({
  nome: '',
  matricula: '',
  curso: '',
  email: '',
  turno_refeicao: null,
  dias_semana: [],
  is_ovolactovegetariano: false,
  restricoes_alimentares: [],
  alergias: ''
})

const turnoOptions = [
  { label: 'Almoço', value: 'almoco' },
  { label: 'Jantar', value: 'jantar' }
]

const diasSemanaOptions = [
  { label: 'Domingo', value: 0 },
  { label: 'Segunda', value: 1 },
  { label: 'Terça', value: 2 },
  { label: 'Quarta', value: 3 },
  { label: 'Quinta', value: 4 },
  { label: 'Sexta', value: 5 },
  { label: 'Sábado', value: 6 }
]

const restricoesOptions = [
  'Lactose',
  'Glúten',
  'Frutos do mar',
  'Amendoim',
  'Soja',
  'Carne vermelha',
  'Carne de porco'
]

const dialogTitle = computed(() => {
  return props.mode === 'create' ? 'Cadastrar Novo Bolsista' : 'Editar Bolsista'
})

const isFormValid = computed(() => {
  return formData.value.nome?.length >= 3 &&
         formData.value.matricula?.length >= 3 &&
         formData.value.curso?.length >= 3 &&
         formData.value.email?.length >= 5 &&
         formData.value.turno_refeicao &&
         formData.value.dias_semana.length > 0
})

// Observa mudanças no bolsista para preencher o formulário em modo edição
watch(() => props.bolsista, (newBolsista) => {
  if (newBolsista && props.mode === 'edit') {
    formData.value = {
      nome: newBolsista.nome || '',
      matricula: newBolsista.matricula || '',
      curso: newBolsista.curso || '',
      email: newBolsista.email || '',
      turno_refeicao: newBolsista.turno_refeicao || null,
      dias_semana: newBolsista.dias_semana || [],
      is_ovolactovegetariano: newBolsista.is_ovolactovegetariano || false,
      restricoes_alimentares: newBolsista.restricoes_alimentares || [],
      alergias: newBolsista.alergias || ''
    }
  }
}, { immediate: true })

// Limpa formulário quando fecha
watch(() => props.visible, (isVisible) => {
  if (!isVisible && props.mode === 'create') {
    resetForm()
  }
})

const resetForm = () => {
  formData.value = {
    nome: '',
    matricula: '',
    curso: '',
    email: '',
    turno_refeicao: null,
    dias_semana: [],
    is_ovolactovegetariano: false,
    restricoes_alimentares: [],
    alergias: ''
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  if (!isFormValid.value) {
    toast.add({
      severity: 'warn',
      summary: 'Atenção',
      detail: 'Por favor, preencha todos os campos obrigatórios',
      life: 3000
    })
    return
  }

  loading.value = true
  try {
    const endpoint = props.mode === 'create' 
      ? `${import.meta.env.VITE_API_BASE_URL}/admin/usuarios`
      : `${import.meta.env.VITE_API_BASE_URL}/admin/usuarios/${props.bolsista?.id}`
    
    const method = props.mode === 'create' ? 'POST' : 'PUT'
    
    const payload = {
      ...formData.value,
      bolsista: true,
      perfil: 'bolsista'
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao salvar bolsista')
    }

    toast.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: props.mode === 'create' 
        ? 'Bolsista cadastrado com sucesso!'
        : 'Bolsista atualizado com sucesso!',
      life: 3000
    })

    emit('success')
    handleClose()
    if (props.mode === 'create') {
      resetForm()
    }
  } catch (error: any) {
    const errorMsg = error.message || 'Falha ao salvar bolsista'
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: errorMsg,
      life: 5000
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog 
    :visible="visible" 
    :header="dialogTitle" 
    :modal="true"
    :closable="!loading"
    :style="{ width: '600px', maxWidth: '95vw' }"
    @update:visible="handleClose"
    class="!rounded-xl"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4 py-4">
      <!-- Nome -->
      <div class="field">
        <label for="nome" class="font-bold block mb-2 text-sm">
          Nome Completo <span class="text-red-500">*</span>
        </label>
        <InputText 
          id="nome"
          v-model="formData.nome"
          :disabled="loading"
          placeholder="Ex: João da Silva"
          class="w-full !rounded-xl"
          :invalid="formData.nome.length > 0 && formData.nome.length < 3"
        />
        <small class="text-slate-500">Mínimo 3 caracteres</small>
      </div>

      <!-- Matrícula e Email -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="field">
          <label for="matricula" class="font-bold block mb-2 text-sm">
            Matrícula <span class="text-red-500">*</span>
          </label>
          <InputText 
            id="matricula"
            v-model="formData.matricula"
            :disabled="loading || mode === 'edit'"
            placeholder="Ex: 202301234"
            class="w-full !rounded-xl"
            :invalid="formData.matricula.length > 0 && formData.matricula.length < 3"
          />
        </div>

        <div class="field">
          <label for="email" class="font-bold block mb-2 text-sm">
            E-mail <span class="text-red-500">*</span>
          </label>
          <InputText 
            id="email"
            v-model="formData.email"
            type="email"
            :disabled="loading"
            placeholder="Ex: joao@email.com"
            class="w-full !rounded-xl"
          />
        </div>
      </div>

      <!-- Curso -->
      <div class="field">
        <label for="curso" class="font-bold block mb-2 text-sm">
          Curso <span class="text-red-500">*</span>
        </label>
        <InputText 
          id="curso"
          v-model="formData.curso"
          :disabled="loading"
          placeholder="Ex: Engenharia de Software"
          class="w-full !rounded-xl"
          :invalid="formData.curso.length > 0 && formData.curso.length < 3"
        />
      </div>

      <!-- Turno de Refeição -->
      <div class="field">
        <label for="turno" class="font-bold block mb-2 text-sm">
          Turno de Refeição <span class="text-red-500">*</span>
        </label>
        <Select 
          id="turno"
          v-model="formData.turno_refeicao"
          :options="turnoOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Selecione o turno"
          :disabled="loading"
          class="w-full !rounded-xl"
        />
      </div>

      <!-- Dias da Semana -->
      <div class="field">
        <label for="dias" class="font-bold block mb-2 text-sm">
          Dias da Semana <span class="text-red-500">*</span>
        </label>
        <MultiSelect 
          id="dias"
          v-model="formData.dias_semana"
          :options="diasSemanaOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Selecione os dias"
          :disabled="loading"
          class="w-full !rounded-xl"
          display="chip"
        />
        <small class="text-slate-500 block mt-1">Dias em que o bolsista pode se alimentar</small>
      </div>

      <!-- Preferências Alimentares -->
      <div class="field">
        <div class="flex items-center gap-2 mb-2">
          <Checkbox 
            v-model="formData.is_ovolactovegetariano"
            :binary="true"
            :disabled="loading"
            inputId="ovolacto"
          />
          <label for="ovolacto" class="font-bold text-sm cursor-pointer">
            <i class="pi pi-leaf text-green-500 mr-1"></i>
            Ovolactovegetariano
          </label>
        </div>
      </div>

      <!-- Restrições Alimentares -->
      <div class="field">
        <label for="restricoes" class="font-bold block mb-2 text-sm">
          Restrições Alimentares
        </label>
        <MultiSelect 
          id="restricoes"
          v-model="formData.restricoes_alimentares"
          :options="restricoesOptions"
          placeholder="Selecione se houver"
          :disabled="loading"
          class="w-full !rounded-xl"
          display="chip"
        />
      </div>

      <!-- Alergias -->
      <div class="field">
        <label for="alergias" class="font-bold block mb-2 text-sm">
          Alergias
        </label>
        <Textarea 
          id="alergias"
          v-model="formData.alergias"
          rows="3"
          :disabled="loading"
          placeholder="Descreva as alergias, se houver..."
          class="w-full !rounded-xl"
        />
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button 
          label="Cancelar" 
          icon="pi pi-times" 
          text 
          @click="handleClose"
          :disabled="loading"
        />
        <Button 
          :label="mode === 'create' ? 'Cadastrar' : 'Atualizar'"
          icon="pi pi-check" 
          :loading="loading"
          :disabled="!isFormValid"
          @click="handleSubmit"
        />
      </div>
    </template>
  </Dialog>
</template>
