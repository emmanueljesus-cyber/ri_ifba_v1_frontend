import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../layouts/DashboardLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public Home Page
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { public: true }
    },
    // Auth Routes
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { public: true }
    },
    {
      path: '/cadastro',
      name: 'register',
      component: () => import('../views/auth/RegisterView.vue'),
      meta: { public: true }
    },
    {
      path: '/cardapio',
      name: 'cardapio',
      component: () => import('../views/estudante/CardapioView.vue'),
      meta: { public: true }
    },
    // Student Dashboard
    {
      path: '/dashboard',
      component: DashboardLayout,
      meta: { requiresAuth: true, role: 'estudante' },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('../views/estudante/DashboardView.vue')
        },
        {
          path: 'fila-extras',
          name: 'fila-extras',
          component: () => import('../views/estudante/FilaExtrasView.vue')
        },
        {
          path: 'historico',
          name: 'historico',
          component: () => import('../views/estudante/HistoricoView.vue')
        },
        {
          path: 'perfil',
          name: 'perfil',
          component: () => import('../views/estudante/PerfilView.vue')
        },
        {
          path: 'justificativas',
          name: 'justificativas',
          component: () => import('../views/estudante/JustificativasView.vue'),
          meta: { bolsistaOnly: true }
        },
        {
          path: 'cardapio',
          name: 'dashboard-cardapio',
          component: () => import('../views/estudante/CardapioView.vue')
        }
      ]
    },
    // Admin Dashboard
    {
      path: '/admin',
      component: DashboardLayout,
      meta: { requiresAuth: true, role: 'admin' },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('../views/admin/DashboardView.vue')
        },
        {
          path: 'cardapios',
          name: 'admin-cardapios',
          component: () => import('../views/admin/CardapiosView.vue')
        },
        {
          path: 'presencas',
          name: 'admin-presencas',
          component: () => import('../views/admin/PresencasView.vue')
        },
        {
          path: 'extras',
          name: 'admin-extras',
          component: () => import('../views/admin/ExtrasView.vue')
        },
        {
          path: 'bolsistas',
          name: 'admin-bolsistas',
          component: () => import('../views/admin/BolsistasView.vue')
        },
        {
          path: 'justificativas',
          name: 'admin-justificativas',
          component: () => import('../views/admin/JustificativasView.vue')
        },
        {
          path: 'relatorios',
          name: 'admin-relatorios',
          component: () => import('../views/admin/RelatoriosView.vue')
        },
        {
          path: 'usuarios',
          name: 'admin-usuarios',
          component: () => import('../views/admin/UsuariosView.vue')
        },
        {
          path: 'solicitacoes-mudanca-dias',
          name: 'admin-solicitacoes-mudanca-dias',
          component: () => import('../views/admin/SolicitacoesMudancaDiasView.vue')
        },
        {
          path: 'perfil',
          name: 'admin-perfil',
          component: () => import('../views/estudante/PerfilView.vue')
        }
      ]
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()

  // Fetch user data if authenticated but user data not loaded
  if (auth.isAuthenticated && !auth.user) {
    try {
      await auth.fetchMe()
    } catch (err) {
      console.error('Erro ao recuperar sessão', err)
      // Se falhou ao buscar o "me", a sessão provavelmente é inválida
      if (to.meta.requiresAuth) {
        return next({ name: 'login', query: { redirect: to.fullPath } })
      }
    }
  }

  // Redirect to login if route requires auth
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  // Prevent different profiles from accessing reserved routes
  if (to.meta.role && auth.user && auth.user.perfil !== to.meta.role) {
    return next({ name: auth.user.perfil === 'admin' ? 'admin-dashboard' : 'dashboard' })
  }

  // Check exclusive access for scholarship holders
  if (to.meta.bolsistaOnly && auth.user && !auth.user.bolsista) {
    return next({ name: 'dashboard' })
  }

  // Redirect authenticated users from auth pages or home to dashboard (unless explicitly accessing public cardapio)
  if (auth.isAuthenticated && (to.name === 'login' || to.name === 'register' || to.name === 'home')) {
    return next({ name: auth.user?.perfil === 'admin' ? 'admin-dashboard' : 'dashboard' })
  }

  // Allow public access to cardapio even for authenticated users
  if (to.name === 'cardapio' && to.meta.public) {
    return next()
  }

  return next()
})

export default router
