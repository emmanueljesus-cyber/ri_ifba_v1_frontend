<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import AuthLayout from '../../layouts/AuthLayout.vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = ref({
  matricula: '',
  password: ''
})

const errorMessage = ref('')
const loading = computed(() => auth.loading)

const handleSubmit = async () => {
  errorMessage.value = ''
  try {
    await auth.login({ ...form.value })
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch (err: any) {
    console.error('Erro no login:', err)
    if (err?.code === 'ERR_NETWORK') {
      errorMessage.value = 'Erro de conexão. Verifique se o backend está rodando.'
    } else if (err?.response?.status === 401) {
      errorMessage.value = 'Matrícula ou senha incorretos'
    } else {
      errorMessage.value = err?.response?.data?.message || 'Não foi possível fazer login. Tente novamente.'
    }
  }
}
</script>

<template>
  <AuthLayout>
    <div class="space-y-8 animate-fadein">
      <!-- Header -->
      <header class="text-center lg:text-left space-y-3">
        <h1 class="text-4xl font-black text-slate-800 lato-black tracking-tight">Login</h1>
        <p class="text-slate-500 font-medium">Acesse sua conta para gerenciar suas refeições no IFBA.</p>
      </header>

      <!-- Login Form -->
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <!-- Matrícula -->
        <div class="space-y-2">
          <label class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1" for="matricula">
            Matrícula
          </label>
          <div class="relative flex items-center group">
            <span class="absolute left-4 text-slate-400 group-focus-within:text-primary-600 transition-colors pointer-events-none z-10">
              <i class="pi pi-user"></i>
            </span>
            <InputText 
              id="matricula" 
              v-model="form.matricula" 
              placeholder="Ex: 2025123456" 
              class="w-full !pl-12 !rounded-xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all"
              autocomplete="username"
              required 
            />
          </div>
        </div>

        <!-- Senha -->
        <div class="space-y-2">
          <div class="flex items-center justify-between ml-1">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest" for="senha">
              Senha
            </label>
            <RouterLink to="/forgot-password" class="text-xs text-primary-600 font-bold hover:text-primary-700 transition-colors">
              Esqueceu a senha?
            </RouterLink>
          </div>
          <div class="relative flex items-center group">
            <span class="absolute left-4 text-slate-400 group-focus-within:text-primary-600 transition-colors pointer-events-none z-10">
              <i class="pi pi-lock"></i>
            </span>
            <Password 
              v-model="form.password" 
              inputId="senha" 
              :feedback="false" 
              toggleMask 
              class="w-full" 
              inputClass="w-full !pl-12 !rounded-xl !py-3.5 !border-slate-200 focus:!border-primary-500 focus:!ring-4 focus:!ring-primary-100 transition-all" 
              placeholder="Digite sua senha" 
              autocomplete="current-password"
              required 
            />
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
            label="Entrar no Sistema" 
            icon="pi pi-sign-in" 
            class="w-full !rounded-xl !py-4 shadow-lg font-bold tracking-tight" 
            :loading="loading" 
            size="large"
          />
        </div>
      </form>

      <!-- SUAP Login (Em desenvolvimento) -->
      <Button 
        v-tooltip.top="'Em breve: Integração direta com SUAP'"
        label="Acesso via SUAP"
        icon="pi pi-external-link"
        severity="secondary"
        outlined
        class="w-full !rounded-xl !py-3 !border-slate-200 !text-slate-500 hover:!bg-slate-50"
        disabled
      />

      <!-- Register Link -->
      <div class="flex flex-col items-center justify-center gap-4 pt-4">
        <div class="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <span>Ainda não tem acesso?</span>
          <RouterLink to="/cadastro" class="text-primary-600 font-black hover:text-primary-700 transition-colors underline decoration-2 underline-offset-4">
            Crie sua conta
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
