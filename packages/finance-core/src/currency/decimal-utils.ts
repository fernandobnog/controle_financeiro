import { Decimal } from 'decimal.js';

export const toDecimal = (value: Decimal.Value): Decimal => new Decimal(value ?? 0);

export const toMoney = (value: Decimal.Value): number =>
  Number(toDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString());

export const sumMoney = (values: Array<Decimal.Value>): Decimal =>
  values.reduce<Decimal>((carry, current) => carry.plus(toDecimal(current)), new Decimal(0));