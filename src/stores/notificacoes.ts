import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notificacoesService } from '../services/notificacoes'
import { useAuthStore } from './auth'
import type { Notificacao } from '../types/notificacao'

export const useNotificacoesStore = defineStore('notificacoes', () => {
  const notificacoes = ref<Notificacao[]>([])
  const loading = ref(false)

  const naoLidas = computed(() => notificacoes.value.filter(n => !n.lida_em))
  const contador = computed(() => naoLidas.value.length)

  // Helper para verificar se é admin
  function isAdmin(): boolean {
    try {
      const authStore = useAuthStore()
      return authStore.user?.perfil === 'admin'
    } catch {
      return false
    }
  }

  async function carregarNaoLidas() {
    // Prevent multiple simultaneous calls
    if (loading.value) return

    loading.value = true
    try {
      const admin = isAdmin()
      const novasNotificacoes = await notificacoesService.naoLidas(admin)

      // Só atualiza se houver mudança para evitar re-renders desnecessários
      if (JSON.stringify(novasNotificacoes) !== JSON.stringify(notificacoes.value)) {
        notificacoes.value = novasNotificacoes
      }
    } catch (error) {
      // Silenciar erro - não é crítico para o funcionamento do app
      // Manter lista anterior em caso de erro
    } finally {
      loading.value = false
    }
  }

  async function marcarComoLida(id: number) {
    try {
      await notificacoesService.marcarComoLida(id, isAdmin())
      const notif = notificacoes.value.find(n => n.id === id)
      if (notif) {
        notif.lida_em = new Date().toISOString()
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  async function marcarTodasComoLidas() {
    try {
      await notificacoesService.marcarTodasComoLidas(isAdmin())
      notificacoes.value.forEach(n => {
        n.lida_em = new Date().toISOString()
      })
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }

  return {
    notificacoes,
    naoLidas,
    contador,
    loading,
    carregarNaoLidas,
    marcarComoLida,
    marcarTodasComoLidas
  }
})
