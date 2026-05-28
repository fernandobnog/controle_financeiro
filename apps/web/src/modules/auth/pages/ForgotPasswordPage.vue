<template>
  <section class="auth-screen">
    <div class="auth-screen__content">
      <aside class="auth-hero page-panel">
        <p class="app-shell__eyebrow">Recuperacao de acesso</p>
        <h1>Solicite um token temporario para redefinir sua senha.</h1>
        <p class="panel-note auth-hero__note">
          Em producao, o token deve ser entregue por um canal seguro. No ambiente local, ele aparece na tela para fechar o fluxo.
        </p>
      </aside>

      <Card class="auth-card">
        <template #title>Recuperar senha</template>
        <template #subtitle>Informe o e-mail da conta para gerar um token de redefinicao.</template>
        <template #content>
          <form class="auth-form" @submit.prevent="submitRecovery">
            <label class="auth-form__field">
              <span>E-mail</span>
              <InputText v-model.trim="form.email" type="email" autocomplete="email" />
            </label>

            <p v-if="feedbackMessage" class="panel-note">{{ feedbackMessage }}</p>
            <p v-if="errorMessage" class="panel-error">{{ errorMessage }}</p>

            <div v-if="resetToken" class="page-panel">
              <p class="app-shell__eyebrow">Token local</p>
              <p class="panel-note">{{ resetToken }}</p>
              <Button type="button" label="Ir para redefinicao" icon="pi pi-arrow-right" @click="goToReset" />
            </div>

            <Button type="submit" label="Gerar token" icon="pi pi-envelope" :loading="loading" />

            <p class="panel-note auth-form__footer">
              Lembrou a senha?
              <RouterLink :to="{ name: 'login' }">Voltar para entrar</RouterLink>
            </p>
          </form>
        </template>
      </Card>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';

import { requestPasswordRecovery } from '@/shared/api/client';

export default defineComponent({
  name: 'ForgotPasswordPage',
  components: {
    Button,
    Card,
    InputText,
    RouterLink
  },
  data() {
    return {
      form: {
        email: ''
      },
      loading: false,
      errorMessage: '',
      feedbackMessage: '',
      resetToken: ''
    };
  },
  methods: {
    async submitRecovery() {
      this.loading = true;
      this.errorMessage = '';
      this.feedbackMessage = '';
      this.resetToken = '';

      try {
        const result = await requestPasswordRecovery(this.form);

        this.feedbackMessage = result.message;
        this.resetToken = result.resetToken ?? '';
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : 'Falha ao solicitar a recuperacao de senha.';
      } finally {
        this.loading = false;
      }
    },
    goToReset() {
      this.$router.push({
        name: 'password-reset',
        query: {
          token: this.resetToken
        }
      });
    }
  }
});
</script>