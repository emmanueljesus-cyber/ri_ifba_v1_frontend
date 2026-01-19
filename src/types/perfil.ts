export interface Perfil {
  id: number
  nome: string
  email: string
  matricula: string
  perfil: 'admin' | 'estudante'
  bolsista: boolean
  curso?: string | null
  turno?: 'matutino' | 'vespertino' | 'noturno' | null
  foto?: string | null
  preferencia_alimentar?: string | null
  restricoes_alimentares?: string[]
  dias_cadastrados?: string[]
  created_at?: string
  updated_at?: string
}

export interface AtualizarPerfilRequest {
  nome?: string
  email?: string
  curso?: string
  turno?: 'matutino' | 'vespertino' | 'noturno'
}

export interface AlterarSenhaRequest {
  senha_atual: string
  senha_nova: string
  senha_nova_confirmacao: string
}
