<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNotificacoesStore } from '../stores/notificacoes'
import { useAvatar } from '../composables/useAvatar'
import Avatar from 'primevue/avatar'
import OverlayPanel from 'primevue/overlaypanel'

const router = useRouter()
const auth = useAuthStore()
const notificacoes = useNotificacoesStore()
const { getAvatarStyle } = useAvatar()

const menuPanel = ref()
const notifPanel = ref()
let intervaloNotificacoes: ReturnType<typeof setInterval> | null = null

// Estado dos acordeões do menu
const menuAccordion = ref({
  operacoes: true,  // Aberto por padrão
  cadastros: false,
  solicitacoes: false,
  relatorios: false
})

const toggleAccordion = (section: keyof typeof menuAccordion.value) => {
  menuAccordion.value[section] = !menuAccordion.value[section]
}

const handleLogout = async () => {
  // Limpar intervalo ao fazer logout
  if (intervaloNotificacoes) {
    clearInterval(intervaloNotificacoes)
    intervaloNotificacoes = null
  }
  await auth.logout()
  router.push('/login')
  menuPanel.value?.hide()
}

const toggleMenu = (event: Event) => {
  menuPanel.value?.toggle(event)
}

const toggleNotif = (event: Event) => {
  notifPanel.value?.toggle(event)
  // Recarregar ao abrir o panel
  notificacoes.carregarNaoLidas()
}

// Retorna o ícone baseado no tipo de notificação
const getNotifIcon = (tipo: string): string => {
  const icons: Record<string, string> = {
    'justificativa_aprovada': 'pi pi-check-circle',
    'justificativa_rejeitada': 'pi pi-times-circle',
    'cadastro_confirmado': 'pi pi-user-plus',
    'fila_confirmada': 'pi pi-users',
    'fila_posicao_alterada': 'pi pi-sort-alt',
    'fila_aprovada': 'pi pi-check',
    'fila_rejeitada': 'pi pi-ban',
    'sucesso': 'pi pi-star',
    'aviso': 'pi pi-exclamation-triangle',
    'geral': 'pi pi-info-circle',
    'solicitacao_aprovada': 'pi pi-check-square',
    'solicitacao_rejeitada': 'pi pi-minus-circle',
  }
  return icons[tipo] || 'pi pi-bell'
}

// Retorna o estilo do ícone baseado no tipo
const getNotifIconStyle = (tipo: string): string => {
  const styles: Record<string, string> = {
    'justificativa_aprovada': 'bg-emerald-100 text-emerald-600',
    'justificativa_rejeitada': 'bg-red-100 text-red-600',
    'cadastro_confirmado': 'bg-blue-100 text-blue-600',
    'fila_confirmada': 'bg-purple-100 text-purple-600',
    'fila_posicao_alterada': 'bg-amber-100 text-amber-600',
    'fila_aprovada': 'bg-emerald-100 text-emerald-600',
    'fila_rejeitada': 'bg-red-100 text-red-600',
    'sucesso': 'bg-emerald-100 text-emerald-600',
    'aviso': 'bg-amber-100 text-amber-600',
    'geral': 'bg-slate-100 text-slate-600',
    'solicitacao_aprovada': 'bg-emerald-100 text-emerald-600',
    'solicitacao_rejeitada': 'bg-red-100 text-red-600',
  }
  return styles[tipo] || 'bg-slate-100 text-slate-600'
}

// Formata tempo relativo (há X minutos, há X horas, etc)
const formatarTempoNotificacao = (dataStr: string): string => {
  if (!dataStr) return ''

  const data = new Date(dataStr)
  const agora = new Date()
  const diffMs = agora.getTime() - data.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHoras = Math.floor(diffMs / 3600000)
  const diffDias = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Agora mesmo'
  if (diffMin < 60) return `Há ${diffMin} min`
  if (diffHoras < 24) return `Há ${diffHoras}h`
  if (diffDias === 1) return 'Ontem'
  if (diffDias < 7) return `Há ${diffDias} dias`

  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Retorna a rota de destino baseada no tipo da notificação
const getNotifRoute = (tipo: string, dados?: any): string => {
  const isAdminUser = auth.user?.perfil === 'admin'

  const routeMap: Record<string, string> = {
    // Justificativas
    'justificativa_aprovada': '/dashboard/justificativas',
    'justificativa_rejeitada': '/dashboard/justificativas',
    // Para admin, nova justificativa vai para gestão
    'aviso': isAdminUser ? '/admin/justificativas' : '/dashboard/justificativas',
    // Fila de extras
    'fila_confirmada': '/dashboard/fila-extras',
    'fila_posicao_alterada': '/dashboard/fila-extras',
    'fila_aprovada': '/dashboard/fila-extras',
    'fila_rejeitada': '/dashboard/fila-extras',
    // Cadastro
    'cadastro_confirmado': '/dashboard/perfil',
    // Solicitações
    'solicitacao_aprovada': '/dashboard/perfil',
    'solicitacao_rejeitada': '/dashboard/perfil',
    // Geral e sucesso
    'sucesso': '/dashboard',
    'geral': '/dashboard',
  }

  return routeMap[tipo] || '/dashboard/notificacoes'
}

// Ao clicar na notificação: marca como lida e navega para o local
const handleNotifClick = async (notif: any) => {
  // Fechar o panel
  notifPanel.value?.hide()

  // Marcar como lida
  await notificacoes.marcarComoLida(notif.id)

  // Navegar para o destino
  const destino = getNotifRoute(notif.tipo, notif.dados)
  router.push(destino)
}

// Formata mensagem de notificação para destacar nomes em negrito
const formatarMensagemNotificacao = (mensagem: string): string => {
  if (!mensagem) return ''

  // Padrões comuns de nomes em notificações:
  // "O estudante João Silva solicitou..." -> destaca "João Silva"
  // "Maria Santos justificou..." -> destaca "Maria Santos"
  // "Aprovada a solicitação de Pedro Lima" -> destaca "Pedro Lima"

  // Regex para encontrar nomes próprios (2+ palavras capitalizadas consecutivas)
  const regexNomes = /\b([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+)+)\b/g

  // Substitui nomes encontrados por versão em negrito
  return mensagem.replace(regexNomes, '<strong class="font-bold text-slate-800">$1</strong>')
}

onMounted(() => {
  // Carregar notificações imediatamente
  notificacoes.carregarNaoLidas()

  // Atualizar automaticamente a cada 30 segundos (menos frequente para evitar piscadas)
  intervaloNotificacoes = setInterval(() => {
    notificacoes.carregarNaoLidas()
  }, 30000)
})

onUnmounted(() => {
  // Limpar intervalo ao desmontar componente
  if (intervaloNotificacoes) {
    clearInterval(intervaloNotificacoes)
    intervaloNotificacoes = null
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
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
            class="relative p-2.5 rounded-xl hover:bg-slate-100 transition-all duration-200 group"
            @click="toggleNotif"
          >
            <i class="pi pi-bell text-slate-500 text-xl group-hover:text-primary-600 transition-colors"></i>
            <span
              v-if="notificacoes.contador > 0"
              class="absolute -top-0.5 -right-0.5 min-w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 shadow-lg"
            >
              {{ notificacoes.contador > 9 ? '9+' : notificacoes.contador }}
            </span>
          </button>
          <OverlayPanel ref="notifPanel" class="!rounded-2xl !shadow-2xl !border-0">
            <div class="w-96 max-h-[500px] overflow-hidden flex flex-col">
              <!-- Header do Painel -->
              <div class="p-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <i class="pi pi-bell text-xl"></i>
                    </div>
                    <div>
                      <h3 class="font-bold text-lg">Notificações</h3>
                      <p class="text-primary-100 text-xs">{{ notificacoes.contador }} não lidas</p>
                    </div>
                  </div>
                  <button
                    v-if="notificacoes.naoLidas.length > 0"
                    class="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
                    @click="notificacoes.marcarTodasComoLidas()"
                  >
                    Limpar todas
                  </button>
                </div>
              </div>

              <!-- Lista de Notificações -->
              <div class="flex-1 overflow-y-auto">
                <div v-if="notificacoes.naoLidas.length === 0" class="p-8 text-center">
                  <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <i class="pi pi-inbox text-3xl text-slate-300"></i>
                  </div>
                  <p class="text-slate-500 font-medium">Tudo em dia!</p>
                  <p class="text-slate-400 text-sm mt-1">Nenhuma notificação pendente</p>
                </div>
                <div v-else class="divide-y divide-slate-100">
                  <div
                    v-for="notif in notificacoes.naoLidas.slice(0, 6)"
                    :key="notif.id"
                    class="p-4 hover:bg-slate-50 cursor-pointer transition-all duration-200 group"
                    @click="handleNotifClick(notif)"
                  >
                    <div class="flex gap-3">
                      <!-- Ícone por tipo -->
                      <div
                        class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        :class="getNotifIconStyle(notif.tipo)"
                      >
                        <i :class="getNotifIcon(notif.tipo)" class="text-lg"></i>
                      </div>
                      <!-- Conteúdo -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2">
                          <p class="font-semibold text-sm text-slate-800 group-hover:text-primary-700 transition-colors">
                            {{ notif.titulo }}
                          </p>
                          <i class="pi pi-chevron-right text-xs text-slate-300 group-hover:text-primary-500 transition-colors"></i>
                        </div>
                        <p
                          class="text-xs text-slate-600 mt-1 line-clamp-2"
                          v-html="formatarMensagemNotificacao(notif.mensagem)"
                        ></p>
                        <p class="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                          <i class="pi pi-clock"></i>
                          {{ formatarTempoNotificacao(notif.created_at) }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="p-3 border-t border-slate-200 bg-slate-50">
                <button
                  class="w-full py-2.5 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                  @click="router.push('/dashboard/notificacoes'); notifPanel?.hide()"
                >
                  <i class="pi pi-list"></i>
                  Ver todas as notificações
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
              icon="pi pi-user"
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
          <OverlayPanel ref="menuPanel" class="!rounded-2xl !shadow-xl !border !border-slate-200">
            <div class="w-72">
              <nav class="space-y-1 max-h-[70vh] overflow-y-auto">
                <!-- Links para Admin -->
                <template v-if="auth.user?.perfil === 'admin'">
                  <!-- Dashboard -->
                  <button
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-primary-50 hover:text-primary-700 rounded-xl transition-all group"
                    @click="router.push('/admin'); menuPanel?.hide()"
                  >
                    <div class="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                      <i class="pi pi-th-large text-primary-600"></i>
                    </div>
                    <span class="text-sm font-semibold text-slate-700 group-hover:text-primary-700">Dashboard</span>
                  </button>

                  <!-- Acordeão: Operações Diárias -->
                  <div class="pt-2">
                    <button
                      class="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-slate-50 rounded-lg transition-all"
                      @click="toggleAccordion('operacoes')"
                    >
                      <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operações Diárias</span>
                      <i :class="['pi text-xs text-slate-400 transition-transform duration-200', menuAccordion.operacoes ? 'pi-chevron-up' : 'pi-chevron-down']"></i>
                    </button>
                    <div v-show="menuAccordion.operacoes" class="space-y-1 mt-1">
                      <button
                        class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-emerald-50 rounded-xl transition-all group"
                        @click="router.push('/admin/presencas'); menuPanel?.hide()"
                      >
                        <div class="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                          <i class="pi pi-check-circle text-emerald-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-slate-700 group-hover:text-emerald-700">Controle de Presenças</span>
                      </button>
                      <button
                        class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-amber-50 rounded-xl transition-all group"
                        @click="router.push('/admin/justificativas'); menuPanel?.hide()"
                      >
                        <div class="w-8 h-8 rounded-lg bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center transition-colors">
                          <i class="pi pi-file-edit text-amber-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-slate-700 group-hover:text-amber-700">Justificativas</span>
                      </button>
                      <button
                        class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-purple-50 rounded-xl transition-all group"
                        @click="menuPanel?.hide(); router.push('/admin/extras')"
                      >
                        <div class="w-8 h-8 rounded-lg bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                          <i class="pi pi-ticket text-purple-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-slate-700 group-hover:text-purple-700">Fila de Extras</span>
                      </button>
                    </div>
                  </div>

                  <!-- Acordeão: Cadastros -->
                  <div class="pt-1">
                    <button
                      class="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-slate-50 rounded-lg transition-all"
                      @click="toggleAccordion('cadastros')"
                    >
                      <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cadastros</span>
                      <i :class="['pi text-xs text-slate-400 transition-transform duration-200', menuAccordion.cadastros ? 'pi-chevron-up' : 'pi-chevron-down']"></i>
                    </button>
                    <div v-show="menuAccordion.cadastros" class="space-y-1 mt-1">
                      <button
                        class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-blue-50 rounded-xl transition-all group"
                        @click="router.push('/admin/bolsistas'); menuPanel?.hide()"
                      >
                        <div class="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                          <i class="pi pi-users text-blue-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-slate-700 group-hover:text-blue-700">Bolsistas</span>
                      </button>
                      <button
                        class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-indigo-50 rounded-xl transition-all group"
                        @click="router.push('/admin/usuarios'); menuPanel?.hide()"
                      >
                        <div class="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                          <i class="pi pi-user-plus text-indigo-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-slate-700 group-hover:text-indigo-700">Usuários</span>
                      </button>
                      <button
                        class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-teal-50 rounded-xl transition-all group"
                        @click="router.push('/admin/cardapios'); menuPanel?.hide()"
                      >
                        <div class="w-8 h-8 rounded-lg bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center transition-colors">
                          <i class="pi pi-calendar text-teal-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-slate-700 group-hover:text-teal-700">Cardápios</span>
                      </button>
                    </div>
                  </div>

                  <!-- Acordeão: Solicitações -->
                  <div class="pt-1">
                    <button
                      class="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-slate-50 rounded-lg transition-all"
                      @click="toggleAccordion('solicitacoes')"
                    >
                      <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Solicitações</span>
                      <i :class="['pi text-xs text-slate-400 transition-transform duration-200', menuAccordion.solicitacoes ? 'pi-chevron-up' : 'pi-chevron-down']"></i>
                    </button>
                    <div v-show="menuAccordion.solicitacoes" class="space-y-1 mt-1">
                      <button
                        class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-orange-50 rounded-xl transition-all group"
                        @click="router.push('/admin/solicitacoes-mudanca-dias'); menuPanel?.hide()"
                      >
                        <div class="w-8 h-8 rounded-lg bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                          <i class="pi pi-sync text-orange-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-slate-700 group-hover:text-orange-700">Mudança de Dias</span>
                      </button>
                    </div>
                  </div>

                  <!-- Acordeão: Relatórios -->
                  <div class="pt-1">

                    <button
                      class="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-slate-50 rounded-lg transition-all"
                      @click="toggleAccordion('relatorios')"
                    >
                      <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Relatórios</span>
                      <i :class="['pi text-xs text-slate-400 transition-transform duration-200', menuAccordion.relatorios ? 'pi-chevron-up' : 'pi-chevron-down']"></i>
                    </button>
                    <div v-show="menuAccordion.relatorios" class="space-y-1 mt-1">
                      <button
                          class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-cyan-50 rounded-xl transition-all group"
                          @click="router.push('/admin/relatorios'); menuPanel?.hide()"
                      >
                        <div class="w-8 h-8 rounded-lg bg-cyan-50 group-hover:bg-cyan-100 flex items-center justify-center transition-colors">
                          <i class="pi pi-chart-bar text-cyan-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-slate-700 group-hover:text-cyan-700">Geral</span>
                      </button>
                      <button
                          class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-blue-50 rounded-xl transition-all group"
                          @click="router.push('/admin/relatorios/bolsistas'); menuPanel?.hide()"
                      >
                        <div class="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                          <i class="pi pi-users text-blue-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-slate-700 group-hover:text-blue-700">Bolsistas</span>
                      </button>
                      <button
                        class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-purple-50 rounded-xl transition-all group"
                        @click="router.push('/admin/relatorios/extras'); menuPanel?.hide()"
                      >
                        <div class="w-8 h-8 rounded-lg bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                          <i class="pi pi-ticket text-purple-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-slate-700 group-hover:text-purple-700">Extras</span>
                      </button>
                    </div>
                  </div>
                </template>

                <!-- Links para Estudante -->
                <template v-else>
                  <!-- Dashboard -->
                  <button
                    class="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-primary-50 rounded-xl transition-all group"
                    @click="router.push('/dashboard'); menuPanel?.hide()"
                  >
                    <div class="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                      <i class="pi pi-th-large text-primary-600"></i>
                    </div>
                    <span class="text-sm font-semibold text-slate-700 group-hover:text-primary-700">Dashboard</span>
                  </button>

                  <!-- Seção: Refeições -->
                  <div class="px-3 pt-3 pb-1">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Refeições</p>
                  </div>

                  <button
                    class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-teal-50 rounded-xl transition-all group"
                    @click="router.push('/dashboard/cardapio'); menuPanel?.hide()"
                  >
                    <div class="w-8 h-8 rounded-lg bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center transition-colors">
                      <i class="pi pi-calendar text-teal-600"></i>
                    </div>
                    <span class="text-sm font-semibold text-slate-700 group-hover:text-teal-700">Cardápio da Semana</span>
                  </button>

                  <!-- Opções para NÃO-BOLSISTA -->
                  <button
                    v-if="!auth.user?.bolsista"
                    class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-purple-50 rounded-xl transition-all group"
                    @click="router.push('/dashboard/fila-extras'); menuPanel?.hide()"
                  >
                    <div class="w-8 h-8 rounded-lg bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                      <i class="pi pi-ticket text-purple-600"></i>
                    </div>
                    <span class="text-sm font-semibold text-slate-700 group-hover:text-purple-700">Fila de Extras</span>
                  </button>

                  <!-- Opções para BOLSISTA -->
                  <template v-if="auth.user?.bolsista">
                    <div class="px-3 pt-3 pb-1">
                      <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bolsista</p>
                    </div>

                    <button
                      class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-emerald-50 rounded-xl transition-all group"
                      @click="router.push('/dashboard/carteirinha'); menuPanel?.hide()"
                    >
                      <div class="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                        <i class="pi pi-qrcode text-emerald-600"></i>
                      </div>
                      <span class="text-sm font-semibold text-slate-700 group-hover:text-emerald-700">Minha Carteirinha</span>
                    </button>

                    <button
                      class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-amber-50 rounded-xl transition-all group"
                      @click="router.push('/dashboard/justificativas'); menuPanel?.hide()"
                    >
                      <div class="w-8 h-8 rounded-lg bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center transition-colors">
                        <i class="pi pi-file-edit text-amber-600"></i>
                      </div>
                      <span class="text-sm font-semibold text-slate-700 group-hover:text-amber-700">Justificativas</span>
                    </button>
                  </template>

                  <!-- Seção: Histórico -->
                  <div class="px-3 pt-3 pb-1">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico</p>
                  </div>

                  <button
                    class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-blue-50 rounded-xl transition-all group"
                    @click="router.push('/dashboard/historico'); menuPanel?.hide()"
                  >
                    <div class="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                      <i class="pi pi-history text-blue-600"></i>
                    </div>
                    <span class="text-sm font-semibold text-slate-700 group-hover:text-blue-700">Meu Histórico</span>
                  </button>
                </template>
              </nav>

              <!-- Rodapé do Menu -->
              <div class="border-t border-slate-200 mt-3 pt-3 px-1">
                <button
                  class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-slate-100 rounded-xl transition-all group"
                  @click="router.push(auth.user?.perfil === 'admin' ? '/admin/perfil' : '/dashboard/perfil'); menuPanel?.hide()"
                >
                  <div class="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                    <i class="pi pi-user text-slate-500"></i>
                  </div>
                  <span class="text-sm font-semibold text-slate-700">Meu Perfil</span>
                </button>
                <button
                  class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-red-50 rounded-xl transition-all group"
                  @click="handleLogout"
                >
                  <div class="w-8 h-8 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                    <i class="pi pi-sign-out text-red-500"></i>
                  </div>
                  <span class="text-sm font-semibold text-red-600 group-hover:text-red-700">Sair</span>
                </button>
              </div>
            </div>
          </OverlayPanel>
        </div>
      </div>
    </header>

    <!-- Conteúdo Principal -->
    <main class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <RouterView />
    </main>

    <!-- Footer Simples -->
    <footer class="bg-white border-t border-slate-200 py-4 mt-auto">
      <div class="max-w-7xl mx-auto px-4 text-center">
        <p class="text-xs text-slate-500">
          © 2026 IFBA - Campus Salvador. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  </div>
</template>
