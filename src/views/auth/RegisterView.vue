<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Message from 'primevue/message'
import AuthLayout from '../../layouts/AuthLayout.vue'
import { useAuthStore } from '../../stores/auth'
import type { PerfilUsuario } from '../../types/auth'
import api from '../../services/api'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const perfil = ref<PerfilUsuario>('estudante')

// Opcoes de turno de AULA (para nao-bolsistas)
const turnosAula = [
  { label: 'Matutino', value: 'matutino' },
  { label: 'Vespertino', value: 'vespertino' },
  { label: 'Noturno', value: 'noturno' }
]

const form = ref({
  nome: '',
  email: '',
  matricula: '',
  password: '',
  password_confirmation: '',
  curso: '',
  turno_aula: '' // turno de aula do estudante
})

// Estado de verificacao de matricula
const verificandoMatricula = ref(false)
const ehBolsista = ref<boolean | null>(null)
const dadosBolsista = ref<{ nome: string; curso: string; turno_refeicao: string } | null>(null)
const matriculaJaCadastrada = ref(false)

const errorMessage = ref('')
const submitted = ref(false)
const loading = computed(() => auth.loading)

// Debounce para verificar matricula
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const verificarMatricula = async (matricula: string) => {
  if (matricula.length < 5) {
    ehBolsista.value = null
    dadosBolsista.value = null
    matriculaJaCadastrada.value = false
    return
  }

  verificandoMatricula.value = true
  matriculaJaCadastrada.value = false

  try {
    const response = await api.get(`/auth/verificar-matricula/${matricula}`)
    const data = response.data.data

    ehBolsista.value = data.bolsista

    if (data.bolsista) {
      dadosBolsista.value = {
        nome: data.nome,
        curso: data.curso,
        turno_refeicao: data.turno_refeicao
      }
      // Preenche automaticamente os dados do bolsista (sobrescreve se for bolsista)
      if (data.nome) {
        form.value.nome = data.nome
      }
      if (data.curso) {
        form.value.curso = data.curso
      }
    } else {
      dadosBolsista.value = null
    }
  } catch (err: any) {
    if (err?.response?.status === 409) {
      matriculaJaCadastrada.value = true
      ehBolsista.value = null
    }
  } finally {
    verificandoMatricula.value = false
  }
}

watch(() => form.value.matricula, (novaMatricula) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    verificarMatricula(novaMatricula)
  }, 500)
})

watch(perfil, (value) => {
  if (value === 'admin') {
    form.value.curso = ''
    form.value.turno_aula = ''
  }
})

const handleSubmit = async () => {
  errorMessage.value = ''
  submitted.value = true
  
  // Validacao basica
  const camposObrigatorios = ['nome', 'email', 'matricula', 'password', 'password_confirmation']
  if (perfil.value === 'estudante' && !form.value.curso) camposObrigatorios.push('curso')
  if (perfil.value === 'estudante' && !ehBolsista.value && !form.value.turno_aula) camposObrigatorios.push('turno_aula')
  
  const algumVazio = camposObrigatorios.some(campo => !form.value[campo as keyof typeof form.value])
  
  if (algumVazio) {
    errorMessage.value = 'Por favor, preencha todos os campos obrigatórios'
    return
  }

  if (matriculaJaCadastrada.value) {
    errorMessage.value = 'Esta matricula ja esta cadastrada no sistema'
    return
  }

  // Validacao de senha
  if (form.value.password !== form.value.password_confirmation) {
    errorMessage.value = 'As senhas nao conferem'
    return
  }

  // Nao-bolsista: envia turno de aula (matutino/vespertino/noturno)
  // Bolsista: nao precisa enviar turno (backend pega da lista)
  const payload = {
    nome: form.value.nome,
    email: form.value.email,
    matricula: form.value.matricula,
    password: form.value.password,
    password_confirmation: form.value.password_confirmation,
    curso: perfil.value === 'estudante' ? form.value.curso : null,
    turno: perfil.value === 'estudante' && !ehBolsista.value ? form.value.turno_aula : null,
    perfil: perfil.value
  }

  try {
    await auth.register(payload, false)
    toast.add({
      severity: 'success',
      summary: 'Cadastro realizado!',
      detail: 'Sua conta foi criada com sucesso. Redirecionando para login...',
      life: 3000
    })
    
    setTimeout(() => {
      router.push({ name: 'login' })
    }, 2000)
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Nao foi possivel concluir o cadastro'
  }
}
</script>

<template>
  <AuthLayout>
    <div class="space-y-8 animate-fadein">
      <!-- Header -->
      <header class="text-center lg:text-left space-y-3">
        <h1 class="text-4xl font-black text-slate-800 lato-black tracking-tight">Cadastro</h1>
        <p class="text-slate-500 font-medium">Crie sua conta para acessar os serviços do Restaurante Institucional.</p>
      </header>

      <!-- Cadastro Form -->
      <form class="space-y-5" @submit.prevent="handleSubmit" novalidate>
        <!-- Matrícula -->
        <div class="space-y-2">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="matricula">
            Matrícula *
          </label>
          <IconField>
            <InputIcon class="pi pi-id-card text-slate-400" />
            <InputText 
              id="matricula" 
              v-model="form.matricula" 
              placeholder="Sua matrícula SUAP"
              class="w-full !pr-12 !rounded-xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all"
              :invalid="(submitted && !form.matricula) || matriculaJaCadastrada"
              :class="{ '!border-green-400': ehBolsista === true }"
            />
            <!-- Indicador de verificação -->
            <span v-if="verificandoMatricula" class="absolute right-4 top-1/2 -translate-y-1/2 z-20">
              <i class="pi pi-spin pi-spinner text-slate-400"></i>
            </span>
            <span v-else-if="ehBolsista === true" class="absolute right-4 top-1/2 -translate-y-1/2 z-20">
              <i class="pi pi-check-circle text-green-500"></i>
            </span>
            <span v-else-if="matriculaJaCadastrada" class="absolute right-4 top-1/2 -translate-y-1/2 z-20">
              <i class="pi pi-times-circle text-red-500"></i>
            </span>
          </IconField>
          <small v-if="submitted && !form.matricula" class="p-error ml-1 block">Matrícula é obrigatória</small>
          <!-- Mensagem de status da matrícula -->
          <p v-if="ehBolsista === true" class="text-xs text-green-600 ml-1 font-medium">
            <i class="pi pi-verified mr-1"></i>
            Bolsista identificado! Turno: {{ dadosBolsista?.turno_refeicao === 'almoco' ? 'Almoço' : 'Jantar' }}
          </p>
          <p v-else-if="ehBolsista === false && form.matricula.length >= 5" class="text-xs text-amber-600 ml-1">
            <i class="pi pi-info-circle mr-1"></i>
            Matrícula não encontrada na lista de bolsistas. Selecione seu turno de aula.
          </p>
          <small v-if="matriculaJaCadastrada" class="p-error ml-1 block">
            <i class="pi pi-exclamation-circle mr-1"></i>
            Esta matrícula já está cadastrada no sistema.
          </small>
        </div>

        <!-- E-mail -->
        <div class="space-y-2">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="email">
            E-mail *
          </label>
          <IconField>
            <InputIcon class="pi pi-envelope text-slate-400" />
            <InputText 
              id="email" 
              v-model="form.email" 
              type="email" 
              placeholder="Digite seu email"
              class="w-full !rounded-xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all" 
              :invalid="submitted && !form.email"
              autocomplete="email"
            />
          </IconField>
          <small v-if="submitted && !form.email" class="p-error ml-1 block">E-mail é obrigatório</small>
        </div>

        <!-- Nome completo -->
        <div class="space-y-2">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="nome">
            Nome completo *
          </label>
          <IconField>
            <InputIcon class="pi pi-user text-slate-400" />
            <InputText 
              id="nome" 
              v-model="form.nome" 
              placeholder="Digite seu nome completo" 
              class="w-full !rounded-xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all" 
              :invalid="submitted && !form.nome"
              :disabled="ehBolsista === true"
            />
          </IconField>
          <small v-if="submitted && !form.nome" class="p-error ml-1 block">Nome é obrigatório</small>
        </div>

        <!-- Curso e Turno (apenas para estudante) -->
        <div v-if="perfil === 'estudante'" class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="curso">
              Curso
            </label>
            <IconField>
              <InputIcon class="pi pi-book text-slate-400" />
              <InputText 
                id="curso" 
                v-model="form.curso" 
                placeholder="Ex: Mecânica"
                class="w-full !rounded-xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all"
                :invalid="submitted && !form.curso && perfil === 'estudante'"
                :disabled="ehBolsista === true"
              />
            </IconField>
            <small v-if="submitted && !form.curso && perfil === 'estudante'" class="p-error ml-1 block">Curso é obrigatório</small>
          </div>
          
          <!-- Turno de AULA - apenas para NAO bolsistas -->
          <div v-if="ehBolsista !== true" class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="turno">
              Turno
            </label>
            <Dropdown 
              id="turno" 
              v-model="form.turno_aula"
              :options="turnosAula"
              optionLabel="label"
              optionValue="value" 
              placeholder="Selecione seu turno"
              class="w-full !rounded-xl !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all"
              :invalid="submitted && !form.turno_aula && perfil === 'estudante' && !ehBolsista"
            />
            <small v-if="submitted && !form.turno_aula && perfil === 'estudante' && !ehBolsista" class="p-error ml-1 block">Turno é obrigatório</small>
          </div>

          <!-- Turno do bolsista - apenas informativo -->
          <div v-else class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
              Refeicao
            </label>
            <div class="px-4 py-3.5 bg-green-50 rounded-xl border border-green-200">
              <p class="text-green-700 font-medium">
                {{ dadosBolsista?.turno_refeicao === 'almoco' ? 'Almoco' : 'Jantar' }}
              </p>
            </div>
            <p class="text-xs text-green-600 ml-1">
              <i class="pi pi-check mr-1"></i>
              Turno definido conforme lista de bolsistas
            </p>
          </div>
        </div>

        <!-- Senhas -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="senha">
              Senha *
            </label>
            <IconField>
              <InputIcon class="pi pi-lock text-slate-400" />
              <Password 
                v-model="form.password" 
                inputId="senha" 
                :feedback="true"
                toggleMask 
                class="w-full" 
                inputClass="w-full !rounded-xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all" 
                :invalid="submitted && (!form.password || (form.password_confirmation && form.password !== form.password_confirmation))"
                placeholder="Crie uma senha" 
                autocomplete="new-password"
              />
            </IconField>
            <small v-if="submitted && !form.password" class="p-error ml-1 block">Senha é obrigatória</small>
          </div>
        
          <div class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="senha2">
              Confirmar senha *
            </label>
            <IconField>
              <InputIcon class="pi pi-lock text-slate-400" />
              <Password 
                v-model="form.password_confirmation" 
                inputId="senha2" 
                :feedback="false" 
                toggleMask 
                class="w-full" 
                inputClass="w-full !rounded-xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all" 
                :invalid="submitted && (!form.password_confirmation || (form.password && form.password !== form.password_confirmation))"
                placeholder="Repita a senha" 
                autocomplete="new-password"
              />
            </IconField>
            <small v-if="submitted && !form.password_confirmation" class="p-error ml-1 block">Confirmação de senha é obrigatória</small>
            <small v-else-if="submitted && form.password !== form.password_confirmation" class="p-error ml-1 block">As senhas não conferem</small>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="pt-2">
          <Message severity="error" icon="pi pi-exclamation-triangle" class="!rounded-xl">{{ errorMessage }}</Message>
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
          <Button 
            type="submit" 
            label="Concluir Cadastro" 
            icon="pi pi-user-plus" 
            class="w-full !rounded-xl !py-4 shadow-lg font-bold tracking-tight" 
            :loading="loading" 
            size="large"
          />
        </div>
      </form>

      <!-- Login Link -->
      <div class="flex flex-col items-center justify-center gap-4 pt-4">
        <div class="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <span>Já possui uma conta?</span>
          <RouterLink to="/login" class="text-primary-600 font-black hover:text-primary-700 transition-colors underline decoration-2 underline-offset-4">
            Faça login aqui
          </RouterLink>
        </div>

        <!-- Back to Home -->
        <Button
          label="Voltar para a página inicial"
          icon="pi pi-arrow-left"
          text
          size="small"
          class="!text-slate-400 hover:!text-slate-600 font-bold"
          @click="() => router.push('/')"
        />
      </div>
    </div>
  </AuthLayout>
</template>
