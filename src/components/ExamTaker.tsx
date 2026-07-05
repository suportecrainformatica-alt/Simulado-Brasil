import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ArrowRight, CheckCircle2, Clock, 
  HelpCircle, AlertCircle, Sparkles, BookOpen, UserCheck, Shield,
  RefreshCw
} from 'lucide-react';
import { Exam, Question } from '../types';

interface ExamTakerProps {
  exam: Exam;
  onBack: () => void;
  onSubmitSuccess: (submissionId: string) => void;
}

export default function ExamTaker({ exam, onBack, onSubmitSuccess }: ExamTakerProps) {
  // Candidate Info State
  const [candidateName, setCandidateName] = useState('');
  const [candidateRegister, setCandidateRegister] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [newsletterConsent, setNewsletterConsent] = useState(true);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Exam Progress State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D' | 'E' | ''>>({});
  const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Start exam validation
  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!candidateName.trim()) {
      setError('Por favor, informe o seu nome para iniciar o simulado.');
      return;
    }
    if (!privacyConsent) {
      setError('Você precisa aceitar os Termos de Uso e Política de Privacidade.');
      return;
    }

    // Initialize blank answers
    const initialAnswers: Record<number, 'A' | 'B' | 'C' | 'D' | 'E' | ''> = {};
    exam.questions.forEach(q => {
      initialAnswers[q.number] = '';
    });
    setAnswers(initialAnswers);

    // Mock an enrollment ID if left blank
    if (!candidateRegister.trim()) {
      setCandidateRegister('INS-' + Math.floor(100000 + Math.random() * 900000));
    }

    setIsStarted(true);
  };

  // Timer countdown
  useEffect(() => {
    if (!isStarted || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isStarted, timeLeft]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Click an alternative
  const selectAnswer = (questionNumber: number, alternative: 'A' | 'B' | 'C' | 'D' | 'E') => {
    setAnswers(prev => ({
      ...prev,
      [questionNumber]: alternative
    }));
  };

  // Navigation
  const goNext = () => {
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Submit Answer Sheet to Backend (Trigger Confirmation Modal)
  const handleSubmitExam = () => {
    setShowConfirmModal(true);
  };

  // Actual execution of submission
  const executeSubmitExam = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      // Create valid, normalized email without accents or spaces
      const normalizedEmail = candidateName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "") + '@simuladosbrasil.com';

      // 1. Submit to server
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: exam.id,
          userName: candidateName,
          userEmail: normalizedEmail,
          answers
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Automatically save register details for newsletters as well if accepted
        await fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: candidateName,
            email: normalizedEmail,
            newsletterAccepted: newsletterConsent,
            agreedToPrivacyPolicy: privacyConsent
          })
        });

        setShowConfirmModal(false);
        onSubmitSuccess(data.submissionId);
      } else {
        setError(data.error || 'Ocorreu um erro ao processar seu gabarito.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setError('Erro de conexão ao enviar o gabarito. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  // Active question info
  const activeQuestion: Question = exam.questions[currentQuestionIndex];

  // Render Start Page
  if (!isStarted) {
    return (
      <div className="max-w-4xl mx-auto my-8 p-6">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border-2 border-slate-900 rounded-xl text-slate-800 hover:text-slate-950 text-xs font-black uppercase tracking-wider mb-6 transition-all cursor-pointer shadow-[3px_3px_0px_rgba(15,23,42,1)] inline-flex items-center gap-1.5 hover:translate-x-[-1px] hover:translate-y-[-1px]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para lista
        </button>

        {/* ETEC style Cover Frame */}
        <div className="bg-white rounded-[2rem] shadow-[8px_8px_0px_rgba(15,23,42,1)] overflow-hidden border-4 border-slate-900">
          
          {/* Cover Header logos */}
          <div className="bg-amber-100 p-6 border-b-4 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-slate-900 text-white font-black px-4 py-2.5 rounded-xl text-lg tracking-wider font-sans border-2 border-slate-900 shadow-[2px_2px_0px_rgba(255,255,255,1)]">
                ETEC
              </div>
              <div className="h-8 w-1 bg-slate-900 hidden sm:block"></div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider leading-tight text-center sm:text-left">
                Processo Seletivo <br />Vestibulinho 1º Sem/2025
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs bg-emerald-300 text-slate-950 font-black px-4 py-2 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)]">
                PROVA INTEGRADA OFICIAL
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-8">
            <div className="text-center space-y-3">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight leading-none">
                Caderno de Questões Interativo
              </h1>
              <p className="text-sm text-slate-600 font-medium max-w-lg mx-auto">
                Prepare-se de forma idêntica à aplicação real com correção instantânea e laudo de desempenho produzido por IA.
              </p>
            </div>

            {/* Candidate Setup Card */}
            <form onSubmit={handleStartExam} className="bg-indigo-50 rounded-[2rem] p-6 sm:p-8 border-4 border-slate-900 space-y-5 max-w-2xl mx-auto shadow-[6px_6px_0px_rgba(15,23,42,1)]">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" /> Identificação Obrigatória do Candidato
              </h3>
              
              {error && (
                <div className="p-3 bg-red-100 text-red-900 text-xs rounded-xl border-2 border-red-900 font-black flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">Nome Completo do Candidato</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Maria da Silva"
                  value={candidateName}
                  onChange={e => setCandidateName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 focus:outline-hidden focus:bg-indigo-50 text-xs font-bold transition-all shadow-[2px_2px_0px_rgba(15,23,42,1)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">Número de Inscrição (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: ETEC-2025-0041"
                  value={candidateRegister}
                  onChange={e => setCandidateRegister(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 focus:outline-hidden focus:bg-indigo-50 text-xs font-bold transition-all shadow-[2px_2px_0px_rgba(15,23,42,1)]"
                />
                <p className="text-[10px] text-slate-500 font-semibold mt-1">Se deixado em branco, geraremos uma inscrição fictícia oficial para o seu laudo.</p>
              </div>

              {/* Consent checkmarks */}
              <div className="space-y-3 pt-3 border-t border-slate-300">
                <label className="flex items-start gap-3 cursor-pointer text-[11px] text-slate-700 font-bold select-none">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={e => setPrivacyConsent(e.target.checked)}
                    className="mt-0.5 rounded-sm border-2 border-slate-950 text-slate-900 focus:ring-0 cursor-pointer w-4 h-4"
                  />
                  <span>
                    Aceito os <strong>Termos de Uso</strong> e as{' '}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-indigo-600 underline font-black hover:text-indigo-800 cursor-pointer"
                    >
                      Políticas de Privacidade
                    </button>{' '}
                    integradas de proteção aos meus dados cadastrais de acordo com a LGPD.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer text-[11px] text-slate-700 font-bold select-none">
                  <input
                    type="checkbox"
                    checked={newsletterConsent}
                    onChange={e => setNewsletterConsent(e.target.checked)}
                    className="mt-0.5 rounded-sm border-2 border-slate-950 text-slate-900 focus:ring-0 cursor-pointer w-4 h-4"
                  />
                  <span>
                    Desejo me cadastrar na <strong>Newsletter Simulados Brasil</strong> para receber materiais de estudo semanais, provas passadas de vestibulares e dicas de aprovação.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 mt-2 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_rgba(15,23,42,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" /> Iniciar Prova de Simulado
              </button>
            </form>

            {/* Instruction cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t-2 border-slate-200 pt-8">
              <div className="p-5 bg-yellow-50 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] text-center">
                <Clock className="w-6 h-6 text-slate-900 mx-auto mb-2" />
                <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">Duração de 4 Horas</h4>
                <p className="text-[10px] text-slate-600 font-semibold mt-1">Gerencie seu tempo real. O simulador conta com timer regressivo de 240 minutos.</p>
              </div>
              <div className="p-5 bg-pink-50 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] text-center">
                <HelpCircle className="w-6 h-6 text-slate-900 mx-auto mb-2" />
                <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">50 Questões Objetivas</h4>
                <p className="text-[10px] text-slate-600 font-semibold mt-1">Cada questão possui 5 alternativas (A, B, C, D, E). Apenas um acerto conta ponto.</p>
              </div>
              <div className="p-5 bg-blue-50 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] text-center">
                <Sparkles className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                <h4 className="font-black text-xs text-indigo-950 uppercase tracking-wider">Relatório de IA</h4>
                <p className="text-[10px] text-slate-600 font-semibold mt-1">Nossa inteligência artificial analisa as suas habilidades e fornece recomendações personalizadas.</p>
              </div>
            </div>

          </div>
        </div>

        {/* Modal display portal */}
        {showPrivacyModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[2rem] border-4 border-slate-900 max-w-xl w-full max-h-[80vh] overflow-hidden shadow-[8px_8px_0px_rgba(15,23,42,1)] flex flex-col">
              <div className="p-6 border-b-2 border-slate-900 flex items-center justify-between bg-indigo-50 font-black">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <span className="font-black text-slate-900 text-sm">Política de Privacidade Simulados Brasil</span>
                </div>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center text-slate-500 hover:text-slate-900 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-xs text-slate-700 space-y-4 font-semibold">
                <p><strong>1. Coleta:</strong> Coletamos nome e e-mail informados no ato do simulado para gerar seu laudo de correção inteligente e salvar seu progresso pedagógico.</p>
                <p><strong>2. Uso do e-mail:</strong> Usamos seu e-mail para comunicação direta sobre simulados. Caso tenha aceito a newsletter, enviaremos dicas de estudo semanais e novas provas liberadas na plataforma Simulados Brasil.</p>
                <p><strong>3. Armazenamento Seguro:</strong> Os seus dados são mantidos em sigilo e não serão compartilhados com terceiros sob qualquer hipótese, em total conformidade com a LGPD.</p>
                <p><strong>4. Cancelamento:</strong> Você pode revogar o consentimento e pedir a exclusão total do cadastro de newsletter a qualquer momento enviando um aviso ao nosso portal.</p>
              </div>
              <div className="p-4 bg-slate-50 border-t-2 border-slate-900 flex justify-end">
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider border-2 border-slate-900 shadow-[2px_2px_0px_white] cursor-pointer"
                >
                  Concordo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render exam taking interface
  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-8">
      {/* Exam Header bar */}
      <div className="bg-white rounded-[2rem] border-4 border-slate-900 p-6 shadow-[6px_6px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg border-2 border-slate-900 shadow-[2px_2px_0px_rgba(255,255,255,1)]">
            E
          </div>
          <div>
            <h2 className="font-black text-slate-950 leading-tight text-base">{exam.title}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 font-bold">
              <span>Candidato: <strong className="text-slate-900">{candidateName}</strong></span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300 text-[10px]">{candidateRegister}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-amber-100 text-slate-950 font-mono font-black px-4 py-2 rounded-xl text-sm border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)]">
            <Clock className="w-4 h-4 text-slate-900 animate-pulse" />
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={handleSubmitExam}
            className="px-5 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] cursor-pointer active:translate-x-[2px] active:translate-y-[2px]"
          >
            Enviar Gabarito
          </button>
        </div>
      </div>

      {/* Main split dashboard panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANEL: ACTIVE QUESTION */}
        <div className="lg:col-span-8 bg-white rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col min-h-[500px]">
          
          {/* Context box if available */}
          {activeQuestion.context && (
            <div className="bg-yellow-50/70 p-6 border-b-4 border-slate-900 text-xs sm:text-sm text-slate-700 leading-relaxed max-h-60 overflow-y-auto font-sans italic">
              <div className="flex items-center gap-1.5 text-slate-900 font-black mb-2 not-italic text-xs uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-slate-800" /> Texto de Apoio / Contexto
              </div>
              <p className="whitespace-pre-line">{activeQuestion.context}</p>
            </div>
          )}

          {/* Question text */}
          <div className="p-6 sm:p-8 flex-1 space-y-6">
            <div className="flex items-start gap-4">
              <span className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5 border-2 border-slate-950 shadow-[2px_2px_0px_rgba(255,255,255,1)]">
                {activeQuestion.number.toString().padStart(2, '0')}
              </span>
              <div className="space-y-1.5">
                {activeQuestion.skill && (
                  <span className="inline-flex text-[10px] bg-slate-100 text-slate-800 border border-slate-300 font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                    Critério de Desempate: {activeQuestion.skill}
                  </span>
                )}
                <h3 className="font-black text-slate-950 text-base sm:text-lg leading-snug">
                  {activeQuestion.text}
                </h3>
              </div>
            </div>

            {/* Alternatives (A to E) */}
            <div className="space-y-3">
              {(['A', 'B', 'C', 'D', 'E'] as const).map(alternative => {
                const isSelected = answers[activeQuestion.number] === alternative;
                return (
                  <button
                    key={alternative}
                    onClick={() => selectAnswer(activeQuestion.number, alternative)}
                    className={`w-full text-left p-4 rounded-xl border-2 border-slate-900 text-sm font-bold transition-all flex gap-3 cursor-pointer items-start shadow-[2px_2px_0px_rgba(15,23,42,1)] ${
                      isSelected
                        ? 'bg-slate-900 border-slate-950 text-white shadow-[4px_4px_0px_rgba(15,23,42,1)] scale-[1.002]'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border-2 border-slate-900 ${
                      isSelected ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {alternative}
                    </span>
                    <span className="leading-relaxed mt-0.5 font-semibold">{activeQuestion.options[alternative]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom simple navigation controls */}
          <div className="p-4 bg-slate-50 border-t-2 border-slate-900 flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2.5 border-2 border-slate-900 bg-white text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Anterior
            </button>

            <span className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono">
              Questão {currentQuestionIndex + 1} de {exam.questions.length}
            </span>

            <button
              onClick={goNext}
              disabled={currentQuestionIndex === exam.questions.length - 1}
              className="px-4 py-2.5 border-2 border-slate-900 bg-white text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: DIGITAL FOLHA DE RESPOSTAS */}
        <div className="lg:col-span-4 bg-white rounded-[2rem] border-4 border-slate-900 p-6 shadow-[6px_6px_0px_rgba(15,23,42,1)] space-y-6">
          <div className="border-b-2 border-slate-200 pb-4">
            <h3 className="font-black text-slate-950 text-sm">Folha de Respostas</h3>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-black">
              Preenchimento Automático Conforme Cliques
            </p>
          </div>

          {/* Grid of answer sheets */}
          <div className="grid grid-cols-5 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {exam.questions.map((q, idx) => {
              const currentChoice = answers[q.number];
              const isCurrentActive = idx === currentQuestionIndex;
              const isAnswered = currentChoice !== '';
              
              return (
                <button
                  key={q.number}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`py-2 rounded-xl border-2 border-slate-900 text-center transition-all cursor-pointer text-xs flex flex-col items-center justify-center gap-0.5 relative shadow-[2px_2px_0px_rgba(15,23,42,1)] ${
                    isCurrentActive
                      ? 'ring-4 ring-indigo-500 bg-slate-50'
                      : ''
                  } ${
                    isAnswered
                      ? 'bg-slate-900 border-slate-900 text-white font-black'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  <span className={`text-[9px] font-bold ${isAnswered ? 'text-slate-300' : 'text-slate-400'}`}>
                    Q{q.number.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[12px] uppercase font-black">
                    {currentChoice || '-'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-slate-900 space-y-2">
            <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1 uppercase tracking-wider">
              <UserCheck className="w-4 h-4 text-emerald-700" /> Instruções Rápidas
            </h4>
            <ul className="text-[10px] text-emerald-800 font-bold space-y-1 pl-1 list-disc leading-tight">
              <li>Clique no número acima para pular diretamente para a questão.</li>
              <li>A sela preenchida indica que a questão já está salva no gabarito.</li>
              <li>Sua nota final é gerada instantaneamente ao finalizar a prova.</li>
            </ul>
          </div>

          <button
            onClick={handleSubmitExam}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-wider border-2 border-slate-900 rounded-xl text-xs transition-colors cursor-pointer shadow-[3px_3px_0px_rgba(15,23,42,1)] flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="w-4 h-4" /> Concluir e Enviar Simulado
          </button>
        </div>

      </div>

      {/* Custom Confirmation & Submission Loader Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] border-4 border-slate-900 max-w-lg w-full overflow-hidden shadow-[8px_8px_0px_rgba(15,23,42,1)] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b-2 border-slate-900 flex items-center justify-between bg-indigo-50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 animate-bounce" />
                <span className="font-black text-slate-900 text-sm uppercase tracking-wider">Finalizar Simulado</span>
              </div>
              {!isSubmitting && (
                <button 
                  onClick={() => {
                    setShowConfirmModal(false);
                    setError('');
                  }}
                  className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-slate-500 hover:text-slate-900 cursor-pointer bg-white shadow-[1px_1px_0px_black]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {isSubmitting ? (
                <div className="text-center py-8 space-y-4">
                  <div className="inline-flex items-center justify-center p-4 bg-indigo-100 text-slate-900 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] animate-spin">
                    <RefreshCw className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 animate-pulse">Enviando Folha de Respostas...</h3>
                  <p className="text-slate-600 font-bold text-xs max-w-sm mx-auto leading-relaxed">
                    Estamos processando seu gabarito e gerando a correção automática com nosso laudo inteligente por IA. Por favor, aguarde alguns segundos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-bold leading-relaxed">
                    Olá, <strong className="text-slate-900">{candidateName}</strong>! Antes de enviar sua folha de respostas definitiva para a nossa inteligência artificial corrigir, confira o resumo do seu preenchimento:
                  </p>

                  {/* Summary grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] text-center">
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Questões Respondidas</span>
                      <div className="text-2xl font-black text-emerald-950 mt-1">
                        {Object.values(answers).filter(val => val !== '').length}
                      </div>
                    </div>

                    <div className="p-4 bg-pink-50 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] text-center">
                      <span className="text-[10px] font-black text-pink-800 uppercase tracking-wider">Questões em Branco</span>
                      <div className="text-2xl font-black text-pink-950 mt-1">
                        {Object.values(answers).filter(val => val === '').length}
                      </div>
                    </div>
                  </div>

                  {/* Alerts */}
                  {Object.values(answers).filter(val => val === '').length > 0 ? (
                    <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-500 text-amber-950 text-xs font-semibold leading-relaxed flex gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Atenção!</strong> Você possui <strong className="font-black underline">{Object.values(answers).filter(val => val === '').length}</strong> questão(ões) em branco. Questões não preenchidas serão consideradas como incorretas na correção definitiva.
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-500 text-emerald-950 text-xs font-semibold leading-relaxed flex gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Excelente!</strong> Todas as <strong className="font-black">{exam.questions.length}</strong> questões foram preenchidas no gabarito! Pronto para enviar para correção inteligente.
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-red-100 text-red-950 text-xs rounded-xl border-2 border-red-900 font-black flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                      {error}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 font-bold leading-normal text-center">
                    Ao confirmar, suas respostas serão corrigidas em tempo real e você receberá seu laudo imediatamente.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!isSubmitting && (
              <div className="p-4 bg-slate-50 border-t-2 border-slate-900 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setError('');
                  }}
                  className="w-full sm:flex-1 py-3 border-2 border-slate-900 bg-white text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)]"
                >
                  Voltar e Revisar
                </button>
                <button
                  onClick={executeSubmitExam}
                  className="w-full sm:flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-wider border-2 border-slate-900 rounded-xl text-xs transition-all cursor-pointer shadow-[2px_2px_0px_rgba(15,23,42,1)] flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Enviar para Correção
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
