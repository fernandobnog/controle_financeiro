<template>
  <section class="auth-screen">
    <div class="auth-screen__content">
      <aside class="auth-hero page-panel">
        <p class="app-shell__eyebrow">Acesso seguro</p>
        <h1>Entre na sua conta e continue o plano financeiro.</h1>
        <p class="panel-note auth-hero__note">
          O acesso fica restrito a dados da sua conta, com sessão autenticada para dashboard, revisão de OCR e documentos.
        </p>
        <div class="auth-hero__highlights">
          <div class="auth-highlight">
            <i class="pi pi-shield"></i>
            <span>Autorização por conta em toda leitura e escrita.</span>
          </div>
          <div class="auth-highlight">
            <i class="pi pi-lock"></i>
            <span>Documentos e planos disponíveis apenas para usuários autenticados.</span>
          </div>
          <div class="auth-highlight">
            <i class="pi pi-chart-line"></i>
            <span>Diagnóstico e revisão prontos para retomar do ponto em que você parou.</span>
          </div>
        </div>
      </aside>

      <Card class="auth-card">
        <template #title>Entrar</template>
        <template #subtitle>Use seu e-mail e senha para acessar sua conta.</template>
        <template #content>
          <form class="auth-form" @submit.prevent="submitLogin">
            <label class="auth-form__field">
              <span>E-mail</span>
              <InputText v-model.trim="form.email" type="email" autocomplete="email" />
            </label>

            <label class="auth-form__field">
              <span>Senha</span>
              <Password
                v-model="form.password"
                :feedback="false"
                toggleMask
                autocomplete="current-password"
                inputClass="auth-form__password-input"
              />
            </label>

            <p class="panel-note auth-form__footer auth-form__footer--inline">
              <RouterLink :to="{ name: 'password-recovery' }">Esqueci minha senha</RouterLink>
            </p>

            <p v-if="errorMessage" class="panel-error">{{ errorMessage }}</p>

            <Button type="submit" label="Entrar" icon="pi pi-sign-in" :loading="loading" />

            <p class="panel-note auth-form__footer">
              Ainda não tem conta?
              <RouterLink :to="{ name: 'register' }">Criar cadastro</RouterLink>
            </p>
          </form>
        </template>
      </Card>
    </div>
  </section>
</template>

<script lang="ts">
import type { Session } from '@controle-financeiro/shared-contracts';
import { defineComponent } from 'vue';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';

import { loginUser } from '@/shared/api/client';
import { setCurrentSession } from '@/shared/auth/session';

export default defineComponent({
  name: 'LoginPage',
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
        email: '',
        password: ''
      },
      loading: false,
      errorMessage: ''
    };
  },
  methods: {
    resolveRedirect(): string {
      const redirect = this.$route.query.redirect;

      return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/';
    },
    async submitLogin() {
      this.loading = true;
      this.errorMessage = '';

      try {
        const session = await loginUser(this.form);

        this.finishAuthentication(session);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : 'Falha ao autenticar usuario.';
      } finally {
        this.loading = false;
      }
    },
    finishAuthentication(session: Session) {
      setCurrentSession(session);
      this.$router.replace(this.resolveRedirect());
    }
  }
});
</script>