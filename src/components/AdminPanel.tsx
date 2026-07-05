import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, CheckCircle2, ListFilter, Users, FileText, 
  Lock, ArrowLeft, PlusCircle, CheckCircle, Award, Eye, Clipboard, HelpCircle,
  RefreshCw, AlertCircle, Sparkles, Upload
} from 'lucide-react';
import { Exam, Question } from '../types';

interface AdminPanelProps {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Tab control: 'exams' | 'newsletter' | 'submissions' | 'password'
  const [activeTab, setActiveTab] = useState<'exams' | 'newsletter' | 'submissions' | 'password'>('exams');
  
  // New Exam Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'ETEC' | 'ENEM' | 'Concursos' | 'Outros'>('ETEC');
  const [durationMinutes, setDurationMinutes] = useState(240);
  const [questions, setQuestions] = useState<Partial<Question>[]>([
    {
      number: 1,
      text: '',
      context: '',
      options: { A: '', B: '', C: '', D: '', E: '' },
      correctAnswer: 'A',
      skill: 'C2'
    }
  ]);

  // Loaded server data states
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Password Change state
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // PDF Import states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [gabaritoPdfFile, setGabaritoPdfFile] = useState<File | null>(null);
  const [gabaritoText, setGabaritoText] = useState('');
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [showExtractingModal, setShowExtractingModal] = useState(false);
  const [extractingError, setExtractingError] = useState('');
  const [extractingSuccessMessage, setExtractingSuccessMessage] = useState('');
  const [extractingProgressText, setExtractingProgressText] = useState('');

  // Exam confirmation modal states
  const [showConfirmExamModal, setShowConfirmExamModal] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToken(data.token);
        localStorage.setItem('admin_token', data.token);
      } else {
        const errorMsg = data.hint ? `${data.error || 'Credenciais inválidas.'} (${data.hint})` : (data.error || 'Credenciais inválidas');
        setError(errorMsg);
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    }
  };

  // Logout
  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('admin_token');
  };

  // Check persisted token
  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // Fetch admin stats and listings
  useEffect(() => {
    if (!token) return;

    const fetchAdminData = async () => {
      try {
        // Newsletters
        const newsRes = await fetch(`/api/newsletters?adminToken=${token}`);
        if (newsRes.ok) {
          const newsData = await newsRes.json();
          setNewsletters(newsData);
        }
        
        // Submissions
        const subsRes = await fetch(`/api/admin/submissions?adminToken=${token}`);
        if (subsRes.ok) {
          const subsData = await subsRes.json();
          setSubmissions(subsData);
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
      }
    };

    fetchAdminData();
  }, [token, activeTab, successMessage]);

  // Questions addition logic
  const addQuestion = () => {
    const nextNum = questions.length + 1;
    setQuestions([
      ...questions,
      {
        number: nextNum,
        text: '',
        context: '',
        options: { A: '', B: '', C: '', D: '', E: '' },
        correctAnswer: 'A',
        skill: 'C2'
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) return;
    const updated = questions.filter((_, i) => i !== index);
    // re-number questions
    const renumbered = updated.map((q, idx) => ({
      ...q,
      number: idx + 1
    }));
    setQuestions(renumbered);
  };

  const updateQuestionText = (index: number, field: 'text' | 'context' | 'skill', value: string) => {
    const updated = [...questions];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setQuestions(updated);
  };

  const updateQuestionOption = (index: number, optionKey: 'A' | 'B' | 'C' | 'D' | 'E', value: string) => {
    const updated = [...questions];
    const prevOptions = updated[index].options || { A: '', B: '', C: '', D: '', E: '' };
    updated[index] = {
      ...updated[index],
      options: {
        ...prevOptions,
        [optionKey]: value
      }
    };
    setQuestions(updated);
  };

  const updateQuestionCorrect = (index: number, value: 'A' | 'B' | 'C' | 'D' | 'E') => {
    const updated = [...questions];
    updated[index] = {
      ...updated[index],
      correctAnswer: value
    };
    setQuestions(updated);
  };

  // Trigger confirmation modal for new Exam
  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!title || !category) {
      setError('Por favor, preencha o título e selecione a categoria.');
      return;
    }

    // validate that options are filled
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text) {
        setError(`A questão ${q.number} está com a pergunta em branco.`);
        return;
      }
      if (!q.options?.A || !q.options?.B || !q.options?.C || !q.options?.D || !q.options?.E) {
        setError(`A questão ${q.number} precisa ter todas as alternativas de A a E preenchidas.`);
        return;
      }
    }

    setShowConfirmExamModal(true);
  };

  // Actual execution of creating the exam
  const executeCreateExam = async () => {
    setIsSubmittingExam(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          durationMinutes,
          questions,
          adminToken: token
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage('Caderno de provas adicionado com sucesso e disponível no portal!');
        // Reset form
        setTitle('');
        setDescription('');
        setCategory('ETEC');
        setDurationMinutes(240);
        setQuestions([
          {
            number: 1,
            text: '',
            context: '',
            options: { A: '', B: '', C: '', D: '', E: '' },
            correctAnswer: 'A',
            skill: 'C2'
          }
        ]);
        setShowConfirmExamModal(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError(data.error || 'Erro ao salvar caderno de provas');
        setShowConfirmExamModal(false);
      }
    } catch (err) {
      setError('Erro de rede ao salvar caderno de provas.');
      setShowConfirmExamModal(false);
    } finally {
      setIsSubmittingExam(false);
    }
  };

  // Change Admin Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (!newPassword || newPassword.trim().length < 4) {
      setPasswordError('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminToken: token,
          newPassword: newPassword.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordSuccess('Senha administrativa atualizada com sucesso!');
        setNewPassword('');
      } else {
        setPasswordError(data.error || 'Erro ao atualizar a senha.');
      }
    } catch (err) {
      setPasswordError('Erro de conexão ao alterar a senha.');
    }
  };

  // Import Exam from PDF via Gemini
  const handleImportPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      setExtractingError('Por favor, selecione um arquivo PDF válido.');
      return;
    }

    setIsExtractingPdf(true);
    setShowExtractingModal(true);
    setExtractingError('');
    setExtractingSuccessMessage('');
    setExtractingProgressText('Lendo arquivo PDF de provas localmente...');

    try {
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      reader.readAsDataURL(pdfFile);
      const pdfBase64 = await base64Promise;

      let gabaritoPdfBase64 = '';
      if (gabaritoPdfFile) {
        setExtractingProgressText('Lendo arquivo do gabarito PDF localmente...');
        const gabaritoReader = new FileReader();
        const gabaritoBase64Promise = new Promise<string>((resolve, reject) => {
          gabaritoReader.onload = () => resolve(gabaritoReader.result as string);
          gabaritoReader.onerror = error => reject(error);
        });
        gabaritoReader.readAsDataURL(gabaritoPdfFile);
        gabaritoPdfBase64 = await gabaritoBase64Promise;
      }

      setExtractingProgressText('Enviando para Inteligência Artificial (Gemini-3.5-Flash)...');

      const res = await fetch('/api/admin/import-pdf-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pdfBase64,
          gabaritoText: gabaritoText.trim(),
          gabaritoPdfBase64,
          adminToken: token
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao processar PDF.');
      }

      const data = await res.json();
      if (data.success) {
        setExtractingProgressText('Ajustando formato das questões...');
        
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        
        if (data.questions && Array.isArray(data.questions)) {
          const parsedQuestions = data.questions.map((q: any, idx: number) => ({
            number: q.number || idx + 1,
            text: q.text || '',
            context: q.context || '',
            options: {
              A: q.options?.A || '',
              B: q.options?.B || '',
              C: q.options?.C || '',
              D: q.options?.D || '',
              E: q.options?.E || ''
            },
            correctAnswer: q.correctAnswer || 'A',
            skill: q.skill || 'C2'
          }));
          setQuestions(parsedQuestions);
          setExtractingSuccessMessage(`Sucesso! ${parsedQuestions.length} questões foram importadas e formatadas do PDF com o gabarito. Revise e salve o simulado abaixo.`);
          // Clear file selection after success
          setPdfFile(null);
          setGabaritoPdfFile(null);
          setGabaritoText('');
        } else {
          throw new Error('Nenhuma questão válida foi encontrada no PDF.');
        }
      } else {
        throw new Error(data.error || 'A IA não conseguiu estruturar as questões.');
      }
    } catch (err: any) {
      console.error(err);
      setExtractingError(err.message || 'Erro inesperado durante a importação.');
    } finally {
      setIsExtractingPdf(false);
    }
  };

  // Copy to clipboard helper
  const copyEmails = () => {
    const list = newsletters.map(n => n.email).join(', ');
    navigator.clipboard.writeText(list);
    alert('Lista de e-mails copiada com sucesso para a área de transferência!');
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_rgba(15,23,42,1)] p-8">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={onBack} className="px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-slate-800 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar
          </button>
          <span className="text-xs font-black uppercase text-slate-500">Voltar para o portal</span>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 text-slate-950 border-2 border-slate-900 shadow-[2px_2px_0px_black] mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-950">Acesso Administrativo</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">Insira suas credenciais para gerenciar a plataforma Simulados Brasil.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-900 text-xs rounded-xl mb-4 border-2 border-red-900 font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">Usuário</label>
            <input
              type="text"
              required
              placeholder="Ex: Cristiano ou admin"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 focus:outline-hidden focus:bg-indigo-50 text-xs font-bold transition-all shadow-[2px_2px_0px_rgba(15,23,42,1)]"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">Senha</label>
              {(username.trim().toLowerCase() === 'cristiano' || username.trim() === 'Cristiano') && (
                <span className="text-[10px] text-indigo-600 font-extrabold animate-pulse">
                  Dica: 4 números
                </span>
              )}
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 focus:outline-hidden focus:bg-indigo-50 text-xs font-bold transition-all shadow-[2px_2px_0px_rgba(15,23,42,1)]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white border-2 border-slate-900 rounded-xl font-black uppercase tracking-wider shadow-[4px_4px_0px_rgba(15,23,42,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer text-xs flex items-center justify-center gap-2"
          >
            Entrar no Painel
          </button>
        </form>


      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-8">
      {/* Header Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-950 text-white p-6 sm:p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_rgba(15,23,42,1)]">
        <div>
          <span className="text-[10px] bg-slate-900 text-emerald-400 font-black border border-emerald-400 px-3 py-1 rounded-full uppercase tracking-wider">Painel Administrativo</span>
          <h2 className="text-2xl font-black mt-2 leading-none">Simulados Brasil - Gestão</h2>
          <p className="text-slate-400 text-xs font-semibold mt-1">Adicione cadernos de prova, baixe cadastros de newsletter e monitore resultados de alunos.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onBack}
            className="px-4 py-2.5 bg-white text-slate-950 hover:bg-slate-50 text-xs font-black uppercase tracking-wider rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(255,255,255,0.4)] transition-all cursor-pointer"
          >
            Portal Inicial
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wider rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(255,255,255,0.4)] transition-all cursor-pointer"
          >
            Sair do Painel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-4 border-slate-200 overflow-x-auto gap-2 pb-0">
        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-2 px-5 py-3 border-b-4 text-xs uppercase tracking-wider font-black transition-all cursor-pointer ${
            activeTab === 'exams'
              ? 'border-slate-900 text-slate-950 bg-slate-100 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          Novo Caderno de Provas
        </button>
        <button
          onClick={() => setActiveTab('newsletter')}
          className={`flex items-center gap-2 px-5 py-3 border-b-4 text-xs uppercase tracking-wider font-black transition-all cursor-pointer ${
            activeTab === 'newsletter'
              ? 'border-slate-900 text-slate-950 bg-slate-100 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Newsletter Inscritos ({newsletters.length})
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-2 px-5 py-3 border-b-4 text-xs uppercase tracking-wider font-black transition-all cursor-pointer ${
            activeTab === 'submissions'
              ? 'border-slate-900 text-slate-950 bg-slate-100 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Simulados Enviados ({submissions.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('password');
            setPasswordSuccess('');
            setPasswordError('');
            setNewPassword('');
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-4 text-xs uppercase tracking-wider font-black transition-all cursor-pointer ${
            activeTab === 'password'
              ? 'border-slate-900 text-slate-950 bg-slate-100 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          Alterar Senha
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_rgba(15,23,42,1)] p-6 sm:p-10">
        
        {/* NEW EXAM FORM */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Cadastrar Nova Prova</h3>
              <p className="text-xs text-slate-600 font-semibold mt-1">Insira um novo caderno de provas completo. Ele será integrado ao sistema instantaneamente e o portal gerará as páginas automaticamente.</p>
            </div>

            {successMessage && (
              <div className="p-4 bg-emerald-100 text-emerald-950 text-xs rounded-xl border-2 border-emerald-900 font-black flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                {successMessage}
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-100 text-red-950 text-xs rounded-xl border-2 border-red-900 font-black">
                {error}
              </div>
            )}

             {/* PDF IMPORT BOX */}
             <div className="p-6 bg-slate-50 border-4 border-dashed border-slate-300 rounded-[2rem] space-y-5 shadow-[4px_4px_0px_rgba(15,23,42,1)] hover:border-slate-900 transition-all">
               <div className="flex items-start gap-4">
                 <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_black] shrink-0">
                   <Sparkles className="w-6 h-6 animate-pulse" />
                 </div>
                 <div>
                   <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight flex items-center gap-1.5">
                     Importação Inteligente por PDF (Recomendado)
                   </h4>
                   <p className="text-[11px] text-slate-600 font-bold mt-1">
                     Insira o PDF completo do caderno de provas e o gabarito oficial (em PDF ou em formato de texto) para preencher as questões automaticamente usando Inteligência Artificial.
                   </p>
                 </div>
               </div>

               <form onSubmit={handleImportPdf} className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                 <div className="space-y-2">
                   <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                     1. Caderno de Provas (PDF)
                   </label>
                   <div className="relative border-2 border-slate-900 rounded-xl p-4 bg-white flex flex-col items-center justify-center hover:bg-indigo-50/30 transition-all cursor-pointer group h-[120px]">
                     <input
                       type="file"
                       accept=".pdf"
                       required
                       onChange={e => {
                         const file = e.target.files?.[0] || null;
                         setPdfFile(file);
                       }}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                     />
                     <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all mb-2" />
                     <span className="text-[11px] font-black text-slate-800 text-center truncate max-w-[150px]">
                       {pdfFile ? pdfFile.name : "Escolher PDF da Prova"}
                     </span>
                     <span className="text-[9px] text-slate-400 font-semibold mt-1">
                       {pdfFile ? `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB` : "Até 30MB"}
                     </span>
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                     2. Gabarito em PDF (Opcional)
                   </label>
                   <div className="relative border-2 border-slate-900 rounded-xl p-4 bg-white flex flex-col items-center justify-center hover:bg-indigo-50/30 transition-all cursor-pointer group h-[120px]">
                     <input
                       type="file"
                       accept=".pdf"
                       onChange={e => {
                         const file = e.target.files?.[0] || null;
                         setGabaritoPdfFile(file);
                       }}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                     />
                     <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all mb-2" />
                     <span className="text-[11px] font-black text-slate-800 text-center truncate max-w-[150px]">
                       {gabaritoPdfFile ? gabaritoPdfFile.name : "Escolher PDF do Gabarito"}
                     </span>
                     <span className="text-[9px] text-slate-400 font-semibold mt-1">
                       {gabaritoPdfFile ? `${(gabaritoPdfFile.size / (1024 * 1024)).toFixed(2)} MB` : "Gabarito Oficial se houver"}
                     </span>
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                     3. Gabarito em Texto (Alternativa)
                   </label>
                   <textarea
                     rows={4}
                     placeholder="Cole o gabarito (Ex: 1-A, 2-C, 3-D...) caso não tenha o PDF do gabarito ao lado. Se preferir, deixe em branco para a IA resolver sozinha!"
                     value={gabaritoText}
                     onChange={e => setGabaritoText(e.target.value)}
                     className="w-full px-4 py-2 bg-white border-2 border-slate-900 rounded-xl text-slate-900 focus:outline-hidden focus:bg-indigo-50 text-[10px] font-bold transition-all shadow-[2px_2px_0px_rgba(15,23,42,1)] resize-none placeholder-slate-400 h-[120px] leading-relaxed"
                   />
                 </div>

                 <div className="md:col-span-3 pt-2 flex justify-end">
                   <button
                     type="submit"
                     disabled={isExtractingPdf}
                     className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-wider border-2 border-slate-900 rounded-xl text-xs transition-all cursor-pointer shadow-[3px_3px_0px_rgba(15,23,42,1)] active:translate-x-[1px] active:translate-y-[1px] disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                   >
                     <Sparkles className="w-4 h-4 animate-bounce" />
                     Processar PDF com Inteligência Artificial
                   </button>
                 </div>
               </form>
             </div>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t-2 border-slate-200"></div>
              <span className="flex-shrink mx-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">OU CADASTRE MANUALMENTE</span>
              <div className="flex-grow border-t-2 border-slate-200"></div>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">Título do Simulado</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ENEM 2026 - Caderno de Ciências Humanas"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 focus:outline-hidden focus:bg-indigo-50 text-xs font-bold transition-all shadow-[2px_2px_0px_rgba(15,23,42,1)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">Categoria</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 focus:outline-hidden text-xs font-bold transition-all shadow-[2px_2px_0px_rgba(15,23,42,1)]"
                  >
                    <option value="ETEC">ETEC (Vestibulinho)</option>
                    <option value="ENEM">ENEM</option>
                    <option value="Concursos">Concursos Públicos</option>
                    <option value="Outros">Outros Vestibulares</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">Duração Estimada (Minutos)</label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 focus:outline-hidden focus:bg-indigo-50 text-xs font-bold transition-all shadow-[2px_2px_0px_rgba(15,23,42,1)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">Descrição Curta</label>
                  <input
                    type="text"
                    placeholder="Ex: Caderno completo de provas com foco em interpretação."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 focus:outline-hidden focus:bg-indigo-50 text-xs font-bold transition-all shadow-[2px_2px_0px_rgba(15,23,42,1)]"
                  />
                </div>
              </div>

              {/* Questions Array */}
              <div className="border-t-2 border-slate-200 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h4 className="font-black text-slate-950 uppercase tracking-wider text-sm">Perguntas do Caderno ({questions.length})</h4>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-black uppercase tracking-wider border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] cursor-pointer flex items-center gap-1 hover:translate-x-[-1px] hover:translate-y-[-1px]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Questão
                  </button>
                </div>

                <div className="space-y-6">
                  {questions.map((q, idx) => (
                    <div key={idx} className="p-5 sm:p-6 bg-slate-50 rounded-2xl border-2 border-slate-900 relative space-y-4 shadow-[4px_4px_0px_rgba(15,23,42,1)]">
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(idx)}
                          className="absolute top-4 right-4 text-red-500 hover:text-white p-1.5 rounded-lg border-2 border-transparent hover:border-red-500 hover:bg-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs border-2 border-slate-900 shadow-[1px_1px_0px_white]">
                          {idx + 1}
                        </span>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-[9px] font-black text-slate-500 uppercase">Habilidade / Critério (Ex: C1, C2)</label>
                            <input
                              type="text"
                              placeholder="Ex: C1, C2, História..."
                              value={q.skill || ''}
                              onChange={e => updateQuestionText(idx, 'skill', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border-2 border-slate-900 rounded-lg text-xs font-bold text-slate-900"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[9px] font-black text-slate-500 uppercase">Gabarito Correto</label>
                            <select
                              value={q.correctAnswer}
                              onChange={e => updateQuestionCorrect(idx, e.target.value as any)}
                              className="w-full px-3 py-1.5 bg-white border-2 border-slate-900 rounded-lg text-xs font-bold text-slate-900"
                            >
                              <option value="A">Alternativa A</option>
                              <option value="B">Alternativa B</option>
                              <option value="C">Alternativa C</option>
                              <option value="D">Alternativa D</option>
                              <option value="E">Alternativa E</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-black text-slate-700">Texto de Contexto (Opcional)</label>
                        <textarea
                          placeholder="Texto auxiliar, charge, poesia ou explicação básica da questão..."
                          value={q.context || ''}
                          rows={2}
                          onChange={e => updateQuestionText(idx, 'context', e.target.value)}
                          className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-black text-slate-700">Pergunta / Enunciado</label>
                        <input
                          type="text"
                          required
                          placeholder="Enunciado da questão..."
                          value={q.text || ''}
                          onChange={e => updateQuestionText(idx, 'text', e.target.value)}
                          className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                        {(['A', 'B', 'C', 'D', 'E'] as const).map(opt => (
                          <div key={opt} className="space-y-1">
                            <label className="block text-[9px] font-black text-slate-500 uppercase">Opção {opt}</label>
                            <input
                              type="text"
                              required
                              placeholder={`Texto da opção ${opt}...`}
                              value={q.options?.[opt] || ''}
                              onChange={e => updateQuestionOption(idx, opt, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border-2 border-slate-900 rounded-lg text-xs font-semibold text-slate-900"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4 border-t-2 border-slate-200 pt-6">
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="px-5 py-3 border-2 border-slate-900 text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 cursor-pointer shadow-[3px_3px_0px_rgba(15,23,42,1)]"
                  >
                    + Adicionar Mais Uma Questão
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-emerald-400 hover:bg-emerald-500 text-slate-950 border-2 border-slate-900 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-[3px_3px_0px_rgba(15,23,42,1)] flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Salvar Caderno de Provas
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* NEWSLETTERS LIST */}
        {activeTab === 'newsletter' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Inscritos na Newsletter</h3>
                <p className="text-xs text-slate-600 font-semibold mt-1">Usuários que se cadastraram e consentiram com o envio de informativos de estudo e privacidade.</p>
              </div>
              {newsletters.length > 0 && (
                <button
                  onClick={copyEmails}
                  className="px-4 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-slate-900 text-xs font-black uppercase tracking-wider border-2 border-slate-900 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-[3px_3px_0px_rgba(15,23,42,1)]"
                >
                  <Clipboard className="w-4 h-4" /> Copiar todos os E-mails
                </button>
              )}
            </div>

            {newsletters.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-3" />
                <p className="font-bold text-xs uppercase tracking-wider">Nenhuma inscrição de newsletter encontrada até o momento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border-2 border-slate-900 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-950 bg-amber-50 uppercase tracking-wider text-[10px] font-black">
                      <th className="py-3 px-4">Nome</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">Consentimento</th>
                      <th className="py-3 px-4">Data do Cadastro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-800 font-semibold">
                    {newsletters.map((n, i) => (
                      <tr key={n.id || i} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-black text-slate-950">{n.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-600 font-bold">{n.email}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 border border-emerald-900 text-emerald-950 px-2.5 py-0.5 rounded-full font-black">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" /> Ativo (Aceito)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[10px] font-mono">
                          {new Date(n.date).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SUBMISSIONS LIST */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Resultados dos Candidatos</h3>
              <p className="text-xs text-slate-600 font-semibold mt-1">Lista de alunos que realizaram os simulados e receberam laudos de inteligência artificial.</p>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Award className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-3" />
                <p className="font-bold text-xs uppercase tracking-wider">Nenhum simulado enviado até o momento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border-2 border-slate-900 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-950 bg-amber-50 uppercase tracking-wider text-[10px] font-black">
                      <th className="py-3 px-4">Candidato</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">Nota / Desempenho</th>
                      <th className="py-3 px-4">Data de Envio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-800 font-semibold">
                    {submissions.map((sub, i) => (
                      <tr key={sub.id || i} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-black text-slate-950">{sub.userName}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 font-bold">{sub.userEmail}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900">{sub.score} / {sub.totalQuestions} acertos</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
                              sub.percentage >= 50 ? 'bg-emerald-100 border-emerald-900 text-emerald-950' : 'bg-pink-100 border-pink-900 text-pink-950'
                            }`}>
                              {sub.percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[10px] font-mono">
                          {new Date(sub.submittedAt).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PASSWORD CHANGE VIEW */}
        {activeTab === 'password' && (
          <div className="space-y-6 max-w-md">
            <div>
              <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Alterar Senha do Painel</h3>
              <p className="text-xs text-slate-650 font-semibold mt-1">Configure uma nova senha de acesso para a área administrativa de Simulados Brasil.</p>
            </div>

            {passwordSuccess && (
              <div className="p-4 bg-emerald-100 text-emerald-950 text-xs rounded-xl border-2 border-emerald-900 font-black flex items-center gap-2 animate-bounce">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                {passwordSuccess}
              </div>
            )}

            {passwordError && (
              <div className="p-4 bg-red-100 text-red-950 text-xs rounded-xl border-2 border-red-900 font-black flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 font-black shrink-0" />
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">Nova Senha Administrativa</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo de 4 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 focus:outline-hidden focus:bg-indigo-50 text-xs font-bold transition-all shadow-[2px_2px_0px_rgba(15,23,42,1)]"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white border-2 border-slate-900 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-[3px_3px_0px_rgba(15,23,42,1)] active:translate-x-[1px] active:translate-y-[1px]"
              >
                Salvar Nova Senha
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Custom Confirmation & Submission Loader Modal for Exam Creation */}
      {showConfirmExamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] border-4 border-slate-900 max-w-lg w-full overflow-hidden shadow-[8px_8px_0px_rgba(15,23,42,1)] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b-2 border-slate-900 flex items-center justify-between bg-indigo-50">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600 animate-bounce" />
                <span className="font-black text-slate-900 text-sm uppercase tracking-wider">Confirmar Caderno de Prova</span>
              </div>
              {!isSubmittingExam && (
                <button 
                  onClick={() => setShowConfirmExamModal(false)}
                  className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-slate-500 hover:text-slate-900 cursor-pointer bg-white shadow-[1px_1px_0px_black]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {isSubmittingExam ? (
                <div className="text-center py-8 space-y-4">
                  <div className="inline-flex items-center justify-center p-4 bg-indigo-100 text-slate-900 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] animate-spin">
                    <RefreshCw className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 animate-pulse">Enviando Caderno e Gabarito...</h3>
                  <p className="text-slate-650 font-bold text-xs max-w-sm mx-auto leading-relaxed">
                    Estamos registrando o novo caderno de provas completo e gerando as páginas automaticamente na plataforma. Por favor, aguarde alguns segundos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-650 font-bold leading-relaxed">
                    Confira as informações do simulado antes de enviá-lo e disponibilizá-lo para os candidatos:
                  </p>

                  {/* Summary Details */}
                  <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-900 space-y-3 shadow-[3px_3px_0px_rgba(15,23,42,1)]">
                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Título do Simulado</span>
                      <strong className="text-slate-950 text-sm font-black">{title}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1.5">
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Categoria</span>
                        <strong className="text-indigo-600 text-xs font-black">{category}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Duração</span>
                        <strong className="text-slate-900 text-xs font-black">{durationMinutes} minutos</strong>
                      </div>
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] text-center">
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Questões Cadastradas</span>
                      <div className="text-2xl font-black text-emerald-950 mt-1">
                        {questions.length} questões
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-2xl border-2 border-indigo-500 text-indigo-950 text-xs font-semibold leading-relaxed flex gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Gabarito Pronto!</strong> O gabarito associado com {questions.length} respostas corretas será salvo para a correção inteligente.
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-bold leading-normal text-center">
                    Ao confirmar, o simulado estará disponível imediatamente na página inicial do portal.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!isSubmittingExam && (
              <div className="p-4 bg-slate-50 border-t-2 border-slate-900 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowConfirmExamModal(false)}
                  className="w-full sm:flex-1 py-3 border-2 border-slate-900 bg-white text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)]"
                >
                  Voltar e Editar
                </button>
                <button
                  onClick={executeCreateExam}
                  className="w-full sm:flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-wider border-2 border-slate-900 rounded-xl text-xs transition-all cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)] flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Enviar Caderno
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Custom PDF Extraction Loader & Success Modal */}
      {showExtractingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] border-4 border-slate-900 max-w-lg w-full overflow-hidden shadow-[8px_8px_0px_rgba(15,23,42,1)] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b-2 border-slate-900 flex items-center justify-between bg-indigo-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                <span className="font-black text-slate-900 text-sm uppercase tracking-wider">Importador IA - Simulados</span>
              </div>
              {!isExtractingPdf && (
                <button 
                  onClick={() => setShowExtractingModal(false)}
                  className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-slate-500 hover:text-slate-900 cursor-pointer bg-white shadow-[1px_1px_0px_black]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {isExtractingPdf ? (
                <div className="text-center py-8 space-y-4">
                  <div className="inline-flex items-center justify-center p-4 bg-indigo-100 text-slate-900 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] animate-spin">
                    <RefreshCw className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 animate-pulse">Extraindo Questões do PDF...</h3>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-950 text-xs font-bold font-mono">
                    {extractingProgressText}
                  </div>
                  <p className="text-slate-550 font-semibold text-xs max-w-sm mx-auto leading-relaxed">
                    Nossa inteligência artificial está analisando as páginas do PDF, identificando os enunciados, imagens de contexto, alternativas de A a E e mapeando com as respostas corretas. Isso pode levar até 30 segundos.
                  </p>
                </div>
              ) : extractingError ? (
                <div className="space-y-4 py-4 text-center">
                  <div className="inline-flex items-center justify-center p-4 bg-red-100 text-red-950 rounded-2xl border-2 border-red-900 shadow-[3px_3px_0px_rgba(15,23,42,1)]">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-black text-red-950">Falha na Extração</h3>
                  <p className="text-red-900 font-bold text-xs max-w-sm mx-auto leading-relaxed">
                    {extractingError}
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setShowExtractingModal(false)}
                      className="px-6 py-2 bg-slate-900 text-white font-black text-xs uppercase rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_black]"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-emerald-100 text-emerald-950 rounded-2xl border-2 border-emerald-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] mb-3 animate-bounce">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-black text-emerald-950">Extração Concluída!</h3>
                  </div>

                  <p className="text-xs text-slate-650 font-bold leading-relaxed text-center">
                    {extractingSuccessMessage}
                  </p>

                  {/* Summary Details */}
                  <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-900 space-y-3 shadow-[3px_3px_0px_rgba(15,23,42,1)] text-xs">
                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Título Sugerido</span>
                      <strong className="text-slate-950 font-black">{title}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1.5">
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Questões Extraídas</span>
                        <strong className="text-indigo-600 font-black">{questions.length} questões</strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Categoria</span>
                        <strong className="text-slate-900 font-black">{category}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-500 text-emerald-950 text-xs font-semibold leading-relaxed flex gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Tudo Pronto!</strong> O formulário abaixo foi preenchido. Você pode revisar questão por questão, editar textos se necessário e clicar em "Enviar Caderno" para salvar no portal.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!isExtractingPdf && !extractingError && (
              <div className="p-4 bg-slate-50 border-t-2 border-slate-900 flex justify-end">
                <button
                  onClick={() => setShowExtractingModal(false)}
                  className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-wider border-2 border-slate-900 rounded-xl text-xs transition-all cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)] text-center"
                >
                  Fechar e Revisar Questões no Editor
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
