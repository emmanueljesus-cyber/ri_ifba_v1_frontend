import api from './api'
import type { Notificacao, ContadorNotificacoes } from '../types/notificacao'

interface ApiResponse<T> {
  data: T
  message: string
}

export const notificacoesService = {
  async listar(): Promise<Notificacao[]> {
    const { data } = await api.get<ApiResponse<Notificacao[]>>('/estudante/notificacoes')
    return data.data
  },

  async naoLidas(): Promise<Notificacao[]> {
    const { data } = await api.get<ApiResponse<Notificacao[]>>('/estudante/notificacoes/nao-lidas')
    return data.data
  },

  async contador(): Promise<ContadorNotificacoes> {
    const { data } = await api.get<ApiResponse<ContadorNotificacoes>>('/estudante/notificacoes/contador')
    return data.data
  },

  async marcarComoLida(id: number): Promise<void> {
    await api.patch(`/estudante/notificacoes/${id}/ler`)
  },

  async marcarTodasComoLidas(): Promise<void> {
    await api.patch('/estudante/notificacoes/marcar-todas-lidas')
  }
}
