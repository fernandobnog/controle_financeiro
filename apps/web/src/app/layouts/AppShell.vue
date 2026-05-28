<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <div>
        <p class="app-shell__eyebrow">Controle Financeiro Familiar</p>
        <h1>Recuperacao de ativos e reorganizacao financeira</h1>
      </div>
      <div class="app-shell__actions">
        <Button
          label="Dashboard"
          icon="pi pi-chart-bar"
          :outlined="!isActive('dashboard')"
          @click="navigateTo('dashboard')"
        />
        <Button
          label="Revisao OCR"
          icon="pi pi-file-edit"
          severity="secondary"
          :outlined="!isActive('intake')"
          @click="navigateTo('intake')"
        />
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

export default defineComponent({
  name: 'AppShell',
  components: {
    Button,
    RouterView
  },
  methods: {
    navigateTo(routeName: 'dashboard' | 'intake') {
      this.$router.push({ name: routeName });
    },
    isActive(routeName: 'dashboard' | 'intake') {
      return this.$route.name === routeName;
    }
  }
});
</script>