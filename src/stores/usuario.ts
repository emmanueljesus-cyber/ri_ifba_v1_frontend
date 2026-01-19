import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUsuarioStore = defineStore('usuario', () => {
  const usuario = ref(null)
  const token = ref(localStorage.getItem('token'))

  const estaLogado = computed(() => !!token.value)

  function definirUsuario(novoUsuario: any, novoToken: string) {
    usuario.value = novoUsuario
    token.value = novoToken
    localStorage.setItem('token', novoToken)
  }

  function fazerLogout() {
    usuario.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  return {
    usuario,
    token,
    estaLogado,
    definirUsuario,
    fazerLogout
  }
})
