import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, RefreshCw, Award, BookOpen, Check, X, 
  ChevronDown, ChevronUp, Share2, Mail, MessageSquare, Sparkles, Star, Clipboard
} from 'lucide-react';
import { Question } from '../types';
import { apiClient } from '../lib/apiClient';

interface SubmissionDetailProps {
  submissionId: string;
  onBackToPortal: () => void;
}

export default function SubmissionDetail({ submissionId, onBackToPortal }: SubmissionDetailProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const json = await apiClient.getSubmission(submissionId);
        setData(json);
      } catch (err) {
        setError('Erro de conexão ao carregar o laudo.');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [submissionId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto my-12 text-center p-8 bg-white rounded-[2rem] shadow-[6px_6px_0px_rgba(15,23,42,1)] border-4 border-slate-900">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-100 text-slate-900 rounded-2xl mb-4 border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] animate-spin">
          <RefreshCw className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-slate-900 animate-pulse">Corrigindo sua Folha de Respostas...</h3>
        <p className="text-slate-600 font-bold text-xs mt-3 max-w-sm mx-auto leading-relaxed">
          Nosso motor inteligente de Inteligência Artificial está calculando seus acertos por critério de desempate e produzindo um laudo pedagógico de estudos personalizado.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-white rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)]">
        <div className="text-red-500 text-4xl mb-3">⚠️</div>
        <h3 className="text-lg font-black text-slate-900">Oops, erro ao carregar</h3>
        <p className="text-slate-600 font-bold text-xs mt-2">{error || 'Ocorreu um erro no processamento do laudo.'}</p>
        <button
          onClick={onBackToPortal}
          className="mt-6 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider border-2 border-slate-900 shadow-[2px_2px_0px_white]"
        >
          Voltar para Home
        </button>
      </div>
    );
  }

  const { submission, examTitle, examCategory, questions } = data;

  // Group Criteria stats programmatically
  const criteriaData: Record<string, { name: string; desc: string; total: number; correct: number }> = {
    C1: {
      name: 'C1 - Interpretação de Textos e Dados',
      desc: 'Interpretar diferentes tipos de textos como crônicas, poesias, charges, tabelas, gráficos, mapas, imagens.',
      total: 0,
      correct: 0
    },
    C2: {
      name: 'C2 - Aplicação de Conhecimentos Básicos',
      desc: 'Aplicar conhecimentos desenvolvidos no ensino fundamental para a compreensão da realidade e para a resolução de problemas.',
      total: 0,
      correct: 0
    },
    C3: {
      name: 'C3 - Análise Crítica',
      desc: 'Analisar criticamente argumentos apresentados nas questões e inferir hipóteses sustentáveis.',
      total: 0,
      correct: 0
    },
    C4: {
      name: 'C4 - Reconhecimento de Linguagens',
      desc: 'Reconhecer e relacionar diferentes formas de linguagens, abordagens e técnicas de comunicação.',
      total: 0,
      correct: 0
    },
    C5: {
      name: 'C5 - Avaliação Ética e Social',
      desc: 'Avaliar ações, resoluções socioambientais e éticas de acordo com critérios sustentáveis.',
      total: 0,
      correct: 0
    }
  };

  questions.forEach((q: any) => {
    const userAnswer = submission.answers[q.number];
    const isCorrect = userAnswer === q.correctAnswer;
    const skill = q.skill || 'C2';
    
    if (criteriaData[skill]) {
      criteriaData[skill].total++;
      if (isCorrect) {
        criteriaData[skill].correct++;
      }
    }
  });

  // Parse AI Analysis JSON
  let aiReportParsed = {
    feedbackText: 'Relatório pedagógico em processamento.',
    focusAreas: [] as string[],
    studyPlan: [] as string[]
  };

  try {
    if (submission.aiAnalysis) {
      aiReportParsed = JSON.parse(submission.aiAnalysis);
    }
  } catch (err) {
    console.error('Error parsing AI report:', err);
    aiReportParsed.feedbackText = submission.aiAnalysis || 'Seu laudo de acompanhamento foi gerado com sucesso.';
  }

  // Construct sharing strings
  const shareText = `Fiz o simulado do ${examTitle} no portal Simulados Brasil! Acertei ${submission.score} de ${submission.totalQuestions} questões (${submission.percentage}%). Confira o portal Simulados Brasil para treinar também!`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const emailUrl = `mailto:?subject=Meu Resultado no Simulados Brasil&body=${encodeURIComponent(shareText)}`;

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8">
      
      {/* Return to home button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={onBackToPortal}
          className="px-4 py-2.5 bg-white border-2 border-slate-900 rounded-xl text-slate-800 hover:text-slate-950 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[3px_3px_0px_rgba(15,23,42,1)] inline-flex items-center gap-1.5 hover:translate-x-[-1px] hover:translate-y-[-1px]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao portal inicial
        </button>
        
        {/* Share buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-900 font-black uppercase tracking-wider">Compartilhar:</span>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-emerald-400 hover:bg-emerald-500 text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] transition-all cursor-pointer text-xs flex items-center gap-1"
            title="Compartilhar no WhatsApp"
          >
            <MessageSquare className="w-4 h-4" /> WhatsApp
          </a>
          <a
            href={emailUrl}
            className="px-3 py-2 bg-indigo-300 hover:bg-indigo-400 text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] transition-all cursor-pointer text-xs flex items-center gap-1"
            title="Enviar por E-mail"
          >
            <Mail className="w-4 h-4" /> E-mail
          </a>
        </div>
      </div>

      {/* Main Score & Award Board */}
      <div className="bg-slate-950 text-white rounded-[2rem] p-6 sm:p-10 relative overflow-hidden border-4 border-slate-900 shadow-[8px_8px_0px_rgba(15,23,42,1)]">
        {/* Background ambient stars */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800/45 rounded-full blur-3xl"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs bg-slate-900 text-emerald-400 font-black border-2 border-emerald-400 px-3 py-1 rounded-full uppercase tracking-wider shadow-[2px_2px_0px_rgba(52,211,153,0.3)]">
              <Award className="w-3.5 h-3.5" /> Simulado Concluído com Sucesso
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">{examTitle}</h2>
            <div className="text-slate-300 space-y-1 font-semibold text-xs sm:text-sm">
              <p>Candidato(a): <strong className="text-white font-black">{submission.userName}</strong></p>
              <p className="text-[10px] text-slate-400 font-mono">Gabarito processado em: {new Date(submission.submittedAt).toLocaleString('pt-BR')}</p>
            </div>
          </div>

          {/* Large Grade Badge */}
          <div className="bg-slate-900 rounded-2xl p-5 border-2 border-slate-850 text-center min-w-[180px] shadow-[4px_4px_0px_white]">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total de Acertos</span>
            <div className="text-3xl sm:text-4xl font-black text-white mt-1">
              {submission.score} <span className="text-lg text-slate-400 font-normal">/ {submission.totalQuestions}</span>
            </div>
            <div className="text-xs text-slate-950 font-black mt-2 bg-emerald-400 border-2 border-slate-900 px-3 py-1 rounded-full inline-block">
              Aproveitamento: {submission.percentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Criteria and Etec desempate breakdown bar chart */}
      <div className="bg-white rounded-[2rem] border-4 border-slate-900 p-6 sm:p-8 shadow-[6px_6px_0px_rgba(15,23,42,1)] space-y-6">
        <div>
          <h3 className="font-black text-slate-950 text-base sm:text-lg uppercase tracking-tight">Critérios de Habilidade do Vestibulinho</h3>
          <p className="text-xs text-slate-600 font-medium mt-0.5">Veja seu aproveitamento agrupado pelas competências oficiais avaliadas para critério de desempate ETEC.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {Object.entries(criteriaData).map(([code, stats]) => {
            const hasQuestions = stats.total > 0;
            const percentage = hasQuestions ? Math.round((stats.correct / stats.total) * 100) : 0;
            
            return (
              <div key={code} className="p-5 rounded-2xl border-2 border-slate-900 bg-amber-50 shadow-[3px_3px_0px_rgba(15,23,42,1)] space-y-3 flex flex-col justify-between">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h4 className="font-black text-xs text-slate-900 leading-snug uppercase tracking-wider">{stats.name}</h4>
                    <p className="text-[10px] text-slate-600 font-bold mt-1.5 leading-normal italic">{stats.desc}</p>
                  </div>
                  <span className="text-xs font-mono font-black text-slate-900 bg-white border-2 border-slate-900 px-2.5 py-1 rounded-lg shrink-0 shadow-[2px_2px_0px_rgba(15,23,42,1)]">
                    {stats.correct}/{stats.total}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-3">
                  <div className="h-4 bg-white border-2 border-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 border-r-2 border-slate-900 ${
                        percentage >= 70 ? 'bg-emerald-400' : percentage >= 40 ? 'bg-amber-300' : 'bg-pink-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-right text-[10px] font-black text-slate-700 font-mono uppercase tracking-wider">
                    Acertos: {percentage}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Server side Gemini AI Correction analysis report */}
      <div className="bg-emerald-100 border-4 border-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-[6px_6px_0px_rgba(15,23,42,1)] space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 text-emerald-400 rounded-xl border-2 border-slate-900">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-950 text-base sm:text-lg uppercase tracking-tight">Laudo Inteligente de Desempenho</h3>
            <p className="text-xs text-slate-800 font-bold">Análise pedagógica de habilidades e plano de estudos produzido via IA do Simulados Brasil.</p>
          </div>
        </div>

        {/* AI feedback text */}
        <div className="text-slate-900 text-sm font-semibold leading-relaxed whitespace-pre-line bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)]">
          {aiReportParsed.feedbackText}
        </div>

        {/* focus areas and study plans grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Focus Areas */}
          {aiReportParsed.focusAreas?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] space-y-3">
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" /> Tópicos Recomendados para Foco
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-700 font-bold">
                {aiReportParsed.focusAreas.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-lg bg-indigo-50 text-slate-900 border border-slate-900 font-black flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="leading-normal mt-0.5">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Study Plan */}
          {aiReportParsed.studyPlan?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] space-y-3">
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" /> Plano de Estudos Semanal
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-700 font-bold">
                {aiReportParsed.studyPlan.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-slate-900 rounded-full shrink-0 mt-1.5 border border-slate-900"></span>
                    <span className="leading-normal">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>

      {/* FULL ANSWER REVIEW ACCORDION */}
      <div className="bg-white rounded-[2rem] border-4 border-slate-900 p-6 sm:p-8 shadow-[6px_6px_0px_rgba(15,23,42,1)] space-y-6">
        <div>
          <h3 className="font-black text-slate-950 text-base sm:text-lg uppercase tracking-tight">Gabarito Oficial & Suas Respostas</h3>
          <p className="text-xs text-slate-600 font-medium mt-0.5">Revise cada uma das 50 questões, veja o gabarito oficial e compare com o que você assinalou.</p>
        </div>

        <div className="space-y-3 divide-y-2 divide-slate-100">
          {questions.map((q: any) => {
            const userAnswer = submission.answers[q.number] || '';
            const isCorrect = userAnswer === q.correctAnswer;
            const isExpanded = expandedQuestion === q.number;

            return (
              <div key={q.number} className="pt-4 first:pt-0">
                <button
                  onClick={() => setExpandedQuestion(isExpanded ? null : q.number)}
                  className="w-full flex items-center justify-between text-left gap-4 hover:bg-slate-50 p-2.5 rounded-2xl transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] ${
                      isCorrect 
                        ? 'bg-emerald-300 text-slate-950' 
                        : userAnswer === '' 
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-pink-300 text-slate-950'
                    }`}>
                      {q.number.toString().padStart(2, '0')}
                    </span>
                    
                    <div className="space-y-1">
                      <p className="font-black text-xs sm:text-sm text-slate-900 truncate max-w-lg sm:max-w-2xl">{q.text}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-black uppercase tracking-wider font-mono">
                        <span>Gabarito: <strong className="text-emerald-700 bg-emerald-50 px-1 border border-emerald-300 rounded">{q.correctAnswer}</strong></span>
                        <span>Sua resposta: <strong className={isCorrect ? 'text-emerald-700 bg-emerald-50 px-1 border border-emerald-300 rounded' : 'text-red-700 bg-red-50 px-1 border border-red-300 rounded'}>{userAnswer || 'Não respondida'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center text-slate-500 bg-white">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-900" /> : <ChevronDown className="w-4 h-4 text-slate-900" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-4 p-5 sm:p-6 bg-slate-50 rounded-2xl border-2 border-slate-900 space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed max-w-3xl ml-11 shadow-[3px_3px_0px_rgba(15,23,42,1)] font-medium">
                    {q.context && (
                      <div className="italic text-slate-700 bg-white p-4 rounded-xl border-2 border-slate-900 font-semibold shadow-[2px_2px_0px_rgba(15,23,42,1)]">
                        {q.context}
                      </div>
                    )}
                    <p className="font-black text-slate-900">Enunciado Completo: {q.text}</p>
                    
                    <div className="space-y-2 pt-2">
                      {(['A', 'B', 'C', 'D', 'E'] as const).map(opt => {
                        const isOptCorrect = q.correctAnswer === opt;
                        const isOptChosen = userAnswer === opt;
                        
                        return (
                          <div 
                            key={opt}
                            className={`p-3 rounded-xl border-2 flex gap-3 items-start ${
                              isOptCorrect 
                                ? 'bg-emerald-100 border-slate-900 text-emerald-950 font-black shadow-[2px_2px_0px_rgba(15,23,42,1)]' 
                                : isOptChosen
                                ? 'bg-pink-100 border-slate-900 text-pink-950 shadow-[2px_2px_0px_rgba(15,23,42,1)]'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border-2 border-slate-900 ${
                              isOptCorrect 
                                ? 'bg-white text-slate-950 shadow-[1px_1px_0px_black]' 
                                : isOptChosen 
                                ? 'bg-white text-slate-950 shadow-[1px_1px_0px_black]' 
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {opt}
                            </span>
                            <span className="leading-relaxed mt-0.5">{q.options[opt]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
