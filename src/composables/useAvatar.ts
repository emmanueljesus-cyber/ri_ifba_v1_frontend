/**
 * Composable para gerenciar avatares de usuários
 * Gera cores baseadas no nome do usuário para avatares sem foto
 */

// Paleta de cores para avatares - Padronizada para a paleta IFBA
const avatarColors = [
  { bg: '#6ee7b7', text: '#064e3b' }, // Verde Emerald (Padrão)
  { bg: '#1e742c', text: '#FFFFFF' }, // Verde Escuro
  { bg: '#3b8d48', text: '#FFFFFF' }, // Verde Claro
  { bg: '#175c23', text: '#FFFFFF' }, // Verde Musgo
]

export function useAvatar() {
  /**
   * Gera uma cor baseada no nome do usuário
   * Usa um hash simples do nome para garantir consistência
   */
  const getColorFromName = (name: string = ''): { bg: string; text: string } => {
    if (!name || name.trim() === '') return avatarColors[0]!

    // Gera um hash simples do nome
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
      hash = hash & hash // Converte para 32bit integer
    }

    // Seleciona uma cor baseada no hash
    const index = Math.abs(hash) % avatarColors.length
    return avatarColors[index]!
  }

  /**
   * Obtém as iniciais do nome (primeiras letras de até 2 palavras)
   */
  const getInitials = (name: string = ''): string => {
    if (!name || name.trim() === '') return 'U'

    const parts = name.trim().split(' ').filter(part => part.length > 0)

    if (parts.length === 0) return 'U'
    if (parts.length === 1) return (parts[0] ?? 'U').charAt(0).toUpperCase()

    // Pega primeira letra do primeiro e último nome
    const first = parts[0] ?? ''
    const last = parts[parts.length - 1] ?? ''
    return (first.charAt(0) + last.charAt(0)).toUpperCase()
  }

  /**
   * Gera um estilo CSS para o avatar
   */
  const getAvatarStyle = (name: string = ''): string => {
    const colors = getColorFromName(name)
    return `background-color: ${colors.bg}; color: ${colors.text};`
  }

  return {
    getColorFromName,
    getInitials,
    getAvatarStyle,
  }
}
