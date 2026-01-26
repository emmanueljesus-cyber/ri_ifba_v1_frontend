/**
 * Composable para extrair mensagens de erro de respostas da API
 * Suporta diferentes formatos de resposta de erro
 */
export function useErrorMessage() {
  /**
   * Extrai mensagem de erro de uma resposta axios error
   * Suporta formatos:
   * - { message: string }
   * - { errors: { campo: [mensagens] } }
   * - { data: { message: string } }
   */
  const extractErrorMessage = (err: any, fallback = 'Ocorreu um erro'): string => {
    const data = err?.response?.data

    if (!data) {
      return err?.message || fallback
    }

    // Formato: { message: string }
    if (data.message) {
      return data.message
    }

    // Formato: { errors: { campo: [mensagens] } }
    if (data.errors && typeof data.errors === 'object') {
      const firstErrorKey = Object.keys(data.errors)[0]
      if (firstErrorKey) {
        const errorMessages = data.errors[firstErrorKey]
        if (Array.isArray(errorMessages) && errorMessages.length > 0) {
          return errorMessages[0]
        }
        if (typeof errorMessages === 'string') {
          return errorMessages
        }
      }
    }

    return fallback
  }

  return {
    extractErrorMessage
  }
}
