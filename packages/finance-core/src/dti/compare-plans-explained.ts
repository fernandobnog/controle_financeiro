import type {
  BudgetEnvelopeInput,
  DebtInput,
  IncomeInput,
  PlanComparisonExplained,
  PlanExplanation,
  PlanStrategy
} from '@controle-financeiro/shared-contracts';

import { toMoney } from '../currency/decimal-utils.js';
import { createAvalanchePlan } from '../avalanche/create-avalanche-plan.js';
import { createSnowballPlan } from '../snowball/create-snowball-plan.js';
import { calculateDti } from '../dti/calculate-dti.js';

export interface ComparePlansInput {
  incomes: IncomeInput[];
  debts: DebtInput[];
  envelopes?: BudgetEnvelopeInput[];
}

const strategyLabel = (strategy: PlanStrategy): string =>
  strategy === 'avalanche' ? 'Método Avalanche (maior juros primeiro)' : 'Método Bola de Neve (menor saldo primeiro)';

const whyThisStrategy = (strategy: PlanStrategy): string => {
  if (strategy === 'avalanche') {
    return 'Você paga menos juros no total porque elimina primeiro as dívidas mais caras. Ideal para quem consegue manter o foco no longo prazo.';
  }

  return 'Cada dívida quitada libera uma parcela inteira para reforçar a próxima — o progresso visível ajuda a manter a disciplina. Paga-se um pouco mais de juros, mas a motivação é maior.';
};

const firstActionLabel = (strategy: PlanStrategy, firstCreditor: string | undefined): string => {
  if (!firstCreditor) {
    return 'Nenhuma dívida cadastrada ainda. Adicione suas dívidas para gerar o plano.';
  }

  if (strategy === 'avalanche') {
    return `Direcione todo valor extra para "${firstCreditor}" — a dívida com maior taxa de juros da lista.`;
  }

  return `Concentre o pagamento extra em "${firstCreditor}" — a dívida de menor saldo para quitar logo de cara.`;
};

const buildExplanation = (plan: ReturnType<typeof createAvalanchePlan>, surplus: number): Omit<PlanExplanation, 'strategyLabel' | 'whyThisStrategy' | 'firstActionLabel'> => ({
  strategy: plan.strategy,
  installments: plan.installments.map((inst) => ({
    creditor: inst.creditor,
    recommendedPayment: inst.recommendedPayment,
    priority: inst.priority,
    rationale:
      inst.priority === 1
        ? 'Prioridade máxima — direcione o pagamento extra aqui.'
        : `Pague o mínimo de R$ ${inst.recommendedPayment.toFixed(2).replace('.', ',')} e libere margem para a dívida prioritária.`
  })),
  estimatedMonthsToDebtFree: null,
  totalInterestPaid: null,
  monthlySurplus: surplus
});

export const comparePlansExplained = ({ incomes, debts, envelopes = [] }: ComparePlansInput): PlanComparisonExplained => {
  const dti = calculateDti({ incomes, debts });
  const essentialObligations = envelopes.reduce((sum, env) => sum + env.plannedAmount, 0);
  const surplus = toMoney(dti.monthlyIncome - dti.monthlyDebtPayments);
  const extraPayment = toMoney(Math.max(0, surplus - essentialObligations));
  const surplusAfterEssentials = toMoney(surplus - essentialObligations);

  const avalanchePlan = createAvalanchePlan({ incomes, debts, extraPayment });
  const snowballPlan = createSnowballPlan({ incomes, debts, extraPayment });

  const firstAvalancheCreditor = avalanchePlan.installments[0]?.creditor;
  const firstSnowballCreditor = snowballPlan.installments[0]?.creditor;

  // A Avalanche é recomendada quando DTI >= 35% (risco/crítico) pois economiza juros
  // A Bola de Neve é recomendada quando DTI < 35% pois o foco é motivação
  const recommended: PlanStrategy = dti.dtiPercent >= 35 ? 'avalanche' : 'snowball';
  const recommendationReason =
    recommended === 'avalanche'
      ? 'Com comprometimento de renda acima de 35%, o objetivo principal é reduzir o custo total dos juros o mais rápido possível. O Método Avalanche economiza mais dinheiro neste cenário.'
      : 'O comprometimento de renda está em um patamar gerenciável. O Método Bola de Neve gera vitórias rápidas que ajudam a manter a motivação até quitar tudo.';

  const avalancheExplanation: PlanExplanation = {
    ...buildExplanation(avalanchePlan, surplusAfterEssentials),
    strategy: 'avalanche',
    strategyLabel: strategyLabel('avalanche'),
    whyThisStrategy: whyThisStrategy('avalanche'),
    firstActionLabel: firstActionLabel('avalanche', firstAvalancheCreditor)
  };

  const snowballExplanation: PlanExplanation = {
    ...buildExplanation(snowballPlan, surplusAfterEssentials),
    strategy: 'snowball',
    strategyLabel: strategyLabel('snowball'),
    whyThisStrategy: whyThisStrategy('snowball'),
    firstActionLabel: firstActionLabel('snowball', firstSnowballCreditor)
  };

  return {
    avalanche: avalancheExplanation,
    snowball: snowballExplanation,
    recommendedStrategy: recommended,
    recommendationReason,
    essentialMonthlyObligations: toMoney(essentialObligations),
    surplusAfterEssentials
  };
};
