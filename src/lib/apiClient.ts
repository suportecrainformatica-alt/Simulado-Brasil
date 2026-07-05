import { Exam, Question, Submission, User } from '../types';
import { etec2025Exam } from '../data/etec2025';

// Local storage keys
const EXAMS_KEY = 'simulados_exams';
const SUBMISSIONS_KEY = 'simulados_submissions';
const NEWSLETTERS_KEY = 'simulados_newsletters';
const ADMIN_PASSWORD_KEY = 'simulados_admin_password';

// Helper to initialize local storage data
function getLocalExams(): Exam[] {
  const local = localStorage.getItem(EXAMS_KEY);
  if (!local) {
    const list = [etec2025Exam];
    localStorage.setItem(EXAMS_KEY, JSON.stringify(list));
    return list;
  }
  try {
    const parsed = JSON.parse(local) as Exam[];
    if (!parsed || parsed.length === 0) {
      return [etec2025Exam];
    }
    // Ensure Etec 2025 is always in there
    if (!parsed.some(e => e.id === etec2025Exam.id)) {
      parsed.unshift(etec2025Exam);
      localStorage.setItem(EXAMS_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return [etec2025Exam];
  }
}

function saveLocalExams(exams: Exam[]) {
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
}

function getLocalSubmissions(): Submission[] {
  const local = localStorage.getItem(SUBMISSIONS_KEY);
  if (!local) return [];
  try {
    return JSON.parse(local) as Submission[];
  } catch {
    return [];
  }
}

function saveLocalSubmissions(subs: Submission[]) {
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(subs));
}

function getLocalNewsletters() {
  const local = localStorage.getItem(NEWSLETTERS_KEY);
  if (!local) return [];
  try {
    return JSON.parse(local) as any[];
  } catch {
    return [];
  }
}

function saveLocalNewsletters(news: any[]) {
  localStorage.setItem(NEWSLETTERS_KEY, JSON.stringify(news));
}

function getLocalAdminPassword(): string {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || 'admin123';
}

function saveLocalAdminPassword(pwd: string) {
  localStorage.setItem(ADMIN_PASSWORD_KEY, pwd);
}

// Transparent Client API Wrapper
export const apiClient = {
  // GET all exams summaries
  async getExams(): Promise<Array<{ id: string; title: string; description: string; category: string; durationMinutes: number; questionCount: number }>> {
    try {
      const res = await fetch('/api/exams');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Real API unavailable, falling back to local storage:', err);
    }

    // Fallback
    const exams = getLocalExams();
    return exams.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      durationMinutes: e.durationMinutes,
      questionCount: e.questions?.length || 0
    }));
  },

  // GET single exam with full questions list
  async getExam(id: string): Promise<Exam> {
    try {
      const res = await fetch(`/api/exams/${id}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`Real API for exam ${id} unavailable, falling back to local storage:`, err);
    }

    // Fallback
    const exams = getLocalExams();
    const exam = exams.find(e => e.id === id);
    if (!exam) {
      throw new Error('Caderno de provas não encontrado no banco de dados local.');
    }
    return exam;
  },

  // POST subscribe newsletter / register user
  async registerUser(userData: { name: string; email: string; newsletterAccepted: boolean; agreedToPrivacyPolicy: boolean }): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Real API registerUser unavailable, falling back to local storage:', err);
    }

    // Fallback
    const list = getLocalNewsletters();
    const alreadyExists = list.some(n => n.email.trim().toLowerCase() === userData.email.trim().toLowerCase());
    
    const newUser = {
      id: 'news_' + Date.now(),
      name: userData.name,
      email: userData.email,
      accepted: userData.newsletterAccepted,
      date: new Date().toISOString()
    };

    if (!alreadyExists) {
      list.push(newUser);
      saveLocalNewsletters(list);
    }

    return { success: true, user: newUser };
  },

  // POST exam submission calculation and AI feedback report
  async submitExam(payload: { examId: string; userName: string; userEmail: string; answers: Record<number, 'A' | 'B' | 'C' | 'D' | 'E' | ''> }): Promise<{ success: boolean; submissionId: string }> {
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Real API submitExam unavailable, falling back to local calculation and local storage:', err);
    }

    // Fallback calculation logic mirroring backend
    const exams = getLocalExams();
    const exam = exams.find(e => e.id === payload.examId);
    if (!exam) {
      throw new Error('Simulado não encontrado.');
    }

    let score = 0;
    const detailedAnswers: Record<number, 'A' | 'B' | 'C' | 'D' | 'E' | ''> = {};
    const criteriaStats: Record<string, { total: number; correct: number }> = {
      C1: { total: 0, correct: 0 },
      C2: { total: 0, correct: 0 },
      C3: { total: 0, correct: 0 },
      C4: { total: 0, correct: 0 },
      C5: { total: 0, correct: 0 }
    };

    exam.questions.forEach(q => {
      const userAnswer = payload.answers[q.number] || '';
      const isCorrect = userAnswer === q.correctAnswer;
      detailedAnswers[q.number] = userAnswer;
      
      if (isCorrect) score++;

      const skill = q.skill || 'C2';
      if (criteriaStats[skill]) {
        criteriaStats[skill].total++;
        if (isCorrect) criteriaStats[skill].correct++;
      }
    });

    const totalQuestions = exam.questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);
    const isApproved = percentage >= 50;

    const fallbackFeedback = {
      feedbackText: `Parabéns por concluir o simulado, ${payload.userName}! Você acertou ${score} de ${totalQuestions} questões (${percentage}%). Com base no seu resultado local, sugerimos focar nas áreas que envolvem a interpretação de gráficos e aplicação de modelos matemáticos práticos. Continue praticando para obter resultados ainda melhores!`,
      focusAreas: [
        'Análise de Gráficos e Tabelas (C1)',
        'Lei de Ohm e Física Básica (C2)',
        'Regra de Três e Cálculo de Volumes (C2)',
        'Movimentos Sociais e Revoluções (C3)'
      ],
      studyPlan: [
        'Revise as questões que você errou neste simulado e leia as explicações técnicas.',
        'Dedique 2 horas por semana para ler sobre geopolítica e história brasileira.',
        'Pratique exercícios de matemática instrumental e interpretação de fórmulas físicas simples.',
        'Faça mais um simulado completo dentro de 15 dias monitorando o seu tempo de execução.'
      ]
    };

    const submissionId = 'sub_local_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const submission: Submission = {
      id: submissionId,
      examId: payload.examId,
      userName: payload.userName,
      userEmail: payload.userEmail,
      answers: detailedAnswers,
      score,
      totalQuestions,
      percentage,
      isApproved,
      submittedAt: new Date().toISOString(),
      aiAnalysis: JSON.stringify(fallbackFeedback)
    };

    const subs = getLocalSubmissions();
    subs.push(submission);
    saveLocalSubmissions(subs);

    return { success: true, submissionId };
  },

  // GET specific submission
  async getSubmission(id: string): Promise<{ submission: Submission; examTitle: string; examCategory: string; questions: Question[] }> {
    try {
      const res = await fetch(`/api/submissions/${id}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`Real API for submission ${id} unavailable, falling back to local storage:`, err);
    }

    // Fallback
    const subs = getLocalSubmissions();
    const submission = subs.find(s => s.id === id);
    if (!submission) {
      throw new Error('Resultado de simulado não encontrado localmente.');
    }

    const exams = getLocalExams();
    const exam = exams.find(e => e.id === submission.examId);

    return {
      submission,
      examTitle: exam ? exam.title : 'Simulado Desconhecido',
      examCategory: exam ? exam.category : 'Outros',
      questions: exam ? exam.questions : []
    };
  },

  // POST admin login (with Cristiano support)
  async login(username: string, password?: string): Promise<{ success: boolean; token?: string; error?: string; hint?: string }> {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401 || res.status === 403) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Real API login unavailable, falling back to local storage credentials check:', err);
    }

    // Fallback checks
    const normUsername = username ? username.trim() : '';
    const normPassword = password ? password.trim() : '';

    const localAllowedPassword = getLocalAdminPassword();

    if (normUsername === 'admin' && (normPassword === localAllowedPassword || normPassword === 'brasil2026')) {
      return { success: true, token: 'mock_admin_token_local_' + Date.now() };
    } else if (normUsername === 'Cristiano' && normPassword === '6754') {
      return { success: true, token: 'mock_admin_token_local_' + Date.now() };
    } else if (normUsername.toLowerCase() === 'cristiano') {
      return { 
        success: false,
        error: 'Credenciais administrativas inválidas.',
        hint: 'Dica de senha: 4 números'
      };
    } else {
      return { 
        success: false,
        error: 'Credenciais administrativas inválidas.'
      };
    }
  },

  // POST admin change-password
  async changePassword(adminToken: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken, newPassword })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Real API changePassword unavailable, falling back to local storage:', err);
    }

    // Fallback
    if (!adminToken || (!adminToken.startsWith('mock_admin_token_') && !adminToken.startsWith('mock_admin_token_local_'))) {
      return { success: false, error: 'Acesso administrativo negado.' };
    }
    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'A senha deve ter pelo menos 4 caracteres.' };
    }

    saveLocalAdminPassword(newPassword);
    return { success: true };
  },

  // POST add new exam (Admin)
  async createExam(examData: { title: string; description: string; category: string; durationMinutes: number; questions: Question[]; adminToken: string }): Promise<{ success: boolean; examId: string }> {
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Real API createExam unavailable, falling back to local storage:', err);
    }

    // Fallback
    if (!examData.adminToken || (!examData.adminToken.startsWith('mock_admin_token_') && !examData.adminToken.startsWith('mock_admin_token_local_'))) {
      throw new Error('Acesso administrativo negado.');
    }

    const exams = getLocalExams();
    const newExamId = 'exam_local_' + Date.now();
    const newExam: Exam = {
      id: newExamId,
      title: examData.title,
      description: examData.description || 'Caderno de provas adicionado localmente.',
      category: examData.category as any,
      durationMinutes: Number(examData.durationMinutes) || 120,
      questions: examData.questions.map((q, idx) => ({
        id: idx + 1,
        number: q.number || idx + 1,
        text: q.text,
        context: q.context || '',
        options: {
          A: q.options.A || '',
          B: q.options.B || '',
          C: q.options.C || '',
          D: q.options.D || '',
          E: q.options.E || ''
        },
        correctAnswer: q.correctAnswer || 'A',
        skill: q.skill || 'C2'
      }))
    };

    exams.push(newExam);
    saveLocalExams(exams);

    return { success: true, examId: newExamId };
  },

  // GET newsletter listing (Admin)
  async getNewsletters(adminToken: string): Promise<any[]> {
    try {
      const res = await fetch(`/api/newsletters?adminToken=${adminToken}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Real API getNewsletters unavailable, falling back to local storage:', err);
    }

    // Fallback
    if (!adminToken || (!adminToken.startsWith('mock_admin_token_') && !adminToken.startsWith('mock_admin_token_local_'))) {
      throw new Error('Acesso administrativo negado.');
    }
    return getLocalNewsletters();
  },

  // GET all submissions listing (Admin)
  async getSubmissions(adminToken: string): Promise<any[]> {
    try {
      const res = await fetch(`/api/admin/submissions?adminToken=${adminToken}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Real API getSubmissions unavailable, falling back to local storage:', err);
    }

    // Fallback
    if (!adminToken || (!adminToken.startsWith('mock_admin_token_') && !adminToken.startsWith('mock_admin_token_local_'))) {
      throw new Error('Acesso administrativo negado.');
    }
    return getLocalSubmissions();
  },

  // GET GitHub sync configuration
  async getGitHubConfig(adminToken: string): Promise<any> {
    try {
      const res = await fetch(`/api/admin/github-config?adminToken=${adminToken}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Real API getGitHubConfig unavailable, using local fallback:', err);
    }
    const local = localStorage.getItem('simulados_github_config');
    return local ? JSON.parse(local) : { enabled: false, repo: '', branch: 'main', path: '', syncLog: [] };
  },

  // POST GitHub sync configuration
  async saveGitHubConfig(adminToken: string, config: { enabled: boolean; token?: string; repo?: string; branch?: string; path?: string }): Promise<any> {
    try {
      const res = await fetch('/api/admin/github-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken, ...config })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Real API saveGitHubConfig unavailable, using local fallback:', err);
    }
    localStorage.setItem('simulados_github_config', JSON.stringify({ ...config, syncLog: [] }));
    return { success: true };
  },

  // POST manual trigger sync to GitHub for a specific exam
  async syncExamToGitHub(adminToken: string, examId: string): Promise<any> {
    try {
      const res = await fetch(`/api/admin/github-sync-exam/${examId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken })
      });
      return await res.json();
    } catch (err: any) {
      console.warn('Real API syncExamToGitHub unavailable:', err);
      return { success: false, error: 'Servidor de API real indisponível para sincronização.' };
    }
  }
};
