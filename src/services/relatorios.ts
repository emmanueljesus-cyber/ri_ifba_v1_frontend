import api from './api'

export const relatorioService = {
  async semanal(mes?: number, ano?: number) {
    const { data } = await api.get('/admin/relatorios/semanal', {
      params: { mes, ano }
    })
    return data.data
  },

  async mensal(mes?: number, ano?: number) {
    const { data } = await api.get('/admin/relatorios/mensal', {
      params: { mes, ano }
    })
    return data.data
  },

  async exportarSemanal(mes: number, ano: number) {
    const response = await api.get('/admin/relatorios/exportar-semanal', {
      params: { mes, ano },
      responseType: 'blob'
    })
    return response.data
  },

  async presencas(dataInicio: string, dataFim: string, turno?: string) {
    const { data } = await api.get('/admin/relatorios/presencas', {
      params: { data_inicio: dataInicio, data_fim: dataFim, turno }
    })
    return data
  },

  async dashboard(params: any = {}) {
    const { data } = await api.get('/admin/dashboard', { params })
    return data.data
  },

  async exportarGeral(dataInicio: string, dataFim: string, turno?: string, formato: string = 'xlsx') {
    const response = await api.get('/admin/relatorios/exportar', {
      params: { data_inicio: dataInicio, data_fim: dataFim, turno, formato },
      responseType: 'blob'
    })
    return response.data
  }
}
