<template>
  <section class="auth-screen">
    <div class="auth-screen__content auth-screen__content--register">
      <Card class="auth-card">
        <template #title>Criar conta</template>
        <template #subtitle>Cadastre seu usuário e sua unidade familiar inicial.</template>
        <template #content>
          <form class="auth-form" @submit.prevent="submitRegister">
            <label class="auth-form__field">
              <span>Nome completo</span>
              <InputText v-model.trim="form.fullName" autocomplete="name" />
            </label>

            <label class="auth-form__field">
              <span>E-mail</span>
              <InputText v-model.trim="form.email" type="email" autocomplete="email" />
            </label>

            <label class="auth-form__field">
              <span>Nome da familia ou unidade</span>
              <InputText v-model.trim="form.householdName" autocomplete="organization" />
            </label>

            <label class="auth-form__field">
              <span>Senha</span>
              <Password
                v-model="form.password"
                :feedback="false"
                toggleMask
                autocomplete="new-password"
                inputClass="auth-form__password-input"
              />
            </label>

            <p v-if="errorMessage" class="panel-error">{{ errorMessage }}</p>

            <Button type="submit" label="Criar conta" icon="pi pi-user-plus" :loading="loading" />

            <p class="panel-note auth-form__footer">
              Ja tem conta?
              <RouterLink :to="{ name: 'login' }">Entrar</RouterLink>
            </p>
          </form>
        </template>
      </Card>

      <aside class="auth-hero page-panel">
        <p class="app-shell__eyebrow">Onboarding SaaS</p>
        <h1>Crie sua conta e comece a consolidar renda, dividas e documentos.</h1>
        <p class="panel-note auth-hero__note">
          O cadastro inicial cria sua conta, vincula seu primeiro usuário e prepara um caso familiar vazio para você preencher com segurança.
        </p>
        <div class="auth-hero__highlights">
          <div class="auth-highlight">
            <i class="pi pi-user"></i>
            <span>Usuário responsável criado como owner da conta.</span>
          </div>
          <div class="auth-highlight">
            <i class="pi pi-home"></i>
            <span>Unidade familiar inicial criada para receber renda, dividas e documentos.</span>
          </div>
          <div class="auth-highlight">
            <i class="pi pi-database"></i>
            <span>Dados segregados por conta desde o primeiro acesso.</span>
          </div>
        </div>
      </aside>
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

import { registerUser } from '@/shared/api/client';
import { setCurrentSession } from '@/shared/auth/session';

export default defineComponent({
  name: 'RegisterPage',
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
        fullName: '',
        email: '',
        householdName: '',
        password: ''
      },
      loading: false,
      errorMessage: ''
    };
  },
  methods: {
    async submitRegister() {
      this.loading = true;
      this.errorMessage = '';

      try {
        const session = await registerUser(this.form);

        this.finishAuthentication(session);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : 'Falha ao criar a conta.';
      } finally {
        this.loading = false;
      }
    },
    finishAuthentication(session: Session) {
      setCurrentSession(session);
      this.$router.replace({ name: 'onboarding' });
    }
  }
});
</script>