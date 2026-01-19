<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Message from 'primevue/message'
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
    <div class="space-y-6">
      <header class="space-y-2">
        <h1 class="text-2xl font-bold text-slate-800">Cadastro</h1>
        <p class="text-slate-500">Preencha os dados para criar sua conta.</p>
      </header>

      <div class="flex gap-2">
        <Button label="Estudante" :severity="perfil === 'estudante' ? 'success' : 'secondary'" outlined @click="perfil = 'estudante'" />
        <Button label="Admin" :severity="perfil === 'admin' ? 'success' : 'secondary'" outlined @click="perfil = 'admin'" />
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-1">
          <label class="text-sm font-medium text-slate-700" for="nome">Nome completo</label>
          <InputText id="nome" v-model="form.nome" placeholder="Seu nome" class="w-full" required />
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-slate-700" for="email">E-mail institucional</label>
          <InputText id="email" v-model="form.email" type="email" placeholder="seu.email@ifba.edu.br" class="w-full" required />
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-slate-700" for="matricula">Matrícula</label>
          <InputText id="matricula" v-model="form.matricula" placeholder="Ex: 20231160001" class="w-full" required />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-sm font-medium text-slate-700" for="senha">Senha</label>
            <Password v-model="form.password" inputId="senha" :feedback="false" toggleMask class="w-full" inputClass="w-full" placeholder="Mínimo 6 caracteres" required />
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium text-slate-700" for="senha2">Confirmar senha</label>
            <Password v-model="form.password_confirmation" inputId="senha2" :feedback="false" toggleMask class="w-full" inputClass="w-full" placeholder="Repita a senha" required />
          </div>
        </div>

        <div v-if="perfil === 'estudante'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-sm font-medium text-slate-700" for="curso">Curso</label>
            <InputText id="curso" v-model="form.curso" placeholder="Ex: Informática" class="w-full" />
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium text-slate-700" for="turno">Turno</label>
            <Dropdown id="turno" v-model="form.turno" :options="turnos" optionLabel="label" optionValue="value" placeholder="Selecione" class="w-full" />
          </div>
        </div>

        <div v-if="errorMessage" class="pt-2">
          <Message severity="error" :closable="false">{{ errorMessage }}</Message>
        </div>

        <Button type="submit" label="Cadastrar" icon="pi pi-user-plus" class="w-full" :loading="loading" />
      </form>

      <div class="flex items-center gap-2 text-sm text-slate-600">
        <span>Já tem conta?</span>
        <RouterLink to="/login" class="text-emerald-700 font-semibold hover:underline">Entrar</RouterLink>
      </div>
    </div>
  </AuthLayout>
</template>
