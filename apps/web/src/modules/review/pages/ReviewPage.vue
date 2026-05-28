<template>
  <div class="review-page">
    <div class="review-page__header">
      <p class="eyebrow">Revisão de documento</p>
      <h2>Itens identificados pela IA</h2>
      <p class="panel-note">
        Revise os itens extraídos automaticamente. Confirme os corretos, corrija os imprecisos
        e descarte o que não for relevante. Apenas itens confirmados serão usados no seu diagnóstico.
      </p>
    </div>

    <div v-if="loading" class="review-page__loading">
      <ProgressBar mode="indeterminate" style="height: 4px" />
      <p class="panel-note">Buscando itens extraídos...</p>
    </div>

    <div v-else-if="errorMessage" class="review-page__error">
      <Message severity="error" :closable="false">{{ errorMessage }}</Message>
    </div>

    <template v-else>
      <div class="review-page__summary">
        <div class="summary-pill">
          <i class="pi pi-list" />
          <span>{{ totalItems }} itens encontrados</span>
        </div>
        <div class="summary-pill summary-pill--warn" v-if="pendingCount > 0">
          <i class="pi pi-clock" />
          <span>{{ pendingCount }} aguardando revisão</span>
        </div>
        <div class="summary-pill summary-pill--success" v-if="pendingCount === 0">
          <i class="pi pi-check-circle" />
          <span>Todos revisados</span>
        </div>
      </div>

      <TabView v-if="groupKeys.length > 0">
        <TabPanel v-for="groupKey in groupKeys" :key="groupKey" :header="groupLabel(groupKey)">
          <DataTable
            :value="groupedItems[groupKey]"
            stripedRows
            responsiveLayout="scroll"
            class="review-page__table"
          >
            <Column field="description" header="Descrição" />
            <Column header="Valor (R$)">
              <template #body="{ data }">
                {{ formatCurrency(data.amount) }}
              </template>
            </Column>
            <Column field="occurred_at" header="Data" />
            <Column header="Confiança">
              <template #body="{ data }">
                <Tag
                  :value="confidenceLabel(data.ai_confidence)"
                  :severity="confidenceSeverity(data.ai_confidence)"
                />
              </template>
            </Column>
            <Column header="Status">
              <template #body="{ data }">
                <Tag
                  :value="statusLabel(data.review_status)"
                  :severity="statusSeverity(data.review_status)"
                />
              </template>
            </Column>
            <Column header="Ações">
              <template #body="{ data }">
                <div class="review-page__actions">
                  <Button
                    v-if="data.review_status === 'pending'"
                    icon="pi pi-check"
                    size="small"
                    severity="success"
                    outlined
                    title="Confirmar item"
                    :loading="processingItemId === data.id"
                    @click="approveItem(data.id)"
                  />
                  <Button
                    v-if="data.review_status === 'pending'"
                    icon="pi pi-times"
                    size="small"
                    severity="danger"
                    outlined
                    title="Descartar item"
                    :loading="processingItemId === data.id"
                    @click="discardItem(data.id)"
                  />
                  <Tag v-if="data.review_status !== 'pending'" :value="statusLabel(data.review_status)" :severity="statusSeverity(data.review_status)" />
                </div>
              </template>
            </Column>
          </DataTable>
        </TabPanel>
      </TabView>

      <div v-else class="review-page__empty">
        <Message severity="warn" :closable="false">
          Nenhum item extraído encontrado para este documento.
          O processamento pode ainda estar em andamento — aguarde alguns instantes e recarregue a página.
        </Message>
      </div>

      <div class="review-page__footer">
        <Button
          label="Voltar para documentos"
          icon="pi pi-arrow-left"
          severity="secondary"
          outlined
          @click="goBack"
        />
        <Button
          v-if="pendingCount === 0 && totalItems > 0"
          label="Ver diagnóstico"
          icon="pi pi-chart-bar"
          @click="goToDashboard"
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Message from 'primevue/message';
import ProgressBar from 'primevue/progressbar';
import TabPanel from 'primevue/tabpanel';
import TabView from 'primevue/tabview';
import Tag from 'primevue/tag';

import { getDocumentItems, reviewExtractedItem } from '@/shared/api/client';

const GROUP_LABELS: Record<string, string> = {
  'income': 'Rendas identificadas',
  'fixed-expense': 'Despesas fixas',
  'variable-expense': 'Despesas variáveis',
  'debt-installment': 'Parcelas de dívida',
  'future-installment': 'Parcelas futuras',
  'overdue-debt': 'Dívidas em atraso',
  'loan-contract': 'Contratos de empréstimo',
  'credit-card-purchase': 'Compras no cartão',
  'dda-obligation': 'Obrigações DDA',
  'ambiguous': 'Itens ambíguos',
  'ignored': 'Descartados'
};

interface ExtractedItem {
  id: string;
  item_type: string;
  description: string;
  amount: number;
  occurred_at: string | null;
  creditor: string | null;
  ai_confidence: number;
  ai_category: string | null;
  review_status: string;
}

export default defineComponent({
  name: 'ReviewPage',
  components: {
    Button,
    Column,
    DataTable,
    Message,
    ProgressBar,
    TabPanel,
    TabView,
    Tag
  },
  data() {
    return {
      loading: true,
      errorMessage: '',
      totalItems: 0,
      pendingCount: 0,
      groupedItems: {} as Record<string, ExtractedItem[]>,
      processingItemId: null as string | null
    };
  },
  computed: {
    groupKeys(): string[] {
      return Object.keys(this.groupedItems).filter(
        (key) => this.groupedItems[key].length > 0
      );
    }
  },
  async created() {
    const documentId = this.$route.params['documentId'] as string;

    if (!documentId) {
      this.errorMessage = 'ID do documento não encontrado na URL.';
      this.loading = false;

      return;
    }

    await this.loadItems(documentId);
  },
  methods: {
    async loadItems(documentId: string) {
      this.loading = true;
      this.errorMessage = '';

      try {
        const response = await getDocumentItems(documentId);

        this.totalItems = response.totalItems;
        this.pendingCount = response.pendingReview;
        this.groupedItems = response.groups as Record<string, ExtractedItem[]>;
      } catch {
        this.errorMessage = 'Não foi possível carregar os itens extraídos. Tente novamente.';
      } finally {
        this.loading = false;
      }
    },
    async approveItem(itemId: string) {
      await this.sendDecision(itemId, 'approved');
    },
    async discardItem(itemId: string) {
      await this.sendDecision(itemId, 'discarded');
    },
    async sendDecision(itemId: string, decision: 'approved' | 'discarded') {
      const documentId = this.$route.params['documentId'] as string;

      this.processingItemId = itemId;

      try {
        const result = await reviewExtractedItem(documentId, itemId, { decision });

        this.pendingCount = result.pendingItemsRemaining;

        // Atualiza o item no estado local
        for (const key of Object.keys(this.groupedItems)) {
          const idx = this.groupedItems[key].findIndex((i) => i.id === itemId);

          if (idx !== -1) {
            this.groupedItems[key][idx] = {
              ...this.groupedItems[key][idx],
              review_status: decision
            };
          }
        }
      } catch {
        // Silencia erros de rede — o usuário pode tentar novamente
      } finally {
        this.processingItemId = null;
      }
    },
    formatCurrency(value: number): string {
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    groupLabel(key: string): string {
      return GROUP_LABELS[key] ?? key;
    },
    confidenceLabel(confidence: number): string {
      if (confidence >= 0.8) return 'Alta';
      if (confidence >= 0.5) return 'Média';
      return 'Baixa';
    },
    confidenceSeverity(confidence: number): string {
      if (confidence >= 0.8) return 'success';
      if (confidence >= 0.5) return 'warn';
      return 'danger';
    },
    statusLabel(status: string): string {
      const labels: Record<string, string> = {
        'pending': 'Pendente',
        'approved': 'Confirmado',
        'corrected': 'Corrigido',
        'discarded': 'Descartado',
        'merged': 'Mesclado'
      };

      return labels[status] ?? status;
    },
    statusSeverity(status: string): string {
      const severities: Record<string, string> = {
        'pending': 'warn',
        'approved': 'success',
        'corrected': 'info',
        'discarded': 'danger',
        'merged': 'info'
      };

      return severities[status] ?? 'secondary';
    },
    goBack() {
      this.$router.push({ name: 'intake' });
    },
    goToDashboard() {
      this.$router.push({ name: 'dashboard' });
    }
  }
});
</script>

<style scoped>
.review-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.review-page__header {
  margin-bottom: 2rem;
}

.review-page__loading {
  text-align: center;
  padding: 3rem 0;
}

.review-page__summary {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.summary-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface-100);
  border: 1px solid var(--surface-300);
  border-radius: 2rem;
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
}

.summary-pill--warn {
  background: #fef9c3;
  border-color: #eab308;
  color: #713f12;
}

.summary-pill--success {
  background: #dcfce7;
  border-color: #16a34a;
  color: #14532d;
}

.review-page__actions {
  display: flex;
  gap: 0.5rem;
}

.review-page__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--surface-300);
}

.review-page__empty {
  margin: 2rem 0;
}

.review-page__table {
  margin-top: 1rem;
}
</style>
