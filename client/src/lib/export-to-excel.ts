import ExcelJS from "exceljs/dist/exceljs.min.js";
import type { Patient } from "@shared/schema";

export async function exportPatientsToExcel(patients: Patient[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Pacientes");

  worksheet.columns = [
    { header: "LEITO", key: "leito", width: 8 },
    { header: "ESPECIALIDADE/RAMAL", key: "especialidadeRamal", width: 20 },
    { header: "NOME", key: "nome", width: 25 },
    { header: "REGISTRO", key: "registro", width: 12 },
    { header: "DATA NASCIMENTO", key: "dataNascimento", width: 15 },
    { header: "DATA INTERNAÇÃO", key: "dataInternacao", width: 15 },
    { header: "BRADEN", key: "braden", width: 15 },
    { header: "DIAGNÓSTICO", key: "diagnostico", width: 25 },
    { header: "ALERGIAS", key: "alergias", width: 20 },
    { header: "MOBILIDADE", key: "mobilidade", width: 30 },
    { header: "DIETA", key: "dieta", width: 15 },
    { header: "ELIMINAÇÕES", key: "eliminacoes", width: 15 },
    { header: "DISPOSITIVOS", key: "dispositivos", width: 20 },
    { header: "ATB", key: "atb", width: 10 },
    { header: "CURATIVOS", key: "curativos", width: 15 },
    { header: "APORTE E SATURAÇÃO", key: "aporteSaturacao", width: 20 },
    { header: "EXAMES", key: "exames", width: 25 },
    { header: "CIRURGIA", key: "cirurgia", width: 20 },
    { header: "OBSERVAÇÕES", key: "observacoes", width: 30 },
    { header: "PREVISÃO DE ALTA", key: "previsaoAlta", width: 20 },
    { header: "STATUS", key: "status", width: 12 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0056B3" },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  patients.forEach((p) => {
    worksheet.addRow({
      leito: p.leito,
      especialidadeRamal: p.especialidadeRamal || "-",
      nome: p.nome,
      registro: p.registro || "-",
      dataNascimento: p.dataNascimento || "-",
      dataInternacao: p.dataInternacao || "-",
      braden: p.braden || "-",
      diagnostico: p.diagnostico || "-",
      alergias: p.alergias || "-",
      mobilidade: p.mobilidade || "-",
      dieta: p.dieta || "-",
      eliminacoes: p.eliminacoes || "-",
      dispositivos: p.dispositivos || "-",
      atb: p.atb || "-",
      curativos: p.curativos || "-",
      aporteSaturacao: p.aporteSaturacao || "-",
      exames: p.exames || "-",
      cirurgia: p.cirurgia || "-",
      observacoes: p.observacoes || "-",
      previsaoAlta: p.previsaoAlta || "-",
      status: p.status || "-",
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const timestamp = new Date().toISOString().split("T")[0];
  a.download = `passagem-plantao-${timestamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
