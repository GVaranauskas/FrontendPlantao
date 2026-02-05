import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// ============================================
// CONFIGURAÇÃO DE CORES E ESTILOS
// ============================================
const COLORS = {
  primary: '#1a365d',      // Azul escuro
  secondary: '#2d3748',    // Cinza escuro
  accent: '#3182ce',       // Azul médio
  success: '#38a169',      // Verde
  warning: '#d69e2e',      // Amarelo
  danger: '#e53e3e',       // Vermelho
  info: '#4299e1',         // Azul claro
  text: '#2d3748',         // Texto principal
  textLight: '#718096',    // Texto secundário
  background: '#f7fafc',   // Fundo
  white: '#ffffff',
  tableBorder: '#e2e8f0',
  tableHeader: '#edf2f7',
  tableStripe: '#f7fafc',
};

const FONTS = {
  title: 'Helvetica-Bold',
  heading: 'Helvetica-Bold',
  body: 'Helvetica',
  bodyBold: 'Helvetica-Bold',
  code: 'Courier',
  codeBold: 'Courier-Bold',
};

// ============================================
// CLASSE GERADORA DE PDF
// ============================================
class PDFGenerator {
  constructor(outputPath, title, subtitle) {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
      autoFirstPage: false,
      info: {
        Title: title,
        Author: '11Care - Healthcare Platform',
        Subject: subtitle,
        Creator: '11Care PDF Generator',
      }
    });

    this.outputPath = outputPath;
    this.title = title;
    this.subtitle = subtitle;
    this.pageWidth = 595.28 - 100; // A4 width minus margins
    this.currentY = 60;
    this.pageNumber = 0;

    const stream = fs.createWriteStream(outputPath);
    this.doc.pipe(stream);
  }

  // --- RENDERIZAR HEADER/FOOTER NA PÁGINA ATUAL ---
  renderPageHeaderFooter() {
    this.doc.save();

    // Header line
    this.doc
      .moveTo(50, 40)
      .lineTo(545, 40)
      .lineWidth(0.5)
      .strokeColor(COLORS.tableBorder)
      .stroke();

    this.doc
      .font(FONTS.body)
      .fontSize(8)
      .fillColor(COLORS.textLight)
      .text('11Care | ' + this.title, 50, 28, { width: 300, lineBreak: false });

    this.doc
      .font(FONTS.body)
      .fontSize(8)
      .fillColor(COLORS.textLight)
      .text('Confidencial', 350, 28, { width: 195, align: 'right', lineBreak: false });

    // Footer line
    this.doc
      .moveTo(50, 800)
      .lineTo(545, 800)
      .lineWidth(0.5)
      .strokeColor(COLORS.tableBorder)
      .stroke();

    this.doc
      .font(FONTS.body)
      .fontSize(8)
      .fillColor(COLORS.textLight)
      .text(`Pagina ${this.pageNumber}`, 50, 808, {
        width: this.pageWidth,
        align: 'center',
        lineBreak: false,
      });

    this.doc.restore();
  }

  // --- ADICIONAR PÁGINA DE CONTEÚDO (com header/footer) ---
  addContentPage() {
    this.doc.addPage();
    this.pageNumber++;
    this.currentY = 60;
    this.renderPageHeaderFooter();
  }

  // --- CAPA ---
  addCover() {
    this.doc.addPage(); // First page - cover (no header/footer)

    // Background gradient effect
    this.doc.rect(0, 0, 595.28, 842).fill(COLORS.primary);

    // Decorative element
    this.doc.rect(0, 0, 595.28, 8).fill(COLORS.accent);
    this.doc.rect(0, 834, 595.28, 8).fill(COLORS.accent);

    // Side accent
    this.doc.rect(0, 200, 6, 400).fill(COLORS.accent);

    // Logo area
    this.doc
      .roundedRect(220, 120, 155, 60, 10)
      .lineWidth(2)
      .strokeColor(COLORS.accent)
      .stroke();

    this.doc
      .font(FONTS.title)
      .fontSize(28)
      .fillColor(COLORS.white)
      .text('11Care', 220, 132, { width: 155, align: 'center' });

    this.doc
      .font(FONTS.body)
      .fontSize(10)
      .fillColor(COLORS.accent)
      .text('Healthcare Platform', 220, 158, { width: 155, align: 'center' });

    // Title
    this.doc
      .font(FONTS.title)
      .fontSize(32)
      .fillColor(COLORS.white)
      .text(this.title, 50, 260, { width: this.pageWidth, align: 'center' });

    // Subtitle
    this.doc
      .font(FONTS.body)
      .fontSize(16)
      .fillColor(COLORS.accent)
      .text(this.subtitle, 50, 320, { width: this.pageWidth, align: 'center' });

    // Divider line
    this.doc
      .moveTo(150, 370)
      .lineTo(445, 370)
      .lineWidth(1)
      .strokeColor(COLORS.accent)
      .stroke();

    // Metadata
    const metaY = 420;
    const metaItems = [
      { label: 'Projeto', value: '11Care (FrontendPlantao)' },
      { label: 'Plataforma', value: 'Replit' },
      { label: 'Data', value: new Date().toLocaleDateString('pt-BR') },
      { label: 'Versao', value: '1.0.0' },
      { label: 'Classificacao', value: 'Confidencial' },
    ];

    metaItems.forEach((item, i) => {
      const y = metaY + i * 30;
      this.doc
        .font(FONTS.bodyBold)
        .fontSize(11)
        .fillColor(COLORS.accent)
        .text(`${item.label}:`, 170, y, { continued: true })
        .font(FONTS.body)
        .fillColor(COLORS.white)
        .text(`  ${item.value}`);
    });

    // Footer
    this.doc
      .font(FONTS.body)
      .fontSize(9)
      .fillColor(COLORS.textLight)
      .text('Documento gerado automaticamente - Uso interno', 50, 760, {
        width: this.pageWidth,
        align: 'center',
      });

    // After cover, start first content page with header/footer
    this.addContentPage();
  }

  // --- VERIFICAR ESPAÇO NA PÁGINA ---
  checkPageBreak(neededSpace = 80) {
    if (this.currentY + neededSpace > 770) {
      this.addContentPage();
      return true;
    }
    return false;
  }

  // --- TÍTULO PRINCIPAL (H1) ---
  addH1(text) {
    this.checkPageBreak(60);

    this.doc
      .font(FONTS.title)
      .fontSize(22)
      .fillColor(COLORS.primary)
      .text(text, 50, this.currentY, { width: this.pageWidth });

    this.currentY = this.doc.y + 5;

    // Underline
    this.doc
      .moveTo(50, this.currentY)
      .lineTo(545, this.currentY)
      .lineWidth(2)
      .strokeColor(COLORS.accent)
      .stroke();

    this.currentY += 15;
  }

  // --- SUBTÍTULO (H2) ---
  addH2(text) {
    this.checkPageBreak(50);

    // Colored left bar
    this.doc.rect(50, this.currentY, 4, 22).fill(COLORS.accent);

    this.doc
      .font(FONTS.heading)
      .fontSize(16)
      .fillColor(COLORS.primary)
      .text(text, 62, this.currentY + 2, { width: this.pageWidth - 12 });

    this.currentY = this.doc.y + 10;
  }

  // --- SUB-SUBTÍTULO (H3) ---
  addH3(text) {
    this.checkPageBreak(40);

    this.doc
      .font(FONTS.heading)
      .fontSize(13)
      .fillColor(COLORS.secondary)
      .text(text, 50, this.currentY, { width: this.pageWidth });

    this.currentY = this.doc.y + 6;
  }

  // --- PARÁGRAFO ---
  addParagraph(text) {
    this.checkPageBreak(30);

    // Simple approach: render full text with basic formatting
    const cleanText = text.replace(/\*\*/g, '');
    this.doc
      .font(FONTS.body)
      .fontSize(10)
      .fillColor(COLORS.text)
      .text(cleanText, 50, this.currentY, {
        width: this.pageWidth,
        lineGap: 3,
      });

    this.currentY = this.doc.y + 8;
  }

  // --- TEXTO NEGRITO ---
  addBoldText(text) {
    this.checkPageBreak(30);

    this.doc
      .font(FONTS.bodyBold)
      .fontSize(10)
      .fillColor(COLORS.text)
      .text(text, 50, this.currentY, { width: this.pageWidth, lineGap: 3 });

    this.currentY = this.doc.y + 4;
  }

  // --- LISTA ---
  addListItem(text, indent = 0) {
    this.checkPageBreak(25);

    const bulletX = 58 + indent * 15;
    const textX = bulletX + 12;
    const bullet = indent === 0 ? '\u2022' : '-';

    this.doc
      .font(FONTS.body)
      .fontSize(10)
      .fillColor(COLORS.accent)
      .text(bullet, bulletX, this.currentY);

    const cleanText = text.replace(/\*\*/g, '');
    this.doc
      .font(FONTS.body)
      .fontSize(10)
      .fillColor(COLORS.text)
      .text(cleanText, textX, this.currentY, {
        width: this.pageWidth - (textX - 50),
        lineGap: 2,
      });

    this.currentY = this.doc.y + 4;
  }

  // --- CHECKLIST ---
  addChecklistItem(text, checked = false) {
    this.checkPageBreak(25);

    const boxX = 58;
    const boxY = this.currentY + 1;

    // Checkbox
    this.doc.rect(boxX, boxY, 10, 10).lineWidth(1).strokeColor(COLORS.tableBorder).stroke();

    if (checked) {
      this.doc
        .font(FONTS.bodyBold)
        .fontSize(8)
        .fillColor(COLORS.success)
        .text('V', boxX + 2, boxY + 1);
    }

    const cleanText = text.replace(/\*\*/g, '');
    this.doc
      .font(FONTS.body)
      .fontSize(10)
      .fillColor(COLORS.text)
      .text(cleanText, boxX + 16, this.currentY, {
        width: this.pageWidth - 24,
        lineGap: 2,
      });

    this.currentY = this.doc.y + 4;
  }

  // --- BLOCO DE CÓDIGO ---
  addCodeBlock(code, language = '') {
    const lines = code.split('\n');
    const blockHeight = Math.min(lines.length * 13 + 20, 400);

    this.checkPageBreak(blockHeight);

    // Background
    this.doc
      .roundedRect(50, this.currentY, this.pageWidth, blockHeight, 4)
      .fill('#1a202c');

    // Language badge
    if (language) {
      this.doc
        .roundedRect(52, this.currentY + 2, language.length * 6 + 12, 14, 3)
        .fill('#2d3748');

      this.doc
        .font(FONTS.code)
        .fontSize(7)
        .fillColor('#a0aec0')
        .text(language, 58, this.currentY + 5);
    }

    // Code text
    const codeY = this.currentY + (language ? 20 : 10);
    const maxLines = Math.floor((blockHeight - 20) / 13);

    lines.slice(0, maxLines).forEach((line, i) => {
      this.doc
        .font(FONTS.code)
        .fontSize(8)
        .fillColor('#e2e8f0')
        .text(line.substring(0, 90), 60, codeY + i * 13, {
          width: this.pageWidth - 20,
          lineBreak: false,
        });
    });

    if (lines.length > maxLines) {
      this.doc
        .font(FONTS.code)
        .fontSize(8)
        .fillColor('#a0aec0')
        .text(`... (${lines.length - maxLines} linhas omitidas)`, 60, codeY + maxLines * 13);
    }

    this.currentY += blockHeight + 10;
  }

  // --- TABELA ---
  addTable(headers, rows) {
    const colCount = headers.length;
    const colWidth = this.pageWidth / colCount;
    const rowHeight = 25;
    const headerHeight = 28;

    const totalHeight = headerHeight + rows.length * rowHeight + 10;
    this.checkPageBreak(Math.min(totalHeight, 200));

    let tableY = this.currentY;

    // Header
    this.doc
      .roundedRect(50, tableY, this.pageWidth, headerHeight, 3)
      .fill(COLORS.primary);

    headers.forEach((header, i) => {
      this.doc
        .font(FONTS.bodyBold)
        .fontSize(9)
        .fillColor(COLORS.white)
        .text(header, 54 + i * colWidth, tableY + 8, {
          width: colWidth - 8,
          lineBreak: false,
        });
    });

    tableY += headerHeight;

    // Rows
    rows.forEach((row, rowIndex) => {
      this.checkPageBreak(rowHeight);

      if (this.currentY > tableY) {
        tableY = this.currentY;
      }

      // Stripe background
      if (rowIndex % 2 === 0) {
        this.doc.rect(50, tableY, this.pageWidth, rowHeight).fill(COLORS.tableStripe);
      }

      // Border
      this.doc
        .rect(50, tableY, this.pageWidth, rowHeight)
        .lineWidth(0.5)
        .strokeColor(COLORS.tableBorder)
        .stroke();

      // Cell text
      row.forEach((cell, i) => {
        const cleanCell = String(cell).replace(/\*\*/g, '');
        this.doc
          .font(FONTS.body)
          .fontSize(9)
          .fillColor(COLORS.text)
          .text(cleanCell, 54 + i * colWidth, tableY + 7, {
            width: colWidth - 8,
            lineBreak: false,
          });
      });

      tableY += rowHeight;
    });

    this.currentY = tableY + 10;
  }

  // --- CAIXA DE DESTAQUE ---
  addHighlightBox(text, type = 'info') {
    this.checkPageBreak(60);

    const colors = {
      info: { bg: '#ebf8ff', border: COLORS.info, icon: 'i' },
      warning: { bg: '#fffff0', border: COLORS.warning, icon: '!' },
      danger: { bg: '#fff5f5', border: COLORS.danger, icon: 'X' },
      success: { bg: '#f0fff4', border: COLORS.success, icon: 'V' },
    };

    const style = colors[type] || colors.info;

    // Box
    this.doc
      .roundedRect(50, this.currentY, this.pageWidth, 45, 4)
      .fill(style.bg);

    // Left border
    this.doc.rect(50, this.currentY, 4, 45).fill(style.border);

    // Icon
    this.doc
      .font(FONTS.bodyBold)
      .fontSize(14)
      .fillColor(style.border)
      .text(style.icon, 62, this.currentY + 12);

    // Text
    const cleanText = text.replace(/\*\*/g, '');
    this.doc
      .font(FONTS.body)
      .fontSize(10)
      .fillColor(COLORS.text)
      .text(cleanText, 82, this.currentY + 12, {
        width: this.pageWidth - 42,
      });

    this.currentY += 55;
  }

  // --- SEPARADOR ---
  addSeparator() {
    this.checkPageBreak(20);

    this.doc
      .moveTo(150, this.currentY + 5)
      .lineTo(445, this.currentY + 5)
      .lineWidth(0.5)
      .strokeColor(COLORS.tableBorder)
      .stroke();

    this.currentY += 15;
  }

  // --- ESPAÇO ---
  addSpace(height = 10) {
    this.currentY += height;
  }

  // --- FINALIZAR ---
  finalize() {
    this.doc.end();
  }
}

// ============================================
// GERAR PDF 1: SKILLS ANALYSIS
// ============================================
function generateSkillsAnalysisPDF() {
  const pdf = new PDFGenerator(
    'docs/SKILLS_ANALYSIS.pdf',
    'Analise de Skills',
    'Otimizacao, Seguranca, LGPD e Protecao'
  );

  pdf.addCover();

  // --- SUMÁRIO EXECUTIVO ---
  pdf.addH1('Sumario Executivo');
  pdf.addParagraph('Este documento apresenta uma analise completa das skills que podem ser criadas para o projeto 11Care (FrontendPlantao), organizadas em quatro categorias principais:');
  pdf.addSpace(5);
  pdf.addListItem('Otimizacao do Trabalho - Automacao e produtividade');
  pdf.addListItem('Seguranca - Protecao de dados e sistemas');
  pdf.addListItem('LGPD - Conformidade com a Lei Geral de Protecao de Dados');
  pdf.addListItem('Protecao contra Erros - Salvaguardas para usuarios inexperientes');

  pdf.addSeparator();

  // --- 1. SKILLS DE OTIMIZAÇÃO ---
  pdf.addH1('1. Skills de Otimizacao do Trabalho');

  pdf.addH2('1.1 Validador de Build e Deploy');
  pdf.addBoldText('Objetivo: Automatizar a validacao completa antes de cada deploy');
  pdf.addSpace(5);
  pdf.addParagraph('Checklist automatico:');
  pdf.addChecklistItem('Verificar se npm run check (TypeScript) passa sem erros');
  pdf.addChecklistItem('Verificar se npm run build completa com sucesso');
  pdf.addChecklistItem('Validar variaveis de ambiente obrigatorias');
  pdf.addChecklistItem('Verificar conexao com banco de dados');
  pdf.addChecklistItem('Validar chave de criptografia (formato e tamanho)');
  pdf.addChecklistItem('Testar endpoints criticos (healthcheck)');
  pdf.addChecklistItem('Verificar se nao ha console.log em producao');
  pdf.addChecklistItem('Validar que migrations estao sincronizadas');

  pdf.addSpace(5);
  pdf.addCodeBlock(`// server/scripts/validate-deploy.ts
import { validateEnv } from '../config/env';
import { db } from '../lib/database';
import { encryptionService } from '../services/encryption.service';

async function validateDeploy() {
  const checks = [];
  try {
    validateEnv();
    checks.push({ name: 'Variaveis de ambiente', status: 'OK' });
  } catch (e) {
    checks.push({ name: 'Variaveis de ambiente', status: 'FALHOU' });
  }
  // ... mais verificacoes
  return checks;
}`, 'typescript');

  pdf.addSeparator();

  pdf.addH2('1.2 Gerador de Codigo Padronizado');
  pdf.addBoldText('Objetivo: Gerar codigo seguindo os padroes do projeto automaticamente');
  pdf.addSpace(5);
  pdf.addCodeBlock(`# Gerar novo endpoint CRUD completo
npm run skill:generate endpoint pacientes-pendentes

# Gerar novo componente React
npm run skill:generate component PatientCard

# Gerar novo hook customizado
npm run skill:generate hook usePatientSync`, 'bash');
  pdf.addSpace(5);
  pdf.addParagraph('Templates gerados:');
  pdf.addListItem('Endpoint: Route + Service + Repository + Validacao Zod');
  pdf.addListItem('Componente: TSX + Types + Hook de dados');
  pdf.addListItem('Hook: Custom hook com TanStack Query integrado');

  pdf.addSeparator();

  pdf.addH2('1.3 Sincronizador de Schema');
  pdf.addBoldText('Objetivo: Manter schema do banco sincronizado e validado');
  pdf.addSpace(5);
  pdf.addParagraph('Acoes automaticas:');
  pdf.addListItem('Detectar diferencas entre shared/schema.ts e banco de dados');
  pdf.addListItem('Gerar migrations automaticamente');
  pdf.addListItem('Validar que nao ha breaking changes');
  pdf.addListItem('Backup automatico antes de migracao');
  pdf.addListItem('Rollback automatico em caso de falha');

  pdf.addSeparator();

  pdf.addH2('1.4 Analisador de Performance');
  pdf.addBoldText('Objetivo: Identificar gargalos de performance automaticamente');
  pdf.addSpace(5);
  pdf.addParagraph('Analises realizadas:');
  pdf.addListItem('Queries N+1 detectadas no codigo');
  pdf.addListItem('Componentes React sem memoizacao adequada');
  pdf.addListItem('Endpoints sem paginacao');
  pdf.addListItem('Uso excessivo de memoria');
  pdf.addListItem('Tempo de resposta de APIs');
  pdf.addListItem('Bundle size do frontend');

  pdf.addSeparator();

  pdf.addH2('1.5 Auto-Documentacao de API');
  pdf.addBoldText('Objetivo: Gerar documentacao OpenAPI automaticamente');
  pdf.addSpace(5);
  pdf.addParagraph('Saidas:');
  pdf.addListItem('docs/openapi.yaml - Especificacao OpenAPI 3.0');
  pdf.addListItem('docs/api-reference.html - Documentacao visual');
  pdf.addListItem('Validacao de que todos endpoints estao documentados');
  pdf.addListItem('Exemplos de request/response extraidos do codigo');

  pdf.addSeparator();

  // --- 2. SKILLS DE SEGURANÇA ---
  pdf.addH1('2. Skills de Seguranca');

  pdf.addH2('2.1 Scanner de Vulnerabilidades');
  pdf.addBoldText('Objetivo: Detectar vulnerabilidades de seguranca no codigo');
  pdf.addSpace(5);
  pdf.addParagraph('Verificacoes realizadas:');
  pdf.addTable(
    ['Tipo', 'Severidade', 'Descricao'],
    [
      ['SQL Injection', 'CRITICO', 'Detecta interpolacao em queries SQL'],
      ['XSS', 'ALTO', 'Detecta dangerouslySetInnerHTML'],
      ['Hardcoded Secrets', 'CRITICO', 'Detecta senhas no codigo'],
      ['Console.log', 'MEDIO', 'Detecta logs em producao'],
      ['eval()', 'CRITICO', 'Detecta uso de eval'],
      ['Senhas fracas', 'ALTO', 'Valida politica de senhas'],
    ]
  );

  pdf.addSeparator();

  pdf.addH2('2.2 Validador de Dependencias');
  pdf.addBoldText('Objetivo: Verificar vulnerabilidades em dependencias');
  pdf.addSpace(5);
  pdf.addParagraph('Verificacoes:');
  pdf.addListItem('npm audit com analise de severidade');
  pdf.addListItem('Dependencias desatualizadas com vulnerabilidades conhecidas');
  pdf.addListItem('Licencas incompativeis com uso comercial');
  pdf.addListItem('Dependencias abandonadas (sem updates ha mais de 2 anos)');

  pdf.addSeparator();

  pdf.addH2('2.3 Monitor de Acessos Suspeitos');
  pdf.addBoldText('Objetivo: Detectar padroes de acesso anormais em tempo real');
  pdf.addSpace(5);
  pdf.addTable(
    ['Padrao', 'Threshold', 'Janela', 'Acao'],
    [
      ['Brute Force', '5 tentativas', '5 minutos', 'Bloquear IP 30min'],
      ['Data Scraping', '100 acessos', '10 minutos', 'Alertar admin'],
      ['Auth Bypass', '3 tentativas', '1 minuto', 'Logout user'],
      ['Horario Anormal', '22h-06h', '-', 'Log enhanced'],
      ['Session Hijack', 'Mudanca IP', '-', 'Invalidar sessao'],
    ]
  );

  pdf.addSeparator();

  pdf.addH2('2.4 Rotacao Automatica de Chaves');
  pdf.addBoldText('Objetivo: Automatizar a rotacao de chaves de criptografia');
  pdf.addSpace(5);
  pdf.addParagraph('Processo:');
  pdf.addListItem('1. Gerar nova chave de criptografia');
  pdf.addListItem('2. Re-criptografar dados existentes em background');
  pdf.addListItem('3. Manter chave antiga para rollback (7 dias)');
  pdf.addListItem('4. Atualizar variavel de ambiente');
  pdf.addListItem('5. Invalidar caches');
  pdf.addListItem('6. Notificar administradores');
  pdf.addListItem('7. Gerar relatorio de auditoria');

  pdf.addSeparator();

  pdf.addH2('2.5 Testes de Penetracao Automatizados');
  pdf.addBoldText('Objetivo: Executar testes de seguranca automatizados');
  pdf.addSpace(5);
  pdf.addParagraph('Testes realizados:');
  pdf.addListItem('Injecao SQL em todos os inputs');
  pdf.addListItem('XSS refletido e armazenado');
  pdf.addListItem('CSRF token bypass attempts');
  pdf.addListItem('Authentication bypass');
  pdf.addListItem('Rate limit bypass');
  pdf.addListItem('Path traversal');
  pdf.addListItem('IDOR (Insecure Direct Object Reference)');

  pdf.addSeparator();

  // --- 3. SKILLS DE LGPD ---
  pdf.addH1('3. Skills de LGPD');

  pdf.addH2('3.1 Validador de Conformidade LGPD');
  pdf.addBoldText('Objetivo: Verificar conformidade com a LGPD automaticamente');
  pdf.addSpace(5);
  pdf.addTable(
    ['Artigo', 'Requisito', 'Verificacao'],
    [
      ['Art. 7', 'Base legal', 'Documentacao de base legal para cada tratamento'],
      ['Art. 9', 'Dados sensiveis', 'Campos sensiveis criptografados'],
      ['Art. 18', 'Direitos titular', 'Endpoints de acesso, correcao, eliminacao'],
      ['Art. 37', 'Registro operacoes', 'Audit logging completo'],
      ['Art. 46', 'Seguranca', 'Criptografia, auth, RBAC, rate limiting'],
      ['Art. 50', 'Boas praticas', 'Documentacao de politicas'],
    ]
  );

  pdf.addSeparator();

  pdf.addH2('3.2 Gerador de Relatorio de Impacto (RIPD)');
  pdf.addBoldText('Objetivo: Gerar Relatorio de Impacto a Protecao de Dados');
  pdf.addSpace(5);
  pdf.addParagraph('Conteudo gerado:');
  pdf.addListItem('1. Descricao do tratamento de dados');
  pdf.addListItem('2. Categorias de dados tratados');
  pdf.addListItem('3. Finalidade do tratamento');
  pdf.addListItem('4. Base legal');
  pdf.addListItem('5. Medidas de seguranca');
  pdf.addListItem('6. Riscos identificados');
  pdf.addListItem('7. Medidas de mitigacao');

  pdf.addSeparator();

  pdf.addH2('3.3 Monitor de Consentimento');
  pdf.addBoldText('Objetivo: Rastrear e validar consentimentos');
  pdf.addListItem('Consentimentos validos e nao expirados');
  pdf.addListItem('Historico de alteracoes de consentimento');
  pdf.addListItem('Alertas quando consentimento proximo de expirar');
  pdf.addListItem('Relatorio de consentimentos por finalidade');

  pdf.addSeparator();

  pdf.addH2('3.4 Anonimizador de Dados');
  pdf.addBoldText('Objetivo: Anonimizar dados para pesquisa e estatisticas');
  pdf.addSpace(5);
  pdf.addParagraph('Tecnicas aplicadas:');
  pdf.addListItem('Remocao de identificadores diretos (nome, CPF, registro)');
  pdf.addListItem('Generalizacao de datas (apenas mes/ano)');
  pdf.addListItem('Supressao de campos unicos');
  pdf.addListItem('K-anonimato (minimo k=5)');
  pdf.addListItem('Perturbacao de dados numericos');

  pdf.addSeparator();

  pdf.addH2('3.5 Detector de Vazamento de Dados');
  pdf.addBoldText('Objetivo: Detectar possiveis vazamentos de dados pessoais');
  pdf.addSpace(5);
  pdf.addParagraph('Verificacoes:');
  pdf.addListItem('Logs contendo dados pessoais');
  pdf.addListItem('Respostas de API com dados nao autorizados');
  pdf.addListItem('Cache contendo dados sensiveis');
  pdf.addListItem('Arquivos temporarios com dados pessoais');
  pdf.addListItem('Console.log com informacoes de pacientes');

  pdf.addSeparator();

  // --- 4. SKILLS DE PROTEÇÃO ---
  pdf.addH1('4. Skills de Protecao contra Erros');

  pdf.addH2('4.1 Validador de Commits');
  pdf.addBoldText('Objetivo: Prevenir commits problematicos');
  pdf.addSpace(5);
  pdf.addTable(
    ['Verificacao', 'Detalhe', 'Acao'],
    [
      ['Arquivos proibidos', '.env, *.pem, *.key', 'Bloquear commit'],
      ['Tamanho', 'Max 5MB por arquivo', 'Aviso ou bloqueio'],
      ['Padroes perigosos', 'passwords, localhost', 'Bloquear commit'],
      ['Branch protection', 'main, master, prod', 'Bloquear commit direto'],
      ['TypeScript errors', 'npm run check', 'Bloquear commit'],
    ]
  );

  pdf.addSeparator();

  pdf.addH2('4.2 Modo Seguro de Desenvolvimento');
  pdf.addBoldText('Objetivo: Ambiente de desenvolvimento com protecoes extras');
  pdf.addSpace(5);
  pdf.addHighlightBox('Ativar com: SAFE_MODE=true npm run dev', 'info');
  pdf.addParagraph('Protecoes ativadas:');
  pdf.addListItem('Dados de pacientes sempre mocados (nunca dados reais)');
  pdf.addListItem('Queries destrutivas (DELETE, DROP) bloqueadas');
  pdf.addListItem('Limite de registros afetados por query (max 10)');
  pdf.addListItem('Confirmacao visual antes de alteracoes em massa');
  pdf.addListItem('Rollback automatico disponivel para todas operacoes');

  pdf.addSeparator();

  pdf.addH2('4.3 Guia Interativo de Desenvolvimento');
  pdf.addBoldText('Objetivo: Guiar novos desenvolvedores com assistente inteligente');
  pdf.addSpace(5);
  pdf.addParagraph('Fluxos guiados:');
  pdf.addListItem('Criar novo endpoint (Route + Service + Repository)');
  pdf.addListItem('Criar novo componente React');
  pdf.addListItem('Modificar schema do banco');
  pdf.addListItem('Executar testes');
  pdf.addListItem('Preparar deploy');

  pdf.addSeparator();

  pdf.addH2('4.4 Revisor de Codigo Automatico');
  pdf.addBoldText('Objetivo: Revisar codigo antes de merge');
  pdf.addSpace(5);
  pdf.addTable(
    ['Categoria', 'Verificacao', 'Limite'],
    [
      ['Padroes', 'Zod, asyncHandler, logger', 'Obrigatorio'],
      ['Anti-padroes', 'any, console.log, require()', 'Proibido'],
      ['Complexidade', 'Funcao muito longa', 'Max 50 linhas'],
      ['Complexidade', 'Arquivo muito longo', 'Max 300 linhas'],
      ['Complexidade', 'Aninhamento profundo', 'Max 4 niveis'],
      ['Complexidade', 'Muitos parametros', 'Max 5 params'],
    ]
  );

  pdf.addSeparator();

  pdf.addH2('4.5 Sandbox de Testes');
  pdf.addBoldText('Objetivo: Ambiente isolado para testes sem risco');
  pdf.addParagraph('Caracteristicas:');
  pdf.addListItem('Banco de dados separado (copia do schema, dados mocados)');
  pdf.addListItem('Dados de teste gerados automaticamente');
  pdf.addListItem('Reset automatico apos cada sessao');
  pdf.addListItem('Nenhuma conexao com servicos externos reais');

  pdf.addSeparator();

  pdf.addH2('4.6 Detector de Breaking Changes');
  pdf.addBoldText('Objetivo: Detectar mudancas que quebram compatibilidade');
  pdf.addSpace(5);
  pdf.addTable(
    ['Tipo', 'Verificacao', 'Severidade'],
    [
      ['Database', 'Remocao de colunas', 'CRITICO'],
      ['Database', 'Alteracao de tipo', 'ALTO'],
      ['API', 'Remocao de endpoints', 'CRITICO'],
      ['API', 'Alteracao de resposta', 'ALTO'],
      ['API', 'Novos campos obrigatorios', 'MEDIO'],
      ['Frontend', 'Alteracao de props', 'MEDIO'],
    ]
  );

  pdf.addSeparator();

  pdf.addH2('4.7 Backup e Restore Automatizado');
  pdf.addBoldText('Objetivo: Sistema de backup com restore facil');
  pdf.addParagraph('Caracteristicas:');
  pdf.addListItem('Backup automatico antes de migrations');
  pdf.addListItem('Backup diario programado');
  pdf.addListItem('Retencao configuravel (30 dias default)');
  pdf.addListItem('Restore seletivo (tabelas especificas)');
  pdf.addListItem('Verificacao de integridade');

  pdf.addSeparator();

  // --- 5. MATRIZ DE PRIORIZAÇÃO ---
  pdf.addH1('5. Matriz de Priorizacao');

  pdf.addH2('5.1 Impacto vs Esforco');
  pdf.addTable(
    ['Skill', 'Impacto', 'Esforco', 'Prioridade'],
    [
      ['Validador de Commits', 'Alto', 'Baixo', 'URGENTE'],
      ['Scanner de Vulnerabilidades', 'Alto', 'Medio', 'URGENTE'],
      ['Validador LGPD', 'Alto', 'Medio', 'URGENTE'],
      ['Modo Seguro Dev', 'Alto', 'Medio', 'ALTA'],
      ['Validador de Deploy', 'Medio', 'Baixo', 'ALTA'],
      ['Detector Breaking Changes', 'Alto', 'Alto', 'ALTA'],
      ['Guia Interativo', 'Medio', 'Medio', 'MEDIA'],
      ['Revisor de Codigo', 'Medio', 'Alto', 'MEDIA'],
      ['Gerador de Codigo', 'Medio', 'Alto', 'MEDIA'],
      ['Sandbox de Testes', 'Medio', 'Alto', 'MEDIA'],
      ['Rotacao de Chaves', 'Alto', 'Alto', 'PLANEJADA'],
      ['Analisador de Performance', 'Baixo', 'Alto', 'PLANEJADA'],
    ]
  );

  pdf.addSeparator();

  pdf.addH2('5.2 Roadmap Sugerido');

  pdf.addH3('Fase 1 - Fundacao');
  pdf.addListItem('Validador de Commits (git hooks)');
  pdf.addListItem('Scanner de Vulnerabilidades basico');
  pdf.addListItem('Validador de Conformidade LGPD');

  pdf.addH3('Fase 2 - Protecao');
  pdf.addListItem('Modo Seguro de Desenvolvimento');
  pdf.addListItem('Validador de Build e Deploy');
  pdf.addListItem('Detector de Breaking Changes');

  pdf.addH3('Fase 3 - Produtividade');
  pdf.addListItem('Guia Interativo de Desenvolvimento');
  pdf.addListItem('Revisor de Codigo Automatico');
  pdf.addListItem('Gerador de Codigo Padronizado');

  pdf.addH3('Fase 4 - Avancado');
  pdf.addListItem('Sandbox de Testes completo');
  pdf.addListItem('Rotacao Automatica de Chaves');
  pdf.addListItem('Analisador de Performance');

  pdf.addSeparator();

  // --- BENEFÍCIOS ---
  pdf.addH1('6. Beneficios Esperados');
  pdf.addTable(
    ['Area', 'Melhoria Esperada'],
    [
      ['Tempo de desenvolvimento', '-30% (com geradores e guias)'],
      ['Bugs em producao', '-60% (com validadores)'],
      ['Vulnerabilidades', '-80% (com scanners)'],
      ['Conformidade LGPD', '100% (com validadores)'],
      ['Onboarding de devs', '-50% tempo (com guias)'],
      ['Incidentes de seguranca', '-90% (com protecoes)'],
    ]
  );

  pdf.finalize();
  console.log('PDF gerado: docs/SKILLS_ANALYSIS.pdf');
}

// ============================================
// GERAR PDF 2: REPLIT SKILLS PRONTAS
// ============================================
function generateReplitSkillsPDF() {
  const pdf = new PDFGenerator(
    'docs/REPLIT_SKILLS_PRONTAS.pdf',
    'Skills Prontas - Replit',
    'Ferramentas e Integracoes para o 11Care'
  );

  pdf.addCover();

  // --- 1. FERRAMENTAS NATIVAS ---
  pdf.addH1('1. Ferramentas Nativas do Replit');

  pdf.addH2('1.1 Secrets Manager');
  pdf.addHighlightBox('Status: Disponivel | Relevancia: CRITICA', 'danger');
  pdf.addParagraph('O Secrets Manager do Replit armazena e criptografa variaveis sensiveis com AES-256 em repouso e TLS em transito.');
  pdf.addSpace(5);
  pdf.addTable(
    ['Secret', 'Variavel', 'Proposito'],
    [
      ['Chave JWT', 'JWT_SECRET', 'Assinatura de tokens'],
      ['Chave Refresh', 'REFRESH_SECRET', 'Refresh tokens'],
      ['Chave Criptografia', 'ENCRYPTION_KEY', 'AES-256-GCM dos dados'],
      ['Sessao', 'SESSION_SECRET', 'Express sessions'],
      ['OpenAI', 'OPENAI_API_KEY', 'Analise clinica IA'],
      ['Anthropic', 'ANTHROPIC_API_KEY', 'Fallback IA'],
      ['N8N', 'N8N_WEBHOOK_SECRET', 'Webhooks hospital'],
      ['Banco', 'DATABASE_URL', 'Conexao PostgreSQL'],
    ]
  );

  pdf.addSpace(5);
  pdf.addHighlightBox('NUNCA usar arquivo .env no Replit! NUNCA printar secrets nos logs!', 'warning');

  pdf.addSeparator();

  pdf.addH2('1.2 SQL Runner');
  pdf.addHighlightBox('Status: Disponivel | Relevancia: ALTA', 'info');
  pdf.addParagraph('Ferramenta integrada para executar queries SQL diretamente no workspace.');
  pdf.addParagraph('Uso no 11Care: Consultas de auditoria LGPD, verificacao de dados, debug.');
  pdf.addBoldText('Acesso: Tools > Database > My Data > SQL Runner');

  pdf.addSeparator();

  pdf.addH2('1.3 Drizzle Studio');
  pdf.addHighlightBox('Status: Disponivel | Relevancia: ALTA', 'info');
  pdf.addParagraph('Visualizador e editor de dados integrado com Drizzle ORM.');
  pdf.addParagraph('Uso: Navegar tabelas (patients, users, audit_logs), verificar integridade de dados.');

  pdf.addSeparator();

  pdf.addH2('1.4 Plugins Replit ja Configurados');
  pdf.addTable(
    ['Plugin', 'Funcao', 'Beneficio'],
    [
      ['Dev Banner', 'Banner visual em dev', 'Impede confusao dev/prod'],
      ['Runtime Error Modal', 'Mostra erros visuais', 'Ajuda devs inexperientes'],
      ['Cartographer', 'Mapeamento de codigo', 'Navegacao rapida'],
    ]
  );

  pdf.addSeparator();

  // --- 2. SKILLS DE SEGURANÇA ---
  pdf.addH1('2. Skills de Seguranca Prontas');

  pdf.addH2('2.1 Semgrep Pre-Deploy Scanner');
  pdf.addHighlightBox('Status: Disponivel (ATIVAR!) | Relevancia: CRITICA', 'danger');
  pdf.addParagraph('Scanner de seguranca com ~200 regras para JavaScript/TypeScript.');
  pdf.addParagraph('Detecta: Padroes inseguros, secrets expostos, dependencias vulneraveis, SQL Injection, XSS.');
  pdf.addBoldText('Como ativar: Configuracoes de deploy > Pre-deployment scanning');

  pdf.addSeparator();

  pdf.addH2('2.2 Protecoes Automaticas');
  pdf.addTable(
    ['Protecao', 'Status', 'Beneficio para 11Care'],
    [
      ['HTTPS', 'Ja ativo', 'Dados em transito criptografados (LGPD Art. 46)'],
      ['DDoS Protection', 'Ja ativo', 'Disponibilidade do sistema de plantao'],
      ['Container Isolation', 'Ja ativo', 'Dados isolados de outros apps'],
      ['Security Center', 'Enterprise', 'CVE detection, SBOM, SOC 2'],
    ]
  );

  pdf.addSeparator();

  // --- 3. SKILLS DE BANCO DE DADOS ---
  pdf.addH1('3. Skills de Banco de Dados');

  pdf.addH2('3.1 PostgreSQL Managed');
  pdf.addHighlightBox('Status: Configurado | PostgreSQL 16', 'success');
  pdf.addParagraph('Banco gerenciado com provisionamento automatico e credenciais via Secrets.');

  pdf.addSeparator();

  pdf.addH2('3.2 Point-in-Time Restore');
  pdf.addHighlightBox('Status: Disponivel (verificar plano) | Relevancia: CRITICA', 'warning');
  pdf.addParagraph('Restauracao para qualquer ponto no tempo.');
  pdf.addParagraph('Uso: Recuperar dados de pacientes em caso de erro, rollback apos migration problematica.');

  pdf.addSeparator();

  pdf.addH2('3.3 Ambientes Separados (Dev/Prod)');
  pdf.addHighlightBox('Status: Disponivel | Relevancia: ALTA', 'info');
  pdf.addParagraph('Bancos de dados separados para desenvolvimento e producao.');
  pdf.addListItem('Dev: Dados mocados, pode destruir a vontade');
  pdf.addListItem('Prod: Dados reais, protegido por deploy');
  pdf.addListItem('Conformidade LGPD: dados reais apenas em prod');

  pdf.addSeparator();

  // --- 4. DEPLOY E INFRAESTRUTURA ---
  pdf.addH1('4. Skills de Deploy e Infraestrutura');

  pdf.addH2('4.1 Autoscale Deployment');
  pdf.addHighlightBox('Status: Configurado | Relevancia: ALTA', 'success');
  pdf.addParagraph('Deploy com auto-scaling baseado em demanda.');
  pdf.addListItem('Escala automaticamente durante picos de plantao');
  pdf.addListItem('Reduz custos fora do horario');
  pdf.addListItem('Alta disponibilidade');

  pdf.addSeparator();

  pdf.addH2('4.2 Recursos Adicionais');
  pdf.addTable(
    ['Recurso', 'Status', 'Uso'],
    [
      ['Custom Domains', 'Plano pago', '11care.hospital.com.br'],
      ['Health Checks', 'Disponivel', 'Restart automatico se app cair'],
      ['Logs de Deploy', 'Disponivel', 'Debug de problemas em prod'],
    ]
  );

  pdf.addSeparator();

  // --- 5. AUTOMAÇÃO E WORKFLOWS ---
  pdf.addH1('5. Skills de Automacao e Workflows');

  pdf.addH2('5.1 Workflows Personalizados');
  pdf.addHighlightBox('Parcialmente configurado - adicionar mais workflows!', 'warning');
  pdf.addSpace(5);

  pdf.addTable(
    ['Workflow', 'Comando', 'Funcao'],
    [
      ['Start Application', 'npm run dev', 'Ja existe'],
      ['TypeScript Check', 'npm run check', 'Adicionar'],
      ['Database Sync', 'npm run db:push', 'Adicionar'],
      ['Build Production', 'npm run build', 'Adicionar'],
      ['Security Audit', 'npm audit', 'Adicionar'],
      ['Full Validation', 'check + build + audit', 'Adicionar'],
    ]
  );

  pdf.addSeparator();

  pdf.addH2('5.2 Timed Automations');
  pdf.addHighlightBox('Status: Disponivel | Relevancia: ALTA', 'info');
  pdf.addParagraph('Automacoes agendadas:');
  pdf.addListItem('Backup diario do banco de dados');
  pdf.addListItem('Limpeza de logs antigos');
  pdf.addListItem('Sync automatico com sistema hospitalar (N8N)');
  pdf.addListItem('Relatorio LGPD semanal');
  pdf.addListItem('Verificacao de sessoes expiradas');

  pdf.addSeparator();

  pdf.addH2('5.3 Agent Browser Testing');
  pdf.addHighlightBox('Status: Disponivel (Agent 3) | Relevancia: ALTA', 'info');
  pdf.addParagraph('O Agent testa automaticamente o app usando um browser real.');
  pdf.addListItem('Testar fluxo de login');
  pdf.addListItem('Testar cadastro de pacientes');
  pdf.addListItem('Testar exportacao de dados (LGPD)');
  pdf.addListItem('Testar SBAR handover');
  pdf.addListItem('Testar permissoes por role');

  pdf.addSeparator();

  // --- 6. AGENT IA ---
  pdf.addH1('6. Skills do Agent (IA)');

  pdf.addH2('6.1 Capacidades do Agent 3');
  pdf.addTable(
    ['Skill', 'Uso no 11Care'],
    [
      ['Full-Stack Generation', 'Gerar endpoints, componentes, services'],
      ['Self-Testing', 'Testar automaticamente o codigo gerado'],
      ['Extended Autonomy', 'Trabalhar ate 200 min sem supervisao'],
      ['Web Search', 'Buscar docs LGPD, referencias medicas'],
      ['Debugging', 'Identificar e corrigir bugs automaticamente'],
      ['Plan Mode', 'Planejar features antes de implementar'],
      ['Design Mode', 'Criar/ajustar interfaces visuais'],
    ]
  );

  pdf.addSeparator();

  pdf.addH2('6.2 Instrucoes para replit.md');
  pdf.addHighlightBox('CRITICO: Adicionar regras de seguranca no replit.md para proteger o projeto!', 'danger');
  pdf.addSpace(5);

  pdf.addH3('Regras NUNCA FAZER:');
  pdf.addListItem('Nunca remover criptografia de campos sensiveis');
  pdf.addListItem('Nunca desabilitar autenticacao ou autorizacao');
  pdf.addListItem('Nunca commitar secrets ou senhas');
  pdf.addListItem('Nunca usar console.log com dados de pacientes');
  pdf.addListItem('Nunca desabilitar CSRF protection ou rate limiting');
  pdf.addListItem('Nunca alterar audit_logs (tabela imutavel)');

  pdf.addH3('Regras SEMPRE FAZER:');
  pdf.addListItem('Sempre usar Zod para validacao de inputs');
  pdf.addListItem('Sempre criptografar campos sensiveis');
  pdf.addListItem('Sempre adicionar audit logging em novos endpoints');
  pdf.addListItem('Sempre verificar autenticacao e RBAC');
  pdf.addListItem('Sempre usar o logger (winston) em vez de console.log');
  pdf.addListItem('Sempre testar com npm run check antes de deploy');

  pdf.addSeparator();

  // --- 7. RESUMO POR OBJETIVO ---
  pdf.addH1('7. Resumo por Objetivo');

  pdf.addH2('Para Otimizar o Trabalho (10 skills)');
  pdf.addTable(
    ['#', 'Skill', 'Como Ativar'],
    [
      ['1', 'Workflows Customizados', 'Adicionar no .replit'],
      ['2', 'Agent 3 Full-Stack', 'Chat do Replit'],
      ['3', 'Plan Mode', 'Ativar antes de features'],
      ['4', 'Fast/Full Build', 'Selecionar no Agent'],
      ['5', 'Drizzle Studio', 'Tools > Database'],
      ['6', 'SQL Runner', 'Tools > Database'],
      ['7', 'MCP (Notion, Linear)', 'Integrations > MCP'],
      ['8', 'Max Autonomy', 'Tasks bem definidas'],
      ['9', 'Figma Import', 'Import de designs'],
      ['10', 'Web Search', 'Automatico no Agent 3'],
    ]
  );

  pdf.addSpace(5);

  pdf.addH2('Para Garantir Seguranca (10 skills)');
  pdf.addTable(
    ['#', 'Skill', 'Como Ativar'],
    [
      ['1', 'Semgrep Scanner', 'Config de deploy'],
      ['2', 'HTTPS Automatico', 'Ja ativo'],
      ['3', 'DDoS Protection', 'Ja ativo'],
      ['4', 'Secrets Manager', 'Tools > Secrets'],
      ['5', 'Container Isolation', 'Ja ativo'],
      ['6', 'npm audit', 'Shell: npm audit'],
      ['7', 'TypeScript Strict', 'npm run check'],
      ['8', 'Security Center', 'Enterprise'],
      ['9', 'Git Version Control', 'Ja ativo'],
      ['10', 'Browser Testing', 'Agent 3'],
    ]
  );

  pdf.addSpace(5);

  pdf.addH2('Para Garantir LGPD (10 skills)');
  pdf.addTable(
    ['#', 'Skill', 'Artigo LGPD'],
    [
      ['1', 'Secrets Manager', 'Art. 46'],
      ['2', 'HTTPS', 'Art. 46'],
      ['3', 'Dev/Prod DB Separation', 'Art. 46'],
      ['4', 'Point-in-Time Restore', 'Art. 18'],
      ['5', 'SBOM Export', 'Art. 50'],
      ['6', 'SQL Runner (Audit)', 'Art. 37'],
      ['7', 'Semgrep Leak Detection', 'Art. 46'],
      ['8', 'Container Isolation', 'Art. 46'],
      ['9', 'Agent LGPD Rules', 'Todos'],
      ['10', 'Backup/Restore', 'Art. 46'],
    ]
  );

  pdf.addSpace(5);

  pdf.addH2('Para Proteger contra Erros (10 skills)');
  pdf.addTable(
    ['#', 'Skill', 'Como Ativar'],
    [
      ['1', 'replit.md (regras)', 'Editar arquivo'],
      ['2', 'Dev Banner', 'Ja configurado'],
      ['3', 'Runtime Error Modal', 'Ja configurado'],
      ['4', 'Full Build Mode', 'Selecionar no Agent'],
      ['5', 'TypeScript Check', 'Workflow'],
      ['6', 'Dev/Prod DB Separados', 'Configurar'],
      ['7', 'Git Rollback', 'Automatico'],
      ['8', 'Agent Self-Testing', 'Agent 3'],
      ['9', 'Plan Mode', 'Ativar'],
      ['10', 'Workflows Validacao', 'Adicionar no .replit'],
    ]
  );

  pdf.addSeparator();

  // --- CHECKLIST ---
  pdf.addH1('8. Checklist de Ativacao');

  pdf.addH2('Imediato (fazer agora)');
  pdf.addChecklistItem('Secrets Manager: Migrar todas as variaveis sensiveis');
  pdf.addChecklistItem('Semgrep Scanner: Ativar pre-deployment scanning');
  pdf.addChecklistItem('replit.md: Adicionar instrucoes de seguranca para o Agent');
  pdf.addChecklistItem('Workflows: Adicionar TypeScript Check, Build e Security Audit');
  pdf.addChecklistItem('Dev/Prod Databases: Confirmar separacao de ambientes');

  pdf.addH2('Curto Prazo (esta semana)');
  pdf.addChecklistItem('Agent Instructions: Atualizar replit.md com regras LGPD');
  pdf.addChecklistItem('Full Validation Workflow: Ativar validacao completa pre-deploy');
  pdf.addChecklistItem('npm audit: Executar e corrigir vulnerabilidades pendentes');
  pdf.addChecklistItem('Browser Testing: Usar Agent 3 para testar fluxos criticos');
  pdf.addChecklistItem('Git Integration: Configurar push automatico para GitHub');

  pdf.addH2('Medio Prazo (proximas semanas)');
  pdf.addChecklistItem('MCP Integrations: Conectar Notion/Linear');
  pdf.addChecklistItem('Timed Automations: Backup diario e limpeza de logs');
  pdf.addChecklistItem('Slack/Telegram Bot: Alertas de seguranca');
  pdf.addChecklistItem('Security Center: Avaliar plano Enterprise');

  pdf.addH2('Longo Prazo (proximo mes)');
  pdf.addChecklistItem('Custom Domain: Configurar dominio institucional');
  pdf.addChecklistItem('SBOM Export: Gerar inventario para compliance');
  pdf.addChecklistItem('Full CI/CD: Pipeline completo com testes');
  pdf.addChecklistItem('Multi-environment: Staging separado');

  pdf.finalize();
  console.log('PDF gerado: docs/REPLIT_SKILLS_PRONTAS.pdf');
}

// ============================================
// EXECUTAR
// ============================================
console.log('Gerando PDFs...\n');
generateSkillsAnalysisPDF();
generateReplitSkillsPDF();
console.log('\nConcluido! Arquivos gerados em docs/');
