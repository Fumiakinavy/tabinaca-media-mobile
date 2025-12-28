// User Vector Computation from Quiz Answers

export interface QuizAnswer {
  location: { lat: number; lng: number };
  plan: number; // 0..1
  social: number; // 0..1
  immersion: number; // 0..1
  nature: number; // 0..1
  durationMinutes: number;
  budgetJPY: number;
  indoorPreferred: boolean;
  category: "eat" | "feel" | "make" | "learn" | "play";
}

export interface UserVector {
  plan: number;
  social: number;
  immersion: number;
  nature: number;
  urban: number; // 1 - nature
  durationMinutes?: number;
  budgetJPY?: number;
}

export interface Constraints {
  radiusMeters: number;
  maxPriceLevel: number;
  minPriceLevel: number;
  indoorPreferred: boolean;
  location: { lat: number; lng: number };
}

export function computeUserVector(answer: QuizAnswer): UserVector {
  return {
    plan: answer.plan,
    social: answer.social,
    immersion: answer.immersion,
    nature: answer.nature,
    urban: 1 - answer.nature,
    durationMinutes: answer.durationMinutes,
    budgetJPY: answer.budgetJPY,
  };
}

export function computeConstraints(answer: QuizAnswer): Constraints {
  // Duration → radius mapping
  let radiusMeters: number;
  if (answer.durationMinutes <= 60) {
    radiusMeters = 1200;
  } else if (answer.durationMinutes <= 180) {
    radiusMeters = 3000;
  } else if (answer.durationMinutes <= 300) {
    radiusMeters = 6000;
  } else {
    radiusMeters = 10000;
  }

  // Budget → price_level mapping
  let maxPriceLevel: number;
  let minPriceLevel = 0;
  if (answer.budgetJPY <= 2000) {
    maxPriceLevel = 1;
  } else if (answer.budgetJPY <= 5000) {
    maxPriceLevel = 2;
  } else {
    maxPriceLevel = 3;
  }

  return {
    radiusMeters,
    maxPriceLevel,
    minPriceLevel,
    indoorPreferred: answer.indoorPreferred,
    location: answer.location,
  };
}

export function normalizeVector(vector: UserVector): UserVector {
  // Already 0-1 normalized from quiz
  return {
    plan: Math.max(0, Math.min(1, vector.plan)),
    social: Math.max(0, Math.min(1, vector.social)),
    immersion: Math.max(0, Math.min(1, vector.immersion)),
    nature: Math.max(0, Math.min(1, vector.nature)),
    urban: Math.max(0, Math.min(1, vector.urban)),
  };
}
