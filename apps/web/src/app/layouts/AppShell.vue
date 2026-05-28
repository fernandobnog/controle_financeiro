<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <div>
        <p class="app-shell__eyebrow">Controle Financeiro Familiar</p>
        <h1>Recuperacao de ativos e reorganizacao financeira</h1>
        <p class="panel-note app-shell__welcome">{{ currentSession?.user.fullName }} | {{ currentSession?.user.email }}</p>
      </div>
      <div class="app-shell__actions">
        <Button
          label="Dashboard"
          icon="pi pi-chart-bar"
          :outlined="!isActive('dashboard')"
          @click="navigateTo('dashboard')"
        />
        <Button
          label="Base financeira"
          icon="pi pi-home"
          severity="secondary"
          :outlined="!isActive('onboarding')"
          @click="navigateTo('onboarding')"
        />
        <Button
          label="Revisao OCR"
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