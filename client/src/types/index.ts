export interface Enfermaria {
  codigo: string;
  nome: string;
}

export interface User {
  id: string;
  username: string;
  email?: string | null;
  name: string;
  role: string;
  isActive?: boolean;
  firstAccess?: boolean;
  createdAt?: string;
  lastLogin?: string | null;
}

export interface NursingTemplate {
  id: string;
  name: string;
  description?: string;
}

export interface ImportStats {
  total: number;
  importados: number;
  erros: number;
  detalhes: Array<{ leito: string; status: string; mensagem?: string }>;
}

export interface ImportResponse {
  success: boolean;
  enfermaria: string;
  stats: ImportStats;
  mensagem: string;
}

export interface ImportStatus {
  status: "online" | "offline";
  latency: string;
}

export type UserRole = "admin" | "enfermagem" | "visualizador";

export interface AIAnalysisResult {
  resumoGeral: string;
  pacientesCriticos: string[];
  alertasGerais: string[];
  estatisticas: {
    total: number;
    altaComplexidade: number;
    mediaBraden: number;
  };
}

export interface ClinicalAlert {
  tipo: string;
  nivel: "VERMELHO" | "AMARELO" | "VERDE";
  titulo: string;
  descricao?: string;
}

export interface ClinicalInsights {
  timestamp: string;
  nivel_alerta: "VERMELHO" | "AMARELO" | "VERDE";
  alertas_count: { vermelho: number; amarelo: number; verde: number };
  principais_alertas: ClinicalAlert[];
  gaps_criticos: string[];
  score_qualidade: number;
  categoria_qualidade: string;
  prioridade_acao: string | null;
  recomendacoes_enfermagem: string[];
}

export interface LeitoDetalhadoSimples {
  leito: string;
  nome: string;
  recomendacoes: string[];
  alertas: ClinicalAlert[];
}

export interface LeitoDetalhado {
  leito: string;
  nome: string;
  diagnostico_principal: string;
  tipo_enfermidade: string;
  dias_internacao: number;
  nivel_alerta: "VERMELHO" | "AMARELO" | "VERDE";
  score_qualidade: number;
  braden: string;
  mobilidade: string;
  riscos_identificados: Array<{
    tipo: string;
    nivel: "ALTO" | "MODERADO" | "BAIXO";
    descricao: string;
  }>;
  protocolos_ativos: Array<{
    nome: string;
    descricao: string;
    frequencia?: string;
  }>;
  recomendacoes_enfermagem: string[];
  alertas: Array<{
    tipo: string;
    nivel: "VERMELHO" | "AMARELO" | "VERDE";
    titulo: string;
    descricao?: string;
  }>;
  gaps_documentacao: string[];
  dispositivos: string[];
  antibioticos: string[];
}

export interface LeitoClassificado {
  leito: string;
  nome: string;
  nivel: "VERMELHO" | "AMARELO" | "VERDE";
  problemas: string[];
  recomendacoes: string[];
  alertas_prioritarios: string[];
}

export interface ClassificacaoProblemas {
  risco_queda: LeitoClassificado[];
  risco_lesao_pressao: LeitoClassificado[];
  risco_infeccao: LeitoClassificado[];
  risco_broncoaspiracao: LeitoClassificado[];
  risco_nutricional: LeitoClassificado[];
  risco_respiratorio: LeitoClassificado[];
}

export interface ProtocoloEnfermagem {
  categoria: string;
  icone: string;
  cor: string;
  leitos_afetados: string[];
  quantidade: number;
  protocolo_resumo: string;
  acoes_principais: string[];
}

export interface IndicadoresPlantao {
  total_pacientes: number;
  media_braden: number;
  media_dias_internacao: number;
  taxa_completude_documentacao: number;
  pacientes_alta_complexidade: number;
  pacientes_com_dispositivos: number;
  pacientes_com_atb: number;
  pacientes_acamados: number;
  pacientes_risco_queda_alto: number;
  pacientes_lesao_pressao: number;
}

export interface AnaliseGeral {
  timestamp: string;
  resumo_executivo: string;
  alertas_criticos_enfermagem: string[];
  classificacao_por_problema: ClassificacaoProblemas;
  leitos_prioridade_maxima: LeitoClassificado[];
  leitos_detalhados: LeitoDetalhado[];
  protocolos_enfermagem: ProtocoloEnfermagem[];
  indicadores: IndicadoresPlantao;
  estatisticas: {
    total: number;
    vermelho: number;
    amarelo: number;
    verde: number;
    por_tipo_risco: Record<string, number>;
  };
  recomendacoes_gerais_plantao: string[];
}

export interface ClinicalBatchResult {
  total: number;
  success: number;
  summary: { vermelho: number; amarelo: number; verde: number; errors: number };
  analiseGeral?: AnaliseGeral;
  leitosAtencao: LeitoDetalhadoSimples[];
  leitosAlerta: LeitoDetalhadoSimples[];
  failedPatients: string[];
}

export interface PatientStats {
  total: number;
  complete: number;
  pending: number;
  alert: number;
  critical: number;
}

export interface PatientNotesFields {
  notasPaciente?: string | null;
  notasUpdatedAt?: string | null;
  notasUpdatedBy?: string | null;
  notasCreatedAt?: string | null;
  notasCreatedBy?: string | null;
}
