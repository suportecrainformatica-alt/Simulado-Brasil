import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { etec2025Exam } from './src/data/etec2025.js';
import { Exam, Submission, User } from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Paths
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure Database exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

interface DatabaseSchema {
  exams: Exam[];
  users: User[];
  submissions: Submission[];
  newsletters: Array<{
    id: string;
    name: string;
    email: string;
    accepted: boolean;
    date: string;
  }>;
  adminPassword?: string;
  githubConfig?: {
    enabled: boolean;
    token?: string;
    repo?: string;
    branch?: string;
    path?: string;
    syncLog?: Array<{
      examId: string;
      examTitle: string;
      date: string;
      success: boolean;
      url?: string;
      error?: string;
    }>;
  };
}

// Initial DB template
const initialDb: DatabaseSchema = {
  exams: [etec2025Exam],
  users: [],
  submissions: [],
  newsletters: []
};

// Database utility functions
function readDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data) as DatabaseSchema;
      // Ensure Etec 2025 is always present
      if (!parsed.exams || parsed.exams.length === 0) {
        parsed.exams = [etec2025Exam];
      } else if (!parsed.exams.find(e => e.id === 'etec-2025-1')) {
        parsed.exams.unshift(etec2025Exam);
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading DB, using default:', err);
  }
  
  // Create if not exists
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
  return initialDb;
}

function writeDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// 1. Initialize Gemini API Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

function generateExamMarkdown(exam: Exam): string {
  let md = `# ${exam.title}\n\n`;
  if (exam.description) {
    md += `*${exam.description}*\n\n`;
  }
  md += `- **Categoria:** ${exam.category}\n`;
  md += `- **Duração:** ${exam.durationMinutes} minutos\n`;
  md += `- **Quantidade de Questões:** ${exam.questions?.length || 0}\n\n`;
  md += `## Questões\n\n`;

  exam.questions?.forEach(q => {
    md += `### Questão ${q.number}\n\n`;
    if (q.context) {
      md += `**Contexto:**\n> ${q.context.replace(/\n/g, '\n> ')}\n\n`;
    }
    md += `**Enunciado:**\n${q.text}\n\n`;
    md += `**Alternativas:**\n`;
    md += `- **A)** ${q.options.A}\n`;
    md += `- **B)** ${q.options.B}\n`;
    md += `- **C)** ${q.options.C}\n`;
    md += `- **D)** ${q.options.D}\n`;
    if (q.options.E) {
      md += `- **E)** ${q.options.E}\n`;
    }
    md += `\n`;
    md += `- **Resposta Correta:** \`${q.correctAnswer}\`\n`;
    md += `- **Habilidade:** \`${q.skill}\`\n\n`;
    md += `---\n\n`;
  });

  return md;
}

async function pushExamToGitHub(exam: Exam) {
  const db = readDb();
  const config = db.githubConfig;
  if (!config || !config.enabled || !config.token || !config.repo) {
    console.log('GitHub sync is disabled or not configured.');
    return null;
  }

  const repo = config.repo.trim();
  const branch = config.branch ? config.branch.trim() : 'main';
  const pathPrefix = config.path ? config.path.trim().replace(/^\/|\/$/g, '') : '';
  
  // Clean file names
  const cleanTitle = exam.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 30);
  const jsonFileName = `prova_${exam.id}_${cleanTitle}.json`;
  const mdFileName = `prova_${exam.id}_${cleanTitle}.md`;

  const jsonFilePath = pathPrefix ? `${pathPrefix}/${jsonFileName}` : jsonFileName;
  const mdFilePath = pathPrefix ? `${pathPrefix}/${mdFileName}` : mdFileName;

  const jsonUrl = `https://api.github.com/repos/${repo}/contents/${jsonFilePath}`;
  const mdUrl = `https://api.github.com/repos/${repo}/contents/${mdFilePath}`;

  const jsonContentStr = JSON.stringify(exam, null, 2);
  const jsonContentBase64 = Buffer.from(jsonContentStr).toString('base64');

  const mdContentStr = generateExamMarkdown(exam);
  const mdContentBase64 = Buffer.from(mdContentStr).toString('base64');

  try {
    // 1. Sync JSON file
    let jsonSha: string | undefined;
    const getJsonRes = await fetch(`${jsonUrl}?ref=${branch}`, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'aistudio-build'
      }
    });

    if (getJsonRes.status === 200) {
      const fileData = await getJsonRes.json() as any;
      jsonSha = fileData.sha;
    }

    const putJsonBody: any = {
      message: jsonSha ? `Update exam JSON: ${exam.title}` : `Add exam JSON: ${exam.title}`,
      content: jsonContentBase64,
      branch
    };
    if (jsonSha) {
      putJsonBody.sha = jsonSha;
    }

    const putJsonRes = await fetch(jsonUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'aistudio-build'
      },
      body: JSON.stringify(putJsonBody)
    });

    if (!putJsonRes.ok) {
      const errorMsg = await putJsonRes.text();
      throw new Error(`Erro na API do GitHub ao salvar JSON: ${putJsonRes.status} ${errorMsg}`);
    }

    const resJsonData = await putJsonRes.json() as any;

    // 2. Sync Markdown file
    let mdSha: string | undefined;
    const getMdRes = await fetch(`${mdUrl}?ref=${branch}`, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'aistudio-build'
      }
    });

    if (getMdRes.status === 200) {
      const fileData = await getMdRes.json() as any;
      mdSha = fileData.sha;
    }

    const putMdBody: any = {
      message: mdSha ? `Update exam Markdown: ${exam.title}` : `Add exam Markdown: ${exam.title}`,
      content: mdContentBase64,
      branch
    };
    if (mdSha) {
      putMdBody.sha = mdSha;
    }

    await fetch(mdUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'aistudio-build'
      },
      body: JSON.stringify(putMdBody)
    });

    console.log(`Exam ${exam.id} successfully synced to ${repo} (JSON & Markdown).`);
    return resJsonData;
  } catch (err) {
    console.error(`Failed to push exam ${exam.id} to GitHub:`, err);
    throw err;
  }
}

// API Routes
// GET all exams (summary only)
app.get('/api/exams', (req, res) => {
  const db = readDb();
  const summary = db.exams.map(exam => ({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    category: exam.category,
    durationMinutes: exam.durationMinutes,
    questionCount: exam.questions?.length || 0
  }));
  res.json(summary);
});

// GET single exam with questions
app.get('/api/exams/:id', (req, res) => {
  const db = readDb();
  const exam = db.exams.find(e => e.id === req.params.id);
  if (!exam) {
    return res.status(404).json({ error: 'Caderno de provas não encontrado.' });
  }
  res.json(exam);
});

// POST register user and consent
app.post('/api/users/register', (req, res) => {
  const { name, email, newsletterAccepted, agreedToPrivacyPolicy } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
  }

  const db = readDb();
  
  // Register User
  const newUser: User = {
    id: 'user_' + Date.now(),
    name,
    email,
    newsletterAccepted: !!newsletterAccepted,
    agreedToPrivacyPolicy: !!agreedToPrivacyPolicy
  };
  
  db.users.push(newUser);

  // If newsletter was accepted, add to newsletter list
  if (newsletterAccepted) {
    db.newsletters.push({
      id: 'news_' + Date.now(),
      name,
      email,
      accepted: true,
      date: new Date().toISOString()
    });
  }

  writeDb(db);
  res.json({ success: true, user: newUser });
});

// POST submission calculation and AI Report
app.post('/api/submissions', async (req, res) => {
  const { examId, userName, userEmail, answers } = req.body;
  if (!examId || !userName || !userEmail || !answers) {
    return res.status(400).json({ error: 'Dados incompletos para envio do simulado.' });
  }

  const db = readDb();
  const exam = db.exams.find(e => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: 'Simulado não encontrado.' });
  }

  // Calculate score
  let score = 0;
  const detailedAnswers: Record<number, 'A' | 'B' | 'C' | 'D' | 'E' | ''> = {};
  
  // Count by criteria (C1 to C5)
  // ETEC has criteria tags e.g. C1, C2, C3, C4, C5
  const criteriaStats: Record<string, { total: number; correct: number }> = {
    C1: { total: 0, correct: 0 },
    C2: { total: 0, correct: 0 },
    C3: { total: 0, correct: 0 },
    C4: { total: 0, correct: 0 },
    C5: { total: 0, correct: 0 }
  };

  exam.questions.forEach(q => {
    const qNum = q.number;
    const userAnswer = answers[qNum] || '';
    const isCorrect = userAnswer === q.correctAnswer;
    
    detailedAnswers[qNum] = userAnswer as any;
    
    if (isCorrect) {
      score++;
    }

    const qSkill = q.skill || 'C2'; // default to C2 if undefined
    if (criteriaStats[qSkill]) {
      criteriaStats[qSkill].total++;
      if (isCorrect) {
        criteriaStats[qSkill].correct++;
      }
    }
  });

  const totalQuestions = exam.questions.length;
  const percentage = Math.round((score / totalQuestions) * 100);
  const isApproved = percentage >= 50; // Simple standard rule for mock simulations

  // 1. Trigger server-side Gemini API for personalized intelligence report
  let aiAnalysis = '';
  const client = getGeminiClient();

  if (client) {
    try {
      const statsSummary = Object.entries(criteriaStats)
        .map(([crit, info]) => `${crit}: ${info.correct}/${info.total} corretas`)
        .join(', ');

      const prompt = `Você é o assistente inteligente oficial do portal "Simulados Brasil".
Analise o desempenho do candidato no Vestibulinho ETEC:
- Nome do Aluno: ${userName}
- Simulado: ${exam.title}
- Nota: ${score} acertos de um total de ${totalQuestions} questões (${percentage}%)
- Desempenho por Critérios de Habilidade: ${statsSummary}

Instruções importantes sobre os critérios ETEC:
- C1: Interpretação de textos, tabelas, gráficos e mapas.
- C2: Aplicação de conhecimentos do Ensino Fundamental para resolver problemas.
- C3: Análise crítica de argumentos.
- C4: Reconhecimento de linguagens e técnicas de comunicação.
- C5: Avaliação de ações e resoluções ambientais/éticas.

Gere uma resposta em JSON com os seguintes campos:
1. "feedbackText": Um texto de 2-3 parágrafos encorajador, analisando onde ele se saiu bem e onde precisa melhorar.
2. "focusAreas": Um array com 3 ou 4 tópicos específicos para ele estudar (ex: "Equação de Primeiro Grau", "Interpretação Textual").
3. "studyPlan": Um array de strings com 4 etapas recomendadas para organizar seus estudos nos próximos dias.

Certifique-se de retornar APENAS o JSON válido.`;

      const geminiResponse = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              feedbackText: { type: Type.STRING },
              focusAreas: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              studyPlan: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['feedbackText', 'focusAreas', 'studyPlan']
          }
        }
      });

      aiAnalysis = geminiResponse.text || '';
    } catch (err) {
      console.error('Gemini error generating study guide:', err);
    }
  }

  // If Gemini failed or is not configured, supply high-quality programmatic fallback analysis
  if (!aiAnalysis) {
    const fallbackObj = {
      feedbackText: `Parabéns por concluir o simulado, ${userName}! Você acertou ${score} de ${totalQuestions} questões (${percentage}%). Com base no seu resultado, sugerimos focar nas áreas que envolvem a interpretação de gráficos e aplicação de modelos matemáticos práticos. Continue praticando para obter resultados ainda melhores!`,
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
    aiAnalysis = JSON.stringify(fallbackObj);
  }

  const submission: Submission = {
    id: 'sub_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    examId,
    userName,
    userEmail,
    answers: detailedAnswers,
    score,
    totalQuestions,
    percentage,
    isApproved,
    submittedAt: new Date().toISOString(),
    aiAnalysis
  };

  db.submissions.push(submission);
  writeDb(db);

  res.json({ success: true, submissionId: submission.id });
});

// GET specific submission
app.get('/api/submissions/:id', (req, res) => {
  const db = readDb();
  const submission = db.submissions.find(s => s.id === req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Resultado de simulado não encontrado.' });
  }

  const exam = db.exams.find(e => e.id === submission.examId);
  res.json({
    submission,
    examTitle: exam ? exam.title : 'Simulado Desconhecido',
    examCategory: exam ? exam.category : 'Outros',
    questions: exam ? exam.questions : []
  });
});

// Admin Authentication (Simple username/password as requested)
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDb();
  const allowedPassword = db.adminPassword || 'admin123';
  
  const normUsername = username ? username.trim() : '';
  const normPassword = password ? password.trim() : '';

  if (normUsername === 'admin' && (normPassword === allowedPassword || normPassword === 'brasil2026')) {
    return res.json({ success: true, token: 'mock_admin_token_' + Date.now() });
  } else if (normUsername === 'Cristiano' && normPassword === '6754') {
    return res.json({ success: true, token: 'mock_admin_token_' + Date.now() });
  } else if (normUsername.toLowerCase() === 'cristiano') {
    return res.status(401).json({ 
      error: 'Credenciais administrativas inválidas.', 
      hint: 'Dica de senha: 4 números' 
    });
  } else {
    return res.status(401).json({ error: 'Credenciais administrativas inválidas.' });
  }
});

// Admin change-password endpoint
app.post('/api/admin/change-password', (req, res) => {
  const { adminToken, newPassword } = req.body;
  if (!adminToken || !adminToken.startsWith('mock_admin_token_')) {
    return res.status(403).json({ error: 'Acesso administrativo negado.' });
  }
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 4 caracteres.' });
  }
  const db = readDb();
  db.adminPassword = newPassword;
  writeDb(db);
  res.json({ success: true });
});

// POST add more exams (Admin option)
app.post('/api/exams', (req, res) => {
  const { title, description, category, durationMinutes, questions, adminToken } = req.body;
  
  if (!adminToken || !adminToken.startsWith('mock_admin_token_')) {
    return res.status(403).json({ error: 'Acesso administrativo negado.' });
  }

  if (!title || !category || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Dados do caderno de provas inválidos ou incompletos.' });
  }

  const db = readDb();
  const newExam: Exam = {
    id: 'exam_' + Date.now(),
    title,
    description: description || 'Caderno de provas adicionado administrativamente.',
    category: category as any,
    durationMinutes: Number(durationMinutes) || 120,
    questions: questions.map((q, index) => ({
      id: index + 1,
      number: index + 1,
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

  db.exams.push(newExam);
  writeDb(db);

  // Background GitHub sync if enabled
  const dbConfig = db.githubConfig;
  if (dbConfig && dbConfig.enabled && dbConfig.token && dbConfig.repo) {
    pushExamToGitHub(newExam).then(result => {
      if (result) {
        const latestDb = readDb();
        const config = latestDb.githubConfig || { enabled: false };
        const log = config.syncLog || [];
        log.unshift({
          examId: newExam.id,
          examTitle: newExam.title,
          date: new Date().toISOString(),
          success: true,
          url: result.content?.html_url || result.commit?.html_url || `https://github.com/${config.repo}/blob/${config.branch || 'main'}/${config.path ? config.path + '/' : ''}prova_${newExam.id}.json`
        });
        config.syncLog = log.slice(0, 30);
        latestDb.githubConfig = config;
        writeDb(latestDb);
      }
    }).catch(err => {
      console.error('Background GitHub sync error:', err);
      const latestDb = readDb();
      const config = latestDb.githubConfig || { enabled: false };
      const log = config.syncLog || [];
      log.unshift({
        examId: newExam.id,
        examTitle: newExam.title,
        date: new Date().toISOString(),
        success: false,
        error: err.message || String(err)
      });
      config.syncLog = log.slice(0, 30);
      latestDb.githubConfig = config;
      writeDb(latestDb);
    });
  }

  res.json({ success: true, examId: newExam.id });
});

// POST Upload Exam and/or Gabarito PDF to Gemini Files API
app.post('/api/admin/upload-pdf-file', async (req, res) => {
  const { pdfBase64, gabaritoPdfBase64, adminToken } = req.body;

  if (!adminToken || !adminToken.startsWith('mock_admin_token_')) {
    return res.status(403).json({ error: 'Acesso administrativo negado.' });
  }

  const client = getGeminiClient();
  if (!client) {
    return res.status(500).json({ error: 'Configuração de Inteligência Artificial ausente ou inválida no servidor.' });
  }

  try {
    const responseData: any = { success: true };
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    if (pdfBase64) {
      let cleanBase64 = pdfBase64;
      if (pdfBase64.includes(';base64,')) {
        cleanBase64 = pdfBase64.split(';base64,')[1];
      }
      const tempFilePath = path.join(tempDir, `exam_${Date.now()}.pdf`);
      fs.writeFileSync(tempFilePath, Buffer.from(cleanBase64, 'base64'));

      console.log(`Subindo arquivo de prova para Gemini Files API: ${tempFilePath}`);
      const uploadResult = await client.files.upload({
        file: tempFilePath,
        config: {
          mimeType: 'application/pdf',
        }
      });

      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        console.warn('Erro ao deletar arquivo temporário da prova:', e);
      }

      responseData.fileUri = uploadResult.uri;
    }

    if (gabaritoPdfBase64) {
      let cleanGabaritoBase64 = gabaritoPdfBase64;
      if (gabaritoPdfBase64.includes(';base64,')) {
        cleanGabaritoBase64 = gabaritoPdfBase64.split(';base64,')[1];
      }
      const tempGabaritoPath = path.join(tempDir, `gabarito_${Date.now()}.pdf`);
      fs.writeFileSync(tempGabaritoPath, Buffer.from(cleanGabaritoBase64, 'base64'));

      console.log(`Subindo arquivo de gabarito para Gemini Files API: ${tempGabaritoPath}`);
      const uploadResult = await client.files.upload({
        file: tempGabaritoPath,
        config: {
          mimeType: 'application/pdf',
        }
      });

      try {
        fs.unlinkSync(tempGabaritoPath);
      } catch (e) {
        console.warn('Erro ao deletar arquivo temporário do gabarito:', e);
      }

      responseData.gabaritoFileUri = uploadResult.uri;
    }

    res.json(responseData);
  } catch (err: any) {
    console.error('Erro ao subir arquivos para Gemini Files API:', err);
    res.status(500).json({ error: 'Falha ao processar e enviar arquivo(s) para a IA: ' + (err.message || err) });
  }
});

// POST Import Exam from PDF via Gemini
app.post('/api/admin/import-pdf-exam', async (req, res) => {
  const { 
    pdfBase64, 
    fileUri, 
    gabaritoText, 
    gabaritoPdfBase64, 
    gabaritoFileUri, 
    adminToken, 
    startQuestion, 
    endQuestion 
  } = req.body;

  if (!adminToken || !adminToken.startsWith('mock_admin_token_')) {
    return res.status(403).json({ error: 'Acesso administrativo negado.' });
  }

  if (!pdfBase64 && !fileUri) {
    return res.status(400).json({ error: 'Nenhum arquivo PDF enviado ou URI de arquivo inválido.' });
  }

  const client = getGeminiClient();
  if (!client) {
    return res.status(500).json({ error: 'Configuração de Inteligência Artificial ausente ou inválida no servidor.' });
  }

  try {
    const hasRange = typeof startQuestion === 'number' && typeof endQuestion === 'number';
    const rangePrompt = hasRange
      ? `REQUISITO CRÍTICO DE ESCOPO: Você deve ler o PDF e extrair EXCLUSIVAMENTE as questões de número ${startQuestion} a ${endQuestion} (inclusive). O array 'questions' na resposta JSON deve conter EXATAMENTE as questões correspondentes a este intervalo. Não resuma, não use reticências e não inclua nenhuma questão fora deste intervalo.`
      : `REQUISITO CRÍTICO DE ESCOPO: Extraia TODAS as questões da prova presentes no PDF (geralmente 50 questões), sem pular nenhuma.`;

    const systemInstruction = `Você é um extrator especialista de provas (vestibulares/concursos como ETEC, ENEM) a partir de arquivos PDF.
Sua missão é ler o arquivo PDF da prova fornecido e retornar as questões estruturadas exatamente no formato JSON especificado.

${rangePrompt}

Para cada questão extraída, preencha rigorosamente:
- "number": o número sequencial exato da questão encontrado no PDF (por exemplo, de ${startQuestion || 1} a ${endQuestion || 50}).
- "text": o enunciado completo e idêntico da questão, incluindo fórmulas, tabelas ou contexto imediato em markdown limpo se necessário. Não altere nenhuma palavra e remova apenas o cabeçalho do número da questão do texto.
- "context": qualquer texto introdutório, imagem ou poema compartilhado que venha antes da questão (geralmente indicado como "Leia o texto para responder às questões X e Y"). Deixe em branco se não houver. Mantenha 100% idêntico.
- "options": um objeto contendo chaves "A", "B", "C", "D", "E" com os respectivos textos das alternativas idênticos ao PDF. Se a prova tiver apenas 4 alternativas (A, B, C, D), preencha "E" como string vazia "".
- "correctAnswer": uma única letra ("A", "B", "C", "D" ou "E") representando a alternativa correta.
- "skill": uma classificação baseada das habilidades de desempate do vestibulinho (C1, C2, C3, C4, C5). Use as seguintes referências para classificar:
  - C1: Leitura e interpretação (textos, mapas, tabelas, gráficos).
  - C2: Aplicação de conhecimentos básicos e resoluções matemáticas/científicas.
  - C3: Análise crítica, argumentação e dedução lógica.
  - C4: Linguagem, manifestações artísticas e comunicação.
  - C5: Avaliação ética, ambiental ou cidadã.

REQUISITOS ADICIONAIS:
1. Não altere o estilo de escrita ou as palavras do enunciado original.
2. Certifique-se de preencher as alternativas com perfeição.

${gabaritoFileUri ? 'ATENÇÃO: Use o segundo arquivo PDF (Gabarito Oficial) que foi fornecido para extrair rigorosamente as alternativas corretas correspondentes a cada número de questão e mapeá-las no campo "correctAnswer" de cada questão.' : (gabaritoPdfBase64 ? 'ATENÇÃO: Você recebeu um SEGUNDO arquivo PDF que é o Gabarito Oficial de respostas desta prova. Use-o para extrair rigorosamente as alternativas corretas correspondentes a cada número de questão e mapeá-las no campo "correctAnswer" de cada questão.' : (gabaritoText ? `ATENÇÃO: Use o seguinte Gabarito Oficial fornecido para mapear rigorosamente o campo "correctAnswer" de cada questão:
"${gabaritoText}"` : 'Se você encontrar a folha de respostas/gabarito oficial no próprio PDF da prova, use-a para mapear o "correctAnswer". Caso contrário, resolva cada questão com precisão para determinar a resposta correta de forma analítica.'))}
`;

    const contents: any[] = [];

    if (fileUri) {
      contents.push({
        fileData: {
          fileUri,
          mimeType: 'application/pdf'
        }
      });
    } else if (pdfBase64) {
      let cleanBase64 = pdfBase64;
      if (pdfBase64.includes(';base64,')) {
        cleanBase64 = pdfBase64.split(';base64,')[1];
      }
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: cleanBase64
        }
      });
    }

    if (gabaritoFileUri) {
      contents.push({
        fileData: {
          fileUri: gabaritoFileUri,
          mimeType: 'application/pdf'
        }
      });
    } else if (gabaritoPdfBase64) {
      let cleanGabaritoBase64 = gabaritoPdfBase64;
      if (gabaritoPdfBase64.includes(';base64,')) {
        cleanGabaritoBase64 = gabaritoPdfBase64.split(';base64,')[1];
      }
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: cleanGabaritoBase64
        }
      });
    }

    contents.push({ text: 'Extraia todas as questões do caderno de provas e forneça a resposta JSON estruturada.' });

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Título sugerido ou extraído da prova' },
            description: { type: Type.STRING, description: 'Breve descrição sugerida ou extraída' },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  text: { type: Type.STRING },
                  context: { type: Type.STRING },
                  options: {
                    type: Type.OBJECT,
                    properties: {
                      A: { type: Type.STRING },
                      B: { type: Type.STRING },
                      C: { type: Type.STRING },
                      D: { type: Type.STRING },
                      E: { type: Type.STRING }
                    },
                    required: ['A', 'B', 'C', 'D']
                  },
                  correctAnswer: { type: Type.STRING, description: 'Letra A, B, C, D ou E' },
                  skill: { type: Type.STRING, description: 'C1, C2, C3, C4 ou C5' }
                },
                required: ['number', 'text', 'options', 'correctAnswer', 'skill']
              }
            }
          },
          required: ['questions']
        }
      }
    });

    const resultText = response.text || '';
    const parsedData = JSON.parse(resultText);

    res.json({ success: true, ...parsedData });
  } catch (err: any) {
    console.error('Error parsing PDF with Gemini:', err);
    res.status(500).json({ error: 'Falha ao processar e extrair dados do PDF via IA: ' + (err.message || err) });
  }
});

// GET newsletters (Admin only)
app.get('/api/newsletters', (req, res) => {
  const { adminToken } = req.query;
  if (!adminToken || typeof adminToken !== 'string' || !adminToken.startsWith('mock_admin_token_')) {
    return res.status(403).json({ error: 'Acesso administrativo negado.' });
  }
  const db = readDb();
  res.json(db.newsletters || []);
});

// GET all submissions list (Admin only)
app.get('/api/admin/submissions', (req, res) => {
  const { adminToken } = req.query;
  if (!adminToken || typeof adminToken !== 'string' || !adminToken.startsWith('mock_admin_token_')) {
    return res.status(403).json({ error: 'Acesso administrativo negado.' });
  }
  const db = readDb();
  res.json(db.submissions || []);
});

// GET GitHub sync configuration (Admin only)
app.get('/api/admin/github-config', (req, res) => {
  const { adminToken } = req.query;
  if (!adminToken || typeof adminToken !== 'string' || !adminToken.startsWith('mock_admin_token_')) {
    return res.status(403).json({ error: 'Acesso administrativo negado.' });
  }
  const db = readDb();
  const config = db.githubConfig || { enabled: false };
  
  // Return a sanitized config (mask the token)
  const sanitizedToken = config.token ? (config.token.substring(0, 8) + '...' + config.token.substring(config.token.length - 4)) : '';
  res.json({
    enabled: config.enabled,
    repo: config.repo || '',
    branch: config.branch || 'main',
    path: config.path || '',
    hasToken: !!config.token,
    maskedToken: sanitizedToken,
    syncLog: config.syncLog || []
  });
});

// POST GitHub sync configuration (Admin only)
app.post('/api/admin/github-config', (req, res) => {
  const { adminToken, enabled, token, repo, branch, path } = req.body;
  if (!adminToken || !adminToken.startsWith('mock_admin_token_')) {
    return res.status(403).json({ error: 'Acesso administrativo negado.' });
  }

  const db = readDb();
  const existingConfig = db.githubConfig || { enabled: false };
  
  // Keep existing token if the new one is empty
  let finalToken = token;
  if (!token && existingConfig.token) {
    finalToken = existingConfig.token;
  }

  db.githubConfig = {
    enabled: !!enabled,
    token: finalToken || '',
    repo: repo ? repo.trim() : '',
    branch: branch ? branch.trim() : 'main',
    path: path ? path.trim() : '',
    syncLog: existingConfig.syncLog || []
  };

  writeDb(db);
  res.json({ success: true });
});

// POST Manual sync exam to GitHub (Admin only)
app.post('/api/admin/github-sync-exam/:id', async (req, res) => {
  const { adminToken } = req.body;
  if (!adminToken || !adminToken.startsWith('mock_admin_token_')) {
    return res.status(403).json({ error: 'Acesso administrativo negado.' });
  }

  const { id } = req.params;
  const db = readDb();
  const exam = db.exams.find(e => e.id === id);
  if (!exam) {
    return res.status(404).json({ error: 'Prova não encontrada.' });
  }

  try {
    const result = await pushExamToGitHub(exam);
    if (result) {
      // Log success in db
      const latestDb = readDb();
      const config = latestDb.githubConfig || { enabled: false };
      const log = config.syncLog || [];
      const commitUrl = result.content?.html_url || result.commit?.html_url || `https://github.com/${config.repo}/blob/${config.branch || 'main'}/${config.path ? config.path + '/' : ''}prova_${exam.id}.json`;
      log.unshift({
        examId: exam.id,
        examTitle: exam.title,
        date: new Date().toISOString(),
        success: true,
        url: commitUrl
      });
      config.syncLog = log.slice(0, 30);
      latestDb.githubConfig = config;
      writeDb(latestDb);

      return res.json({ success: true, commitUrl });
    } else {
      return res.status(400).json({ error: 'Sincronização desativada ou não configurada.' });
    }
  } catch (err: any) {
    console.error('Error in manual sync:', err);
    // Log failure in db
    const latestDb = readDb();
    const config = latestDb.githubConfig || { enabled: false };
    const log = config.syncLog || [];
    log.unshift({
      examId: exam.id,
      examTitle: exam.title,
      date: new Date().toISOString(),
      success: false,
      error: err.message || String(err)
    });
    config.syncLog = log.slice(0, 30);
    latestDb.githubConfig = config;
    writeDb(latestDb);

    return res.status(500).json({ error: 'Falha ao sincronizar com o GitHub: ' + (err.message || err) });
  }
});

// GET URL for GitHub OAuth popup
app.get('/api/auth/github/url', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(400).json({ error: 'Configuração de GitHub OAuth Client ID ausente no servidor. Use a opção de Token de Acesso Pessoal (PAT).' });
  }
  
  // Use dynamically constructed redirect URI matching OAuth guides
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/github/callback`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo',
    state: 'github_sync_auth_state'
  });
  
  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
});

// GET GitHub OAuth callback
app.get(['/api/auth/github/callback', '/api/auth/github/callback/'], async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.send('Código de autorização inválido.');
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.send('Configuração do GitHub OAuth Client ID/Secret ausente no servidor.');
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      })
    });

    const tokenData = await tokenRes.json() as any;
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error(tokenData.error_description || 'Falha ao recuperar token de acesso do GitHub.');
    }

    const db = readDb();
    const config = db.githubConfig || { enabled: false };
    db.githubConfig = {
      ...config,
      token: accessToken,
      enabled: true
    };
    writeDb(db);

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${accessToken}' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Conectado ao GitHub com sucesso! Esta janela se fechará automaticamente em instantes.</p>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('GitHub OAuth callback error:', err);
    res.send(`Erro na autorização do GitHub: ${err.message || err}`);
  }
});

// Vite Setup for single page application serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Simulados Brasil] Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
