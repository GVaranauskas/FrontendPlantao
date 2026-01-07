/**
 * Tipos compartilhados centralizados do FrontendPlantao
 * Este arquivo consolida todas as interfaces duplicadas encontradas nos componentes
 */

// Re-export tipos do schema (Patient, Alert, etc)
export type { Patient, Alert, User, NursingUnit, ImportHistory, AuditLog } from "@shared/schema";

// ============================================================================
// INTERFACES DE ENFERMARIA E TEMPLATES
// ============================================================================

export interface Enfermaria {
  codigo: string;
  nome: string;
}

export interface NursingTemplate {
  id: string;
  name: string;
  description?: string;
  enfermariaCodigo?: string;
  fieldsConfiguration?: any;
  specialRules?: any;
  isActive?: number;
  createdAt?: Date;
}

// ============================================================================
// INTERFACES DE IMPORTAÇÃO
// ============================================================================

export interface ImportStats {
  total: number;
  importados: number;
  erros: number;
  detalhes: Array<{
    leito: string;
    status: string;
    mensagem?: string;
  }>;
}

export interface ImportResponse {
  success: boolean;
  enfermaria: string;
  stats: ImportStats;
  mensagem: string;
}

// ============================================================================
// INTERFACES DE ANÁLISE CLÍNICA (IA)
// ============================================================================

export type AlertLevel = "VERMELHO" | "AMARELO" | "VERDE";
export type RiskLevel = "ALTO" | "MODERADO" | "BAIXO";

export interface ClinicalAlert {
  tipo: string;
  nivel: AlertLevel;
  titulo: string;
  descricao?: string;
}

export interface ClinicalInsights {
  timestamp: string;
  nivel_alerta: AlertLevel;
  alertas_count: {
    vermelho: number;
    amarelo: number;
    verde: number;
  };
  principais_alertas: ClinicalAlert[];
  gaps_criticos: string[];
  score_qualidade: number;
  categoria_qualidade: string;
  prioridade_acao: string | null;
  recomendacoes_enfermagem: string[];
}

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

// ============================================================================
// INTERFACES DE LEITO E ANÁLISE DETALHADA
// ============================================================================

export interface LeitoDetalhadoSimples {
  leito: string;
  nome: string;
  recomendacoes: string[];
  alertas: ClinicalAlert[];
}

export interface RiscoIdentificado {
  tipo: string;
  nivel: RiskLevel;
  descricao: string;
}

export interface ProtocoloAtivo {
  nome: string;
  descricao: string;
  frequencia?: string;
}

export interface LeitoDetalhado {
  leito: string;
  nome: string;
  diagnostico_principal: string;
  tipo_enfermidade: string;
  dias_internacao: number;
  nivel_alerta: AlertLevel;
  score_qualidade: number;
  braden: string;
  mobilidade: string;
  riscos_identificados: RiscoIdentificado[];
  protocolos_ativos: ProtocoloAtivo[];
  recomendacoes_enfermagem: string[];
  alertas: ClinicalAlert[];
  gaps_documentacao: string[];
  dispositivos: string[];
  antibioticos: string[];
}

export interface LeitoClassificado {
  leito: string;
  nome: string;
  nivel: AlertLevel;
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

// ============================================================================
// INTERFACES DE PROTOCOLOS E INDICADORES
// ============================================================================

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
  summary: {
    vermelho: number;
    amarelo: number;
    verde: number;
    errors: number;
  };
  analiseGeral?: AnaliseGeral;
  leitosAtencao: LeitoDetalhadoSimples[];
  leitosAlerta: LeitoDetalhadoSimples[];
  failedPatients: string[];
}

// ============================================================================
// INTERFACES DE SINCRONIZAÇÃO
// ============================================================================

export interface SyncStatus {
  success: boolean;
  message: string;
  timestamp: Date;
  stats?: {
    total: number;
    updated: number;
    errors: number;
  };
}

export interface SyncOptions {
  unitIds?: string;
  forceUpdate?: boolean;
  templateId?: string;
}

// ============================================================================
// TIPOS UTILITÁRIOS
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// INTERFACES DE FORMULÁRIO (PARA CRUD)
// ============================================================================

export interface FormState<T = any> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface CrudActions {
  onCreate?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
}
