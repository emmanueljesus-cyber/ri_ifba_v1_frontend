import api from './api'

export const adminBolsistaService = {
  async listarTodos(params?: any) {
    const { data } = await api.get('/admin/bolsistas', { params })
    return data.data
  },

  async listarAprovados(params?: any) {
    const { data } = await api.get('/admin/bolsistas-aprovados', { params })
    return data.data
  },

  async importar(arquivo: File) {
    const formData = new FormData()
    formData.append('arquivo', arquivo)
    const { data } = await api.post('/admin/bolsistas/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  async desligar(id: number, motivo: string) {
    await api.post(`/admin/bolsistas/${id}/desligar`, { motivo })
  },

  async reativar(id: number) {
    await api.post(`/admin/bolsistas/${id}/reativar`)
  },

  async reativarAprovado(id: number) {
    await api.post(`/admin/bolsistas-aprovados/${id}/reativar`)
  },

  async desativarAprovado(id: number) {
    await api.delete(`/admin/bolsistas-aprovados/${id}`)
  },
}
