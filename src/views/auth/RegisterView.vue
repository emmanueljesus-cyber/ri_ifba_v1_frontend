<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Message from 'primevue/message'
import InputMask from 'primevue/inputmask'
import AuthLayout from '../../layouts/AuthLayout.vue'
import { useAuthStore } from '../../stores/auth'
import type { PerfilUsuario } from '../../types/auth'

const auth = useAuthStore()
const router = useRouter()

const perfil = ref<PerfilUsuario>('estudante')
const turnos = [
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
  turno: ''
})

const errorMessage = ref('')
const loading = computed(() => auth.loading)

watch(perfil, (value) => {
  if (value === 'admin') {
    form.value.curso = ''
    form.value.turno = ''
  }
})

const handleSubmit = async () => {
  errorMessage.value = ''
  
  // Validação de senha
  if (form.value.password !== form.value.password_confirmation) {
    errorMessage.value = 'As senhas não conferem'
    return
  }

  const payload = {
    ...form.value,
    curso: perfil.value === 'estudante' ? form.value.curso : null,
    turno: perfil.value === 'estudante' ? form.value.turno || null : null,
    perfil: perfil.value
  }

  try {
    await auth.register(payload)
    router.push({ name: 'dashboard' })
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Não foi possível concluir o cadastro'
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
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <!-- Nome completo -->
        <div class="space-y-2">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="nome">
            Nome completo *
          </label>
          <div class="relative group">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors">
              <i class="pi pi-user"></i>
            </span>
            <InputText 
              id="nome" 
              v-model="form.nome" 
              placeholder="Digite seu nome completo" 
              class="w-full !pl-12 !rounded-2xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all" 
              required 
            />
          </div>
        </div>

        <!-- E-mail e Matrícula -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="email">
              E-mail *
            </label>
            <div class="relative group">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors">
                <i class="pi pi-envelope"></i>
              </span>
              <InputText 
                id="email" 
                v-model="form.email" 
                type="email" 
                placeholder="exemplo@ifba.edu.br" 
                class="w-full !pl-12 !rounded-2xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all" 
                autocomplete="email"
                required 
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="matricula">
              Matrícula *
            </label>
            <div class="relative group">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors">
                <i class="pi pi-id-card"></i>
              </span>
              <InputText 
                id="matricula" 
                v-model="form.matricula" 
                placeholder="Sua matrícula SUAP" 
                class="w-full !pl-12 !rounded-2xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all" 
                required 
              />
            </div>
          </div>
        </div>

        <!-- Curso e Turno (apenas para estudante) -->
        <div v-if="perfil === 'estudante'" class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="curso">
              Curso
            </label>
            <div class="relative group">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors">
                <i class="pi pi-book"></i>
              </span>
              <InputText 
                id="curso" 
                v-model="form.curso" 
                placeholder="Nome do seu curso" 
                class="w-full !pl-12 !rounded-2xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all" 
              />
            </div>
          </div>
          
          <div class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="turno">
              Turno
            </label>
            <Dropdown 
              id="turno" 
              v-model="form.turno" 
              :options="turnos" 
              optionLabel="label" 
              optionValue="value" 
              placeholder="Selecione seu turno" 
              class="w-full !rounded-2xl !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all" 
            />
          </div>
        </div>

        <!-- Senhas -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="senha">
              Senha *
            </label>
            <div class="relative group">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors z-10">
                <i class="pi pi-lock"></i>
              </span>
              <Password 
                v-model="form.password" 
                inputId="senha" 
                :feedback="true"
                toggleMask 
                class="w-full" 
                inputClass="w-full !pl-12 !rounded-2xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all" 
                placeholder="Crie uma senha" 
                autocomplete="new-password"
                required 
              />
            </div>
          </div>
          
          <div class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="senha2">
              Confirmar senha *
            </label>
            <div class="relative group">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors z-10">
                <i class="pi pi-lock"></i>
              </span>
              <Password 
                v-model="form.password_confirmation" 
                inputId="senha2" 
                :feedback="false" 
                toggleMask 
                class="w-full" 
                inputClass="w-full !pl-12 !rounded-2xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all" 
                placeholder="Repita a senha" 
                autocomplete="new-password"
                required 
              />
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="pt-2">
          <Message severity="error" icon="pi pi-exclamation-triangle" class="!rounded-2xl">{{ errorMessage }}</Message>
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
          <Button 
            type="submit" 
            label="Concluir Cadastro" 
            icon="pi pi-user-plus" 
            class="w-full !rounded-2xl !py-4 shadow-xl shadow-primary-100 font-bold tracking-tight" 
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
