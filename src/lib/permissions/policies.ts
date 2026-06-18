export type PolicyCondition = {
  field: string;
  op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "in";
  value: string | number | boolean | Array<string | number>;
};

export type PolicyContext = Record<string, string | number | boolean | null>;

export function evaluatePolicyCondition(
  condition: PolicyCondition,
  context: PolicyContext,
): boolean {
  const actual = context[condition.field];
  const expected = condition.value;

  switch (condition.op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "lt":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "gt":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual as string | number);
    default:
      return false;
  }
}

export function evaluatePolicies(
  conditions: PolicyCondition[],
  context: PolicyContext,
): boolean {
  if (conditions.length === 0) {
    return true;
  }

  return conditions.every((condition) => evaluatePolicyCondition(condition, context));
}
