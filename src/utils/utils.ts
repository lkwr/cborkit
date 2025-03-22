export const asBigInt = (value: number | bigint): bigint => {
  if (typeof value === "number") return BigInt(asInt(value));
  return value;
};

export const asInt = (value: number | bigint): number => {
  if (typeof value === "bigint") value = Number(value);

  if (!Number.isSafeInteger(value))
    throw new Error("value must be a safe integer");

  if (Number.isNaN(value)) throw new Error("value must be a number");

  return value;
};

export const tryInt = (value: number | bigint): number | bigint => {
  try {
    return asInt(value);
  } catch {
    return value;
  }
};
