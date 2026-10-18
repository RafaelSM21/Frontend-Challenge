import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_DOWN });

export type EthString = string;

export const eth = (value: EthString | number) => new Decimal(value);

export const addEth = (a: EthString, b: EthString): EthString =>
  eth(a).plus(b).toFixed();
export const subEth = (a: EthString, b: EthString): EthString =>
  eth(a).minus(b).toFixed();
export const mulEth = (a: EthString, qty: number): EthString => {
  if (!Number.isInteger(qty)) throw new Error("Quantidade deve ser inteira");
  return eth(a).times(qty).toFixed();
};

export function formatEth(value: EthString, fractionDigits = 3): string {
  return `${eth(value).toFixed(fractionDigits)} ETH`;
}
