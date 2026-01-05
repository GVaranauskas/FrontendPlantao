import { Patient } from "@shared/schema";

// HTML escape function to prevent XSS
function escapeHtml(text: string | null | undefined): string {
  if (text === null || text === undefined) return '-';
  const str = String(text);
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return str.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}

export function printShiftHandover(patients: Patient[]) {
  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  
  if (!printWindow) {
    alert('Por favor, permita popups para imprimir o relatório.');
    return;
  }

  const timestamp = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Calculate age from birth date
  const calculateAge = (birthDateStr: string | null): string => {
    if (!birthDateStr) return '-';
    try {
      const parts = birthDateStr.split('/');
      if (parts.length !== 3) return '-';
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const birthDate = new Date(year, month, day);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return `${age} anos`;
    } catch {
      return '-';
    }
  };

  // Generate table rows with HTML escaping for security
  const tableRows = patients.map(patient => {
    const insights = patient.clinicalInsights as { nivel_alerta?: string } | null;
    const alertaIA = escapeHtml(insights?.nivel_alerta);
    const alertaColor = alertaIA === 'VERMELHO' ? '#dc2626' : alertaIA === 'AMARELO' ? '#ca8a04' : alertaIA === 'VERDE' ? '#16a34a' : '#666';
    
    return `
      <tr>
        <td class="leito">${escapeHtml(patient.leito)}</td>
        <td class="center" style="color: ${alertaColor}; font-weight: bold;">${alertaIA}</td>
        <td class="center">${escapeHtml(patient.dsEnfermaria)}</td>
        <td>${escapeHtml(patient.especialidadeRamal)}</td>
        <td><strong>${escapeHtml(patient.nome)}</strong><br/>REG: ${escapeHtml(patient.registro)}<br/>${calculateAge(patient.dataNascimento)}</td>
        <td class="center">${escapeHtml(patient.dataNascimento)}</td>
        <td class="center">${escapeHtml(patient.dataInternacao)}</td>
        <td class="center">${escapeHtml(patient.braden)}</td>
        <td>${escapeHtml(patient.diagnostico)}</td>
        <td>${escapeHtml(patient.alergias)}</td>
        <td class="center">${escapeHtml(patient.mobilidade)}</td>
        <td>${escapeHtml(patient.dieta)}</td>
        <td>${escapeHtml(patient.eliminacoes)}</td>
        <td>${escapeHtml(patient.dispositivos)}</td>
        <td>${escapeHtml(patient.atb)}</td>
        <td>${escapeHtml(patient.curativos)}</td>
        <td>${escapeHtml(patient.aporteSaturacao)}</td>
        <td>${escapeHtml(patient.exames)}</td>
        <td>${escapeHtml(patient.cirurgia)}</td>
        <td>${escapeHtml(patient.observacoes)}</td>
        <td>${escapeHtml(patient.previsaoAlta)}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Passagem de Plantão - 11Care</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 5mm;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 6pt;
          line-height: 1.2;
          color: #000;
          background: #fff;
        }
        
        .header {
          background: #0056b3;
          color: white;
          padding: 8px 12px;
          text-align: center;
          margin-bottom: 5px;
        }
        
        .header .logo {
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .header .subtitle {
          font-size: 9pt;
        }
        
        .header .timestamp {
          font-size: 7pt;
          margin-top: 2px;
          opacity: 0.9;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        
        thead {
          display: table-header-group;
        }
        
        thead tr {
          background: #0056b3;
        }
        
        th {
          background: #0056b3;
          color: white;
          font-size: 5.5pt;
          font-weight: bold;
          padding: 3px 2px;
          border: 0.5px solid #003d80;
          text-align: center;
          vertical-align: middle;
          word-wrap: break-word;
        }
        
        tbody tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        tbody tr:nth-child(even) {
          background: #f5f5f5;
        }
        
        td {
          font-size: 5.5pt;
          padding: 2px 1px;
          border: 0.5px solid #ccc;
          vertical-align: top;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        td.leito {
          font-weight: bold;
          text-align: center;
          background: #e8f0ff;
        }
        
        td.center {
          text-align: center;
        }
        
        /* Column widths - total should fit A4 landscape (277mm usable) */
        th:nth-child(1), td:nth-child(1) { width: 2.5%; }   /* LEITO */
        th:nth-child(2), td:nth-child(2) { width: 3%; }     /* ALERTA IA */
        th:nth-child(3), td:nth-child(3) { width: 4%; }     /* ENFERMARIA */
        th:nth-child(4), td:nth-child(4) { width: 5%; }     /* ESPECIALIDADE */
        th:nth-child(5), td:nth-child(5) { width: 8%; }     /* NOME */
        th:nth-child(6), td:nth-child(6) { width: 4%; }     /* DATA NASC */
        th:nth-child(7), td:nth-child(7) { width: 4%; }     /* DATA INT */
        th:nth-child(8), td:nth-child(8) { width: 3%; }     /* BRADEN */
        th:nth-child(9), td:nth-child(9) { width: 8%; }     /* DIAGNÓSTICO */
        th:nth-child(10), td:nth-child(10) { width: 5%; }   /* ALERGIAS */
        th:nth-child(11), td:nth-child(11) { width: 4%; }   /* MOBILIDADE */
        th:nth-child(12), td:nth-child(12) { width: 6%; }   /* DIETA */
        th:nth-child(13), td:nth-child(13) { width: 5%; }   /* ELIMINAÇÕES */
        th:nth-child(14), td:nth-child(14) { width: 6%; }   /* DISPOSITIVOS */
        th:nth-child(15), td:nth-child(15) { width: 5%; }   /* ATB */
        th:nth-child(16), td:nth-child(16) { width: 5%; }   /* CURATIVOS */
        th:nth-child(17), td:nth-child(17) { width: 5%; }   /* APORTE */
        th:nth-child(18), td:nth-child(18) { width: 6%; }   /* EXAMES */
        th:nth-child(19), td:nth-child(19) { width: 4%; }   /* CIRURGIA */
        th:nth-child(20), td:nth-child(20) { width: 6%; }   /* OBSERVAÇÕES */
        th:nth-child(21), td:nth-child(21) { width: 4%; }   /* PREVISÃO ALTA */
        
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .no-print {
            display: none !important;
          }
        }
        
        .print-button {
          position: fixed;
          top: 10px;
          right: 10px;
          padding: 10px 20px;
          background: #0056b3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          z-index: 1000;
        }
        
        .print-button:hover {
          background: #004094;
        }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">
        Imprimir / Salvar PDF
      </button>
      
      <div class="header">
        <div class="logo">11Care - Passagem de Plantão (SBAR)</div>
        <div class="subtitle">Relatório de Passagem de Plantão</div>
        <div class="timestamp">Gerado em: ${timestamp}</div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>LEITO</th>
            <th>ALERTA<br/>IA</th>
            <th>ENFER-<br/>MARIA</th>
            <th>ESPEC./<br/>RAMAL</th>
            <th>NOME/<br/>REG/<br/>IDADE</th>
            <th>DATA<br/>NASC.</th>
            <th>DATA<br/>INTERN.</th>
            <th>BRADEN<br/>SCP</th>
            <th>DIAGNÓSTICO/<br/>COMORBIDADES</th>
            <th>ALERGIAS</th>
            <th>MOBILI-<br/>DADE</th>
            <th>DIETA</th>
            <th>ELIMI-<br/>NAÇÕES</th>
            <th>DISPOSI-<br/>TIVOS</th>
            <th>ATB</th>
            <th>CURA-<br/>TIVOS</th>
            <th>APORTE/<br/>SATUR.</th>
            <th>EXAMES<br/>REALIZ./<br/>PEND.</th>
            <th>PROG.<br/>CIRÚRG.</th>
            <th>OBS./<br/>INTERCORR.</th>
            <th>PREV.<br/>ALTA</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <script>
        // Auto-print after a short delay to ensure rendering is complete
        setTimeout(function() {
          // Optional: uncomment to auto-print
          // window.print();
        }, 500);
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
