import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function useBreadcrumb() {
  const route = useRoute()
  const router = useRouter()

  const breadcrumbs = computed(() => {
    const items = []

    // Sempre adiciona Home
    items.push({
      label: 'Dashboard',
      icon: 'pi pi-home',
      to: '/'
    })

    // Adiciona página atual se não for home
    if (route.path !== '/') {
      const routeName = route.name as string
      const labels: Record<string, string> = {
        'fila-extras': 'Fila de Extras',
        'historico': 'Histórico',
        'perfil': 'Perfil'
      }

      items.push({
        label: labels[routeName] || routeName,
        to: route.path
      })
    }

    return items
  })

  const goBack = () => {
    router.back()
  }

  return {
    breadcrumbs,
    goBack
  }
}
