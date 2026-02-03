<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import PublicLayout from '../layouts/PublicLayout.vue'
import Button from 'primevue/button'

const auth = useAuthStore()
const router = useRouter()

const goToLogin = () => {
  router.push('/login')
}

const quickActions = [
  {
    title: 'Ver Cardápio',
    description: 'Consulte o cardápio semanal do refeitório',
    icon: 'pi pi-calendar',
    route: '/cardapio',
    color: 'primary'
  },
  {
    title: 'Meu Perfil',
    description: 'Gerencie suas informações pessoais',
    icon: 'pi pi-user',
    route: '/perfil',
    color: 'blue'
  },
  {
    title: 'Histórico',
    description: 'Veja seu histórico de refeições',
    icon: 'pi pi-history',
    route: '/historico',
    color: 'purple'
  }
]
</script>

<template>
  <PublicLayout>
    <div class="space-y-16 py-4">
      <!-- Hero Section -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <!-- Left Side - Content -->
        <div class="space-y-8">
          <div class="space-y-4">
            <h2 class="text-4xl lg:text-6xl font-black text-slate-800 leading-tight lato-black tracking-tight">
              Alimentação com <br />
              <span class="text-primary-600">Qualidade e Praticidade</span>
            </h2>
            <p class="text-lg text-slate-600 max-w-xl leading-relaxed">
              Sistema de gestão do <strong>Refeitório Institucional do IFBA</strong>. 
              Acompanhe cardápios, registre justificativas e gerencie suas refeições de forma inteligente.
            </p>
          </div>

          <!-- Info Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex items-center gap-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:border-primary-200 transition-colors group">
               <div class="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all">
                 <i class="pi pi-check-circle text-xl"></i>
               </div>
               <div>
                 <p class="text-xs font-black text-slate-400 uppercase">Bolsistas</p>
                 <p class="text-sm font-bold text-slate-700">Acesso Garantido</p>
               </div>
            </div>
            <div class="flex items-center gap-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-colors group">
               <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                 <i class="pi pi-ticket text-xl"></i>
               </div>
               <div>
                 <p class="text-xs font-black text-slate-400 uppercase">Não-Bolsistas</p>
                 <p class="text-sm font-bold text-slate-700">Fila de Extras</p>
               </div>
            </div>
          </div>

          <!-- CTA Buttons -->
          <div class="flex flex-wrap gap-4 pt-4">
            <template v-if="!auth.isAuthenticated">
              <Button 
                label="Começar agora" 
                icon="pi pi-arrow-right"
                iconPos="right"
                severity="success"
                size="large"
                class="!rounded-xl !px-10 !py-4 shadow-lg hover: transition-all font-bold"
                @click="goToLogin"
              />
              <Button 
                label="Ver Cardápio" 
                icon="pi pi-calendar"
                severity="secondary"
                size="large"
                outlined
                class="!rounded-xl !px-8 !py-4 font-bold !border-slate-200 hover:!bg-white"
                @click="() => router.push('/cardapio')"
              />
            </template>
            <template v-else>
              <Button 
                label="Ir para o Dashboard" 
                icon="pi pi-th-large" 
                severity="success" 
                size="large" 
                class="!rounded-xl !px-10 !py-4 shadow-lg font-bold" 
                @click="() => router.push('/dashboard')" 
              />
            </template>
          </div>
        </div>

        <!-- Right Side - Illustration -->
        <div class="flex items-center justify-center order-first lg:order-last">
          <div class="relative group w-full max-w-lg">
            <div class="absolute -inset-4 bg-gradient-to-r from-emerald-400 to-primary-500 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition duration-1000"></div>
            <img 
              src="../assets/image/home_illustration.svg" 
              alt="Ilustração Refeitório" 
              class="relative w-full drop-shadow-2xl animate-float"
            />
          </div>
        </div>
      </section>

      <!-- Quick Actions (for authenticated users) -->
      <section v-if="auth.isAuthenticated" class="space-y-8">
        <div class="flex items-center gap-3">
          <div class="w-2 h-8 bg-primary-500 rounded-full"></div>
          <h3 class="text-3xl font-black text-slate-800 lato-black tracking-tight">Acesso Rápido</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div 
            v-for="action in quickActions" 
            :key="action.route"
            class="bg-white p-8 rounded-xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all cursor-pointer group"
            @click="() => router.push(action.route)"
          >
            <div 
              :class="`w-16 h-16 rounded-xl bg-${action.color}-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`"
            >
              <i :class="`${action.icon} text-3xl text-${action.color}-600`"></i>
            </div>
            <h4 class="text-xl font-black text-slate-800 mb-2">{{ action.title }}</h4>
            <p class="text-slate-500 font-medium leading-relaxed">{{ action.description }}</p>
          </div>
        </div>
      </section>
    </div>
  </PublicLayout>
</template>

<style scoped>
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
}
.animate-float {
  animation: float 6s ease-in-out infinite;
}

/* Custom background colors for quick action cards */
.bg-primary-100 {
  background-color: var(--p-primary-100);
}
.text-primary-600 {
  color: var(--p-primary-600);
}
.bg-blue-100 {
  background-color: #dbeafe;
}
.text-blue-600 {
  color: #2563eb;
}
.bg-purple-100 {
  background-color: #f3e8ff;
}
.text-purple-600 {
  color: #9333ea;
}
</style>
