import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load rich 30-lesson curriculum database
const fullDataPath = path.join(__dirname, '../data/curriculumFullData.json');

function loadLessons() {
  try {
    const raw = fs.readFileSync(fullDataPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading curriculumFullData.json:', err.message);
    return [];
  }
}

export const getLessons = (filters = {}) => {
  let result = loadLessons();

  if (filters.category && filters.category !== 'ALL') {
    result = result.filter(
      (l) => l.category && l.category.toLowerCase() === filters.category.toLowerCase()
    );
  }

  if (filters.difficulty && filters.difficulty !== 'ALL') {
    result = result.filter(
      (l) => l.difficulty && l.difficulty.toLowerCase() === filters.difficulty.toLowerCase()
    );
  }

  if (filters.phase && filters.phase !== 'ALL') {
    result = result.filter(
      (l) => String(l.phase) === String(filters.phase)
    );
  }

  return result;
};

export const getLessonById = (id) => {
  const lessons = loadLessons();
  return lessons.find((l) => l.id === id || String(l.number) === String(id)) || null;
};

export const getLearningCategories = () => {
  const lessons = loadLessons();
  const categories = [...new Set(lessons.map((l) => l.category).filter(Boolean))];
  return {
    categories,
    count: categories.length,
  };
};

export const getCurriculumSummary = () => {
  const lessons = loadLessons();
  const totalMinutes = lessons.reduce((sum, l) => sum + (l.estimatedMinutes || 25), 0);
  const categories = [...new Set(lessons.map((l) => l.category).filter(Boolean))];

  return {
    totalLessons: lessons.length,
    totalEstimatedMinutes: totalMinutes,
    totalEstimatedHours: (totalMinutes / 60).toFixed(1),
    categoriesCount: categories.length,
    categories,
    difficulties: {
      beginner: lessons.filter((l) => l.difficulty === 'BEGINNER').length,
      intermediate: lessons.filter((l) => l.difficulty === 'INTERMEDIATE').length,
      advanced: lessons.filter((l) => l.difficulty === 'ADVANCED').length,
    },
  };
};
