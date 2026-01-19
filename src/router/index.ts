import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../layouts/DashboardLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
      path: '/',
      component: DashboardLayout,
      meta: { requiresAuth: true, role: 'estudante' },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('../views/estudante/DashboardView.vue')
        },
        {
          path: 'cardapio',
          name: 'cardapio',
          component: () => import('../views/estudante/CardapioView.vue')
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
        }
      ]
    },
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
        }
      ]
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()

  if (auth.isAuthenticated && !auth.user) {
    try {
      await auth.fetchMe()
    } catch (err) {
      console.error('Erro ao recuperar sessão', err)
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  // Impede perfis diferentes de acessarem rotas reservadas
  if (to.meta.role && auth.user && auth.user.perfil !== to.meta.role) {
    return next({ name: auth.user.perfil === 'admin' ? 'admin-dashboard' : 'dashboard' })
  }

  // Verifica acesso exclusivo para bolsistas
  if (to.meta.bolsistaOnly && auth.user && !auth.user.bolsista) {
    return next({ name: 'dashboard' })
  }

  if (to.meta.public && auth.isAuthenticated) {
    return next({ name: auth.user?.perfil === 'admin' ? 'admin-dashboard' : 'dashboard' })
  }

  return next()
})

export default router
