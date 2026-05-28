<template>
  <section class="page-panel">
    <header class="page-panel__header">
      <div>
        <h2>Alterar senha</h2>
        <p class="panel-note">Confirme a senha atual e substitua por uma nova credencial para a sua conta.</p>
      </div>
    </header>

    <form class="form-stack" @submit.prevent="submitChangePassword">
      <div class="form-grid">
        <label class="auth-form__field">
          <span>Senha atual</span>
          <Password
            v-model="form.currentPassword"
            :feedback="false"
            toggleMask
            autocomplete="current-password"
            inputClass="auth-form__password-input"
          />
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
      </div>

      <p v-if="successMessage" class="panel-note">{{ successMessage }}</p>
      <p v-if="errorMessage" class="panel-error">{{ errorMessage }}</p>

      <div class="page-actions">
        <span class="panel-note">A troca invalida tokens de recuperação ainda abertos.</span>
        <Button type="submit" label="Atualizar senha" icon="pi pi-key" :loading="loading" />
      </div>
    </form>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Button from 'primevue/button';
import Password from 'primevue/password';

import { changePassword } from '@/shared/api/client';

export default defineComponent({
  name: 'ChangePasswordPage',
  components: {
    Button,
    Password
  },
  data() {
    return {
      form: {
        currentPassword: '',
        newPassword: ''
      },
      confirmPassword: '',
      loading: false,
      errorMessage: '',
      successMessage: ''
    };
  },
  methods: {
    async submitChangePassword() {
      if (this.form.newPassword !== this.confirmPassword) {
        this.errorMessage = 'A confirmação da nova senha precisa ser igual.';
        this.successMessage = '';
        return;
      }

      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const result = await changePassword(this.form);

        this.successMessage = result.message;
        this.form.currentPassword = '';
        this.form.newPassword = '';
        this.confirmPassword = '';
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : 'Falha ao alterar a senha.';
      } finally {
        this.loading = false;
      }
    }
  }
});
</script>