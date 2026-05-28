<template>
  <section class="page-panel">
    <header class="page-panel__header">
      <div>
        <p class="app-shell__eyebrow">Onboarding financeiro</p>
        <h2>Base inicial da conta</h2>
        <p class="panel-note">Defina a unidade familiar, renda mensal e dividas atuais antes de seguir para o dashboard e o upload de documentos.</p>
      </div>
      <Tag :value="statusLabel" severity="info" />
    </header>

    <div v-if="loading" class="page-panel">
      <ProgressSpinner strokeWidth="4" />
      <p class="panel-note">Carregando a configuracao da conta...</p>
    </div>

    <div v-else class="form-stack">
      <div class="summary-grid">
        <article class="summary-tile">
          <p class="summary-tile__label">Household ativo</p>
          <p class="summary-tile__value">{{ form.householdName || 'Sem nome definido' }}</p>
        </article>
        <article class="summary-tile">
          <p class="summary-tile__label">Rendas cadastradas</p>
          <p class="summary-tile__value">{{ form.incomes.length }}</p>
        </article>
        <article class="summary-tile">
          <p class="summary-tile__label">Dividas cadastradas</p>
          <p class="summary-tile__value">{{ form.debts.length }}</p>
        </article>
        <article class="summary-tile">
          <p class="summary-tile__label">Envelopes do OBZ</p>
          <p class="summary-tile__value">{{ form.envelopes.length }}</p>
        </article>
      </div>

      <form class="form-stack" @submit.prevent="submitProfile">
        <label class="auth-form__field">
          <span>Nome da familia ou unidade</span>
          <InputText v-model.trim="form.householdName" autocomplete="organization" />
        </label>

        <section class="section-block">
          <div class="section-block__header">
            <div>
              <h3>Rendas mensais</h3>
              <p class="panel-note">Cadastre as principais fontes recorrentes para o calculo do DTI.</p>
            </div>
            <Button type="button" label="Adicionar renda" icon="pi pi-plus" severity="secondary" outlined @click="addIncome" />
          </div>

          <div class="entry-grid">
            <article v-for="(income, index) in form.incomes" :key="`income-${index}`" class="entry-card">
              <div class="entry-card__header">
                <p class="entry-card__title">Renda {{ index + 1 }}</p>
                <Button
                  v-if="form.incomes.length > 1"
                  type="button"
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  @click="removeIncome(index)"
                />
              </div>

              <div class="form-grid">
                <label class="auth-form__field">
                  <span>Descricao</span>
                  <InputText v-model.trim="income.label" />
                </label>

                <label class="auth-form__field">
                  <span>Valor mensal</span>
                  <InputNumber v-model="income.amount" mode="currency" currency="BRL" locale="pt-BR" />
                </label>

                <label class="auth-form__field">
                  <span>Recorrente</span>
                  <div>
                    <Checkbox v-model="income.recurring" binary inputId="income-recurring" />
                  </div>
                </label>
              </div>
            </article>
          </div>
        </section>

        <section class="section-block">
          <div class="section-block__header">
            <div>
              <h3>Dividas atuais</h3>
              <p class="panel-note">Inclua saldo, parcela mensal e taxa para o comparativo entre avalanche e bola de neve.</p>
            </div>
            <Button type="button" label="Adicionar divida" icon="pi pi-plus" severity="secondary" outlined @click="addDebt" />
          </div>

          <div v-if="form.debts.length === 0" class="entry-card">
            <p class="panel-note">Nenhuma divida cadastrada ainda. Se preferir, conclua o onboarding e volte depois.</p>
          </div>

          <div v-else class="entry-grid">
            <article v-for="(debt, index) in form.debts" :key="`debt-${index}`" class="entry-card">
              <div class="entry-card__header">
                <p class="entry-card__title">Divida {{ index + 1 }}</p>
                <Button type="button" icon="pi pi-trash" severity="danger" text @click="removeDebt(index)" />
              </div>

              <div class="form-grid">
                <label class="auth-form__field">
                  <span>Credor</span>
                  <InputText v-model.trim="debt.creditor" />
                </label>

                <label class="auth-form__field">
                  <span>Saldo total</span>
                  <InputNumber v-model="debt.balance" mode="currency" currency="BRL" locale="pt-BR" />
                </label>

                <label class="auth-form__field">
                  <span>Parcela mensal</span>
                  <InputNumber v-model="debt.monthlyPayment" mode="currency" currency="BRL" locale="pt-BR" />
                </label>

                <label class="auth-form__field">
                  <span>Juros mensais (%)</span>
                  <InputNumber v-model="debt.interestRate" :minFractionDigits="0" :maxFractionDigits="2" />
                </label>

                <label class="auth-form__field">
                  <span>Meses em atraso</span>
                  <InputNumber v-model="debt.overdueMonths" :min="0" :useGrouping="false" />
                </label>
              </div>
            </article>
          </div>
        </section>

        <section class="section-block">
          <div class="section-block__header">
            <div>
              <h3>Envelopes do orcamento base zero</h3>
              <p class="panel-note">Defina categorias e valores planejados para montar o OBZ inicial da conta.</p>
            </div>
            <Button
              type="button"
              label="Adicionar envelope"
              icon="pi pi-plus"
              severity="secondary"
              outlined
              @click="addEnvelope"
            />
          </div>

          <div v-if="form.envelopes.length === 0" class="entry-card">
            <p class="panel-note">Nenhum envelope cadastrado ainda. Se preferir, salve a base financeira e adicione o OBZ depois.</p>
          </div>

          <div v-else class="entry-grid">
            <article v-for="(envelope, index) in form.envelopes" :key="`envelope-${index}`" class="entry-card">
              <div class="entry-card__header">
                <p class="entry-card__title">Envelope {{ index + 1 }}</p>
                <Button type="button" icon="pi pi-trash" severity="danger" text @click="removeEnvelope(index)" />
              </div>

              <div class="form-grid">
                <label class="auth-form__field">
                  <span>Categoria</span>
                  <InputText v-model.trim="envelope.category" />
                </label>

                <label class="auth-form__field">
                  <span>Valor planejado</span>
                  <InputNumber v-model="envelope.plannedAmount" mode="currency" currency="BRL" locale="pt-BR" />
                </label>

                <label class="auth-form__field">
                  <span>Valor atual</span>
                  <InputNumber v-model="envelope.actualAmount" mode="currency" currency="BRL" locale="pt-BR" />
                </label>
              </div>
            </article>
          </div>
        </section>

        <p v-if="successMessage" class="panel-note">{{ successMessage }}</p>
        <p v-if="errorMessage" class="panel-error">{{ errorMessage }}</p>

        <div class="page-actions">
          <span class="panel-note">Ao salvar, o dashboard e a ingestao passam a usar o household real da sua conta.</span>
          <Button type="submit" label="Salvar e continuar" icon="pi pi-check" :loading="saving" />
        </div>
      </form>
    </div>
  </section>
</template>

<script lang="ts">
import type { BudgetEnvelopeInput, DebtDraftInput, FinancialCase, IncomeDraftInput } from '@controle-financeiro/shared-contracts';
import { defineComponent } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';

import { getOnboardingProfile, saveOnboardingProfile } from '@/shared/api/client';

const createIncomeDraft = (): IncomeDraftInput => ({
  label: '',
  amount: 0,
  recurring: true
});

const createDebtDraft = (): DebtDraftInput => ({
  creditor: '',
  balance: 0,
  monthlyPayment: 0,
  interestRate: 0,
  overdueMonths: 0
});

interface EnvelopeDraft {
  category: string;
  plannedAmount: number;
  actualAmount?: number | null;
}

const createEnvelopeDraft = (): EnvelopeDraft => ({
  category: '',
  plannedAmount: 0,
  actualAmount: undefined
});

export default defineComponent({
  name: 'OnboardingPage',
  components: {
    Button,
    Checkbox,
    InputNumber,
    InputText,
    ProgressSpinner,
    Tag
  },
  data() {
    return {
      loading: true,
      saving: false,
      errorMessage: '',
      successMessage: '',
      form: {
        householdName: '',
        incomes: [createIncomeDraft()] as IncomeDraftInput[],
        debts: [] as DebtDraftInput[],
        envelopes: [] as EnvelopeDraft[]
      }
    };
  },
  computed: {
    statusLabel(): string {
      if (!this.form.householdName.trim()) {
        return 'pendente';
      }

      if (this.form.debts.length === 0) {
        return 'base minima';
      }

      return 'configurado';
    }
  },
  async created() {
    await this.loadProfile();
  },
  methods: {
    addIncome() {
      this.form.incomes.push(createIncomeDraft());
    },
    removeIncome(index: number) {
      this.form.incomes.splice(index, 1);
    },
    addDebt() {
      this.form.debts.push(createDebtDraft());
    },
    removeDebt(index: number) {
      this.form.debts.splice(index, 1);
    },
    addEnvelope() {
      this.form.envelopes.push(createEnvelopeDraft());
    },
    removeEnvelope(index: number) {
      this.form.envelopes.splice(index, 1);
    },
    normalizeAmount(value: unknown): number {
      return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    },
    buildIncomesPayload(): IncomeDraftInput[] {
      return this.form.incomes
        .filter((income) => income.label.trim().length > 0)
        .map((income) => ({
          label: income.label.trim(),
          amount: this.normalizeAmount(income.amount),
          recurring: income.recurring
        }));
    },
    buildDebtsPayload(): DebtDraftInput[] {
      return this.form.debts
        .filter((debt) => debt.creditor.trim().length > 0)
        .map((debt) => ({
          creditor: debt.creditor.trim(),
          balance: this.normalizeAmount(debt.balance),
          monthlyPayment: this.normalizeAmount(debt.monthlyPayment),
          interestRate: this.normalizeAmount(debt.interestRate),
          overdueMonths: Math.max(0, Math.trunc(this.normalizeAmount(debt.overdueMonths)))
        }));
    },
    buildEnvelopesPayload(): BudgetEnvelopeInput[] {
      return this.form.envelopes
        .filter((envelope) => envelope.category.trim().length > 0)
        .map((envelope) => ({
          category: envelope.category.trim(),
          plannedAmount: this.normalizeAmount(envelope.plannedAmount),
          actualAmount:
            envelope.actualAmount === null || envelope.actualAmount === undefined
              ? undefined
              : this.normalizeAmount(envelope.actualAmount)
        }));
    },
    applyProfile(profile: FinancialCase) {
      this.form.householdName = profile.householdName;
      this.form.incomes = profile.incomes.length
        ? profile.incomes.map((income) => ({
            label: income.label,
            amount: income.amount,
            recurring: income.recurring
          }))
        : [createIncomeDraft()];
      this.form.debts = profile.debts.map((debt) => ({
        creditor: debt.creditor,
        balance: debt.balance,
        monthlyPayment: debt.monthlyPayment,
        interestRate: debt.interestRate,
        overdueMonths: debt.overdueMonths
      }));
      this.form.envelopes = profile.envelopes.map((envelope) => ({
        category: envelope.category,
        plannedAmount: envelope.plannedAmount,
        actualAmount: envelope.actualAmount
      }));
    },
    async loadProfile() {
      this.loading = true;
      this.errorMessage = '';

      try {
        const profile = await getOnboardingProfile();

        this.applyProfile(profile);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : 'Falha ao carregar o onboarding.';
      } finally {
        this.loading = false;
      }
    },
    async submitProfile() {
      this.saving = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const profile = await saveOnboardingProfile({
          householdName: this.form.householdName.trim(),
          incomes: this.buildIncomesPayload(),
          debts: this.buildDebtsPayload(),
          envelopes: this.buildEnvelopesPayload()
        });

        this.applyProfile(profile);
        this.successMessage = 'Base financeira atualizada com sucesso.';
        this.$router.replace({ name: 'dashboard' });
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : 'Falha ao salvar o onboarding.';
      } finally {
        this.saving = false;
      }
    }
  }
});
</script>