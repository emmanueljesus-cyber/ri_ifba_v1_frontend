<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Button from 'primevue/button'

const auth = useAuthStore()
const router = useRouter()

const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Header/Navbar -->
    <nav class="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo/Title -->
          <div class="flex items-center gap-3 cursor-pointer" @click="() => router.push('/')">
            <img 
              src="../assets/image/ifba_icone_colorido.svg" 
              alt="IFBA" 
              class="w-10 h-10"
            />
            <div>
              <h1 class="text-lg font-bold text-slate-800">RI-IFBA</h1>
              <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest">Campus Salvador</p>
            </div>
          </div>

          <!-- Actions -->
          <div v-if="!auth.isAuthenticated" class="flex items-center gap-3">
            <Button 
              label="Entrar" 
              icon="pi pi-sign-in" 
              @click="goToLogin"
              text
              class="!text-slate-600 hover:!bg-slate-100 !rounded-xl"
            />
            <Button 
              label="Cadastrar" 
              icon="pi pi-user-plus" 
              @click="() => router.push('/cadastro')"
              severity="success"
              class="!rounded-xl hidden sm:flex"
            />
          </div>
          <div v-else class="flex items-center gap-3">
            <div class="hidden sm:block text-right">
              <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest">Bem-vindo(a)</p>
              <p class="text-sm font-bold text-slate-700">{{ auth.user?.nome }}</p>
            </div>
            <Button 
              label="Meu Painel" 
              icon="pi pi-th-large" 
              @click="() => router.push('/dashboard')"
              class="!rounded-xl shadow-md shadow-primary-100"
              severity="success"
            />
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <img 
              src="../assets/image/logo_ifba_vector.svg" 
              alt="IFBA Logo" 
              class="w-8 h-8 opacity-60"
            />
            <div class="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center md:text-left">
              <p>Instituto Federal da Bahia</p>
              <p>Campus Salvador</p>
            </div>
          </div>
          <div class="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
            © 2026 IFBA RI - Sistema de Gestão
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
