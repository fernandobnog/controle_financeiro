<template>
  <section class="page-panel">
    <header class="page-panel__header">
      <div>
        <h2>Diagnóstico financeiro</h2>
        <p class="panel-note">Visão geral da sua situação familiar, com DTI, composição da dívida e comparativo entre métodos.</p>
      </div>
      <Tag :value="classificationLabel" :severity="classificationSeverity" />
    </header>

    <div v-if="loading" class="page-panel">
      <ProgressSpinner strokeWidth="4" />
      <p class="panel-note">Carregando indicadores e planos do caso...</p>
    </div>

    <div v-else-if="errorMessage" class="panel-error">{{ errorMessage }}</div>

    <div v-else>
      <!-- Alerta de dívidas em atraso -->
      <Message
        v-if="diagnosisExplained && diagnosisExplained.overdueDebtsCount > 0"
        severity="error"
        :closable="false"
        class="dashboard__overdue-alert"
      >
        <strong>Atenção:</strong>
        {{ diagnosisExplained.overdueDebtsCount }}
        {{ diagnosisExplained.overdueDebtsCount === 1 ? 'dívida em atraso identificada.' : 'dívidas em atraso identificadas.' }}
        Regularize o quanto antes para evitar encargos adicionais e restrição de crédito.
      </Message>

      <!-- Narrativa da situação -->
      <Card v-if="diagnosisExplained" class="dashboard__narrative">
        <template #title>
          <span>{{ diagnosisExplained.classificationLabel }}</span>
        </template>
        <template #content>
          <p class="dashboard__narrative-summary">{{ diagnosisExplained.classificationSummary }}</p>
          <p class="dashboard__narrative-text">{{ diagnosisExplained.situationNarrative }}</p>
          <div class="dashboard__first-action">
            <strong>Próxima ação recomendada</strong>
            <p>{{ diagnosisExplained.firstRecommendedAction }}</p>
          </div>
        </template>
      </Card>

      <!-- Métricas -->
      <div class="metric-grid">
        <Card class="metric-card">
          <template #content>
            <div class="metric-card__label">Renda mensal</div>
            <div class="metric-card__value">{{ formatCurrency(diagnosis?.monthlyIncome) }}</div>
          </template>
        </Card>
        <Card class="metric-card">
          <template #content>
            <div class="metric-card__label">Pagamento mensal de dívidas</div>
            <div class="metric-card__value">{{ formatCurrency(diagnosis?.monthlyDebtPayments) }}</div>
          </template>
        </Card>
        <Card class="metric-card">
          <template #content>
            <div class="metric-card__label">DTI (comprometimento de renda)</div>
            <div class="metric-card__value">{{ diagnosis?.dtiPercent.toFixed(2) }}%</div>
          </template>
        </Card>
        <Card class="metric-card">
          <template #content>
            <div class="metric-card__label">Saldo total das dívidas</div>
            <div class="metric-card__value">{{ formatCurrency(diagnosis?.totalDebtBalance) }}</div>
          </template>
        </Card>
        <Card v-if="diagnosisExplained" class="metric-card">
          <template #content>
            <div class="metric-card__label">Saldo disponível (após obrigações)</div>
            <div
              class="metric-card__value"
              :class="diagnosisExplained.monthlySurplus >= 0 ? 'metric-card__value--positive' : 'metric-card__value--negative'"
            >
              {{ formatCurrency(diagnosisExplained.monthlySurplus) }}
            </div>
          </template>
        </Card>
      </div>

      <div class="chart-grid">
        <Card>
          <template #title>Comparativo entre métodos</template>
          <template #content>
            <ApexChart type="bar" height="320" :options="planChartOptions" :series="planChartSeries" />
          </template>
        </Card>
        <Card>
          <template #title>Prioridade do plano Avalanche</template>
          <template #content>
            <ApexChart type="donut" height="320" :options="debtChartOptions" :series="debtChartSeries" />
          </template>
        </Card>
      </div>

      <div class="dashboard__cta-row">
        <Button
          label="Ver plano detalhado"
          icon="pi pi-arrow-right"
          iconPos="right"
          @click="goToPlan"
        />
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import type { FinancialDiagnosisSummary, FinancialDiagnosisExplained, PlanComparison } from '@controle-financeiro/shared-contracts';
import { defineComponent } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import ApexChart from 'vue3-apexcharts';

import { getDiagnosisSummary, getDiagnosisExplained, getPlanComparison } from '@/shared/api/client';

export default defineComponent({
  name: 'DashboardPage',
  components: {
    ApexChart,
    Button,
    Card,
    Message,
    ProgressSpinner,
    Tag
  },
  data() {
    return {
      diagnosis: null as FinancialDiagnosisSummary | null,
      diagnosisExplained: null as FinancialDiagnosisExplained | null,
      plans: null as PlanComparison | null,
      loading: true,
      errorMessage: ''
    };
  },
  computed: {
    classificationLabel(): string {
      switch (this.diagnosis?.classification) {
        case 'sustainable':
          return 'Situação saudável';
        case 'alert':
          return 'Atenção necessária';
        case 'high-risk':
          return 'Risco elevado';
        case 'critical':
          return 'Situação crítica';
        default:
          return 'Carregando...';
      }
    },
    classificationSeverity(): 'success' | 'warning' | 'danger' | 'secondary' {
      switch (this.diagnosis?.classification) {
        case 'sustainable':
          return 'success';
        case 'alert':
          return 'warning';
        case 'high-risk':
        case 'critical':
          return 'danger';
        default:
          return 'secondary';
      }
    },
    debtChartSeries(): number[] {
      return this.plans?.avalanche.installments.map((item) => item.recommendedPayment) ?? [];
    },
    debtChartOptions(): Record<string, unknown> {
      return {
        labels: this.plans?.avalanche.installments.map((item) => item.creditor) ?? [],
        colors: ['#0f4c81', '#166534', '#0ea5e9']
      };
    },
    planChartSeries(): Array<{ name: string; data: number[] }> {
      return this.plans
        ? [
            {
              name: 'Avalanche',
              data: this.plans.avalanche.installments.map((item) => item.recommendedPayment)
            },
            {
              name: 'Bola de Neve',
              data: this.plans.snowball.installments.map((item) => item.recommendedPayment)
            }
          ]
        : [];
    },
    planChartOptions(): Record<string, unknown> {
      return {
        chart: {
          toolbar: { show: false }
        },
        xaxis: {
          categories: this.plans?.avalanche.installments.map((item) => item.creditor) ?? []
        },
        colors: ['#0f4c81', '#166534']
      };
    }
  },
  async created() {
    await this.loadDashboard();
  },
  methods: {
    async loadDashboard() {
      this.loading = true;
      this.errorMessage = '';

      try {
        const [diagnosis, plans, diagnosisExplained] = await Promise.all([
          getDiagnosisSummary(),
          getPlanComparison(),
          getDiagnosisExplained().catch(() => null)
        ]);

        this.diagnosis = diagnosis;
        this.plans = plans;
        this.diagnosisExplained = diagnosisExplained;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : 'Falha ao carregar dashboard.';
      } finally {
        this.loading = false;
      }
    },
    formatCurrency(value?: number) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value ?? 0);
    },
    goToPlan() {
      this.$router.push({ name: 'plan' });
    }
  }
});
</script>

<style scoped>
.dashboard__overdue-alert {
  margin-bottom: 1.5rem;
}

.dashboard__narrative {
  margin-bottom: 1.5rem;
}

.dashboard__narrative-summary {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
}

.dashboard__narrative-text {
  color: var(--text-color-secondary);
  line-height: 1.7;
  margin-bottom: 1.25rem;
}

.dashboard__first-action {
  background: var(--surface-100);
  border-left: 3px solid var(--primary-color);
  padding: 0.75rem 1rem;
  border-radius: 4px;
}

.dashboard__first-action strong {
  display: block;
  font-size: 0.8rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.25rem;
}

.metric-card__value--positive {
  color: #16a34a;
}

.metric-card__value--negative {
  color: #dc2626;
}

.dashboard__cta-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
</style>