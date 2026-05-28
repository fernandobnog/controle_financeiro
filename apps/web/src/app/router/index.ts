import { createRouter, createWebHistory } from 'vue-router';

import DashboardPage from '@/modules/dashboard/pages/DashboardPage.vue';
import IntakePage from '@/modules/intake/pages/IntakePage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardPage
    },
    {
      path: '/intake',
      name: 'intake',
      component: IntakePage
    }
  ]
});

export default router;