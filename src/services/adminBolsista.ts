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
    formData.append('file', arquivo)
    const { data } = await api.post('/admin/bolsistas/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  async criarBolsista(dados: {
    matricula: string
    turno_refeicao: string
  }) {
    const { data } = await api.post('/admin/bolsistas-aprovados', {
      matricula: dados.matricula,
      turno_refeicao: dados.turno_refeicao
    })
    return data
  },

  async desligar(id: number, motivo: string) {
    await api.post(`/admin/bolsistas/${id}/desligar`, { motivo })
  },

  async reativar(id: number, motivo?: string) {
    const payload = motivo ? { motivo } : {}
    await api.post(`/admin/bolsistas/${id}/reativar`, payload)
  },

  async reativarAprovado(id: number) {
    await api.post(`/admin/bolsistas-aprovados/${id}/reativar`)
  },

  async desativarAprovado(id: number) {
    await api.delete(`/admin/bolsistas-aprovados/${id}`)
  },
}
