<template>
  <section class="page-panel">
    <header class="page-panel__header">
      <div>
        <h2>Diagnostico financeiro</h2>
        <p class="panel-note">Visao inicial do caso familiar, com DTI, composicao da divida e comparativo entre metodos.</p>
      </div>
      <span class="status-chip">
        <i class="pi pi-shield"></i>
        {{ diagnosis ? diagnosis.classification : 'carregando' }}
      </span>
    </header>

    <div v-if="loading" class="page-panel">
      <ProgressSpinner strokeWidth="4" />
      <p class="panel-note">Carregando indicadores e planos do caso...</p>
    </div>

    <div v-else-if="errorMessage" class="panel-error">{{ errorMessage }}</div>

    <div v-else>
      <div class="metric-grid">
        <Card class="metric-card">
          <template #content>
            <div class="metric-card__label">Renda mensal</div>
            <div class="metric-card__value">{{ formatCurrency(diagnosis?.monthlyIncome) }}</div>
          </template>
        </Card>
        <Card class="metric-card">
          <template #content>
            <div class="metric-card__label">Pagamento mensal de dividas</div>
            <div class="metric-card__value">{{ formatCurrency(diagnosis?.monthlyDebtPayments) }}</div>
          </template>
        </Card>
        <Card class="metric-card">
          <template #content>
            <div class="metric-card__label">DTI</div>
            <div class="metric-card__value">{{ diagnosis?.dtiPercent.toFixed(2) }}%</div>
          </template>
        </Card>
        <Card class="metric-card">
          <template #content>
            <div class="metric-card__label">Saldo total da divida</div>
            <div class="metric-card__value">{{ formatCurrency(diagnosis?.totalDebtBalance) }}</div>
          </template>
        </Card>
      </div>

      <div class="chart-grid">
        <Card>
          <template #title>Comparativo entre metodos</template>
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
    </div>
  </section>
</template>

<script lang="ts">
import type { ActionPlan, FinancialDiagnosis } from '@controle-financeiro/shared-contracts';
import { defineComponent } from 'vue';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import ApexChart from 'vue3-apexcharts';

import { getDiagnosisSummary, getPlanComparison } from '@/shared/api/client';

interface PlanComparison {
  avalanche: ActionPlan;
  snowball: ActionPlan;
}

export default defineComponent({
  name: 'DashboardPage',
  components: {
    ApexChart,
    Card,
    ProgressSpinner
  },
  data() {
    return {
      diagnosis: null as FinancialDiagnosis | null,
      plans: null as PlanComparison | null,
      loading: true,
      errorMessage: ''
    };
  },
  computed: {
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
        const [diagnosis, plans] = await Promise.all([getDiagnosisSummary(), getPlanComparison()]);
        this.diagnosis = diagnosis;
        this.plans = plans;
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
    }
  }
});
</script>