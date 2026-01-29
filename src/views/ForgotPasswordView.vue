<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { authService } from '../services/auth'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const toast = useToast()

const email = ref('')
const loading = ref(false)
const enviado = ref(false)

const handleSubmit = async () => {
  if (!email.value) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Informe seu e-mail', life: 3000 })
    return
  }

  loading.value = true
  try {
    const message = await authService.forgotPassword(email.value)
    enviado.value = true
    toast.add({ severity: 'success', summary: 'Sucesso', detail: message, life: 5000 })
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || 'Erro ao processar solicitação'
    toast.add({ severity: 'error', summary: 'Erro', detail: errorMsg, life: 5000 })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
    <div class="w-full max-w-md">
      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <!-- Header -->
        <div class="bg-gradient-to-r from-primary-600 to-primary-700 p-8 text-center">
          <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i class="pi pi-lock text-3xl text-white"></i>
          </div>
          <h1 class="text-2xl font-black text-white">Esqueci minha senha</h1>
          <p class="text-white/80 text-sm mt-2">
            {{ enviado ? 'Verifique seu e-mail' : 'Informe seu e-mail para redefinir' }}
          </p>
        </div>

        <!-- Conteúdo -->
        <div class="p-8">
          <template v-if="!enviado">
            <form @submit.prevent="handleSubmit" class="space-y-6">
              <div>
                <label class="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">
                  E-mail cadastrado
                </label>
                <div class="relative">
                  <i class="pi pi-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <InputText
                    v-model="email"
                    type="email"
                    placeholder="seu.email@ifba.edu.br"
                    class="w-full !pl-12 !py-3 !rounded-xl"
                    :disabled="loading"
                  />
                </div>
              </div>

              <Button
                type="submit"
                label="Enviar instruções"
                icon="pi pi-send"
                :loading="loading"
                class="w-full !py-3 !rounded-xl !font-bold shadow-lg"
              />
            </form>
          </template>

          <template v-else>
            <div class="text-center space-y-4">
              <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <i class="pi pi-check text-4xl text-green-600"></i>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-700">E-mail enviado!</h3>
                <p class="text-slate-500 text-sm mt-2">
                  Se o e-mail <strong>{{ email }}</strong> estiver cadastrado, você receberá as instruções para redefinir sua senha.
                </p>
              </div>
              <div class="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p class="text-xs text-amber-700">
                  <i class="pi pi-info-circle mr-1"></i>
                  O link é válido por <strong>1 hora</strong>. Verifique também a pasta de spam.
                </p>
              </div>
            </div>
          </template>

          <div class="mt-6 pt-6 border-t border-slate-100 text-center">
            <router-link to="/login" class="text-primary-600 hover:text-primary-700 font-semibold text-sm">
              <i class="pi pi-arrow-left mr-1"></i>
              Voltar para o login
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
