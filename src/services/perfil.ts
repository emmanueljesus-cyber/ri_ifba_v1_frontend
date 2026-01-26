import api from './api'
import type { Perfil, AtualizarPerfilRequest, AlterarSenhaRequest } from '../types/perfil'

interface ApiResponse<T> {
  data: T
  message: string
}

const normalizeFotoUrl = (path: string | null): string | null => {
  if (!path) return null
  if (path.startsWith('data:')) return path

  // Se já é uma URL absoluta para o storage, usar diretamente via proxy
  if (path.includes('/storage/')) {
    // Extrair apenas o caminho /storage/... para usar via proxy do Vite
    const storageIndex = path.indexOf('/storage/')
    if (storageIndex !== -1) {
      return path.substring(storageIndex)
    }
  }

  // Se já começa com /storage/
  if (path.startsWith('/storage/')) return path

  // Se começa com storage/ (sem barra inicial)
  if (path.startsWith('storage/')) return '/' + path

  // Se for apenas o caminho interno (ex: fotos_perfil/user.jpg)
  const cleanPath = path.startsWith('/') ? path.substring(1) : path
  return `/storage/${cleanPath}`
}

const normalizePerfil = (raw: any): Perfil => ({
  id: raw.id,
  nome: raw.nome,
  email: raw.email,
  matricula: raw.matricula,
  perfil: raw.perfil,
  bolsista: !!raw.bolsista,
  curso: raw.curso ?? null,
  turno_refeicao: raw.turno_refeicao ?? null,
  turno_aula: raw.turno_aula ?? null,
  foto: normalizeFotoUrl(raw.foto ?? raw.foto_url ?? null),
  preferencia_alimentar: raw.preferencia_alimentar ?? null,
  restricoes_alimentares: raw.restricoes_alimentares ?? [],
  alergias: raw.alergias ?? null,
  is_ovolactovegetariano: !!raw.is_ovolactovegetariano,
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
  },

  async atualizarRestricoesAlimentares(payload: {
    preferencia_alimentar?: string
    restricoes_alimentares?: string[]
  }): Promise<{ preferencia_alimentar: string; restricoes_alimentares: string[] }> {
    const { data } = await api.put('/estudante/perfil/restricoes-alimentares', payload)
    return data.data
  },
  
  async atualizarDiasSemana(dias: number[], motivo?: string): Promise<any> {
    const { data } = await api.put('/estudante/perfil/dias-semana', { dias, motivo })
    return data
  }
}
