import api from './api'

export const adminPresencaService = {
  async validarQrCode(token: string) {
    const { data } = await api.post('/admin/presencas/validar-qrcode', { token })
    return data
  },

  async buscarBolsista(search: string, turno: string, data?: string) {
    const { data: res } = await api.get('/admin/bolsistas/buscar', {
      params: { search, turno, data }
    })
    return res.data
  },

  async confirmarPorId(userId: number, data?: string, turno?: string) {
    const payload = (data && turno) ? { data, turno } : {}
    const { data: res } = await api.post(`/admin/bolsistas/${userId}/confirmar-presenca`, payload)
    return res.data
  },

  async marcarFalta(userId: number, data: string, turno: string, justificada = false) {
    await api.post(`/admin/bolsistas/${userId}/marcar-falta`, { data, turno, justificada })
  },

  async listarDoDia(data: string, turno: string) {
    const { data: res } = await api.get('/admin/bolsistas/dia', {
      params: { data, turno }
    })
    return res.data
  }
}
