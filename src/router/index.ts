import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      children: [
        { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
        { path: 'departments', name: 'departments', component: () => import('@/views/DepartmentsView.vue'), meta: { adminOnly: true } },
        { path: 'department-positions', name: 'department-positions', component: () => import('@/views/DepartmentPositionsView.vue'), meta: { adminOnly: true } },
        { path: 'employees', name: 'employees', component: () => import('@/views/EmployeesView.vue'), meta: { adminOnly: true } },
        { path: 'projects', name: 'projects', component: () => import('@/views/ProjectsView.vue') },
        { path: 'projects/:id', name: 'project-detail', component: () => import('@/views/ProjectDetailView.vue') },
        { path: 'project-roles', name: 'project-roles', component: () => import('@/views/ProjectRolesView.vue'), meta: { adminOnly: true } },
        { path: 'reports', name: 'reports', component: () => import('@/views/ReportsView.vue') },
        { path: 'payments', name: 'payments', component: () => import('@/views/PaymentsView.vue') },
        { path: 'materials', name: 'materials', component: () => import('@/views/MaterialsView.vue') },
        { path: 'suppliers', name: 'suppliers', component: () => import('@/views/SuppliersView.vue') },
        { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { adminOnly: true } },
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const appStore = useAppStore();
  
  if (!authStore.initialized) {
    await authStore.init();
  }

  if (!authStore.user && !to.meta.public) {
    next({ name: 'login' });
  } else if (authStore.user && to.name === 'login') {
    next({ name: 'dashboard' });
  } else if (authStore.user && to.name === 'dashboard' && !appStore.hasAnyPaymentAccess) {
    // Basic users go to Reports instead of Dashboard
    next({ name: 'reports' });
  } else if (to.meta.adminOnly && !authStore.isAdmin) {
    next({ name: 'dashboard' });
  } else if (to.name === 'payments' && !appStore.hasAnyPaymentAccess) {
    next({ name: 'reports' });
  } else {
    next();
  }
});

export default router;
