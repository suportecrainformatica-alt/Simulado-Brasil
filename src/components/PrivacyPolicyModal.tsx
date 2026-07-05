import React from 'react';
import { X, Shield, Lock, FileText, CheckCircle } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-emerald-600" />
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">Política de Privacidade</h3>
              <p className="text-xs text-slate-500">Termos de Uso e Proteção de Dados - Simulados Brasil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-600 leading-relaxed">
          <section className="space-y-2">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" /> 1. Coleta e Uso de Informações
            </h4>
            <p>
              Para a realização e emissão dos relatórios dos simulados, o <strong>Simulados Brasil</strong> solicita
              dados essenciais: <strong>Nome Completo</strong> e <strong>Endereço de E-mail</strong>. Estes dados
              são coletados exclusivamente para fins de personalização do laudo pedagógico, acompanhamento do histórico
              de estudos e identificação do candidato.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" /> 2. Processamento e Inteligência Artificial
            </h4>
            <p>
              Ao enviar suas respostas, as estatísticas de acertos (quantidade e critérios ETEC C1-C5) são enviadas de forma segura e anônima ao nosso motor de inteligência artificial baseado na API do Gemini. Nenhuma informação pessoal sensível ou não autorizada é transmitida. O relatório produzido é estritamente confidencial e de visualização do próprio candidato.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> 3. Newsletter e Comunicação
            </h4>
            <p>
              Caso você opte por receber nossa <strong>Newsletter</strong>, nós enviaremos periodicamente materiais
              de estudo gratuitos, dicas de vestibulares, novas provas cadastradas no sistema e avisos sobre exames como
              ETEC, ENEM e concursos públicos. Você poderá revogar o consentimento e cancelar a assinatura a qualquer
              momento diretamente a partir de um link presente em todos os e-mails ou entrando em contato com nosso portal.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" /> 4. Conformidade com a LGPD
            </h4>
            <p>
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD) do Brasil, asseguramos os direitos de exclusão definitiva de seu cadastro do nosso banco de dados, retificação de dados incorretos e transparência total de acesso. Seus dados nunca serão compartilhados com terceiros ou comercializados.
            </p>
          </section>

          <section className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-3 text-xs text-emerald-800">
            <div className="font-bold">Nota:</div>
            <div>
              Ao marcar a caixa de consentimento na tela de login/cadastro de simulado, você declara estar ciente de que as informações fornecidas serão processadas e armazenadas localmente na plataforma Simulados Brasil de forma íntegra e segura.
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors cursor-pointer text-xs"
          >
            Entendi e Concordo
          </button>
        </div>
      </div>
    </div>
  );
}
