<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNotificacoesStore } from '../stores/notificacoes'
import { useAvatar } from '../composables/useAvatar'
import Avatar from 'primevue/avatar'
import Badge from 'primevue/badge'
import OverlayPanel from 'primevue/overlaypanel'

const router = useRouter()
const auth = useAuthStore()
const notificacoes = useNotificacoesStore()
const { getInitials, getAvatarStyle } = useAvatar()

const menuPanel = ref()
const notifPanel = ref()

const handleLogout = async () => {
  await auth.logout()
  router.push('/login')
  menuPanel.value?.hide()
}

const toggleMenu = (event: Event) => {
  menuPanel.value?.toggle(event)
}

const toggleNotif = (event: Event) => {
  notifPanel.value?.toggle(event)
}

onMounted(() => {
  notificacoes.carregarNaoLidas()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div class="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 gap-2 sm:gap-4">
        <!-- Logo e Título -->
        <div class="flex items-center gap-3 sm:gap-4 flex-1 justify-center sm:justify-start">
          <div class="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0">
            <img
              src="../assets/image/logo_ifba_vector.svg"
              alt="Logo IFBA"
              class="w-full h-full object-contain"
            />
          </div>
          <div class="text-center sm:text-left">
            <h1 class="text-lg sm:text-xl font-bold text-slate-800">RI-IFBA</h1>
            <p class="text-xs text-slate-500">Restaurante Institucional</p>
          </div>
        </div>

        <!-- Ações do Header -->
        <div class="flex items-center gap-4">
          <!-- Notificações -->
          <button
            class="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
            @click="toggleNotif"
          >
            <i class="pi pi-bell text-slate-600 text-xl"></i>
            <Badge
              v-if="notificacoes.contador > 0"
              :value="notificacoes.contador"
              severity="danger"
              class="absolute -top-1 -right-1"
            />
          </button>
          <OverlayPanel ref="notifPanel">
            <div class="w-80 max-h-96 overflow-y-auto">
              <div class="p-3 border-b border-slate-200">
                <h3 class="font-semibold text-slate-800">Notificações</h3>
                <p class="text-xs text-slate-500">{{ notificacoes.contador }} não lidas</p>
              </div>
              <div v-if="notificacoes.naoLidas.length === 0" class="p-4 text-center text-slate-500">
                Nenhuma notificação
              </div>
              <div v-else class="divide-y divide-slate-100">
                <div
                  v-for="notif in notificacoes.naoLidas.slice(0, 5)"
                  :key="notif.id"
                  class="p-3 hover:bg-slate-50 cursor-pointer"
                  @click="notificacoes.marcarComoLida(notif.id)"
                >
                  <p class="font-medium text-sm text-slate-800">{{ notif.titulo }}</p>
                  <p class="text-xs text-slate-600 mt-1">{{ notif.mensagem }}</p>
                </div>
              </div>
              <div v-if="notificacoes.naoLidas.length > 0" class="p-3 border-t border-slate-200">
                <button
                  class="text-sm text-emerald-600 hover:text-emerald-700 font-medium w-full text-center"
                  @click="notificacoes.marcarTodasComoLidas()"
                >
                  Marcar todas como lidas
                </button>
              </div>
            </div>
          </OverlayPanel>

          <!-- Avatar e Menu do Usuário -->
          <button
            class="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            @click="toggleMenu"
          >
            <Avatar
              v-if="auth.user?.foto"
              :image="auth.user.foto"
              shape="circle"
              size="large"
            />
            <Avatar
              v-else
              :label="getInitials(auth.user?.nome)"
              shape="circle"
              size="large"
              :style="getAvatarStyle(auth.user?.nome)"
            />
            <div class="text-left hidden md:block">
              <p class="text-sm font-medium text-slate-800">{{ auth.user?.nome }}</p>
              <p class="text-xs text-slate-500">{{ auth.user?.matricula }}</p>
            </div>
            <i class="pi pi-chevron-down text-slate-400 text-sm hidden sm:block"></i>
          </button>
          <OverlayPanel ref="menuPanel">
            <div class="w-56">
              <nav class="space-y-1">
                <!-- Links para Admin -->
                <template v-if="auth.user?.perfil === 'admin'">
                  <button
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors"
                    @click="router.push('/admin'); menuPanel?.hide()"
                  >
                    <i class="pi pi-home text-slate-600"></i>
                    <span class="text-sm font-medium text-slate-700">Dashboard Admin</span>
                  </button>
                  <button
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors"
                    @click="router.push('/admin/cardapios'); menuPanel?.hide()"
                  >
                    <i class="pi pi-calendar text-slate-600"></i>
                    <span class="text-sm font-medium text-slate-700">Gestão de Cardápios</span>
                  </button>
                  <button
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors"
                    @click="router.push('/admin/presencas'); menuPanel?.hide()"
                  >
                    <i class="pi pi-check-circle text-slate-600"></i>
                    <span class="text-sm font-medium text-slate-700">Controle de Presenças</span>
                  </button>
                  <button
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors"
                    @click="router.push('/admin/bolsistas'); menuPanel?.hide()"
                  >
                    <i class="pi pi-users text-slate-600"></i>
                    <span class="text-sm font-medium text-slate-700">Gestão de Bolsistas</span>
                  </button>
                  <button
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors"
                    @click="router.push('/admin/justificativas'); menuPanel?.hide()"
                  >
                    <i class="pi pi-file-edit text-slate-600"></i>
                    <span class="text-sm font-medium text-slate-700">Justificativas</span>
                  </button>
                  <button
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors"
                    @click="router.push('/admin/relatorios'); menuPanel?.hide()"
                  >
                    <i class="pi pi-file-excel text-slate-600"></i>
                    <span class="text-sm font-medium text-slate-700">Relatórios e Modelos</span>
                  </button>
                  <button
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors"
                    @click="menuPanel?.hide(); router.push('/admin/extras')"
                  >
                    <i class="pi pi-ticket text-slate-600"></i>
                    <span class="text-sm font-medium text-slate-700">Fila de Extras</span>
                  </button>
                </template>

                <!-- Links para Estudante -->
                <template v-else>
                  <button
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors"
                    @click="router.push('/'); menuPanel?.hide()"
                  >
                    <i class="pi pi-home text-slate-600"></i>
                    <span class="text-sm font-medium text-slate-700">Dashboard</span>
                  </button>
                  <button
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors"
                    @click="router.push('/cardapio'); menuPanel?.hide()"
                  >
                    <i class="pi pi-calendar text-slate-600"></i>
                    <span class="text-sm font-medium text-slate-700">Cardápio</span>
                  </button>
                  <button
                    v-if="!auth.user?.bolsista"
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors"
                    @click="router.push('/fila-extras'); menuPanel?.hide()"
                  >
                    <i class="pi pi-ticket text-slate-600"></i>
                    <span class="text-sm font-medium text-slate-700">Fila de Extras</span>
                  </button>
                  <button
                    v-if="auth.user?.bolsista"
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors"
                    @click="router.push('/justificativas'); menuPanel?.hide()"
                  >
                    <i class="pi pi-file-edit text-slate-600"></i>
                    <span class="text-sm font-medium text-slate-700">Justificativas</span>
                  </button>
                  <button
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors"
                    @click="router.push('/historico'); menuPanel?.hide()"
                  >
                    <i class="pi pi-history text-slate-600"></i>
                    <span class="text-sm font-medium text-slate-700">Histórico</span>
                  </button>
                </template>

                <div class="border-t border-slate-200 my-2"></div>
                <button
                  class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors"
                  @click="router.push(auth.user?.perfil === 'admin' ? '/admin/perfil' : '/perfil'); menuPanel?.hide()"
                >
                  <i class="pi pi-user text-slate-600"></i>
                  <span class="text-sm font-medium text-slate-700">Perfil</span>
                </button>
                <button
                  class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-red-50 rounded-lg transition-colors"
                  @click="handleLogout"
                >
                  <i class="pi pi-sign-out text-red-600"></i>
                  <span class="text-sm font-medium text-red-700">Sair</span>
                </button>
              </nav>
            </div>
          </OverlayPanel>
        </div>
      </div>
    </header>

    <!-- Conteúdo Principal -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RouterView />
    </main>
  </div>
</template>
