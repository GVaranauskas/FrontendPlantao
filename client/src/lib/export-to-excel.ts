import * as XLSX from "xlsx";
import type { Patient } from "@shared/schema";

export function exportPatientsToExcel(patients: Patient[]) {
  // Preparar dados para exportação
  const data = patients.map((p) => ({
    LEITO: p.leito,
    "ESPECIALIDADE/RAMAL": p.especialidadeRamal || "-",
    NOME: p.nome,
    REGISTRO: p.registro || "-",
    "DATA NASCIMENTO": p.dataNascimento || "-",
    "DATA INTERNAÇÃO": p.dataInternacao || "-",
    "RQ BRADEN SCP": p.rqBradenScp || "-",
    "DIAGNÓSTICO/COMORBIDADES": p.diagnosticoComorbidades || "-",
    ALERGIAS: p.alergias || "-",
    MOBILIDADE: p.mobilidade || "-",
    DIETA: p.dieta || "-",
    ELIMINAÇÕES: p.eliminacoes || "-",
    DISPOSITIVOS: p.dispositivos || "-",
    ATB: p.atb || "-",
    CURATIVOS: p.curativos || "-",
    "APORTE E SATURAÇÃO": p.aporteSaturacao || "-",
    "EXAMES REALIZADOS/PENDENTES": p.examesRealizadosPendentes || "-",
    "DATA PROGRAMAÇÃO CIRÚRGICA": p.dataProgramacaoCirurgica || "-",
    "OBSERVAÇÕES/INTERCORRÊNCIAS": p.observacoesIntercorrencias || "-",
    "PREVISÃO DE ALTA": p.previsaoAlta || "-",
    STATUS: p.status || "-",
  }));

  // Criar workbook
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pacientes");

  // Ajustar largura das colunas
  const columnWidths = [
    { wch: 8 }, // LEITO
    { wch: 20 }, // ESPECIALIDADE
    { wch: 25 }, // NOME
    { wch: 12 }, // REGISTRO
    { wch: 15 }, // DATA NASCIMENTO
    { wch: 15 }, // DATA INTERNAÇÃO
    { wch: 15 }, // RQ BRADEN
    { wch: 25 }, // DIAGNÓSTICO
    { wch: 20 }, // ALERGIAS
    { wch: 12 }, // MOBILIDADE
    { wch: 15 }, // DIETA
    { wch: 15 }, // ELIMINAÇÕES
    { wch: 20 }, // DISPOSITIVOS
    { wch: 10 }, // ATB
    { wch: 15 }, // CURATIVOS
    { wch: 20 }, // APORTE
    { wch: 25 }, // EXAMES
    { wch: 20 }, // PROGRAMAÇÃO
    { wch: 30 }, // OBSERVAÇÕES
    { wch: 20 }, // PREVISÃO
    { wch: 12 }, // STATUS
  ];
  ws["!cols"] = columnWidths;

  // Gerar nome do arquivo
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `passagem-plantao-${timestamp}.xlsx`;

  // Download
  XLSX.writeFile(wb, filename);
}
