<template>
  <section class="auth-screen">
    <div class="auth-screen__content auth-screen__content--register">
      <Card class="auth-card">
        <template #title>Redefinir senha</template>
        <template #subtitle>Use o token temporario e defina uma nova senha para entrar novamente.</template>
        <template #content>
          <form class="auth-form" @submit.prevent="submitReset">
            <label class="auth-form__field">
              <span>Token</span>
              <InputText v-model.trim="form.token" autocomplete="one-time-code" />
            </label>

            <label class="auth-form__field">
              <span>Nova senha</span>
              <Password
                v-model="form.newPassword"
                :feedback="false"
                toggleMask
                autocomplete="new-password"
                inputClass="auth-form__password-input"
              />
            </label>

            <label class="auth-form__field">
              <span>Confirmar nova senha</span>
              <Password
                v-model="confirmPassword"
                :feedback="false"
                toggleMask
                autocomplete="new-password"
                inputClass="auth-form__password-input"
              />
            </label>

            <p v-if="errorMessage" class="panel-error">{{ errorMessage }}</p>

            <Button type="submit" label="Redefinir e entrar" icon="pi pi-key" :loading="loading" />

            <p class="panel-note auth-form__footer">
              Precisa de outro token?
              <RouterLink :to="{ name: 'password-recovery' }">Gerar novamente</RouterLink>
            </p>
          </form>
        </template>
      </Card>

      <aside class="auth-hero page-panel">
        <p class="app-shell__eyebrow">Sessão segura</p>
        <h1>Redefinição concluída com autenticação imediata.</h1>
        <p class="panel-note auth-hero__note">
          Depois da troca, uma nova sessão autenticada é criada para você retomar dashboard, onboarding e revisão de documentos.
        </p>
      </aside>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';

import { resetPassword } from '@/shared/api/client';
import { setCurrentSession } from '@/shared/auth/session';

export default defineComponent({
  name: 'ResetPasswordPage',
  components: {
    Button,
    Card,
    InputText,
    Password,
    RouterLink
  },
  data() {
    return {
      form: {
        token: '',
        newPassword: ''
      },
      confirmPassword: '',
      loading: false,
      errorMessage: ''
    };
  },
  created() {
    const routeToken = this.$route.query.token;

    if (typeof routeToken === 'string') {
      this.form.token = routeToken;
    }
  },
  methods: {
    async submitReset() {
      if (this.form.newPassword !== this.confirmPassword) {
        this.errorMessage = 'A confirmação da nova senha precisa ser igual.';
        return;
      }

      this.loading = true;
      this.errorMessage = '';

      try {
        const session = await resetPassword(this.form);

        setCurrentSession(session);
        this.$router.replace({ name: 'dashboard' });
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : 'Falha ao redefinir a senha.';
      } finally {
        this.loading = false;
      }
    }
  }
});
</script>