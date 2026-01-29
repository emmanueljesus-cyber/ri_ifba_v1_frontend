import api from './api'
import type { CardapioDia, Cardapio } from '../types/cardapio'

interface ApiResponse<T> {
  data: T
  message: string
}

export const cardapioService = {
  async hoje(): Promise<CardapioDia> {
    // Laravel Resource retorna { data: { id, data, almoco, jantar, ... } }
    const response = await api.get('/estudante/cardapio/hoje')
    // Retorna o objeto completo, não apenas response.data.data (que é só a data string)
    return response.data
  },

  async hojePublico(): Promise<CardapioDia> {
    // Rota pública sem autenticação
    const response = await api.get('/cardapio/hoje')
    return response.data
  },

  async semanal(params?: { turno?: string, data?: string }): Promise<Cardapio[]> {
    const { data: response } = await api.get<ApiResponse<Cardapio[]>>('/cardapio/semanal', { params })
    return response.data
  },

  async mensal(params?: { turno?: string, per_page?: number }): Promise<Cardapio[]> {
    const { data: response } = await api.get<ApiResponse<Cardapio[]>>('/cardapio/mensal', { params })
    return response.data
  },

  async presencaHoje(): Promise<any> {
    const { data } = await api.get<ApiResponse<any>>('/estudante/presenca/hoje')
    return data.data
  },

  async carteirinha(): Promise<any> {
    const { data } = await api.get<ApiResponse<any>>('/estudante/carteirinha')
    return data.data
  },

  // Admin methods
  async listarAdmin(): Promise<Cardapio[]> {
    // Buscar todos os cardápios (per_page grande para pegar todos)
    const { data } = await api.get<ApiResponse<Cardapio[]>>('/admin/cardapios', {
      params: { per_page: 500 }
    })
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

  async deletarTodosAdmin(): Promise<void> {
    await api.delete('/admin/cardapios')
  },

  async deletarMultiplosAdmin(ids: number[]): Promise<void> {
    await api.post('/admin/cardapios/delete-multiple', { ids })
  },

  async deletarPorPeriodoAdmin(dataInicio: string, dataFim: string): Promise<void> {
    await api.post('/admin/cardapios/delete-by-date', {
      data_inicio: dataInicio,
      data_fim: dataFim
    })
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
