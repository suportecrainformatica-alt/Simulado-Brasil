export interface Question {
  id: number;
  number: number;
  text: string;
  context?: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  skill?: string; // C1, C2, C3, C4, C5 (Critério de Desempate)
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  category: 'ETEC' | 'ENEM' | 'Concursos' | 'Outros';
  durationMinutes: number;
  questions: Question[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  newsletterAccepted: boolean;
  agreedToPrivacyPolicy: boolean;
}

export interface Submission {
  id: string;
  examId: string;
  userName: string;
  userEmail: string;
  answers: Record<number, 'A' | 'B' | 'C' | 'D' | 'E' | ''>;
  score: number;
  totalQuestions: number;
  percentage: number;
  isApproved: boolean; // based on ETEC approval style or >50%
  submittedAt: string;
  aiAnalysis?: string;
}
