# Especificação Técnica: Webhook N8N para Evolução de Pacientes

## Documento de Integração - 11Care Nursing Platform

**Versão:** 2.0  
**Data:** Dezembro 2025  
**URL:** https://dev-n8n.7care.com.br/webhook/evolucoes

---

## 1. Requisição

### 1.1 Payload de Entrada

```json
{
  "flowId": "10A",
  "forceUpdate": false,
  "meta": {
    "params": ["22,23"],
    "formJson": {
      "dsEpecialid": "especialidade do paciente",
      "braden": "escala braden",
      "diagnostico": "diagnostico do paciente",
      "alergias": "alergias reportadas",
      "mobilidade": "questoes relacionadas à mobilidade do paciente",
      "dieta": "questoes referentes a alimentação do paciente",
      "eliminacoes": "questões referentes a eliminações do paciente",
      "dispositivos": "dispositivos em uso pelo paciente",
      "atb": "antibioticos em uso",
      "curativos": "informações sobre curativos",
      "aporteSaturacao": "informações sobre aporte e saturação",
      "exames": "informaçoes sobre exames realizados e pendentes",
      "cirurgia": "informações sobre cirurgia programada",
      "observacoes": "informações sobre observações e intercorrencias",
      "previsaoAlta": "informações sobre previsão de alta"
    }
  }
}
```

### 1.2 Parâmetros

| Campo | Descrição |
|-------|-----------|
| `flowId` | Identificador do fluxo (ex: "10A") |
| `forceUpdate` | Se true, força atualização dos dados no N8N |
| `meta.params` | IDs das unidades de internação (ex: ["22,23"]) |
| `meta.formJson` | Campos solicitados com descrição semântica |

---

## 2. Resposta

### 2.1 Estrutura JSON Normalizada

O webhook retorna um **array de objetos** com campos normalizados:

```json
[
  {
    "dsEnfermaria": "10A17",
    "dsLeito": "10A1733",
    "leito": "33",
    "dsEpecialid": "CARDIOLOGIA",
    "nomePaciente": "CLEOPATRA AFANASENKO SILVA   PT: 3198597 AT: 10114118",
    "dataInternacao": "13/12/2025",
    "dhCriacao": "15/12/2025 04:20",
    "cdPrestador": 133684,
    "braden": "",
    "diagnostico": "Angina Instável",
    "alergias": "Nega",
    "mobilidade": "Paciente com pulseira de risco de queda. Sem déficits motores...",
    "dieta": "Aceitação parcial da dieta",
    "eliminacoes": "Eliminações vesicais presentes. Evacuações presentes.",
    "dispositivos": "Pulseira de identificação e risco de queda. Sem AVP",
    "atb": "S/ATB",
    "curativos": "Pele íntegra. Sem necessidade de curativos.",
    "aporteSaturacao": "Paciente em ar ambiente (A.A), eupneico.",
    "exames": "Sem informações sobre exames realizados ou pendentes",
    "cirurgia": "Sem informações sobre cirurgia programada",
    "observacoes": "Paciente normotensa, normocárdica, afebril...",
    "previsaoAlta": "Sem informações sobre previsão de alta"
  }
]
```

### 2.2 Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `dsEnfermaria` | string | Código da enfermaria (ex: "10A17") |
| `dsLeito` | string | Leito completo (ex: "10A1733") |
| `leito` | string | Número do leito (ex: "33") |
| `dsEpecialid` | string | Especialidade médica |
| `nomePaciente` | string | Nome com PT: e AT: |
| `dataInternacao` | string | Data de internação (DD/MM/YYYY) |
| `dhCriacao` | string | Data/hora criação da evolução |
| `cdPrestador` | number | Código do prestador |
| `braden` | string | Escala Braden |
| `diagnostico` | string | Diagnóstico principal |
| `alergias` | string | Alergias reportadas |
| `mobilidade` | string | Estado de mobilidade |
| `dieta` | string | Informações sobre dieta |
| `eliminacoes` | string | Eliminações |
| `dispositivos` | string | Dispositivos em uso |
| `atb` | string | Antibióticos |
| `curativos` | string | Curativos |
| `aporteSaturacao` | string | Aporte e saturação |
| `exames` | string | Exames realizados/pendentes |
| `cirurgia` | string | Cirurgia programada |
| `observacoes` | string | Observações e intercorrências |
| `previsaoAlta` | string | Previsão de alta |

---

## 3. Mapeamento para Schema do Paciente

| Campo N8N | Campo Paciente |
|-----------|----------------|
| `dsEnfermaria` | `dsEnfermaria` |
| `dsLeito` | `dsLeitoCompleto` |
| `leito` | `leito` |
| `dsEpecialid` | `especialidadeRamal`, `dsEspecialidade` |
| `nomePaciente` | `nome` (extraído), `registro` (PT:), `codigoAtendimento` (AT:) |
| `dataInternacao` | `dataInternacao` |
| `dhCriacao` | `dhCriacaoEvolucao` |
| `braden` | `braden` |
| `diagnostico` | `diagnostico` |
| `alergias` | `alergias` |
| `mobilidade` | `mobilidade` |
| `dieta` | `dieta` |
| `eliminacoes` | `eliminacoes` |
| `dispositivos` | `dispositivos` |
| `atb` | `atb` |
| `curativos` | `curativos` |
| `aporteSaturacao` | `aporteSaturacao` |
| `exames` | `exames` |
| `cirurgia` | `cirurgia` |
| `observacoes` | `observacoes` |
| `previsaoAlta` | `previsaoAlta` |

---

*Documento atualizado em Dezembro 2025 - 11Care Nursing Platform v2.0*
