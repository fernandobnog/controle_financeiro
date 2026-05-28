<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <div>
        <p class="app-shell__eyebrow">Controle Financeiro Familiar</p>
        <h1>Recuperação de ativos e reorganização financeira</h1>
        <p class="panel-note app-shell__welcome">{{ currentSession?.user.fullName }} | {{ currentSession?.user.email }}</p>
      </div>
      <div class="app-shell__actions">
        <Button
          label="Início"
          icon="pi pi-home"
          :outlined="!isActive('welcome')"
          @click="navigateTo('welcome')"
        />
        <Button
          label="Dashboard"
          icon="pi pi-chart-bar"
          severity="secondary"
          :outlined="!isActive('dashboard')"
          @click="navigateTo('dashboard')"
        />
        <Button
          label="Plano"
          icon="pi pi-calendar"
          severity="secondary"
          :outlined="!isActive('plan')"
          @click="navigateTo('plan')"
        />
        <Button
          label="Dados financeiros"
          icon="pi pi-wallet"
          severity="secondary"
          :outlined="!isActive('onboarding')"
          @click="navigateTo('onboarding')"
        />
        <Button
          label="Documentos"
          icon="pi pi-file-edit"
          severity="secondary"
          :outlined="!isActive('intake')"
          @click="navigateTo('intake')"
        />
        <Button
          label="Senha"
          icon="pi pi-key"
          severity="secondary"
          :outlined="!isActive('change-password')"
          @click="navigateTo('change-password')"
        />
        <Button label="Sair" icon="pi pi-sign-out" severity="contrast" outlined @click="logout" />
      </div>
    </header>
    <main class="app-shell__content">
      <RouterView />
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { RouterView } from 'vue-router';
import Button from 'primevue/button';

import { authState, clearCurrentSession } from '@/shared/auth/session';

type AppRoute = 'welcome' | 'dashboard' | 'plan' | 'intake' | 'onboarding' | 'change-password';

export default defineComponent({
  name: 'AppShell',
  components: {
    Button,
    RouterView
  },
  computed: {
    currentSession() {
      return authState.session;
    }
  },
  methods: {
    navigateTo(routeName: AppRoute) {
      this.$router.push({ name: routeName });
    },
    isActive(routeName: AppRoute) {
      return this.$route.name === routeName;
    },
    logout() {
      clearCurrentSession();
      this.$router.replace({ name: 'login' });
    }
  }
});
</script>
        <Button
          label="Dados financeiros"
          icon="pi pi-home"
          severity="secondary"
          :outlined="!isActive('onboarding')"
          @click="navigateTo('onboarding')"
        />
        <Button
          label="Documentos"
          icon="pi pi-file-edit"
          severity="secondary"
          :outlined="!isActive('intake')"
          @click="navigateTo('intake')"
        />
        <Button
          label="Senha"
          icon="pi pi-key"
          severity="secondary"
          :outlined="!isActive('change-password')"
          @click="navigateTo('change-password')"
        />
        <Button label="Sair" icon="pi pi-sign-out" severity="contrast" outlined @click="logout" />
      </div>
    </header>
    <main class="app-shell__content">
      <RouterView />
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { RouterView } from 'vue-router';
import Button from 'primevue/button';

import { authState, clearCurrentSession } from '@/shared/auth/session';

export default defineComponent({
  name: 'AppShell',
  components: {
    Button,
    RouterView
  },
  computed: {
    currentSession() {
      return authState.session;
    }
  },
  methods: {
    navigateTo(routeName: 'dashboard' | 'intake' | 'onboarding' | 'change-password') {
      this.$router.push({ name: routeName });
    },
    isActive(routeName: 'dashboard' | 'intake' | 'onboarding' | 'change-password') {
      return this.$route.name === routeName;
    },
    logout() {
      clearCurrentSession();
      this.$router.replace({ name: 'login' });
    }
  }
});
</script>