// === CENTRALIZED MAPPING UTILITIES FOR PROMPT GENERATION ===
// Clean separation of mapping logic from prompt construction

// 🟢 Difficulty Mapping — from quizData.ambition
export const difficultyMap: { [key: string]: string } = {
  'Just get fed': 'Easy',
  'Simple & tasty': 'Easy',
  'Confident cook': 'Medium',
  'Ambitious chef': 'Hard',
  'Michelin effort': 'Hard'
};

// 🟢 Cooking Time — ensure it's a numeric upper limit
export const getCookTime = (quizData: any): number => {
  return Number(quizData?.time?.value) || Number(quizData?.time) || 30;
};

// 🟢 Budget Label Mapping (Shopping Mode ONLY) — for realistic per-portion price references
export const budgetMap: { [key: string]: string } = {
  budget: 'Budget-friendly (£1–£3 per portion)',
  moderate: 'Moderate budget (£5–15 per portion)',
  premium: 'Premium (£15–25 per portion)',
  luxury: 'Luxury (£25+ per portion)'
};

// 🟢 Equipment Text — map raw selections to readable text
export const formatEquipmentText = (quizData: any): string => {
  const equipment = quizData?.equipment || [];
  return equipment.length > 0
    ? equipment.join(', ')
    : 'Standard kitchen setup';
};

// 🟢 Get Difficulty from Ambition
export const getDifficulty = (ambition: string): string => {
  return difficultyMap[ambition] || 'Medium';
};

// 🟢 Get Budget Text (Shopping Mode Only)
export const getBudgetText = (budget: string): string => {
  return budgetMap[budget] || 'Any budget';
};