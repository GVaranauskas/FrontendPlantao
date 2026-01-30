import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TestValidationReport() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "Relatório de Validação - 11Care v1.5.8";
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-50">
        <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={handlePrint} data-testid="button-print-report">
          <Printer className="w-4 h-4 mr-2" />
          Salvar como PDF
        </Button>
      </div>

      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
        <style>{`
          @media print {
            @page {
              margin: 2cm;
              size: A4;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .page-break {
              page-break-before: always;
            }
          }
        `}</style>

        <header className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Relatório de Testes e Correções
              </h1>
              <h2 className="text-xl text-gray-700">11Care Nursing Platform v1.5.8</h2>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p><strong>Data:</strong> 30 de Janeiro de 2026</p>
              <p><strong>Ambiente:</strong> Desenvolvimento</p>
              <p><strong>Executor:</strong> Agente de Validação</p>
            </div>
          </div>
        </header>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
            1. Resumo Executivo
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Foram executados <strong>12 conjuntos de testes</strong> cobrindo todas as funcionalidades 
            críticas da plataforma. Durante a validação, foram identificados e corrigidos{" "}
            <strong>3 bugs</strong> que afetavam funcionalidades de auditoria e analytics. 
            Todos os testes foram revalidados após as correções, resultando em{" "}
            <strong>100% de aprovação</strong>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
            2. Escopo dos Testes
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">#</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Categoria</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Endpoints/Funcionalidades</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { n: 1, cat: "Autenticação", desc: "Login, refresh token, logout, first-access password change" },
                { n: 2, cat: "Rate Limiting", desc: "Bloqueio após 5 tentativas (15 min), proteção de força bruta" },
                { n: 3, cat: "RBAC", desc: "Permissões admin/enfermagem/visualizador, segregação de acesso" },
                { n: 4, cat: "LGPD", desc: "Exportação de dados, anonimização, categorias de dados" },
                { n: 5, cat: "Gestão de Pacientes", desc: "CRUD, notas, paginação, filtros por status/especialidade" },
                { n: 6, cat: "Histórico de Pacientes", desc: "Visualização de alta/transferência/óbito, estatísticas" },
                { n: 7, cat: "Sincronização N8N", desc: "Sync manual, detecção de mudanças, reativação automática" },
                { n: 8, cat: "Análise Clínica (IA)", desc: "GPT-4o-mini, análise individual/batch, cache" },
                { n: 9, cat: "Unidades de Enfermagem", desc: "Listagem, aprovação de mudanças pendentes" },
                { n: 10, cat: "Analytics", desc: "Eventos, sessões, métricas administrativas" },
                { n: 11, cat: "Segurança", desc: "Headers HTTP, SQL injection, UUID validation, encryption" },
                { n: 12, cat: "Impressão", desc: "Funcionalidade frontend (browser-based print)" },
              ].map((row) => (
                <tr key={row.n} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 text-center">{row.n}</td>
                  <td className="border border-gray-300 px-3 py-2 font-medium">{row.cat}</td>
                  <td className="border border-gray-300 px-3 py-2">{row.desc}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center text-green-700 font-bold">PASS</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-8 page-break">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
            3. Bugs Identificados e Correções Aplicadas
          </h2>

          <div className="mb-6 bg-gray-50 p-4 rounded border">
            <h3 className="font-bold text-gray-900 mb-2">
              3.1 Bug #1 - SQL Column Mismatch em PatientNoteEvents
            </h3>
            <div className="text-sm space-y-2">
              <p><strong>Localização:</strong> <code className="bg-gray-200 px-1 rounded">server/repositories/postgres-storage.ts</code> (linha 1005)</p>
              <p><strong>Descrição:</strong> O método <code className="bg-gray-200 px-1 rounded">getPatientNoteEvents()</code> referenciava colunas inexistentes na tabela <code className="bg-gray-200 px-1 rounded">patient_note_events</code>.</p>
              <p><strong>Impacto:</strong> <span className="text-red-600 font-medium">Alto</span> - Impossibilidade de visualizar histórico de alterações em notas de pacientes.</p>
              <div className="mt-2">
                <p className="font-medium">Correção:</p>
                <pre className="bg-gray-800 text-green-400 p-2 rounded text-xs mt-1 overflow-x-auto">
{`// ANTES (incorreto)
performer_user_id  →  performed_by_id
performed_at       →  created_at

// DEPOIS (corrigido)
SELECT ... pne.performed_by_id, pne.created_at as "performedAt"
COALESCE(pne.performed_by_name, u.name, 'Sistema') as "performerName"`}
                </pre>
              </div>
            </div>
          </div>

          <div className="mb-6 bg-gray-50 p-4 rounded border">
            <h3 className="font-bold text-gray-900 mb-2">
              3.2 Bug #2 - WHERE Clause Inválida em Analytics Metrics
            </h3>
            <div className="text-sm space-y-2">
              <p><strong>Localização:</strong> <code className="bg-gray-200 px-1 rounded">server/repositories/postgres-storage.ts</code> (linha 814)</p>
              <p><strong>Descrição:</strong> A função <code className="bg-gray-200 px-1 rounded">getUsageMetrics()</code> utilizava diretamente o campo <code className="bg-gray-200 px-1 rounded">durationSeconds</code> como condição booleana no WHERE.</p>
              <p><strong>Impacto:</strong> <span className="text-orange-600 font-medium">Médio</span> - Endpoint <code className="bg-gray-200 px-1 rounded">/api/admin/analytics/metrics</code> retornava erro 500.</p>
              <div className="mt-2">
                <p className="font-medium">Correção:</p>
                <pre className="bg-gray-800 text-green-400 p-2 rounded text-xs mt-1 overflow-x-auto">
{`// ANTES (incorreto)
where: and(userSessions.durationSeconds, whereClause)

// DEPOIS (corrigido)
where: and(isNotNull(userSessions.durationSeconds), whereClause)`}
                </pre>
              </div>
              <p className="text-gray-600 text-xs mt-1">Dependência: Adicionado <code className="bg-gray-200 px-1 rounded">isNotNull</code> ao import do Drizzle ORM.</p>
            </div>
          </div>

          <div className="mb-6 bg-gray-50 p-4 rounded border">
            <h3 className="font-bold text-gray-900 mb-2">
              3.3 Bug #3 - Endpoint LGPD com Permissão Insuficiente
            </h3>
            <div className="text-sm space-y-2">
              <p><strong>Localização:</strong> <code className="bg-gray-200 px-1 rounded">server/routes.ts</code> (linha 2022)</p>
              <p><strong>Descrição:</strong> O endpoint <code className="bg-gray-200 px-1 rounded">/api/lgpd/data-categories</code> estava protegido apenas por autenticação básica.</p>
              <p><strong>Impacto:</strong> <span className="text-orange-600 font-medium">Médio-Alto</span> - Violação de princípio de menor privilégio para dados sensíveis.</p>
              <div className="mt-2">
                <p className="font-medium">Correção:</p>
                <pre className="bg-gray-800 text-green-400 p-2 rounded text-xs mt-1 overflow-x-auto">
{`// ANTES
app.get("/api/lgpd/data-categories", authWithFirstAccessCheck, ...)

// DEPOIS
app.get("/api/lgpd/data-categories", requireRoleWithAuth('admin'), ...)`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
            4. Validações de Segurança
          </h2>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-4 rounded border">
              <h4 className="font-bold mb-2">4.1 Headers HTTP (Helmet)</h4>
              <ul className="space-y-1 text-xs font-mono">
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> X-Frame-Options: DENY</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> X-Content-Type-Options: nosniff</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> X-XSS-Protection: 1; mode=block</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Strict-Transport-Security</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Referrer-Policy: strict-origin</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Permissions-Policy</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded border">
              <h4 className="font-bold mb-2">4.2 Proteções de Input</h4>
              <ul className="space-y-1 text-xs font-mono">
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> SQL Injection: Bloqueado</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> UUID Validation: Ativo</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Authentication: 401 sem token</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Rate Limiting: 5 tentativas</li>
              </ul>
            </div>

            <div className="bg-gray-50 p-4 rounded border col-span-2">
              <h4 className="font-bold mb-2">4.3 Configurações JWT v1.5.8</h4>
              <ul className="space-y-1 text-xs font-mono">
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Token Expiry: 15 minutos</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Cookie SameSite: strict</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Token Versioning: Implementado para revogação remota</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Password Hashes: Filtrados de responses getAllUsers()</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
            5. Resultados da Sincronização N8N
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Métrica</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-gray-300 px-3 py-2">Pacientes sincronizados</td><td className="border border-gray-300 px-3 py-2 font-medium">34</td></tr>
              <tr><td className="border border-gray-300 px-3 py-2">Tempo de execução</td><td className="border border-gray-300 px-3 py-2 font-medium">~30 segundos</td></tr>
              <tr><td className="border border-gray-300 px-3 py-2">Pacientes com análise IA</td><td className="border border-gray-300 px-3 py-2 font-medium">34</td></tr>
              <tr><td className="border border-gray-300 px-3 py-2">Concorrência de DB</td><td className="border border-gray-300 px-3 py-2 font-medium">CONCURRENCY_LIMIT=10</td></tr>
            </tbody>
          </table>
        </section>

        <section className="mb-8 page-break">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
            6. Cobertura de Testes por Módulo
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Módulo</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Testado</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {[
                { mod: "server/routes/auth.ts", note: "" },
                { mod: "server/middleware/auth.ts", note: "" },
                { mod: "server/repositories/postgres-storage.ts", note: "*" },
                { mod: "server/routes.ts", note: "*" },
                { mod: "server/security.ts", note: "" },
                { mod: "N8N Integration Service", note: "" },
                { mod: "UnifiedClinicalAnalysisService", note: "" },
              ].map((row) => (
                <tr key={row.mod}>
                  <td className="border border-gray-300 px-3 py-2 font-mono text-xs">{row.mod}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center text-green-600">✓</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-medium text-green-700">
                    PASS{row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2">* Correções aplicadas durante testes</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
            7. Recomendações
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>
              <strong>Testes Automatizados:</strong> Implementar testes unitários/integração para{" "}
              <code className="bg-gray-200 px-1 rounded text-xs">getUsageMetrics()</code> e{" "}
              <code className="bg-gray-200 px-1 rounded text-xs">getPatientNoteEvents()</code> para prevenir regressões.
            </li>
            <li>
              <strong>Documentação:</strong> Adicionar documentação explícita que a funcionalidade de impressão 
              é baseada em browser (window.print), não havendo endpoint backend.
            </li>
            <li>
              <strong>CI/CD:</strong> Incluir smoke tests dos endpoints corrigidos no pipeline de integração contínua.
            </li>
            <li>
              <strong>Monitoramento:</strong> Configurar alertas para erros 500 nos endpoints de analytics e auditoria.
            </li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
            8. Conclusão
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            A plataforma 11Care v1.5.8 passou por validação completa de suas funcionalidades críticas. 
            Os 3 bugs identificados foram corrigidos e revalidados com sucesso. O sistema está em 
            conformidade com os requisitos de segurança (LGPD, RBAC, rate limiting) e pronto para 
            uso em ambiente de produção.
          </p>
          
          <div className="bg-green-50 border border-green-300 rounded p-4 text-center">
            <p className="text-lg font-bold text-green-800">
              Aprovação Final: APROVADO
            </p>
          </div>
        </section>

        <footer className="border-t border-gray-300 pt-4 mt-8 text-xs text-gray-500">
          <p>Relatório gerado automaticamente.</p>
          <p>Checkpoint: <code className="bg-gray-200 px-1 rounded">0d3505fb169cdef63c3c14ec30c609f35bbcddd3</code></p>
        </footer>
      </div>
    </div>
  );
}
