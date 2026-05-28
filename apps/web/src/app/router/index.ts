import { createRouter, createWebHistory } from 'vue-router';

import AppShell from '@/app/layouts/AppShell.vue';
import ForgotPasswordPage from '@/modules/auth/pages/ForgotPasswordPage.vue';
import LoginPage from '@/modules/auth/pages/LoginPage.vue';
import RegisterPage from '@/modules/auth/pages/RegisterPage.vue';
import ResetPasswordPage from '@/modules/auth/pages/ResetPasswordPage.vue';
import ChangePasswordPage from '@/modules/auth/pages/ChangePasswordPage.vue';
import DashboardPage from '@/modules/dashboard/pages/DashboardPage.vue';
import IntakePage from '@/modules/intake/pages/IntakePage.vue';
import OnboardingPage from '@/modules/onboarding/pages/OnboardingPage.vue';
import { hasActiveSession } from '@/shared/auth/session';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/auth/login',
      name: 'login',
      component: LoginPage,
      meta: {
        guestOnly: true
      }
    },
    {
      path: '/auth/register',
      name: 'register',
      component: RegisterPage,
      meta: {
        guestOnly: true
      }
    },
    {
      path: '/auth/password-recovery',
      name: 'password-recovery',
      component: ForgotPasswordPage,
      meta: {
        guestOnly: true
      }
    },
    {
      path: '/auth/password-reset',
      name: 'password-reset',
      component: ResetPasswordPage,
      meta: {
        guestOnly: true
      }
    },
    {
      path: '/',
      component: AppShell,
      meta: {
        requiresAuth: true
      },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardPage
        },
        {
          path: 'intake',
          name: 'intake',
          component: IntakePage
        },
        {
          path: 'onboarding',
          name: 'onboarding',
          component: OnboardingPage
        },
        {
          path: 'security/password',
          name: 'change-password',
          component: ChangePasswordPage
        }
      ]
    }
  ]
});

router.beforeEach((to) => {
  const authenticated = hasActiveSession();

  if (to.meta.requiresAuth && !authenticated) {
    return {
      name: 'login',
      query: {
        redirect: to.fullPath
      }
    };
  }

  if (to.meta.guestOnly && authenticated) {
    return {
      name: 'dashboard'
    };
  }

  return true;
});

export default router;