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
    const list = JSON.parse(raw);
    return list.map((lesson) => {
      const category = lesson.category === 'CAPSTONE' ? 'OPERATIONS' : (lesson.category || 'FOUNDATIONS');
      const exercise = lesson.exercise || lesson.worksheet?.prompt || `Execute the ${lesson.title} exercise for your company.`;
      return {
        ...lesson,
        category,
        exercise,
      };
    });
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
  const categoryKeys = [...new Set(lessons.map((lesson) => lesson.category))];
  const list = categoryKeys.map((category) => ({
    id: category,
    name: category
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' '),
    lessonCount: lessons.filter((lesson) => lesson.category === category).length,
  }));
  list.categories = categoryKeys;
  list.count = list.length;
  return list;
};

export const getCurriculumSummary = () => {
  const lessons = loadLessons();
  const categories = getLearningCategories();
  const totalMinutes = lessons.reduce((sum, l) => sum + (l.estimatedMinutes || 25), 0);

  const difficultyCounts = {
    BEGINNER: lessons.filter((l) => l.difficulty === 'BEGINNER').length,
    INTERMEDIATE: lessons.filter((l) => l.difficulty === 'INTERMEDIATE').length,
    ADVANCED: lessons.filter((l) => l.difficulty === 'ADVANCED').length,
  };

  return {
    totalLessons: lessons.length,
    totalEstimatedMinutes: totalMinutes,
    totalEstimatedHours: (totalMinutes / 60).toFixed(1),
    categories,
    categoriesCount: categories.length,
    difficultyCounts,
    difficulties: {
      beginner: difficultyCounts.BEGINNER,
      intermediate: difficultyCounts.INTERMEDIATE,
      advanced: difficultyCounts.ADVANCED,
    },
  };
};
