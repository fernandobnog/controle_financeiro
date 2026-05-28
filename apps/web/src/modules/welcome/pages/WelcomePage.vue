<template>
  <div class="welcome-page">
    <div class="welcome-page__hero">
      <p class="eyebrow">Bem-vindo ao sistema</p>
      <h2>Por onde começamos?</h2>
      <p class="welcome-page__intro">
        Para calcular sua saúde financeira e montar um plano de quitação de dívidas,
        precisamos conhecer sua situação. Você pode começar enviando um extrato bancário,
        fatura de cartão ou contrato de empréstimo — ou preencher os dados manualmente.
      </p>
    </div>

    <div class="welcome-page__cards">
      <Card class="welcome-page__card welcome-page__card--primary">
        <template #header>
          <div class="welcome-page__card-icon">
            <i class="pi pi-upload" />
          </div>
        </template>
        <template #title>Enviar documento</template>
        <template #content>
          <p>
            Envie um extrato bancário, fatura de cartão de crédito, contrato de empréstimo ou comprovante.
            Nossa IA extrai e classifica os dados automaticamente — você revisa antes de salvar.
          </p>
          <ul class="welcome-page__doc-types">
            <li><i class="pi pi-file-pdf" /> Extratos bancários (PDF)</li>
            <li><i class="pi pi-file-pdf" /> Faturas de cartão (PDF)</li>
            <li><i class="pi pi-image" /> Comprovantes e prints (JPG, PNG)</li>
            <li><i class="pi pi-file-pdf" /> Contratos de empréstimo (PDF)</li>
          </ul>
        </template>
        <template #footer>
          <Button
            label="Enviar documento"
            icon="pi pi-upload"
            @click="goToIntake"
          />
        </template>
      </Card>

      <Card class="welcome-page__card">
        <template #header>
          <div class="welcome-page__card-icon welcome-page__card-icon--secondary">
            <i class="pi pi-pencil" />
          </div>
        </template>
        <template #title>Preencher manualmente</template>
        <template #content>
          <p>
            Prefere digitar? Cadastre suas fontes de renda, dívidas e despesas mensais
            diretamente. Leva em torno de 5 minutos para uma base financeira completa.
          </p>
        </template>
        <template #footer>
          <Button
            label="Preencher dados"
            icon="pi pi-pencil"
            severity="secondary"
            outlined
            @click="goToOnboarding"
          />
        </template>
      </Card>

      <Card v-if="hasDiagnosis" class="welcome-page__card">
        <template #header>
          <div class="welcome-page__card-icon welcome-page__card-icon--success">
            <i class="pi pi-chart-bar" />
          </div>
        </template>
        <template #title>Ver diagnóstico atual</template>
        <template #content>
          <p>
            Você já tem dados cadastrados. Acesse o diagnóstico completo da sua situação financeira
            e o comparativo entre os métodos de quitação.
          </p>
        </template>
        <template #footer>
          <Button
            label="Acessar dashboard"
            icon="pi pi-chart-bar"
            severity="success"
            outlined
            @click="goToDashboard"
          />
        </template>
      </Card>
    </div>

    <div v-if="!hasDiagnosis" class="welcome-page__tip">
      <Message severity="info" :closable="false">
        <strong>Dica:</strong> você não precisa ter todos os documentos prontos agora.
        Comece pelo que tiver em mãos — o sistema aceita envios parciais e você pode complementar depois.
      </Message>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Message from 'primevue/message';

import { getOnboardingProfile } from '@/shared/api/client';

export default defineComponent({
  name: 'WelcomePage',
  components: {
    Button,
    Card,
    Message
  },
  data() {
    return {
      hasDiagnosis: false
    };
  },
  async created() {
    try {
      const profile = await getOnboardingProfile();

      this.hasDiagnosis = Boolean(
        profile &&
          (profile.incomes?.length > 0 || profile.debts?.length > 0)
      );
    } catch {
      this.hasDiagnosis = false;
    }
  },
  methods: {
    goToIntake() {
      this.$router.push({ name: 'intake' });
    },
    goToOnboarding() {
      this.$router.push({ name: 'onboarding' });
    },
    goToDashboard() {
      this.$router.push({ name: 'dashboard' });
    }
  }
});
</script>

<style scoped>
.welcome-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.welcome-page__hero {
  margin-bottom: 2.5rem;
  text-align: center;
}

.welcome-page__intro {
  max-width: 660px;
  margin: 1rem auto 0;
  color: var(--text-color-secondary);
  line-height: 1.7;
}

.welcome-page__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.welcome-page__card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary-100);
  margin: 1.5rem auto 0;
  font-size: 1.5rem;
  color: var(--primary-color);
}

.welcome-page__card-icon--secondary {
  background: var(--surface-200);
  color: var(--text-color-secondary);
}

.welcome-page__card-icon--success {
  background: #dcfce7;
  color: #16a34a;
}

.welcome-page__card--primary {
  border: 2px solid var(--primary-color);
}

.welcome-page__doc-types {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
}

.welcome-page__doc-types li {
  padding: 0.3rem 0;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

.welcome-page__doc-types li i {
  margin-right: 0.5rem;
  color: var(--primary-color);
}

.welcome-page__tip {
  margin-top: 2rem;
}
</style>
