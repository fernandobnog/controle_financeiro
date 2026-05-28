import type {
  BudgetEnvelopeInput,
  DebtInput,
  DtiClassification,
  FinancialDiagnosisExplained,
  IncomeInput
} from '@controle-financeiro/shared-contracts';

import { toMoney } from '../currency/decimal-utils.js';
import { calculateDti } from './calculate-dti.js';

export interface ExplainDiagnosisInput {
  incomes: IncomeInput[];
  debts: DebtInput[];
  envelopes?: BudgetEnvelopeInput[];
}

const classificationLabel = (classification: DtiClassification): string => {
  switch (classification) {
    case 'sustainable':
      return 'Situação saudável';
    case 'alert':
      return 'Atenção necessária';
    case 'high-risk':
      return 'Risco elevado';
    case 'critical':
      return 'Situação crítica';
  }
};

const classificationSummary = (classification: DtiClassification, dtiPercent: number): string => {
  switch (classification) {
    case 'sustainable':
      return `Você comprometeu ${dtiPercent.toFixed(1)}% da renda com dívidas — abaixo do limite saudável de 20%. Há espaço para guardar e investir.`;
    case 'alert':
      return `Você comprometeu ${dtiPercent.toFixed(1)}% da renda com dívidas. Ainda é gerenciável, mas é hora de agir antes de apertar mais.`;
    case 'high-risk':
      return `${dtiPercent.toFixed(1)}% da sua renda já está comprometida com dívidas. Esse nível limita a capacidade de pagar despesas essenciais com tranquilidade.`;
    case 'critical':
      return `${dtiPercent.toFixed(1)}% da renda está comprometida. Neste patamar, o risco de inadimplência é alto e a reorganização financeira é urgente.`;
  }
};

const situationNarrative = (
  classification: DtiClassification,
  overdueCount: number,
  surplus: number
): string => {
  const surplusText =
    surplus > 0
      ? `Sobra estimada de R$ ${surplus.toFixed(2).replace('.', ',')} por mês após as parcelas mínimas.`
      : `Sem margem após as parcelas mínimas — há risco de atraso em contas essenciais.`;

  if (overdueCount > 0) {
    return `${overdueCount === 1 ? 'Uma dívida está' : `${overdueCount} dívidas estão`} em atraso. ${surplusText} A prioridade é regularizar os atrasos para evitar juros de mora e protestos.`;
  }

  switch (classification) {
    case 'sustainable':
      return `Suas dívidas estão dentro de um patamar controlável. ${surplusText} O próximo passo é garantir que o orçamento cubra os essenciais e direcione o excedente para quitar dívidas mais caras.`;
    case 'alert':
      return `O comprometimento ainda é administrável, mas há pouca margem para imprevistos. ${surplusText} Reduzir despesas variáveis libera espaço para o plano de quitação.`;
    case 'high-risk':
      return `A situação exige atenção imediata. ${surplusText} É essencial mapear e cortar despesas não essenciais para evitar que novos atrasos se acumulem.`;
    case 'critical':
      return `A sobrecarga de dívidas está comprometendo a subsistência. ${surplusText} O plano de recuperação precisa começar hoje — priorize quitar os credores com maior taxa de juros ou negocie condições melhores.`;
  }
};

const firstRecommendedAction = (
  classification: DtiClassification,
  overdueCount: number,
  highestInterestCreditor: string | null
): string => {
  if (overdueCount > 0) {
    return 'Regularize os atrasos primeiro — juros de mora e protestos pioram rapidamente a situação.';
  }

  if (classification === 'sustainable') {
    return 'Aplique o método Avalanche: direcione qualquer extra para a dívida com maior taxa de juros.';
  }

  if (highestInterestCreditor) {
    return `Priorize quitar "${highestInterestCreditor}" — é a dívida com maior taxa de juros e o ponto de partida do plano Avalanche.`;
  }

  return 'Mapeie todos os seus gastos mensais e corte pelo menos um item não essencial para liberar margem de manobra.';
};

export const explainDiagnosis = ({ incomes, debts, envelopes = [] }: ExplainDiagnosisInput): FinancialDiagnosisExplained => {
  const dti = calculateDti({ incomes, debts });

  const overdueDebts = debts.filter((debt) => debt.overdueMonths > 0);
  const essentialObligations = envelopes.reduce((sum, env) => sum + env.plannedAmount, 0);
  const monthlySurplus = toMoney(dti.monthlyIncome - dti.monthlyDebtPayments - essentialObligations);

  const highestInterestDebt = debts.reduce<DebtInput | null>((best, debt) => {
    if (!best || debt.interestRate > best.interestRate) {
      return debt;
    }

    return best;
  }, null);

  return {
    monthlyIncome: dti.monthlyIncome,
    monthlyDebtPayments: dti.monthlyDebtPayments,
    dtiPercent: dti.dtiPercent,
    classification: dti.classification,
    totalDebtBalance: toMoney(debts.reduce((sum, debt) => sum + debt.balance, 0)),
    classificationLabel: classificationLabel(dti.classification),
    classificationSummary: classificationSummary(dti.classification, dti.dtiPercent),
    situationNarrative: situationNarrative(dti.classification, overdueDebts.length, monthlySurplus),
    firstRecommendedAction: firstRecommendedAction(
      dti.classification,
      overdueDebts.length,
      highestInterestDebt?.creditor ?? null
    ),
    overdueDebtsCount: overdueDebts.length,
    monthlySurplus,
    essentialMonthlyObligations: toMoney(essentialObligations)
  };
};
