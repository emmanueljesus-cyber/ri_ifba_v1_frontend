import api from './api'
import type { Perfil, AtualizarPerfilRequest, AlterarSenhaRequest } from '../types/perfil'

interface ApiResponse<T> {
  data: T
  message: string
}

const normalizeFotoUrl = (path: string | null): string | null => {
  if (!path || path.startsWith('http') || path.startsWith('data:')) return path
  
  // Limpa possíveis barras duplas no início do path
  const cleanPath = path.startsWith('/') ? path.substring(1) : path
  
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')
  return `${baseUrl}/storage/${cleanPath}`
}

const normalizePerfil = (raw: any): Perfil => ({
  id: raw.id,
  nome: raw.nome,
  email: raw.email,
  matricula: raw.matricula,
  perfil: raw.perfil,
  bolsista: !!raw.bolsista,
  curso: raw.curso ?? null,
  turno: raw.turno ?? null,
  foto: normalizeFotoUrl(raw.foto ?? raw.foto_url ?? null),
  preferencia_alimentar: raw.preferencia_alimentar ?? null,
  dias_cadastrados: raw.dias_cadastrados ?? [],
  created_at: raw.created_at,
  updated_at: raw.updated_at
})

export const perfilService = {
  async obter(): Promise<Perfil> {
    const { data } = await api.get<ApiResponse<Perfil>>('/estudante/perfil')
    return normalizePerfil(data.data)
  },

  async atualizar(payload: AtualizarPerfilRequest): Promise<Perfil> {
    const { data } = await api.put<ApiResponse<Perfil>>('/estudante/perfil', payload)
    return normalizePerfil(data.data)
  },

  async alterarSenha(payload: AlterarSenhaRequest): Promise<void> {
    await api.put('/estudante/perfil/senha', payload)
  },

  async atualizarFoto(file: File): Promise<Perfil> {
    const formData = new FormData()
    formData.append('foto', file)
    formData.append('consentimento', '1') // LGPD: consentimento explícito
    const { data } = await api.post<ApiResponse<Perfil>>('/estudante/perfil/foto', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return normalizePerfil(data.data)
  },

  async removerFoto(): Promise<void> {
    await api.delete('/estudante/perfil/foto')
  }
}
