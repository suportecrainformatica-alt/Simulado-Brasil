import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Sparkles, Shield, Mail, Award, Lock, ArrowRight, CheckCircle2, 
  HelpCircle, ChevronRight, CheckCircle, ShieldAlert, BookOpenCheck, Globe,
  MessageSquare, UserCheck, TrendingUp, Laptop, ExternalLink, RefreshCw
} from 'lucide-react';
import ExamTaker from './components/ExamTaker';
import SubmissionDetail from './components/SubmissionDetail';
import AdminPanel from './components/AdminPanel';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import { Exam } from './types';
import { apiClient } from './lib/apiClient';

export default function App() {
  // Navigation: 'portal' | 'exam' | 'result' | 'admin'
  const [currentView, setCurrentView] = useState<'portal' | 'exam' | 'result' | 'admin'>('portal');
  
  // Selection states
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  
  // Quick Newsletter box state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterName, setNewsletterName] = useState('');
  const [newsletterPolicyAccepted, setNewsletterPolicyAccepted] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState('');
  const [newsletterError, setNewsletterError] = useState('');
  
  // Category Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  
  // Global Privacy modal state
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Fetch Exams from full-stack Node server or localStorage fallback
  const fetchExams = async () => {
    try {
      const data = await apiClient.getExams();
      setExams(data);
    } catch (err) {
      console.error('Error fetching exams:', err);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [currentView]);

  // Load complete exam text to start taking
  const handleStartExamFlow = async (examId: string) => {
    try {
      const data = await apiClient.getExam(examId);
      setSelectedExam(data);
      setCurrentView('exam');
    } catch (err) {
      alert('Não foi possível carregar o caderno de provas no momento.');
    }
  };

  // Submit success handler
  const handleExamSubmissionSuccess = (submissionId: string) => {
    setSelectedSubmissionId(submissionId);
    setCurrentView('result');
  };

  // Quick home newsletter subscribe handler
  const handleHomeNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterSuccess('');
    setNewsletterError('');

    if (!newsletterName.trim() || !newsletterEmail.trim()) {
      setNewsletterError('Por favor, informe seu nome e e-mail.');
      return;
    }
    if (!newsletterPolicyAccepted) {
      setNewsletterError('Você deve ler e aceitar a Política de Privacidade.');
      return;
    }

    try {
      const data = await apiClient.registerUser({
        name: newsletterName,
        email: newsletterEmail,
        newsletterAccepted: true,
        agreedToPrivacyPolicy: true
      });

      if (data.success) {
        setNewsletterSuccess('Inscrição confirmada com sucesso! Bem-vindo à nossa comunidade.');
        setNewsletterName('');
        setNewsletterEmail('');
        setNewsletterPolicyAccepted(false);
      } else {
        setNewsletterError(data.error || 'Erro ao processar sua inscrição.');
      }
    } catch (err) {
      setNewsletterError('Erro de conexão ao enviar dados.');
    }
  };

  // Group count categories dynamically
  const categoriesCounts = exams.reduce((acc: Record<string, number>, curr: any) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {});

  const filteredExams = selectedCategory === 'TODOS' 
    ? exams 
    : exams.filter((e: any) => e.category === selectedCategory);

  // Calculate some fun mockup study stats or grab if we have submissions
  const mockSubmissionsCount = 1420; // total submissions simulated
  const mockAverageScore = 8.4;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      
      {/* Neobrutalist Header Navbar */}
      <header className="bg-white border-b-4 border-slate-900 sticky top-0 z-40 shadow-[0_4px_0_0_rgba(15,23,42,1)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* Logo brand */}
          <button 
            onClick={() => setCurrentView('portal')} 
            className="flex items-center gap-3 text-left cursor-pointer group"
            id="nav-logo-btn"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(255,255,255,1)] group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-[1px_1px_0px_rgba(255,255,255,1)] transition-all">
              SB
            </div>
            <div>
              <h1 className="font-black text-slate-950 text-lg leading-none tracking-tight">Simulados Brasil</h1>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-1">Acelere sua aprovação</p>
            </div>
          </button>

          {/* Nav navigation items */}
          <nav className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => setCurrentView('portal')}
              className={`text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                currentView === 'portal' 
                  ? 'text-slate-950 border-b-4 border-slate-900 pb-1' 
                  : 'text-slate-500 hover:text-slate-950'
              }`}
              id="nav-simulados-btn"
            >
              Simulados
            </button>
            <button
              onClick={() => setIsPrivacyOpen(true)}
              className="text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-950 cursor-pointer hidden sm:inline"
              id="nav-privacy-btn"
            >
              Privacidade
            </button>
            <button
              onClick={() => setCurrentView('admin')}
              className={`px-4 py-2 border-2 border-slate-900 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] ${
                currentView === 'admin' 
                  ? 'bg-slate-900 text-white shadow-none translate-x-[1px] translate-y-[1px]' 
                  : 'bg-white hover:bg-slate-50 text-slate-900'
              }`}
              id="nav-admin-btn"
            >
              <Lock className="w-3.5 h-3.5" /> Área Admin
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container state router */}
      <main className="flex-1">
        
        {/* VIEW: PORTAL (HOME) */}
        {currentView === 'portal' && (
          <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">
            
            {/* Dynamic Bento Grid Layout */}
            <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* BENTO CARD 1: Featured Simulado (Spans 2 columns & 2 rows on large screen) */}
              <div className="lg:col-span-2 lg:row-span-2 bg-white border-4 border-slate-900 rounded-[2rem] p-6 sm:p-8 flex flex-col justify-between shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]" id="bento-featured-card">
                {(() => {
                  const featuredExam = exams.find(e => e.id === 'etec-2025-1') || exams[0];
                  if (!featuredExam) {
                    return (
                      <div className="h-full flex flex-col justify-between space-y-6">
                        <div className="space-y-6">
                          <div className="flex items-center gap-2">
                            <span className="bg-amber-300 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> AGUARDANDO PROVAS
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            <h2 className="text-3xl font-black tracking-tight leading-none text-slate-950">
                              Nenhum caderno de provas disponível
                            </h2>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                              A estrutura foi limpa. Novas provas e gabaritos oficiais podem ser cadastrados ou importados via PDF diretamente na Área Administrativa do portal.
                            </p>
                          </div>
                        </div>

                        <div className="pt-8 border-t-2 border-dashed border-slate-200 mt-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
                          <div className="text-center sm:text-left">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">STATUS DO SISTEMA</p>
                            <p className="text-xs text-slate-700 font-extrabold mt-0.5">Pronto para novos envios</p>
                          </div>
                          <button
                            onClick={() => setCurrentView('admin')}
                            className="w-full sm:w-auto px-6 py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-sm rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-2 group"
                          >
                            Ir para Área Admin <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="h-full flex flex-col justify-between space-y-6">
                      <div className="space-y-6">
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-300 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> EM DESTAQUE OFICIAL
                          </span>
                          <span className="bg-purple-300 text-slate-950 text-[10px] font-black px-2.5 py-1.5 rounded-full uppercase tracking-wider border-2 border-slate-900">
                            {featuredExam.category}
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none text-slate-950">
                            {featuredExam.title}
                          </h2>
                          <p className="text-sm text-slate-600 font-medium leading-relaxed">
                            {featuredExam.description || "Prepare-se para o exame oficial utilizando o caderno de provas adaptado e clicável."}
                          </p>
                        </div>

                        <div className="p-4 bg-indigo-50 border-2 border-slate-900 rounded-2xl flex items-start gap-3">
                          <div className="p-2 bg-indigo-200 border border-slate-900 rounded-lg text-indigo-900 font-bold">
                            <BookOpenCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-xs">Exame 100% Clicável e Avaliado</h4>
                            <p className="text-[11px] text-slate-600 mt-0.5">Clique nas alternativas, responda de forma fluida no celular ou PC e confira o gabarito.</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-8 border-t-2 border-dashed border-slate-200 mt-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
                        <div className="text-center sm:text-left">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">REQUISITOS DO EXAME</p>
                          <p className="text-xs text-slate-700 font-extrabold mt-0.5">
                            {featuredExam.questions?.length || 0} questões objetivas | Limite livre
                          </p>
                        </div>
                        <button
                          onClick={() => handleStartExamFlow(featuredExam.id)}
                          className="w-full sm:w-auto px-6 py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-sm rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-2 group"
                          id="btn-start-featured"
                        >
                          Iniciar Simulado {featuredExam.category} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* BENTO CARD 2: Performance Stats (Spans 1 column) */}
              <div className="bg-yellow-100 border-4 border-slate-900 rounded-[2rem] p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between" id="bento-stats-card">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-800">Seu Progresso</span>
                    <TrendingUp className="w-5 h-5 text-slate-900" />
                  </div>
                  
                  <div className="mt-6 space-y-1">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Média Simulados</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-slate-950">{mockAverageScore}</span>
                      <span className="text-xs font-extrabold text-slate-600">/ 10</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-semibold mt-4 leading-relaxed">
                    Você está no caminho certo! Com base nos dados públicos de notas de corte da ETEC Paulista, sua nota atual é <strong className="text-indigo-600">+15% superior</strong> ao mínimo necessário para aprovação.
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-900/10 space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                    <span>Taxa de Acerto Esperada</span>
                    <span>84%</span>
                  </div>
                  <div className="h-3 w-full bg-white border-2 border-slate-900 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-indigo-500 border border-slate-950 rounded-full" style={{ width: '84%' }}></div>
                  </div>
                </div>
              </div>

              {/* BENTO CARD 3: Restricted Access / Admin Entry (Spans 1 column) */}
              <div className="bg-slate-900 border-4 border-slate-900 rounded-[2rem] p-6 text-white flex flex-col justify-between shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]" id="bento-admin-card">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border border-slate-700">
                      PAINEL SEGURO
                    </span>
                    <Lock className="w-4 h-4 text-slate-300" />
                  </div>
                  
                  <h3 className="text-xl font-black mt-4 leading-tight text-white">
                    Área Administrativa
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Acesso exclusivo para administradores autenticados enviarem novos cadernos de prova, inserirem gabaritos oficiais e monitorarem relatórios.
                  </p>
                </div>

                <button
                  onClick={() => setCurrentView('admin')}
                  className="w-full mt-6 py-3 bg-white hover:bg-slate-100 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl border-2 border-slate-950 shadow-[3px_3px_0px_rgba(255,255,255,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_rgba(255,255,255,1)] transition-all cursor-pointer text-center"
                  id="btn-admin-panel"
                >
                  Entrar como Admin
                </button>
              </div>

              {/* BENTO CARD 4: Filter Categories Quick-links (Spans 1 column) */}
              {/* BENTO CARD 4: Filter Categories Quick-links (Spans 2 columns) */}
              <div className="lg:col-span-2 bg-indigo-50 border-4 border-slate-900 rounded-[2rem] p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between" id="bento-categories-card">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-800 block mb-4">Filtrar Provas</span>
                  <p className="text-xs text-slate-600 leading-normal mb-4">
                    Navegue e selecione cadernos específicos por exame. A lista completa abaixo será filtrada instantaneamente.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setSelectedCategory('TODOS');
                        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`text-left px-3 py-2 rounded-xl border-2 font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                        selectedCategory === 'TODOS'
                          ? 'bg-slate-950 border-slate-950 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-950'
                      }`}
                    >
                      <span>Todos</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-1.5 py-0.5 rounded-md border border-slate-900">
                        {exams.length}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedCategory('ETEC');
                        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`text-left px-3 py-2 rounded-xl border-2 font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                        selectedCategory === 'ETEC'
                          ? 'bg-slate-950 border-slate-950 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-950'
                      }`}
                    >
                      <span>ETEC</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-1.5 py-0.5 rounded-md border border-slate-900">
                        {categoriesCounts['ETEC'] || 0}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedCategory('ENEM');
                        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`text-left px-3 py-2 rounded-xl border-2 font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                        selectedCategory === 'ENEM'
                          ? 'bg-slate-950 border-slate-950 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-950'
                      }`}
                    >
                      <span>ENEM</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-1.5 py-0.5 rounded-md border border-slate-900">
                        {categoriesCounts['ENEM'] || 0}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">CLIQUE PARA FILTRAR</span>
                </div>
              </div>

            </section>

            {/* BENTO GRID ROW 2: Newsletter section matching neobrutalism (Spans full content) */}
            <section className="bg-white border-4 border-slate-900 rounded-[2rem] p-6 sm:p-8 flex flex-col lg:flex-row justify-between items-center gap-8 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]" id="newsletter-bento">
              <div className="max-w-xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-500 text-white rounded-lg border border-slate-950">
                    <Mail className="w-4 h-4" />
                  </span>
                  <h3 className="font-black text-slate-950 text-xs uppercase tracking-widest">Newsletter Oficial</h3>
                </div>
                <h4 className="text-2xl font-black text-slate-950 leading-tight">Dicas gratuitas de estudo de Simulados</h4>
                <p className="text-xs text-slate-500 font-semibold leading-normal">
                  Fique atualizado sobre exames da ETEC, ENEM e Concursos com nossa curadoria periódica de materiais exclusivos, avisos de novas provas cadastradas e cronogramas.
                </p>
              </div>

              <div className="w-full lg:max-w-md bg-slate-50 p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-4">
                <form onSubmit={handleHomeNewsletterSubscribe} className="space-y-3">
                  {newsletterSuccess && (
                    <div className="p-3 bg-emerald-100 text-emerald-900 text-xs rounded-xl font-black border-2 border-emerald-900 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-800" />
                      {newsletterSuccess}
                    </div>
                  )}
                  {newsletterError && (
                    <div className="p-3 bg-red-100 text-red-900 text-xs rounded-xl font-black border-2 border-red-900">
                      {newsletterError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">Seu Primeiro Nome</label>
                      <input
                        type="text"
                        placeholder="Ex: João"
                        value={newsletterName}
                        onChange={e => setNewsletterName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:bg-indigo-50 font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">Seu E-mail Principal</label>
                      <input
                        type="email"
                        placeholder="Ex: joao@email.com"
                        value={newsletterEmail}
                        onChange={e => setNewsletterEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:bg-indigo-50 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 border-t border-slate-200">
                    <label className="flex items-start gap-2.5 cursor-pointer text-[10px] text-slate-600 font-bold select-none">
                      <input
                        type="checkbox"
                        checked={newsletterPolicyAccepted}
                        onChange={e => setNewsletterPolicyAccepted(e.target.checked)}
                        className="mt-0.5 rounded-sm border-2 border-slate-950 text-slate-900 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                      <span>
                        Aceito as{' '}
                        <button
                          type="button"
                          onClick={() => setIsPrivacyOpen(true)}
                          className="text-indigo-600 underline font-black hover:text-indigo-800 cursor-pointer"
                        >
                          Políticas de Privacidade
                        </button>{' '}
                        e dou livre consentimento de tratamento pedagógico de dados.
                      </span>
                    </label>
                    
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(99,102,241,1)] active:translate-x-[2px] active:translate-y-[2px]"
                    >
                      Cadastrar Gratuitamente
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* Catalog catalog filter & items list section */}
            <section id="catalog-section" className="space-y-8 pt-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-slate-900 pb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-indigo-600" /> Todos os Cadernos de Provas
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">Conforme novos cadernos de simulado são adicionados no painel, as páginas são criadas automaticamente.</p>
                </div>

                {/* Filter chips list inside Catalog */}
                <div className="flex flex-wrap gap-2 text-xs font-black">
                  {['TODOS', 'ETEC', 'ENEM', 'Concursos', 'Outros'].map((category) => {
                    const count = category === 'TODOS' 
                      ? exams.length 
                      : categoriesCounts[category] || 0;
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-4 py-2 rounded-xl border-2 transition-all cursor-pointer shadow-[3px_3px_0px_rgba(15,23,42,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_rgba(15,23,42,1)] ${
                          selectedCategory === category
                            ? 'bg-slate-900 border-slate-950 text-white shadow-none translate-x-[1px] translate-y-[1px]'
                            : 'bg-white border-slate-900 text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {category} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exams Cards list grid */}
              {filteredExams.length === 0 ? (
                <div className="text-center py-16 text-slate-500 bg-white border-4 border-slate-900 rounded-[2rem] shadow-[8px_8px_0px_rgba(15,23,42,1)]">
                  <BookOpenCheck className="w-16 h-16 mx-auto stroke-1 text-slate-400 mb-4" />
                  <p className="text-lg font-black text-slate-900">Nenhum caderno de provas cadastrado nesta categoria ainda.</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Acesse o painel administrativo usando a Área Admin para fazer o envio.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredExams.map((exam: any) => {
                    const isFeatured = exam.id === 'etec-2025-1';
                    
                    // Assign beautiful pastel backgrounds based on category
                    let cardBg = 'bg-white';
                    let bannerBg = 'bg-slate-100';
                    if (exam.category === 'ETEC') {
                      cardBg = 'bg-emerald-50';
                      bannerBg = 'bg-emerald-200/60';
                    } else if (exam.category === 'ENEM') {
                      cardBg = 'bg-pink-50';
                      bannerBg = 'bg-pink-200/60';
                    } else if (exam.category === 'Concursos') {
                      cardBg = 'bg-yellow-50';
                      bannerBg = 'bg-yellow-200/60';
                    } else if (exam.category === 'Outros') {
                      cardBg = 'bg-blue-50';
                      bannerBg = 'bg-blue-200/60';
                    }

                    return (
                      <div 
                        key={exam.id} 
                        className={`border-4 border-slate-900 rounded-[2rem] overflow-hidden flex flex-col justify-between transition-all group shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] hover:shadow-[10px_10px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] ${cardBg}`}
                      >
                        <div>
                          {/* Colored category banner */}
                          <div className={`p-4 border-b-2 border-slate-900 flex items-center justify-between font-black ${bannerBg}`}>
                            <span className="text-[10px] bg-slate-950 text-white font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                              {exam.category}
                            </span>
                            {isFeatured && (
                              <span className="text-[9px] bg-white text-emerald-800 font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider border border-slate-900">
                                Destaque Oficial
                              </span>
                            )}
                          </div>

                          <div className="p-6 space-y-3">
                            <h4 className="font-black text-slate-950 group-hover:text-indigo-600 transition-colors text-lg leading-snug">
                              {exam.title}
                            </h4>
                            <p className="text-xs text-slate-600 font-medium line-clamp-3 leading-relaxed">
                              {exam.description}
                            </p>
                          </div>
                        </div>

                        <div className="p-6 border-t-2 border-slate-900/10 flex items-center justify-between gap-4 bg-white/50">
                          <span className="text-[11px] text-slate-700 font-black font-mono">
                            {exam.questionCount || exam.questions?.length || 50} Questões | {exam.durationMinutes} min
                          </span>
                          <button
                            onClick={() => handleStartExamFlow(exam.id)}
                            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl border-2 border-slate-900 cursor-pointer transition-all flex items-center gap-1 shadow-[2px_2px_0px_rgba(255,255,255,1)]"
                          >
                            Treinar <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>
        )}
        
        {/* VIEW: ACTIVE EXAM */}
        {currentView === 'exam' && selectedExam && (
          <ExamTaker
            exam={selectedExam}
            onBack={() => setCurrentView('portal')}
            onSubmitSuccess={handleExamSubmissionSuccess}
          />
        )}

        {/* VIEW: RESULTS DISPLAY REPORT */}
        {currentView === 'result' && selectedSubmissionId && (
          <SubmissionDetail
            submissionId={selectedSubmissionId}
            onBackToPortal={() => setCurrentView('portal')}
          />
        )}

        {/* VIEW: ADMIN PANEL */}
        {currentView === 'admin' && (
          <AdminPanel
            onBack={() => setCurrentView('portal')}
          />
        )}

      </main>

      {/* Global integrated Privacy policy modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />



      {/* Neobrutalist Footer */}
      <footer className="bg-white border-t-4 border-slate-900 py-10 text-center text-xs text-slate-500 font-bold shadow-[0_-4px_0_0_rgba(15,23,42,1)]">
        <div className="max-w-7xl mx-auto px-6 space-y-4">
          <p className="font-black text-indigo-600 uppercase tracking-widest text-xs">Simulados Brasil © 2026</p>
          <p className="max-w-xl mx-auto text-xs text-slate-600 leading-relaxed font-semibold">
            Plataforma pedagógica interativa para preparação acadêmica baseada em exames oficiais de Vestibulinho ETEC, ENEM e Concursos Públicos do Brasil.
          </p>
          <div className="flex justify-center gap-4 text-slate-700 font-black uppercase tracking-wider text-[10px] pt-2">
            <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-indigo-600 cursor-pointer underline">Termos & Privacidade</button>
            <span>•</span>
            <button onClick={() => setCurrentView('admin')} className="hover:text-indigo-600 cursor-pointer underline">Administração</button>
          </div>
        </div>
      </footer>

    </div>
  );
}

