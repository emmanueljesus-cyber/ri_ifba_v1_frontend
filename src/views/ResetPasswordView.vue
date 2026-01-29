<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { authService } from '../services/auth'
import Button from 'primevue/button'
import Password from 'primevue/password'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const email = ref('')
const token = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const validating = ref(true)
const tokenValid = ref(false)
const success = ref(false)

onMounted(async () => {
  // Pegar token e email da URL
  token.value = (route.query.token as string) || ''
  email.value = (route.query.email as string) || ''

  if (!token.value || !email.value) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Link inválido', life: 5000 })
    validating.value = false
    return
  }

  // Verificar se o token é válido
  try {
    tokenValid.value = await authService.verifyResetToken(email.value, token.value)
    if (!tokenValid.value) {
      toast.add({ severity: 'error', summary: 'Erro', detail: 'Token inválido ou expirado', life: 5000 })
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Erro ao validar token', life: 5000 })
  } finally {
    validating.value = false
  }
})

const handleSubmit = async () => {
  if (!password.value || password.value.length < 6) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'A senha deve ter no mínimo 6 caracteres', life: 3000 })
    return
  }

  if (password.value !== passwordConfirmation.value) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'As senhas não conferem', life: 3000 })
    return
  }

  loading.value = true
  try {
    const message = await authService.resetPassword(email.value, token.value, password.value, passwordConfirmation.value)
    success.value = true
    toast.add({ severity: 'success', summary: 'Sucesso', detail: message, life: 5000 })
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || 'Erro ao redefinir senha'
    toast.add({ severity: 'error', summary: 'Erro', detail: errorMsg, life: 5000 })
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
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
            <i class="pi pi-key text-3xl text-white"></i>
          </div>
          <h1 class="text-2xl font-black text-white">Redefinir Senha</h1>
          <p class="text-white/80 text-sm mt-2">
            {{ success ? 'Senha redefinida com sucesso!' : 'Crie sua nova senha' }}
          </p>
        </div>

        <!-- Conteúdo -->
        <div class="p-8">
          <!-- Loading -->
          <template v-if="validating">
            <div class="text-center py-8">
              <i class="pi pi-spin pi-spinner text-4xl text-primary-500 mb-4"></i>
              <p class="text-slate-500">Validando link...</p>
            </div>
          </template>

          <!-- Token Inválido -->
          <template v-else-if="!tokenValid && !success">
            <div class="text-center space-y-4">
              <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <i class="pi pi-times text-4xl text-red-600"></i>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-700">Link inválido ou expirado</h3>
                <p class="text-slate-500 text-sm mt-2">
                  O link de redefinição de senha é inválido ou já expirou. Solicite um novo link.
                </p>
              </div>
              <Button
                label="Solicitar novo link"
                icon="pi pi-refresh"
                @click="router.push('/forgot-password')"
                class="w-full !py-3 !rounded-xl"
              />
            </div>
          </template>

          <!-- Formulário -->
          <template v-else-if="!success">
            <form @submit.prevent="handleSubmit" class="space-y-5">
              <div>
                <label class="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">
                  Nova senha
                </label>
                <Password
                  v-model="password"
                  placeholder="Mínimo 6 caracteres"
                  toggleMask
                  :feedback="true"
                  class="w-full"
                  inputClass="w-full !py-3 !rounded-xl"
                  :disabled="loading"
                />
              </div>

              <div>
                <label class="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">
                  Confirmar nova senha
                </label>
                <Password
                  v-model="passwordConfirmation"
                  placeholder="Repita a senha"
                  toggleMask
                  :feedback="false"
                  class="w-full"
                  inputClass="w-full !py-3 !rounded-xl"
                  :disabled="loading"
                />
              </div>

              <Button
                type="submit"
                label="Redefinir Senha"
                icon="pi pi-check"
                :loading="loading"
                class="w-full !py-3 !rounded-xl !font-bold shadow-lg"
              />
            </form>
          </template>

          <!-- Sucesso -->
          <template v-else>
            <div class="text-center space-y-4">
              <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <i class="pi pi-check text-4xl text-green-600"></i>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-700">Senha redefinida!</h3>
                <p class="text-slate-500 text-sm mt-2">
                  Sua senha foi alterada com sucesso. Você já pode fazer login com a nova senha.
                </p>
              </div>
              <Button
                label="Ir para o Login"
                icon="pi pi-sign-in"
                @click="goToLogin"
                class="w-full !py-3 !rounded-xl !font-bold shadow-lg"
              />
            </div>
          </template>

          <div v-if="!success" class="mt-6 pt-6 border-t border-slate-100 text-center">
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
