export type PerfilUsuario = 'admin' | 'estudante'

export interface User {
  id: number
  nome: string
  email: string
  matricula: string
  perfil: PerfilUsuario
  bolsista?: boolean
  curso?: string | null
  turno_refeicao?: string | null
  turno_aula?: string | null
  foto?: string | null
  dias_semana?: string[] | any[]
}

export interface LoginRequest {
  matricula: string
  password: string
}

export interface RegisterRequest {
  nome: string
  email: string
  matricula: string
  password: string
  password_confirmation: string
  curso?: string | null
  turno?: string | null
  turno_aula?: string | null
  perfil?: PerfilUsuario
}

export interface AuthPayload {
  user: User
  token: string
}
