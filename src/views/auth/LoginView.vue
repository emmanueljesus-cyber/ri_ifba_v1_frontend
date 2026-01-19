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
    const redirect = (route.query.redirect as string) || '/'
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
    <div class="space-y-6">
      <header class="space-y-2">
        <h1 class="text-2xl font-bold text-slate-800">Login</h1>
        <p class="text-slate-500">Acesse com sua matrícula e senha do sistema.</p>
      </header>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-1">
          <label class="text-sm font-medium text-slate-700" for="matricula">Matrícula</label>
          <InputText id="matricula" v-model="form.matricula" placeholder="Insira sua matrícula" class="w-full" required />
        </div>

        <div class="space-y-1">
          <div class="flex items-center justify-between text-sm font-medium text-slate-700">
            <label for="senha">Senha</label>
            <a class="text-emerald-700 hover:underline" href="#">Esqueceu a senha?</a>
          </div>
          <Password v-model="form.password" inputId="senha" :feedback="false" toggleMask class="w-full" inputClass="w-full" placeholder="Insira sua senha" required />
        </div>

        <div v-if="errorMessage" class="pt-2">
          <Message severity="error" :closable="false">{{ errorMessage }}</Message>
        </div>

        <Button type="submit" label="Entrar" icon="pi pi-sign-in" class="w-full" :loading="loading" />
      </form>

      <div class="flex items-center gap-2 text-sm text-slate-600">
        <span>Não tem conta?</span>
        <RouterLink to="/cadastro" class="text-emerald-700 font-semibold hover:underline">Cadastre-se</RouterLink>
      </div>
    </div>
  </AuthLayout>
</template>
