import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notificacoesService } from '../services/notificacoes'
import type { Notificacao } from '../types/notificacao'

export const useNotificacoesStore = defineStore('notificacoes', () => {
  const notificacoes = ref<Notificacao[]>([])
  const loading = ref(false)

  const naoLidas = computed(() => notificacoes.value.filter(n => !n.lida))
  const contador = computed(() => naoLidas.value.length)

  async function carregarNaoLidas() {
    // Prevent multiple simultaneous calls
    if (loading.value) return

    loading.value = true
    try {
      notificacoes.value = await notificacoesService.naoLidas()
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
      // Silenciar erro - não é crítico para o funcionamento do app
      notificacoes.value = []
    } finally {
      loading.value = false
    }
  }

  async function marcarComoLida(id: number) {
    try {
      await notificacoesService.marcarComoLida(id)
      const notif = notificacoes.value.find(n => n.id === id)
      if (notif) {
        notif.lida = true
        notif.lida_em = new Date().toISOString()
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  async function marcarTodasComoLidas() {
    try {
      await notificacoesService.marcarTodasComoLidas()
      notificacoes.value.forEach(n => {
        n.lida = true
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
