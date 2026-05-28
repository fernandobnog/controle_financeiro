import type { Pool } from 'pg';

const householdId = 'household-1';

export const seedDatabase = async (pool: Pool): Promise<void> => {
  await pool.query(
    `
      INSERT INTO households (id, name)
      VALUES ($1, $2)
      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = CURRENT_TIMESTAMP
    `,
    [householdId, 'Familia Souza']
  );

  await pool.query(
    `
      INSERT INTO incomes (id, household_id, label, amount, recurring)
      VALUES
        ('income-1', $1, 'Salario principal', 4200, TRUE),
        ('income-2', $1, 'Renda extra', 600, FALSE)
      ON CONFLICT (id)
      DO UPDATE SET
        label = EXCLUDED.label,
        amount = EXCLUDED.amount,
        recurring = EXCLUDED.recurring,
        updated_at = CURRENT_TIMESTAMP
    `,
    [householdId]
  );

  await pool.query(
    `
      INSERT INTO debts (id, household_id, creditor, balance, monthly_payment, interest_rate, overdue_months)
      VALUES
        ('debt-1', $1, 'Banco A', 9000, 450, 4.2, 1),
        ('debt-2', $1, 'Cartao B', 2400, 180, 9.8, 0),
        ('debt-3', $1, 'Loja C', 1200, 120, 2.1, 2)
      ON CONFLICT (id)
      DO UPDATE SET
        creditor = EXCLUDED.creditor,
        balance = EXCLUDED.balance,
        monthly_payment = EXCLUDED.monthly_payment,
        interest_rate = EXCLUDED.interest_rate,
        overdue_months = EXCLUDED.overdue_months,
        updated_at = CURRENT_TIMESTAMP
    `,
    [householdId]
  );

  await pool.query(
    `
      INSERT INTO budget_envelopes (id, household_id, category, planned_amount, actual_amount)
      VALUES
        ('envelope-1', $1, 'Moradia', 1200, 1200),
        ('envelope-2', $1, 'Alimentacao', 800, 760),
        ('envelope-3', $1, 'Transporte', 280, 310),
        ('envelope-4', $1, 'Saude', 220, 210)
      ON CONFLICT (id)
      DO UPDATE SET
        category = EXCLUDED.category,
        planned_amount = EXCLUDED.planned_amount,
        actual_amount = EXCLUDED.actual_amount,
        updated_at = CURRENT_TIMESTAMP
    `,
    [householdId]
  );
};

export const defaultHouseholdId = householdId;