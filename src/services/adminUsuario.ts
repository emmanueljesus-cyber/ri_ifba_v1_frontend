import api from './api'

export const adminUsuarioService = {
  listar(params: any = {}) {
    return api.get('/admin/usuarios', { params }).then(res => res.data)
  },

  buscarPorId(id: number) {
    return api.get(`/admin/usuarios/${id}`).then(res => res.data)
  },

  criar(dados: any) {
    return api.post('/admin/usuarios', dados).then(res => res.data)
  },

  atualizar(id: number, dados: any) {
    return api.put(`/admin/usuarios/${id}`, dados).then(res => res.data)
  },

  desativar(id: number) {
    return api.delete(`/admin/usuarios/${id}`).then(res => res.data)
  },

  reativar(id: number) {
    return api.post(`/admin/usuarios/${id}/reativar`).then(res => res.data)
  }
}
