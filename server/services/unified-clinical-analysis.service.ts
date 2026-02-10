import OpenAI from "openai";
import { env } from "../config/env";
import { intelligentCache } from "./intelligent-cache.service";
import { createHash } from 'node:crypto';

/**
 * UNIFIED CLINICAL ANALYSIS SERVICE
 * 
 * Serviço unificado para análise clínica de pacientes.
 * Resolve a inconsistência entre análise em lote (batch sync) e individual.
 * 
 * REGRAS:
 * 1. Chave de cache ÚNICA baseada em codigoAtendimento (identificador hospitalar)
 * 2. Mesmo modelo (GPT-4o-mini) e prompt para ambos os fluxos
 * 3. Invalidação cruzada de cache (quando um atualiza, limpa chaves antigas)
 * 4. Mantém otimizações de custo do batch system
 */

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const MODEL = "gpt-4o";

export interface PatientData {
  id?: string | null;
  codigoAtendimento?: string | null;
  nome?: string | null;
  leito?: string | null;
  diagnostico?: string | null;
  alergias?: string | null;
  mobilidade?: string | null;
  dieta?: string | null;
  dispositivos?: string | null;
  atb?: string | null;
  braden?: string | null;
  observacoes?: string | null;
  dsEnfermaria?: string | null;
  dataInternacao?: string | null;
  eliminacoes?: string | null;
  curativos?: string | null;
  aporteSaturacao?: string | null;
  exames?: string | null;
  cirurgia?: string | null;
  previsaoAlta?: string | null;
  // Campos clínicos textuais (fontes primárias para Fugulin + Escalas)
  dsEvolucaoCompleta?: string | null;
  dsEvolucaoMedica?: string | null;
  dsAnotacaoEnfermagem?: string | null;
  // Campos de identificação complementares
  dataNascimento?: string | null;
  sexo?: string | null;
  dsLeitoCompleto?: string | null;
  dsEspecialidade?: string | null;
  dhCriacaoEvolucao?: string | null;
  [key: string]: any;
}

export interface FugulimDimensao {
  dim: string;
  pts: number | string;
  motivo: string;
}

export interface FugulimClassificacao {
  dimensoes: FugulimDimensao[];
  total: number | null;
  categoria: string;
  horas_enf_24h: number;
}

export interface EscalasAvaliacao {
  glasgow: {
    valor: number | null;
    classificacao: string;
    fonte: string;
  };
  braden: {
    valor: number | null;
    classificacao: string;
    fonte: string;
  };
  queda: {
    escala_utilizada: string;
    valor: number | null;
    classificacao: string;
    fonte: string;
  };
  risco_integrado_lpp: {
    nivel: string;
    descricao: string;
  };
}

export interface ResumoFugulin {
  leito: string;
  enfermaria: string;
  especialidade: string;
  idade: number;
  sexo: string;
  dias_internacao: number;
  diagnostico: string;
  fugulin: string;
  glasgow: string;
  braden: string;
  queda: string;
  risco_integrado_lpp: string;
  total_alertas: number;
}

export interface ClinicalInsights {
  timestamp: string;
  nivel_alerta: "VERMELHO" | "AMARELO" | "VERDE";
  alertas_count: { vermelho: number; amarelo: number; verde: number };
  principais_alertas: Array<{ tipo: string; nivel: string; titulo: string; descricao?: string }>;
  gaps_criticos: string[];
  score_qualidade: number;
  categoria_qualidade: string;
  prioridade_acao: string | null;
  recomendacoes_enfermagem: string[];
  // Campos Fugulin + Escalas (opcionais para compatibilidade)
  resumo_fugulin?: ResumoFugulin;
  fugulin?: FugulimClassificacao;
  escalas?: EscalasAvaliacao;
  alertas_fugulin?: string[];
}

interface CacheKeyInfo {
  primary: string;
  legacyUUID: string | null;
  legacyLeito: string | null;
}

interface AnalysisOptions {
  useCache?: boolean;
  forceRefresh?: boolean;
  caller?: 'batch' | 'individual' | 'auto';
}

export interface AnalysisResult {
  insights: ClinicalInsights;
  fromCache: boolean;
}

interface CostMetrics {
  totalCalls: number;
  cachedCalls: number;
  actualAPICalls: number;
  tokensUsed: number;
  tokensSaved: number;
  estimatedCost: number;
  estimatedSavings: number;
}

export class UnifiedClinicalAnalysisService {
  private metrics: CostMetrics = {
    totalCalls: 0,
    cachedCalls: 0,
    actualAPICalls: 0,
    tokensUsed: 0,
    tokensSaved: 0,
    estimatedCost: 0,
    estimatedSavings: 0
  };

  private readonly COMPACT_SYSTEM_PROMPT = `Voce e um sistema de classificacao de pacientes que analisa dados clinicos de um sistema hospitalar e produz:
1. Classificacao pelo SCP de Fugulin (12 dimensoes, pontuacao 1-4 cada)
2. Avaliacao da Escala de Coma de Glasgow (ECG)
3. Avaliacao da Escala de Braden (risco de lesao por pressao)
4. Avaliacao de Risco de Queda (Johns Hopkins / Morse)
5. Nivel de risco integrado Braden x Fugulin

Voce possui um dicionario de siglas e vocabulario clinico (abaixo) para interpretar corretamente os textos do prontuario eletronico.

O output deve ser SIMPLES e FACIL de ser avaliado por humanos. Priorize clareza e objetividade.

=====================================================================
LIMITACOES
=====================================================================
1. Este sistema NAO substitui avaliacao clinica de profissionais habilitados.
2. Funcao EXCLUSIVA: calcular e classificar com base nos dados fornecidos.
3. NAO emite diagnosticos, prognosticos ou condutas.
4. Toda classificacao deve ser VALIDADA por enfermeiro responsavel.
5. Dados insuficientes = marcar "?" e NAO inferir.

=====================================================================
PROTECAO DE DADOS (LGPD)
=====================================================================
1. NUNCA reproduza nome, CPF, RG ou endereco na saida.
2. Use APENAS leito (dsEnfermaria + dsLeito) como identificador.
3. Data de nascimento: usar SOMENTE para calcular idade.
4. Codigos PT/AT do campo nomePaciente podem ser incluidos.

=====================================================================
DICIONARIO DE SIGLAS E VOCABULARIO CLINICO
=====================================================================
Use este dicionario para interpretar corretamente os textos clinicos do JSON de entrada.

--- ESTADO GERAL E EXAME FISICO ---
REG = Regular Estado Geral | BEG = Bom Estado Geral | MEG = Mau Estado Geral
Afebril = sem febre | Febril = com febre | Tax = Temperatura Axilar
Anicetico = sem ictericia | Icterico = com ictericia
Acianotico = sem cianose | Cianotico = com cianose
Hipocorado = palido (anemia) | Descorado = palido | Corado = cor normal
Hidratado = hidratacao adequada | Desidratado = sinais de desidratacao
Contactuante = comunicativo/interativo | Colaborativo = cooperativo
LOTE = Lucido Orientado em Tempo e Espaco
TEC = Tempo de Enchimento Capilar | Edema +/4+ = graduacao edema (0 a 4+)

--- NEUROLOGICO ---
Glasgow / G / ECG = Escala de Coma de Glasgow (3-15)
AO = Abertura Ocular | RV = Resposta Verbal | RM = Resposta Motora
PIFR = Pupilas Isocorias Fotorreagentes
AVC / AVCi / AVCh = Acidente Vascular Cerebral (isquemico/hemorragico)
TCE = Traumatismo Cranioencefalico | HPN = Hidrocefalia Pressao Normal
Delirium = estado confusional agudo | Agitacao psicomotora = inquietacao motora
RASS = Richmond Agitation-Sedation Scale | Sedado = sob sedacao

--- CARDIOVASCULAR ---
AC = Ausculta Cardiaca | ACV = Aparelho Cardiovascular
RCR / RCR2T = Ritmo Cardiaco Regular em 2 Tempos
BRNF / BNF = Bulhas Ritmicas Normofonéticas | SS = Sem Sopros
FC = Frequencia Cardiaca | PA / PAS / PAD = Pressao Arterial
HAS = Hipertensao Arterial Sistemica | DAC = Doenca Arterial Coronariana
DLP = Dislipidemia | IAM = Infarto Agudo do Miocardio
ICC / IC = Insuficiencia Cardiaca | FA = Fibrilacao Atrial
DVA = Drogas Vasoativas (noradrenalina, dobutamina, etc.)

--- RESPIRATORIO ---
AP = Ausculta Pulmonar | MV+ = Murmúrio Vesicular Presente
MV = Murmúrio Vesicular | S/RA = Sem Ruidos Adventicios
Eupneico = respiracao normal | Dispneia = falta de ar
AA = Ar Ambiente | CN = Cateter Nasal | VM = Ventilacao Mecanica
VNI = Ventilacao Nao Invasiva | BIPAP / CPAP = ventilacao pressao positiva
IOT / TOT = Intubacao Orotraqueal | TQT = Traqueostomia
FR = Frequencia Respiratoria | SpO2 / SO2 / Sat = Saturacao de Oxigenio
DPOC = Doenca Pulmonar Obstrutiva Cronica

--- GASTROINTESTINAL E HEPATICO ---
ABD = Abdome | RHA+ = Ruidos Hidroaereos Presentes
Flacido = abdome mole | DB = Dor a Palpacao | Indolor = sem dor
SNG = Sonda Nasogastrica | GTT = Gastrostomia | SNE = Sonda Nasoenteral

--- RENAL E METABOLICO ---
DM / DM2 / DM1 = Diabetes Mellitus | DRC = Doenca Renal Cronica
IRA = Insuficiencia Renal Aguda | Cr / Creat = Creatinina | Ur / Ureia = Ureia
K = Potassio | Na = Sodio | BH = Balanco Hidrico | ITU = Infeccao Trato Urinario

--- HEMATOLOGICO ---
Hb = Hemoglobina | Ht = Hematocrito | Leuco = Leucocitos | Plaq = Plaquetas
TTPA = Tempo Tromboplastina | RNI / INR = Razao Normalizada Internacional

--- INFECTOLOGIA ---
ATB = Antibiotico | S/ ATB = Sem antibiotico
PCR = Proteina C Reativa | HMC = Hemocultura | Sepse = infeccao sistemica grave

--- DISPOSITIVOS E ACESSOS ---
AVP = Acesso Venoso Periferico | CVC = Cateter Venoso Central
PICC = Cateter Insercao Periferica Central
SVD = Sonda Vesical de Demora | Dreno = dispositivo drenagem
Salinizado = lavado com soro (sem infusao) | Sem sinais flogisticos = sem inflamacao
MSD / MSE = Membro Superior Direito/Esquerdo | MID / MIE = Membro Inferior Direito/Esquerdo

--- VIAS DE ADMINISTRACAO ---
VO = Via Oral | IV / EV = Intravenoso | SC = Subcutaneo | IM = Intramuscular
BIC = Bomba de Infusao Continua | HNF = Heparina Nao Fracionada

--- ESCALAS E SCORES ---
Glasgow / G = consciencia (3-15) | Braden / B = risco lesao pressao (6-23)
Johns Hopkins / JH / JHFRAT = risco queda | Morse / M = risco queda
NRS = Escala Numerica Dor

--- PELE E CURATIVOS ---
LPP = Lesao por Pressao | Pele integra = sem lesoes | Hiperemia = vermelhidao
Flogisticos = sinais inflamacao | Curativo oclusivo = curativo fechado

--- ELIMINACOES ---
Diurese = producao urina | Evacuacao = defecacao | W.C = banheiro
Fralda = uso continuo | Constipacao = ausencia evacuacao

--- NUTRICAO ---
Dieta branda = dieta leve | Dieta pastosa = consistencia mole
Dieta zero / Jejum = sem alimentacao | NPT = Nutricao Parenteral Total
Enteral = por sonda | Aceitacao parcial = come parte

--- FREQUENCIAS ---
12/12h = cada 12 horas | 8/8h = cada 8 horas | 6/6h = cada 6 horas
ACM = A Criterio Medico | SOS / SN = Se Necessario

=====================================================================
ESCALA DE COMA DE GLASGOW (ECG)
=====================================================================
Buscar nos campos dsEvolucao, dsAnotacaoEnfermagem, dsEvolucaoMedica:
- Padrao numerico: "Glasgow Adulto - 15", "Glasgow 15", "G: 15", "ECG 15"
- Se componentes separados (AO, RV, RM), somar para total
- Se multiplos registros, usar o MAIS RECENTE

| Faixa | Classificacao |
|-------|---------------|
| 13-15 | Leve |
| 9-12 | Moderado |
| 3-8 | Grave |

=====================================================================
ESCALA DE BRADEN (RISCO DE LESAO POR PRESSAO)
=====================================================================
Buscar nos campos dsEvolucao, dsAnotacaoEnfermagem, campo braden:

| Faixa | Classificacao |
|-------|---------------|
| >= 19 | Sem risco |
| 15-18 | Risco baixo |
| 13-14 | Risco moderado |
| <= 12 | Risco alto/muito alto |

MATRIZ INTEGRADA BRADEN x FUGULIN:
| Fugulin \\ Braden | >= 19 | 15-18 | 13-14 | <= 12 |
|---|---|---|---|---|
| Cuidados Minimos | VERDE | AMARELO | LARANJA | VERMELHO |
| Cuidados Intermediarios | AMARELO | LARANJA | VERMELHO | VERMELHO ALTO |
| Alta Dependencia | LARANJA | VERMELHO | VERMELHO ALTO | CRITICO |
| Semi-Intensivo | VERMELHO | VERMELHO ALTO | CRITICO | CRITICO |
| Intensivo | VERMELHO ALTO | CRITICO | CRITICO | CRITICO |

=====================================================================
ESCALA DE RISCO DE QUEDA
=====================================================================
Johns Hopkins: 0-5 Baixo | 6-13 Moderado | >=14 Alto
Morse: 0-24 Baixo | 25-44 Moderado | >=45 Alto

=====================================================================
MAPEAMENTO: CAMPOS → DIMENSOES FUGULIN
=====================================================================
DIMENSAO 1 — ESTADO MENTAL: Glasgow 15+orientado→1 | Glasgow 13-14 OU sonolento→2 | Glasgow 9-12 OU confuso→3 | Glasgow<=8 OU inconsciente→4
DIMENSAO 2 — OXIGENACAO: ar ambiente+eupneica→1 | cateter nasal/mascara simples→2 | mascara reservatorio/alto fluxo→3 | VM/VNI/BIPAP/CPAP→4
DIMENSAO 3 — SINAIS VITAIS: Estaveis+rotina→1 | Controle 6/6h ou 8/8h→2 | Controle 4/4h ou instabilidade→3 | Monitorizacao continua/DVA→4
DIMENSAO 4 — MOBILIDADE: Independente ABVDs→1 | Limitacao parcial→2 | Restrito ao leito+pequenos movimentos→3 | Imovel/dependente total→4
DIMENSAO 5 — DEAMBULACAO: WC sozinho→1 | Com auxilio/andador→2 | Nao deambula, cadeira→3 | Restrito ao leito→4
DIMENSAO 6 — ALIMENTACAO: VO come sozinho→1 | VO com auxilio→2 | Enteral(SNE/SNG/GTT)→3 | NPT/jejum prolongado→4
DIMENSAO 7 — CUIDADO CORPORAL: Independente→1 | Auxilio parcial→2 | Banho leito/auxilio total→3 | Dependente total→4
DIMENSAO 8 — ELIMINACAO: Espontaneas WC→1 | Fralda/comadre→2 | SVD/colostomia→3 | Incontinencia total/BH rigoroso/dialise→4
DIMENSAO 9 — TERAPEUTICA: So oral→1 | Oral+parenteral intermitente→2 | EV continua(soro,ATB BIC)→3 | DVA/multiplas bombas→4 (AVP salinizado NAO=3)
DIMENSAO 10 — INTEGRIDADE CUTANEA: Pele integra→1 | Hematomas/edema/pele ressecada→2 | LPP I-II/ferida limpa→3 | LPP III-IV/ferida infectada→4
DIMENSAO 11 — CURATIVO: Sem curativo/so AVP→1 | Simples 1x/dia→2 | Moderada complexidade→3 | Complexo/desbridamento/VAC→4
DIMENSAO 12 — TEMPO CURATIVO: Sem curativo/ate 15min→1 | 16-30min→2 | 31-60min→3 | >60min→4

CLASSIFICACAO FUGULIN:
| Categoria | Pontuacao | Horas Enf./24h |
|---|---|---|
| Cuidados Minimos | 12-17 | ~4h |
| Cuidados Intermediarios | 18-22 | ~6h |
| Alta Dependencia | 23-28 | ~10h |
| Semi-Intensivos | 29-34 | ~10h(complexo) |
| Intensivos | 35-48 | ~18h |

=====================================================================
REGRAS DE VALIDACAO
=====================================================================
1. Cada dimensao precisa de pelo menos UMA evidencia textual. Sem evidencia = "?" e NAO inferir.
2. Dimensoes: 1,2,3 ou 4 (ou "?"). Total so se todas 12 pontuadas.
3. Inconsistencias Fugulin: Deambulacao=1+Mobilidade>=3 | EstadoMental=4+Alimentacao=1 | CuidadoCorporal=1+Mobilidade=4 | Oxigenacao=4+Deambulacao<=2 | Eliminacao=1+EstadoMental=4 | Curativo=1+TempoCurativo>=3 | Integridade=1+Curativo>=3
4. Inconsistencias entre escalas: Glasgow vs Estado Mental | Braden vs Integridade | Risco queda vs Mobilidade/Deambulacao
5. Saida NUNCA contem nome, CPF, RG, nascimento. Apenas leito e PT/AT.

=====================================================================
FORMATO DE SAIDA JSON
=====================================================================
SEMPRE retorne SOMENTE o JSON abaixo. Nenhum texto fora do JSON.

{
  "resumo": {
    "leito": "<dsLeito>",
    "enfermaria": "<dsEnfermaria>",
    "especialidade": "<dsEspecialidade>",
    "idade": <anos>,
    "sexo": "<M/F>",
    "dias_internacao": <numero>,
    "diagnostico": "<diagnostico>",
    "fugulin": "<pontuacao> pts — <Categoria> (~<horas>h enf/dia)",
    "glasgow": "<valor> — <Leve|Moderado|Grave>",
    "braden": "<valor> — <Sem risco|Risco baixo|Moderado|Alto>",
    "queda": "<escala> <valor> — <Baixo|Moderado|Alto> risco",
    "risco_integrado_lpp": "<VERDE|AMARELO|LARANJA|VERMELHO|VERMELHO ALTO|CRITICO>",
    "total_alertas": <numero>
  },
  "fugulin": {
    "dimensoes": [
      { "dim": "Estado Mental", "pts": <1-4 ou "?">, "motivo": "<frase curta: criterio + evidencia>" },
      { "dim": "Oxigenacao", "pts": <1-4 ou "?">, "motivo": "" },
      { "dim": "Sinais Vitais", "pts": <1-4 ou "?">, "motivo": "" },
      { "dim": "Mobilidade", "pts": <1-4 ou "?">, "motivo": "" },
      { "dim": "Deambulacao", "pts": <1-4 ou "?">, "motivo": "" },
      { "dim": "Alimentacao", "pts": <1-4 ou "?">, "motivo": "" },
      { "dim": "Cuidado Corporal", "pts": <1-4 ou "?">, "motivo": "" },
      { "dim": "Eliminacao", "pts": <1-4 ou "?">, "motivo": "" },
      { "dim": "Terapeutica", "pts": <1-4 ou "?">, "motivo": "" },
      { "dim": "Integridade Cutanea", "pts": <1-4 ou "?">, "motivo": "" },
      { "dim": "Curativo", "pts": <1-4 ou "?">, "motivo": "" },
      { "dim": "Tempo Curativo", "pts": <1-4 ou "?">, "motivo": "" }
    ],
    "total": <12-48 ou null>,
    "categoria": "<Cuidados Minimos|Intermediarios|Alta Dependencia|Semi-Intensivos|Intensivos>",
    "horas_enf_24h": <numero>
  },
  "escalas": {
    "glasgow": { "valor": <3-15 ou null>, "classificacao": "<Leve|Moderado|Grave>", "fonte": "<campo>" },
    "braden": { "valor": <6-23 ou null>, "classificacao": "<Sem risco|Risco baixo|Moderado|Alto/Muito alto>", "fonte": "<campo>" },
    "queda": { "escala_utilizada": "<Johns Hopkins|Morse|ambas>", "valor": <numero ou null>, "classificacao": "<Baixo|Moderado|Alto>", "fonte": "<campo>" },
    "risco_integrado_lpp": { "nivel": "<VERDE|AMARELO|LARANJA|VERMELHO|VERMELHO ALTO|CRITICO>", "descricao": "<acao recomendada>" }
  },
  "alertas": [ "<descricao direta e curta do alerta>" ],
  "meta": {
    "versao": "SCP Fugulin + Escalas v3.1",
    "timestamp_utc": "<ISO 8601>",
    "prontuario": "<PT>",
    "atendimento": "<AT>",
    "data_avaliacao": "<dhCriacao>",
    "campos_sem_dados": ["<campos vazios>"],
    "disclaimer": "Ferramenta de apoio. NAO substitui avaliacao de enfermeiro habilitado."
  }
}

=====================================================================
INSTRUCOES DE PROCESSAMENTO
=====================================================================
1. VALIDAR: pelo menos 1 campo clinico textual. Se nenhum: "DADOS INSUFICIENTES".
2. EXTRAIR IDENTIFICADORES: PT/AT do nomePaciente, calcular idade e dias_internacao. NAO incluir nome.
3. EXTRAIR ESCALAS: Glasgow, Braden, Queda - classificar cada uma.
4. AVALIAR 12 DIMENSOES FUGULIN: evidencia→pontuacao→motivo curto.
5. CALCULAR RISCO INTEGRADO: cruzar Fugulin x Braden na matriz.
6. VERIFICAR INCONSISTENCIAS: aplicar todas as regras de validacao.
7. MONTAR RESUMO: bloco autoexplicativo para leitura rapida.
8. VALIDACAO FINAL: nenhum dado pessoal, dimensoes avaliadas, escalas extraidas.`;

  private readonly BATCH_SYSTEM_PROMPT = `Voce e um sistema de classificacao de pacientes hospitalares. Analise MULTIPLOS pacientes de uma vez.

Para cada paciente, produza:
1. Classificacao SCP Fugulin (12 dimensoes, 1-4 cada)
2. Glasgow (3-15), Braden (6-23), Risco de Queda (Johns Hopkins/Morse)
3. Nivel de risco integrado Braden x Fugulin

SIGLAS COMUNS: LOTE=Lucido Orientado | AVP=Acesso Venoso Periferico | SVD=Sonda Vesical | CVC=Cateter Venoso Central | DVA=Drogas Vasoativas | VM=Ventilacao Mecanica | VNI=Ventilacao Nao Invasiva | CN=Cateter Nasal | AA=Ar Ambiente | VO=Via Oral | EV=Intravenoso | SC=Subcutaneo | BIC=Bomba Infusao Continua | ATB=Antibiotico | LPP=Lesao por Pressao | SNE=Sonda Nasoenteral | SNG=Sonda Nasogastrica | GTT=Gastrostomia | NPT=Nutricao Parenteral | HNF=Heparina | BH=Balanco Hidrico | DM=Diabetes

FUGULIN: EstadoMental(Glasgow15+orient=1,G13-14/sonolento=2,G9-12/confuso=3,G<=8/inconsciente=4) | Oxigenacao(AA=1,CN/mascara=2,altofluxo=3,VM/VNI=4) | SinaisVitais(estaveis=1,6/6h=2,4/4h/instavel=3,continuo/DVA=4) | Mobilidade(independente=1,parcial=2,restrito=3,imovel=4) | Deambulacao(WC=1,auxilio=2,cadeira=3,leito=4) | Alimentacao(VO=1,VOauxilio=2,enteral=3,NPT/jejum=4) | CuidadoCorporal(independ=1,parcial=2,banhoLeito=3,depTotal=4) | Eliminacao(WC=1,fralda=2,SVD=3,BH/dialise=4) | Terapeutica(oral=1,oral+parent=2,EVcontinua=3,DVA/bombas=4) | IntegridadeCutanea(integra=1,hematoma/edema=2,LPP1-2=3,LPP3-4=4) | Curativo(sem=1,simples=2,moderado=3,complexo=4) | TempoCurativo(0-15min=1,16-30=2,31-60=3,>60=4)
Categorias: 12-17=Minimos(4h) | 18-22=Intermediarios(6h) | 23-28=AltaDep(10h) | 29-34=SemiIntensivos(10h) | 35-48=Intensivos(18h)

BRADEN x FUGULIN: Minimos+>=19=VERDE | Intermediarios+15-18=LARANJA | AltaDep+<=12=CRITICO | SemiInt/Intensivo+<=14=CRITICO

IMPORTANTE: Retorne um array JSON com analises NA MESMA ORDEM dos pacientes.
NUNCA inclua nome, CPF, RG. Apenas leito e PT/AT.
Cada analise deve seguir o schema do prompt do usuario.`;

  /**
   * Gera chaves de cache para um paciente
   * Prioridade: codigoAtendimento > UUID > leito
   */
  private generateCacheKeys(patient: PatientData): CacheKeyInfo {
    const codigoAtendimento = patient.codigoAtendimento?.toString().trim();
    const patientId = patient.id?.toString().trim();
    const leito = patient.leito?.toString().trim();

    let primaryKey: string;
    if (codigoAtendimento) {
      primaryKey = `unified-clinical:codigo:${codigoAtendimento}`;
    } else if (patientId) {
      primaryKey = `unified-clinical:uuid:${patientId}`;
    } else if (leito) {
      primaryKey = `unified-clinical:leito:${leito}`;
    } else {
      primaryKey = `unified-clinical:unknown:${Date.now()}`;
    }

    return {
      primary: primaryKey,
      legacyUUID: patientId ? `clinical-analysis:${patientId}` : null,
      legacyLeito: leito ? `gpt4o-mini:patient:${leito}:analysis` : null
    };
  }

  /**
   * Gera hash de conteúdo para detecção de mudanças
   */
  private generateContentHash(patient: PatientData): string {
    const relevantData = {
      diagnostico: patient.diagnostico,
      braden: patient.braden,
      mobilidade: patient.mobilidade,
      dispositivos: patient.dispositivos,
      atb: patient.atb,
      observacoes: patient.observacoes,
      dieta: patient.dieta,
      eliminacoes: patient.eliminacoes,
      aporteSaturacao: patient.aporteSaturacao,
      curativos: patient.curativos,
      exames: patient.exames,
      cirurgia: patient.cirurgia,
      previsaoAlta: patient.previsaoAlta,
      alergias: patient.alergias,
      dsEvolucaoCompleta: patient.dsEvolucaoCompleta,
      dsEvolucaoMedica: patient.dsEvolucaoMedica,
      dsAnotacaoEnfermagem: patient.dsAnotacaoEnfermagem
    };
    
    const jsonString = JSON.stringify(relevantData, Object.keys(relevantData).sort());
    return createHash('md5').update(jsonString).digest('hex');
  }

  /**
   * Invalida chaves de cache antigas (legadas) para um paciente
   */
  private invalidateLegacyCache(cacheKeys: CacheKeyInfo): void {
    if (cacheKeys.legacyUUID) {
      intelligentCache.invalidate(cacheKeys.legacyUUID.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    if (cacheKeys.legacyLeito) {
      intelligentCache.invalidate(cacheKeys.legacyLeito.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
  }

  /**
   * Calcula TTL baseado no nível de alerta
   */
  private calculateTTL(nivelAlerta: string): number {
    switch (nivelAlerta) {
      case 'VERMELHO':
        return 15;
      case 'AMARELO':
        return 60;
      case 'VERDE':
        return 240;
      default:
        return 60;
    }
  }

  /**
   * Constrói prompt clínico completo com dados para avaliação Fugulin + Escalas
   */
  private buildClinicalPrompt(patient: PatientData): string {
    const compact: Record<string, any> = {};

    // Campos de identificação
    const idFields = [
      'dsEnfermaria', 'leito', 'dsLeitoCompleto', 'dsEspecialidade',
      'nome', 'dataNascimento', 'sexo', 'dataInternacao', 'dhCriacaoEvolucao', 'codigoAtendimento'
    ];

    // Campos clínicos textuais (fontes primárias)
    const clinicalTextFields = [
      'dsEvolucaoCompleta', 'dsEvolucaoMedica', 'dsAnotacaoEnfermagem'
    ];

    // Campos estruturados (fontes complementares)
    const structuredFields = [
      'braden', 'diagnostico', 'alergias', 'mobilidade', 'dieta', 'eliminacoes',
      'dispositivos', 'atb', 'curativos', 'aporteSaturacao',
      'exames', 'cirurgia', 'observacoes', 'previsaoAlta'
    ];

    for (const field of [...idFields, ...clinicalTextFields, ...structuredFields]) {
      const value = patient[field];
      if (value && value !== '' && value !== 'null' && value !== 'N/A' && value !== 'nao disponivel') {
        // Mapear nomes de campos do banco para nomes esperados pelo prompt
        if (field === 'dsEvolucaoCompleta') {
          compact['dsEvolucao'] = value;
        } else if (field === 'nome') {
          compact['nomePaciente'] = value;
        } else {
          compact[field] = value;
        }
      }
    }

    return `Analise os dados clinicos do paciente abaixo conforme as instrucoes do system prompt (Fugulin + Escalas).
Retorne SOMENTE o JSON especificado.

${JSON.stringify(compact, null, 2)}`;
  }

  /**
   * Mapeia nível de risco integrado Fugulin para nível de alerta do sistema
   */
  private mapRiscoToNivelAlerta(riscoIntegrado: string): "VERMELHO" | "AMARELO" | "VERDE" {
    const risco = (riscoIntegrado || '').toUpperCase();
    if (risco === 'CRITICO' || risco === 'VERMELHO ALTO' || risco === 'VERMELHO') {
      return 'VERMELHO';
    }
    if (risco === 'LARANJA' || risco === 'AMARELO') {
      return 'AMARELO';
    }
    return 'VERDE';
  }

  /**
   * Transforma resposta Fugulin + Escalas em ClinicalInsights
   * Mantém compatibilidade com o formato anterior enquanto adiciona dados Fugulin
   */
  private transformToInsights(analysis: any): ClinicalInsights {
    // Detectar se é resposta no formato Fugulin (novo) ou formato legado
    const isFugulimFormat = !!analysis.resumo && !!analysis.fugulin;

    if (isFugulimFormat) {
      return this.transformFugulimToInsights(analysis);
    }

    // Fallback: formato legado (alertas/score/gaps/prioridades)
    const alertas = analysis.alertas || [];
    const alertasVermelho = alertas.filter((a: any) => a.nivel === 'VERMELHO').length;
    const alertasAmarelo = alertas.filter((a: any) => a.nivel === 'AMARELO').length;
    const alertasVerde = alertas.length - alertasVermelho - alertasAmarelo;

    const nivelAlerta = alertasVermelho > 0
      ? 'VERMELHO'
      : alertasAmarelo > 0
        ? 'AMARELO'
        : 'VERDE';

    return {
      timestamp: new Date().toISOString(),
      nivel_alerta: nivelAlerta,
      alertas_count: {
        vermelho: alertasVermelho,
        amarelo: alertasAmarelo,
        verde: Math.max(0, alertasVerde)
      },
      principais_alertas: alertas.slice(0, 5).map((a: any) => ({
        tipo: a.tipo,
        nivel: a.nivel,
        titulo: a.titulo,
        descricao: a.descricao || ''
      })),
      gaps_criticos: (analysis.gaps || []).slice(0, 5),
      score_qualidade: analysis.score || 0,
      categoria_qualidade: analysis.categoria || 'REGULAR',
      prioridade_acao: analysis.prioridades?.[0]?.acao || null,
      recomendacoes_enfermagem: (analysis.prioridades || [])
        .slice(0, 3)
        .map((p: any) => p.acao)
    };
  }

  /**
   * Transforma resposta no formato Fugulin + Escalas para ClinicalInsights
   */
  private transformFugulimToInsights(analysis: any): ClinicalInsights {
    const resumo = analysis.resumo || {};
    const fugulin = analysis.fugulin || {};
    const escalas = analysis.escalas || {};
    const alertas: string[] = analysis.alertas || [];
    const meta = analysis.meta || {};

    // Determinar nível de alerta baseado no risco integrado e alertas
    const riscoIntegrado = resumo.risco_integrado_lpp || escalas?.risco_integrado_lpp?.nivel || 'VERDE';
    const nivelAlerta = this.mapRiscoToNivelAlerta(riscoIntegrado);

    // Contar alertas por severidade baseado no risco integrado
    const totalAlertas = alertas.length;
    let alertasVermelho = 0;
    let alertasAmarelo = 0;

    if (nivelAlerta === 'VERMELHO') {
      alertasVermelho = Math.max(1, Math.ceil(totalAlertas * 0.6));
      alertasAmarelo = totalAlertas - alertasVermelho;
    } else if (nivelAlerta === 'AMARELO') {
      alertasAmarelo = Math.max(1, totalAlertas);
    }

    // Mapear alertas Fugulin para formato ClinicalAlert
    const principaisAlertas = alertas.slice(0, 5).map((alerta: string) => {
      const alertaLower = alerta.toLowerCase();
      let tipo = 'ALERTA_CLINICO';
      let nivel: string = nivelAlerta;

      if (alertaLower.includes('queda') || alertaLower.includes('deambula') || alertaLower.includes('mobilidade')) {
        tipo = 'RISCO_QUEDA';
        nivel = 'AMARELO';
      } else if (alertaLower.includes('lesao') || alertaLower.includes('lpp') || alertaLower.includes('braden') || alertaLower.includes('pele') || alertaLower.includes('hematoma')) {
        tipo = 'RISCO_LESAO';
        nivel = 'AMARELO';
      } else if (alertaLower.includes('infec') || alertaLower.includes('atb') || alertaLower.includes('sepse')) {
        tipo = 'RISCO_INFECCAO';
        nivel = 'AMARELO';
      } else if (alertaLower.includes('aspira') || alertaLower.includes('deglut')) {
        tipo = 'RISCO_ASPIRACAO';
        nivel = 'VERMELHO';
      } else if (alertaLower.includes('respir') || alertaLower.includes('spo2') || alertaLower.includes('o2')) {
        tipo = 'RISCO_RESPIRATORIO';
        nivel = 'VERMELHO';
      } else if (alertaLower.includes('nutri') || alertaLower.includes('dieta') || alertaLower.includes('jejum')) {
        tipo = 'RISCO_NUTRICIONAL';
        nivel = 'AMARELO';
      } else if (alertaLower.includes('renal') || alertaLower.includes('dialise') || alertaLower.includes('ira') || alertaLower.includes('drc')) {
        tipo = 'RISCO_CLINICO';
        nivel = 'AMARELO';
      }

      return { tipo, nivel, titulo: alerta, descricao: '' };
    });

    // Gaps: campos sem dados do meta
    const gapsCriticos = (meta.campos_sem_dados || []).slice(0, 5);

    // Score baseado na classificação Fugulin (invertido - mais pontos = mais complexo = menor score)
    const fugulimTotal = fugulin.total || 0;
    let scoreQualidade = 80;
    if (fugulimTotal >= 35) scoreQualidade = 30;
    else if (fugulimTotal >= 29) scoreQualidade = 45;
    else if (fugulimTotal >= 23) scoreQualidade = 60;
    else if (fugulimTotal >= 18) scoreQualidade = 70;

    // Categoria baseada no Fugulin
    const categoriaQualidade = fugulin.categoria || 'Cuidados Minimos';

    // Recomendações baseadas nos alertas e risco integrado
    const recomendacoes: string[] = [];
    const riscoLPP = escalas?.risco_integrado_lpp;
    if (riscoLPP?.descricao) {
      recomendacoes.push(riscoLPP.descricao);
    }
    alertas.slice(0, 3).forEach((a: string) => {
      if (!recomendacoes.includes(a)) {
        recomendacoes.push(a);
      }
    });

    // Prioridade de ação baseada no risco mais alto
    let prioridadeAcao: string | null = null;
    if (nivelAlerta === 'VERMELHO' && alertas.length > 0) {
      prioridadeAcao = alertas[0];
    }

    return {
      timestamp: new Date().toISOString(),
      nivel_alerta: nivelAlerta,
      alertas_count: {
        vermelho: alertasVermelho,
        amarelo: alertasAmarelo,
        verde: Math.max(0, totalAlertas - alertasVermelho - alertasAmarelo)
      },
      principais_alertas: principaisAlertas,
      gaps_criticos: gapsCriticos,
      score_qualidade: scoreQualidade,
      categoria_qualidade: categoriaQualidade,
      prioridade_acao: prioridadeAcao,
      recomendacoes_enfermagem: recomendacoes.slice(0, 5),
      // Dados Fugulin + Escalas (novos campos)
      resumo_fugulin: resumo,
      fugulin: {
        dimensoes: (fugulin.dimensoes || []).map((d: any) => ({
          dim: d.dim,
          pts: d.pts,
          motivo: d.motivo
        })),
        total: fugulin.total || null,
        categoria: fugulin.categoria || '',
        horas_enf_24h: fugulin.horas_enf_24h || 0
      },
      escalas: escalas.glasgow ? {
        glasgow: escalas.glasgow,
        braden: escalas.braden,
        queda: escalas.queda,
        risco_integrado_lpp: escalas.risco_integrado_lpp
      } : undefined,
      alertas_fugulin: alertas
    };
  }

  /**
   * Chama GPT-4o para análise clínica individual (Fugulin + Escalas)
   */
  private async callGPT4o(patient: PatientData): Promise<ClinicalInsights> {
    const userPrompt = this.buildClinicalPrompt(patient);

    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: this.COMPACT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        stream: false
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia do GPT-4o');
      }

      const analysis = JSON.parse(content);
      return this.transformToInsights(analysis);

    } catch (error) {
      console.error('[UnifiedClinicalAnalysis] Erro na chamada:', error);
      throw error;
    }
  }

  /**
   * Constrói prompt para múltiplos pacientes (batch real) com dados Fugulin
   */
  private buildBatchPrompt(patients: PatientData[]): string {
    const patientsData = patients.map((patient, index) => {
      const compact: Record<string, any> = { _index: index };

      const fields = [
        'dsEnfermaria', 'leito', 'dsLeitoCompleto', 'dsEspecialidade',
        'nome', 'dataNascimento', 'sexo', 'dataInternacao', 'codigoAtendimento',
        'dsEvolucaoCompleta', 'dsEvolucaoMedica', 'dsAnotacaoEnfermagem',
        'braden', 'diagnostico', 'alergias', 'mobilidade', 'dieta', 'eliminacoes',
        'dispositivos', 'atb', 'curativos', 'aporteSaturacao',
        'exames', 'cirurgia', 'observacoes', 'previsaoAlta'
      ];

      for (const field of fields) {
        const value = patient[field];
        if (value && value !== '' && value !== 'null' && value !== 'N/A' && value !== 'nao disponivel') {
          if (field === 'dsEvolucaoCompleta') {
            compact['dsEvolucao'] = value;
          } else if (field === 'nome') {
            compact['nomePaciente'] = value;
          } else {
            compact[field] = value;
          }
        }
      }

      return compact;
    });

    return `Analise ${patients.length} pacientes. Para cada um, aplique Fugulin + Escalas.
${JSON.stringify(patientsData)}

Retorne JSON com array "analises" contendo ${patients.length} objetos NA MESMA ORDEM. Cada objeto com:
{
  "analises": [
    {
      "resumo": { "leito":"", "enfermaria":"", "especialidade":"", "idade":0, "sexo":"", "dias_internacao":0, "diagnostico":"", "fugulin":"", "glasgow":"", "braden":"", "queda":"", "risco_integrado_lpp":"", "total_alertas":0 },
      "fugulin": { "dimensoes": [{"dim":"","pts":0,"motivo":""}], "total":0, "categoria":"", "horas_enf_24h":0 },
      "escalas": { "glasgow":{"valor":0,"classificacao":"","fonte":""}, "braden":{"valor":0,"classificacao":"","fonte":""}, "queda":{"escala_utilizada":"","valor":0,"classificacao":"","fonte":""}, "risco_integrado_lpp":{"nivel":"","descricao":""} },
      "alertas": [""],
      "meta": { "versao":"SCP Fugulin + Escalas v3.1", "prontuario":"", "atendimento":"", "campos_sem_dados":[], "disclaimer":"Ferramenta de apoio." }
    }
  ]
}`;
  }

  /**
   * Chama GPT-4o para múltiplos pacientes em UMA ÚNICA chamada (batch)
   * Inclui avaliação Fugulin + Escalas para cada paciente
   */
  private async callGPT4oBatch(patients: PatientData[]): Promise<ClinicalInsights[]> {
    const userPrompt = this.buildBatchPrompt(patients);
    const startTime = Date.now();

    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: this.BATCH_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0,
        max_tokens: 16000,
        response_format: { type: "json_object" },
        stream: false
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia do GPT-4o (batch)');
      }

      const parsed = JSON.parse(content);
      const analises = parsed.analises || parsed.analyses || [];
      
      if (analises.length !== patients.length) {
        console.warn(`[UnifiedClinicalAnalysis] ⚠️ Batch retornou ${analises.length} análises para ${patients.length} pacientes`);
      }

      const results: ClinicalInsights[] = [];
      for (let i = 0; i < patients.length; i++) {
        const analysis = analises[i];
        if (analysis) {
          results.push(this.transformToInsights(analysis));
        } else {
          results.push(this.createDefaultInsights());
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[UnifiedClinicalAnalysis] ✅ Batch de ${patients.length} pacientes processado em ${duration}ms (1 chamada API)`);

      return results;

    } catch (error) {
      console.error('[UnifiedClinicalAnalysis] Erro no batch:', error);
      throw error;
    }
  }

  /**
   * Cria insights padrão quando a análise falha
   */
  private createDefaultInsights(): ClinicalInsights {
    return {
      timestamp: new Date().toISOString(),
      nivel_alerta: 'AMARELO',
      alertas_count: { vermelho: 0, amarelo: 1, verde: 0 },
      principais_alertas: [{
        tipo: 'ANALISE_INCOMPLETA',
        nivel: 'AMARELO',
        titulo: 'Análise não disponível',
        descricao: 'Não foi possível analisar este paciente'
      }],
      gaps_criticos: [],
      score_qualidade: 50,
      categoria_qualidade: 'REGULAR',
      prioridade_acao: null,
      recomendacoes_enfermagem: []
    };
  }

  /**
   * MÉTODO PRINCIPAL: Análise clínica unificada
   * 
   * Usado tanto pelo batch sync quanto pela análise individual.
   * Retorna insights + flag indicando se veio do cache.
   */
  async analyze(
    patient: PatientData,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const useCache = options.useCache !== false;
    const forceRefresh = options.forceRefresh || false;
    const caller = options.caller || 'auto';

    this.metrics.totalCalls++;

    const cacheKeys = this.generateCacheKeys(patient);
    const contentHash = this.generateContentHash(patient);
    const patientIdentifier = patient.codigoAtendimento || patient.leito || patient.id || 'unknown';

    if (useCache && !forceRefresh) {
      const cached = intelligentCache.get<ClinicalInsights>(
        cacheKeys.primary,
        contentHash
      );
      
      if (cached) {
        this.metrics.cachedCalls++;
        this.metrics.tokensSaved += 3500;
        this.metrics.estimatedSavings += 0.03;
        
        console.log(`[UnifiedClinicalAnalysis] ✅ Cache HIT: ${patientIdentifier} (caller: ${caller})`);
        return { insights: cached, fromCache: true };
      }
    }

    this.metrics.actualAPICalls++;

    try {
      const insights = await this.callGPT4o(patient);

      if (useCache) {
        this.invalidateLegacyCache(cacheKeys);

        const criticality = insights.nivel_alerta === 'VERMELHO' ? 'critical' : 
                           insights.nivel_alerta === 'AMARELO' ? 'high' : 'medium';
        
        intelligentCache.set(cacheKeys.primary, insights, {
          contentHash,
          ttlMinutes: this.calculateTTL(insights.nivel_alerta),
          criticality
        });
      }

      this.metrics.tokensUsed += 3500;
      this.metrics.estimatedCost += 0.03;

      console.log(`[UnifiedClinicalAnalysis] ✅ Análise concluída: ${patientIdentifier} - ${insights.nivel_alerta} (caller: ${caller})`);
      return { insights, fromCache: false };

    } catch (error) {
      console.error('[UnifiedClinicalAnalysis] Erro na análise:', error);
      throw error;
    }
  }

  /**
   * Análise em lote otimizada com BATCH REAL
   * Envia múltiplos pacientes em UMA ÚNICA chamada à API (não N chamadas)
   * 
   * ANTES: 35 pacientes = 35 chamadas API = ~105s
   * DEPOIS: 35 pacientes = 4 chamadas API = ~12s
   */
  async analyzeBatch(
    patients: PatientData[],
    options?: { useCache?: boolean }
  ): Promise<ClinicalInsights[]> {
    const startTime = Date.now();
    const useCache = options?.useCache !== false;
    
    console.log(`[UnifiedClinicalAnalysis] 🚀 Processando ${patients.length} pacientes com BATCH REAL...`);
    
    const results: (ClinicalInsights | null)[] = new Array(patients.length).fill(null);
    const patientsToAnalyze: { index: number; patient: PatientData; cacheKeys: CacheKeyInfo; contentHash: string }[] = [];
    let cachedCount = 0;
    
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const cacheKeys = this.generateCacheKeys(patient);
      const contentHash = this.generateContentHash(patient);
      
      this.metrics.totalCalls++;
      
      if (useCache) {
        const cached = intelligentCache.get<ClinicalInsights>(cacheKeys.primary, contentHash);
        if (cached) {
          results[i] = cached;
          this.metrics.cachedCalls++;
          this.metrics.tokensSaved += 3500;
          this.metrics.estimatedSavings += 0.03;
          cachedCount++;
          continue;
        }
      }
      
      patientsToAnalyze.push({ index: i, patient, cacheKeys, contentHash });
    }
    
    console.log(`[UnifiedClinicalAnalysis] 📊 Cache: ${cachedCount}/${patients.length} | Para analisar: ${patientsToAnalyze.length}`);
    
    if (patientsToAnalyze.length > 0) {
      const batchSize = 10;
      const totalBatches = Math.ceil(patientsToAnalyze.length / batchSize);
      
      const batches: typeof patientsToAnalyze[] = [];
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, patientsToAnalyze.length);
        batches.push(patientsToAnalyze.slice(batchStart, batchEnd));
      }
      
      console.log(`[UnifiedClinicalAnalysis] 🚀 Processando ${totalBatches} lotes EM PARALELO...`);
      
      const batchPromises = batches.map(async (currentBatch, batchIndex) => {
        const batchStartTime = Date.now();
        console.log(`[UnifiedClinicalAnalysis] 🔄 Lote ${batchIndex + 1}/${totalBatches} iniciando (${currentBatch.length} pacientes)...`);
        
        try {
          const batchPatients = currentBatch.map(item => item.patient);
          const batchInsights = await this.callGPT4oBatch(batchPatients);
          
          const batchDuration = Date.now() - batchStartTime;
          console.log(`[UnifiedClinicalAnalysis] ✅ Lote ${batchIndex + 1} concluído em ${batchDuration}ms`);
          
          return { batchIndex, currentBatch, batchInsights, success: true };
        } catch (error) {
          console.error(`[UnifiedClinicalAnalysis] ❌ Erro no lote ${batchIndex + 1}:`, error);
          return { batchIndex, currentBatch, batchInsights: [] as ClinicalInsights[], success: false };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const { currentBatch, batchInsights, success } of batchResults) {
        this.metrics.actualAPICalls++;
        this.metrics.tokensUsed += 3500 * currentBatch.length;
        this.metrics.estimatedCost += 0.03 * currentBatch.length;
        
        for (let j = 0; j < currentBatch.length; j++) {
          const item = currentBatch[j];
          const insights = success ? (batchInsights[j] || this.createDefaultInsights()) : this.createDefaultInsights();
          
          results[item.index] = insights;
          
          if (useCache && success) {
            this.invalidateLegacyCache(item.cacheKeys);
            const criticality = insights.nivel_alerta === 'VERMELHO' ? 'critical' : 
                               insights.nivel_alerta === 'AMARELO' ? 'high' : 'medium';
            intelligentCache.set(item.cacheKeys.primary, insights, {
              contentHash: item.contentHash,
              ttlMinutes: this.calculateTTL(insights.nivel_alerta),
              criticality
            });
          }
          
          const patientId = item.patient.codigoAtendimento || item.patient.leito || 'unknown';
          console.log(`[UnifiedClinicalAnalysis] ✅ ${patientId} - ${insights.nivel_alerta}`);
        }
      }
    }
    
    const duration = Date.now() - startTime;
    const apiCalls = Math.ceil(patientsToAnalyze.length / 10);
    console.log(`[UnifiedClinicalAnalysis] ✅ BATCH COMPLETO: ${patients.length} pacientes em ${duration}ms (${apiCalls} chamadas API vs ${patientsToAnalyze.length} antes)`);
    
    return results.map(r => r || this.createDefaultInsights());
  }

  /**
   * Invalida cache de um paciente específico (por qualquer identificador)
   */
  invalidatePatientCache(patient: PatientData): void {
    const cacheKeys = this.generateCacheKeys(patient);
    
    intelligentCache.invalidate(cacheKeys.primary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    this.invalidateLegacyCache(cacheKeys);
    
    console.log(`[UnifiedClinicalAnalysis] Cache invalidado para: ${patient.codigoAtendimento || patient.leito || patient.id}`);
  }

  /**
   * Retorna métricas
   */
  getMetrics(): CostMetrics & {
    cacheHitRate: number;
    savingsPercentage: number;
    averageCost: number;
  } {
    const cacheHitRate = this.metrics.totalCalls > 0
      ? (this.metrics.cachedCalls / this.metrics.totalCalls) * 100
      : 0;

    const totalCostWithoutCache = this.metrics.totalCalls * 0.03;
    const savingsPercentage = totalCostWithoutCache > 0
      ? (this.metrics.estimatedSavings / totalCostWithoutCache) * 100
      : 0;

    const averageCost = this.metrics.totalCalls > 0
      ? this.metrics.estimatedCost / this.metrics.totalCalls
      : 0;

    return {
      ...this.metrics,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      savingsPercentage: Math.round(savingsPercentage * 100) / 100,
      averageCost: Math.round(averageCost * 1000) / 1000
    };
  }

  resetMetrics(): void {
    this.metrics = {
      totalCalls: 0,
      cachedCalls: 0,
      actualAPICalls: 0,
      tokensUsed: 0,
      tokensSaved: 0,
      estimatedCost: 0,
      estimatedSavings: 0
    };
  }
}

export const unifiedClinicalAnalysisService = new UnifiedClinicalAnalysisService();
