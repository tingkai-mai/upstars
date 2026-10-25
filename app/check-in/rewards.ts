export const MAX_POINTS_PER_REWARD = 2;

/** The rewards given at each check-in. key is both the form field and the check_in column. */
export const REWARDS = [
    { key: "attendancePoints", label: "Attendance" },
    { key: "behaviourPoints", label: "Behaviour" },
    { key: "bonusPoints", label: "Bonus" },
] as const;

export type RewardKey = (typeof REWARDS)[number]["key"];
export type RewardPoints = Record<RewardKey, number>;

export const MAX_SCORE = REWARDS.length * MAX_POINTS_PER_REWARD;

export function totalScore(points: RewardPoints) {
    return REWARDS.reduce((sum, reward) => sum + points[reward.key], 0);
}

/** "Attendance 2 · Behaviour 1 · Bonus 0 · Score 3/6" */
export function formatRewards(points: RewardPoints) {
    return [...REWARDS.map((r) => `${r.label} ${points[r.key]}`), `Score ${totalScore(points)}/${MAX_SCORE}`].join(" · ");
}
