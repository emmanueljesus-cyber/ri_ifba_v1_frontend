export interface Perfil {
  id: number
  nome: string
  email: string
  matricula: string
  perfil: 'admin' | 'estudante'
  bolsista: boolean
  curso?: string | null
  turno_refeicao?: 'almoco' | 'jantar' | null
  turno_aula?: 'matutino' | 'vespertino' | 'noturno' | null
  foto?: string | null
  preferencia_alimentar?: string | null
  restricoes_alimentares?: string[]
  alergias?: string | null
  is_ovolactovegetariano?: boolean
  dias_cadastrados?: string[]
  created_at?: string
  updated_at?: string
}

export interface AtualizarPerfilRequest {
  nome?: string
  email?: string
  curso?: string
  turno?: 'almoco' | 'jantar' | 'matutino' | 'vespertino' | 'noturno'
  alergias?: string
  restricoes_alimentares?: string[]
  is_ovolactovegetariano?: boolean
}

export interface AlterarSenhaRequest {
  current_password: string
  password: string
  password_confirmation: string
}
