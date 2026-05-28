<template>
  <div class="plan-page">
    <div class="plan-page__header">
      <p class="eyebrow">Planejamento financeiro</p>
      <h2>Seu plano de quitação de dívidas</h2>
      <p class="panel-note">
        Com base nos dados da sua unidade familiar, calculamos dois caminhos possíveis.
        Escolha o que melhor se adapta ao seu perfil.
      </p>
    </div>

    <div v-if="loading" class="plan-page__loading">
      <ProgressBar mode="indeterminate" style="height: 4px" />
      <p class="panel-note">Calculando seu plano...</p>
    </div>

    <div v-else-if="errorMessage" class="plan-page__error">
      <Message severity="error" :closable="false">{{ errorMessage }}</Message>
      <Button label="Tentar novamente" icon="pi pi-refresh" severity="secondary" outlined @click="loadPlan" style="margin-top: 1rem" />
    </div>

    <template v-else-if="plan">
      <!-- Recomendação -->
      <Card class="plan-page__recommendation">
        <template #title>
          <div class="plan-page__rec-title">
            <i class="pi pi-star-fill" style="color: #f59e0b" />
            Estratégia recomendada: {{ recommendedLabel }}
          </div>
        </template>
        <template #content>
          <p>{{ plan.recommendationReason }}</p>
          <div class="plan-page__numbers">
            <div class="stat-item">
              <span class="stat-label">Obrigações mensais essenciais</span>
              <span class="stat-value">R$ {{ formatCurrency(plan.essentialMonthlyObligations) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Saldo disponível para quitação</span>
              <span class="stat-value" :class="plan.surplusAfterEssentials >= 0 ? 'stat-value--positive' : 'stat-value--negative'">
                R$ {{ formatCurrency(plan.surplusAfterEssentials) }}
              </span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Comparativo lado a lado -->
      <div class="plan-page__compare">
        <Card
          v-for="(strategy, key) in strategies"
          :key="key"
          :class="['plan-page__strategy-card', { 'plan-page__strategy-card--recommended': plan.recommendedStrategy === key }]"
        >
          <template #header>
            <div class="plan-page__strategy-header">
              <Tag v-if="plan.recommendedStrategy === key" value="Recomendado" severity="success" />
              <h3>{{ strategy.strategyLabel }}</h3>
            </div>
          </template>
          <template #content>
            <p class="plan-page__why">{{ strategy.whyThisStrategy }}</p>

            <div class="plan-page__first-action">
              <strong>Primeira ação:</strong>
              <p>{{ strategy.firstActionLabel }}</p>
            </div>

            <div class="plan-page__surplus-row">
              <span class="stat-label">Saldo após quitação mensal</span>
              <span class="stat-value" :class="strategy.monthlySurplus >= 0 ? 'stat-value--positive' : 'stat-value--negative'">
                R$ {{ formatCurrency(strategy.monthlySurplus) }}
              </span>
            </div>

            <div class="plan-page__installments">
              <p class="plan-page__installments-title">Ordem de pagamento</p>
              <div
                v-for="(inst, idx) in strategy.installments"
                :key="inst.creditor"
                class="plan-page__installment-row"
              >
                <span class="installment-priority">{{ idx + 1 }}</span>
                <span class="installment-creditor">{{ inst.creditor }}</span>
                <span class="installment-value">R$ {{ formatCurrency(inst.recommendedPayment) }}/mês</span>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <div class="plan-page__footer">
        <Button
          label="Ver diagnóstico completo"
          icon="pi pi-chart-bar"
          severity="secondary"
          outlined
          @click="goToDashboard"
        />
        <Button
          label="Atualizar dados"
          icon="pi pi-pencil"
          @click="goToOnboarding"
        />
      </div>
    </template>

    <div v-else class="plan-page__empty">
      <Message severity="info" :closable="false">
        Nenhum dado financeiro cadastrado ainda.
        <RouterLink to="/onboarding"> Cadastre sua base financeira</RouterLink> para gerar o plano.
      </Message>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Message from 'primevue/message';
import ProgressBar from 'primevue/progressbar';
import Tag from 'primevue/tag';

import { getPlanComparisonExplained } from '@/shared/api/client';
import type { PlanComparisonExplained, PlanExplanation } from '@controle-financeiro/shared-contracts';

export default defineComponent({
  name: 'PlanPage',
  components: {
    Button,
    Card,
    Message,
    ProgressBar,
    RouterLink,
    Tag
  },
  data() {
    return {
      loading: true,
      errorMessage: '',
      plan: null as PlanComparisonExplained | null
    };
  },
  computed: {
    recommendedLabel(): string {
      if (!this.plan) return '';
      const strategy = this.strategies[this.plan.recommendedStrategy];

      return strategy?.strategyLabel ?? this.plan.recommendedStrategy;
    },
    strategies(): Record<string, PlanExplanation> {
      if (!this.plan) return {};

      return {
        avalanche: this.plan.avalanche,
        snowball: this.plan.snowball
      };
    }
  },
  async created() {
    await this.loadPlan();
  },
  methods: {
    async loadPlan() {
      this.loading = true;
      this.errorMessage = '';

      try {
        this.plan = await getPlanComparisonExplained();
      } catch {
        this.errorMessage = 'Não foi possível calcular o plano. Verifique se sua base financeira está preenchida.';
      } finally {
        this.loading = false;
      }
    },
    formatCurrency(value: number): string {
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    goToDashboard() {
      this.$router.push({ name: 'dashboard' });
    },
    goToOnboarding() {
      this.$router.push({ name: 'onboarding' });
    }
  }
});
</script>

<style scoped>
.plan-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.plan-page__header {
  margin-bottom: 2rem;
}

.plan-page__loading {
  text-align: center;
  padding: 3rem 0;
}

.plan-page__recommendation {
  margin-bottom: 2rem;
}

.plan-page__rec-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
}

.plan-page__numbers {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

.stat-value {
  font-size: 1.15rem;
  font-weight: 600;
}

.stat-value--positive {
  color: #16a34a;
}

.stat-value--negative {
  color: #dc2626;
}

.plan-page__compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .plan-page__compare {
    grid-template-columns: 1fr;
  }
}

.plan-page__strategy-card--recommended {
  border: 2px solid #16a34a;
}

.plan-page__strategy-header {
  padding: 1rem 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plan-page__why {
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
  line-height: 1.6;
}

.plan-page__first-action {
  background: var(--surface-100);
  border-left: 3px solid var(--primary-color);
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.plan-page__first-action strong {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

.plan-page__surplus-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-top: 1px solid var(--surface-200);
  margin-bottom: 1rem;
}

.plan-page__installments-title {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  color: var(--text-color-secondary);
}

.plan-page__installment-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--surface-100);
}

.installment-priority {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary-100);
  color: var(--primary-700);
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.installment-creditor {
  flex: 1;
  font-size: 0.9rem;
}

.installment-value {
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
}

.plan-page__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.5rem;
  border-top: 1px solid var(--surface-300);
}

.plan-page__empty {
  margin-top: 2rem;
}
</style>
