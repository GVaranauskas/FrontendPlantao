# Especificação Técnica: Webhook N8N para Evolução de Pacientes

## Documento de Integração - 11Care Nursing Platform

**Versão:** 1.0  
**Data:** Dezembro 2025  
**Para:** Equipe N8N / 7Care  
**De:** Equipe 11Care

---

## 1. Contexto do Problema

### 1.1 Situação Atual

O webhook atual (`https://dev-n8n.7care.com.br/webhook/evolucoes`) está retornando estruturas JSON variáveis dependendo do paciente, template ou formulário de origem. Isso causa:

- **Campos vazios** na passagem de plantão mesmo quando os dados existem no JSON
- **Manutenção contínua** no backend para adicionar novos caminhos de extração
- **Incompatibilidade** com operações de escala (1000+ pacientes/dia)

### 1.2 Causa Raiz

O `formJson` enviado na requisição foi originalmente projetado como um **contrato de campos**, mas o novo workflow N8N:

1. **Ignora o formJson** como mapeamento de campos
2. **Repassa dados brutos** dos sistemas upstream (prontuário eletrônico)
3. **Não normaliza** as estruturas variáveis antes de retornar

### 1.3 Exemplos de Variação Observada

**Paciente A** - Estrutura `paciente.estado`:
```json
{
  "paciente": {
    "estado": {
      "manutencao": {
        "AVP": "MSD inserção limpa",
        "curativo": "limpo e seco"
      }
    }
  }
}
```

**Paciente B** - Estrutura `evolucao.condicao_fisica`:
```json
{
  "evolucao": {
    "condicao_fisica": {
      "avp": { "data": "09/12", "membro": "MSD", "estado": "inserção limpa" },
      "curativo": { "estado": "limpo e seco" },
      "aceitação_alimentar": "boa aceitação"
    },
    "estado_consciente": "orientada",
    "queixas": ["dor", "insônia"]
  },
  "dsEvolucao": "HD : Revisão de ATQ D9..."
}
```

---

## 2. Solução Proposta

### 2.1 Normalização no Workflow N8N

Adicionar um **nó de normalização** no workflow N8N que:

1. Receba os dados brutos de qualquer estrutura upstream
2. Extraia os valores relevantes de todos os caminhos possíveis
3. Retorne um JSON com estrutura **fixa e padronizada**

### 2.2 Diagrama de Fluxo

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Sistema Origem │────>│  Nó Normalização │────>│  Webhook Output │
│  (Estrutura     │     │  (Mapeia para    │     │  (Estrutura     │
│   Variável)     │     │   Schema Fixo)   │     │   Padronizada)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## 3. Schema de Saída Padronizado

### 3.1 Estrutura JSON Esperada

O webhook deve **sempre** retornar esta estrutura, mesmo que alguns campos estejam vazios:

```json
{
  "versao_schema": "1.0",
  "timestamp": "2025-12-12T10:30:00Z",
  
  "identificacao": {
    "leito": "10A02",
    "leito_completo": "10A02",
    "enfermaria": "10A",
    "nome_paciente": "MARIA DA SILVA",
    "registro": "123456",
    "codigo_atendimento": "789012",
    "data_nascimento": "15/03/1950",
    "data_internacao": "10/12/2025"
  },
  
  "clinico": {
    "especialidade": "ORTOPEDIA",
    "diagnostico": "Revisão de ATQ D9 LUXAÇÃO",
    "comorbidades": "HAS, DM2",
    "alergias": "Dipirona",
    "braden": "18",
    "mobilidade": "ACAMADO"
  },
  
  "cuidados": {
    "dieta": "Branda, boa aceitação",
    "eliminacoes": "Diurese espontânea, evacuação presente",
    "dispositivos": "AVP MSD (09/12) inserção limpa",
    "atb": "Ceftriaxona 1g 12/12h - D3",
    "curativos": "Ferida operatória limpa e seca",
    "aporte_saturacao": "AA, SpO2 97%"
  },
  
  "monitoramento": {
    "exames": "Hemograma pendente",
    "observacoes": "Orientada, queixa de dor e insônia",
    "intercorrencias": ""
  },
  
  "planejamento": {
    "cirurgia_programada": "",
    "previsao_alta": "14/12/2025"
  },
  
  "evolucao": {
    "id_evolucao": "EVO-2025-123456",
    "dh_criacao": "2025-12-12T08:00:00Z",
    "texto_completo": "HD : Revisão de ATQ D9 LUXAÇÃO. Paciente..."
  },
  
  "dados_brutos": {
    // Objeto original para debug/auditoria
  }
}
```

### 3.2 Descrição dos Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `versao_schema` | string | Sim | Versão do schema para controle de compatibilidade |
| `identificacao.leito` | string | Sim | Número do leito (ex: "02", "10A02") |
| `identificacao.nome_paciente` | string | Sim | Nome completo sem PT:/AT: |
| `identificacao.registro` | string | Sim | Número do prontuário (PT) |
| `clinico.diagnostico` | string | Não | HD ou diagnóstico principal |
| `clinico.mobilidade` | string | Não | "ACAMADO", "DEAMBULA", ou "DEAMBULA COM AUXÍLIO" |
| `cuidados.dispositivos` | string | Não | AVP, sondas, drenos com datas |
| `cuidados.dieta` | string | Não | Tipo de dieta e aceitação |
| `cuidados.curativos` | string | Não | Estado dos curativos |
| `monitoramento.observacoes` | string | Não | Estado de consciência, queixas |

### 3.3 Regras de Normalização

O nó de normalização deve aplicar estas regras:

#### Dispositivos (AVP)
```javascript
// Entrada variável:
paciente.estado.manutencao.AVP
evolucao.condicao_fisica.avp.estado
evolucao.condicao_fisica.avp (objeto com data, membro, estado)

// Saída padronizada:
cuidados.dispositivos = "AVP MSD (09/12) inserção limpa"
```

#### Dieta
```javascript
// Entrada variável:
paciente.estado.dieta
evolucao.condicao_fisica.aceitação_alimentar
evolucao.condicao_fisica.aceitacao_alimentar

// Saída padronizada:
cuidados.dieta = "Branda, boa aceitação do café da manhã"
```

#### Diagnóstico
```javascript
// Entrada variável:
paciente.intervencao
historico.diagnostico
dsEvolucao (extrair após "HD :" ou "HD:")

// Saída padronizada:
clinico.diagnostico = "Revisão de ATQ D9 LUXAÇÃO"
```

#### Observações
```javascript
// Entrada variável:
paciente.estado.consciência
evolucao.estado_consciente
evolucao.queixas (array)
paciente.observacoes.deficit_auditivo

// Saída padronizada:
monitoramento.observacoes = "Orientada | Queixas: dor, insônia | Déficit auditivo: sim"
```

---

## 4. Requisição do Webhook

### 4.1 Payload de Entrada

O payload enviado pelo 11Care permanece o mesmo:

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

### 4.2 Uso do formJson

O `formJson` deve ser usado pelo nó de normalização como:

1. **Lista de campos requeridos** - Todos esses campos devem existir na saída
2. **Contexto semântico** - Os valores descrevem o que cada campo significa para extração via IA/NLP

---

## 5. Validação e Monitoramento

### 5.1 Validação de Schema

O 11Care irá validar cada resposta contra o schema. Respostas inválidas serão:

1. Logadas para análise
2. Rejeitadas com erro específico
3. Reportadas via métricas

### 5.2 Métricas Sugeridas

O N8N deve monitorar:

- Taxa de sucesso de normalização por template de origem
- Campos vazios por tipo de paciente
- Erros de parsing/extração
- Latência do nó de normalização

---

## 6. Versionamento

### 6.1 Controle de Versão

O campo `versao_schema` permite evolução controlada:

- **1.0**: Schema inicial (este documento)
- **1.1+**: Adição de campos opcionais (retrocompatível)
- **2.0+**: Mudanças estruturais (requer atualização do cliente)

### 6.2 Deprecação

Mudanças no schema devem ser comunicadas com 30 dias de antecedência.

---

## 7. Cronograma Sugerido

| Fase | Ação | Prazo |
|------|------|-------|
| 1 | Revisão deste documento pela equipe N8N | 3 dias |
| 2 | Implementação do nó de normalização | 5 dias |
| 3 | Testes em ambiente de homologação | 3 dias |
| 4 | Validação com amostra de 100 pacientes | 2 dias |
| 5 | Deploy em produção | 1 dia |

---

## 8. Contatos

**11Care (Consumidor do Webhook)**
- Responsável: [Seu nome]
- Email: [Email]

**N8N/7Care (Provedor do Webhook)**
- Responsável: [Nome]
- Email: [Email]

---

## Anexo A: Mapeamento Completo de Caminhos

Tabela de todos os caminhos JSON observados e como devem ser normalizados:

| Caminho Origem | Campo Destino |
|----------------|---------------|
| `paciente.estado.manutencao.AVP` | `cuidados.dispositivos` |
| `evolucao.condicao_fisica.avp` | `cuidados.dispositivos` |
| `evolucao.condicao_fisica.avp.data` | `cuidados.dispositivos` (incluir data) |
| `evolucao.condicao_fisica.avp.membro` | `cuidados.dispositivos` (incluir membro) |
| `paciente.estado.dieta` | `cuidados.dieta` |
| `evolucao.condicao_fisica.aceitação_alimentar` | `cuidados.dieta` |
| `evolucao.condicao_fisica.aceitacao_alimentar` | `cuidados.dieta` |
| `paciente.estado.manutencao.curativo` | `cuidados.curativos` |
| `evolucao.condicao_fisica.curativo` | `cuidados.curativos` |
| `evolucao.condicao_fisica.curativo.estado` | `cuidados.curativos` |
| `paciente.intervencao` | `clinico.diagnostico` |
| `dsEvolucao` (regex "HD :") | `clinico.diagnostico` |
| `historico.diagnostico` | `clinico.diagnostico` |
| `paciente.estado.consciência` | `monitoramento.observacoes` |
| `evolucao.estado_consciente` | `monitoramento.observacoes` |
| `evolucao.queixas` | `monitoramento.observacoes` |
| `paciente.observacoes.deficit_auditivo` | `monitoramento.observacoes` |
| `paciente.observacoes.risco_quedas` | `monitoramento.observacoes` |

---

*Documento gerado automaticamente pelo 11Care Nursing Platform*
