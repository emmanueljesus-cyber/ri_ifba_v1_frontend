import api from './api'
import type { CardapioDia, Cardapio } from '../types/cardapio'

interface ApiResponse<T> {
  data: T
  message: string
}

export const cardapioService = {
  async hoje(): Promise<CardapioDia> {
    const { data } = await api.get<ApiResponse<CardapioDia>>('/estudante/cardapio/hoje')
    return data.data
  },

  async semanal(): Promise<Cardapio[]> {
    const { data: response } = await api.get<ApiResponse<Cardapio[]>>('/cardapio/semanal')
    return response.data
  },

  async presencaHoje(): Promise<any> {
    const { data } = await api.get<ApiResponse<any>>('/estudante/presenca/hoje')
    return data.data
  },

  // Admin methods
  async listarAdmin(): Promise<Cardapio[]> {
    const { data } = await api.get<ApiResponse<Cardapio[]>>('/admin/cardapios')
    return data.data
  },

  async salvarAdmin(payload: any): Promise<void> {
    if (payload.id) {
      await api.put(`/admin/cardapios/${payload.id}`, payload)
    } else {
      await api.post('/admin/cardapios', payload)
    }
  },

  async excluirAdmin(id: number): Promise<void> {
    await api.delete(`/admin/cardapios/${id}`)
  },

  async importarAdmin(arquivo: File, turnos: string[] = ['almoco', 'jantar']): Promise<any> {
    const formData = new FormData()
    formData.append('file', arquivo)
    turnos.forEach(t => formData.append('turno[]', t))
    
    const { data } = await api.post('/admin/cardapios/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  }
}
