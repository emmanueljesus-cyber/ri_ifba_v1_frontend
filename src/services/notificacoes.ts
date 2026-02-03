import api from './api'
import type { Notificacao, ContadorNotificacoes } from '../types/notificacao'

interface ApiResponse<T> {
  data: T
  message: string
}

export const notificacoesService = {
  async listar(isAdmin = false): Promise<Notificacao[]> {
    const prefix = isAdmin ? '/admin' : '/estudante'
    const { data } = await api.get<ApiResponse<Notificacao[]>>(`${prefix}/notificacoes`)
    return data.data
  },

  async naoLidas(isAdmin = false): Promise<Notificacao[]> {
    const prefix = isAdmin ? '/admin' : '/estudante'
    const { data } = await api.get<ApiResponse<Notificacao[]>>(`${prefix}/notificacoes/nao-lidas`)
    return data.data
  },

  async contador(isAdmin = false): Promise<ContadorNotificacoes> {
    const prefix = isAdmin ? '/admin' : '/estudante'
    const { data } = await api.get<ApiResponse<ContadorNotificacoes>>(`${prefix}/notificacoes/contador`)
    return data.data
  },

  async marcarComoLida(id: number, isAdmin = false): Promise<void> {
    const prefix = isAdmin ? '/admin' : '/estudante'
    await api.patch(`${prefix}/notificacoes/${id}/ler`)
  },

  async marcarTodasComoLidas(isAdmin = false): Promise<void> {
    const prefix = isAdmin ? '/admin' : '/estudante'
    await api.patch(`${prefix}/notificacoes/marcar-todas-lidas`)
  }
}
