export const TEST_TYPES = ["capstone", "monthly"] as const;
export type TestType = (typeof TEST_TYPES)[number];

export const TEST_TYPE_LABELS: Record<TestType, { one: string; many: string }> = {
    capstone: { one: "Capstone check", many: "Capstone checks" },
    monthly: { one: "Monthly check", many: "Monthly checks" },
};

export function isTestType(value: unknown): value is TestType {
    return TEST_TYPES.includes(value as TestType);
}
