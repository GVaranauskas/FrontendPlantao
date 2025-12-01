import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, Users, Activity } from "lucide-react";
import type { Patient, ImportHistory } from "@shared/schema";

interface ReportStats {
  totalPatients: number;
  totalLogs: number;
  totalImported: number;
  totalErrors: number;
  averageDuration: number;
  byEnfermaria: Record<string, {
    totalPatients: number;
    mobilidade: Record<string, number>;
    alertStatus: Record<string, number>;
  }>;
}

export default function ReportPage() {
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: history = [] } = useQuery<ImportHistory[]>({
    queryKey: ["/api/import/history"],
  });

  // Calcular estatísticas consolidadas
  const reportStats: ReportStats = {
    totalPatients: patients.length,
    totalLogs: history.length,
    totalImported: history.reduce((sum, h) => sum + (h.importados || 0), 0),
    totalErrors: history.reduce((sum, h) => sum + (h.erros || 0), 0),
    averageDuration: history.length > 0 
      ? Math.round(history.reduce((sum, h) => sum + (h.duracao || 0), 0) / history.length)
      : 0,
    byEnfermaria: {},
  };

  // Agrupar pacientes por enfermaria
  patients.forEach(p => {
    const enf = p.dsEnfermaria || "N/A";
    if (!reportStats.byEnfermaria[enf]) {
      reportStats.byEnfermaria[enf] = {
        totalPatients: 0,
        mobilidade: {},
        alertStatus: {},
      };
    }
    reportStats.byEnfermaria[enf].totalPatients++;
    
    // Contar mobilidade
    if (p.mobilidade) {
      reportStats.byEnfermaria[enf].mobilidade[p.mobilidade] = 
        (reportStats.byEnfermaria[enf].mobilidade[p.mobilidade] || 0) + 1;
    }
    
    // Contar status de alerta
    if (p.alertStatus) {
      reportStats.byEnfermaria[enf].alertStatus[p.alertStatus] = 
        (reportStats.byEnfermaria[enf].alertStatus[p.alertStatus] || 0) + 1;
    }
  });

  const downloadReport = () => {
    const reportData = {
      timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      summary: {
        totalPatients: reportStats.totalPatients,
        totalImportLogs: reportStats.totalLogs,
        totalPatientsImported: reportStats.totalImported,
        totalErrors: reportStats.totalErrors,
        averageImportDuration: `${reportStats.averageDuration}ms`,
        successRate: reportStats.totalImported + reportStats.totalErrors > 0
          ? Math.round((reportStats.totalImported / (reportStats.totalImported + reportStats.totalErrors)) * 100) + "%"
          : "100%",
      },
      byEnfermaria: Object.entries(reportStats.byEnfermaria).map(([enf, data]) => ({
        name: enf,
        totalPatients: data.totalPatients,
        mobilidade: data.mobilidade,
        alertStatus: data.alertStatus,
      })),
      patients: patients.map(p => ({
        leito: p.leito,
        nome: p.nome,
        enfermaria: p.dsEnfermaria,
        especialidade: p.dsEspecialidade,
        mobilidade: p.mobilidade,
        alertStatus: p.alertStatus,
      })),
      importLogs: history.map(h => ({
        timestamp: new Date(h.timestamp).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        enfermaria: h.enfermaria,
        total: h.total,
        importados: h.importados,
        erros: h.erros,
        duracao: `${h.duracao}ms`,
      })),
    };

    const json = JSON.stringify(reportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `11care-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Relatório Consolidado</h1>
            <p className="text-muted-foreground">
              Dados completos do banco de dados - {new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </p>
          </div>
          <Button onClick={downloadReport} data-testid="button-download-report">
            <Download className="w-4 h-4 mr-2" />
            Baixar Relatório
          </Button>
        </div>

        {/* Resumo Geral */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total Pacientes</span>
            </div>
            <div className="text-2xl font-bold">{reportStats.totalPatients}</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Imports</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{reportStats.totalLogs}</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Importados</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{reportStats.totalImported}</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-muted-foreground">Erros</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{reportStats.totalErrors}</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-muted-foreground">Avg Duration</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{reportStats.averageDuration}ms</div>
          </Card>
        </div>

        {/* Distribuição por Enfermaria */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Pacientes por Enfermaria</h2>
          <div className="space-y-4">
            {Object.entries(reportStats.byEnfermaria).map(([enf, data]) => (
              <div key={enf} className="p-4 border rounded-lg hover-elevate">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-primary">{enf || "Sem Enfermaria"}</h3>
                  <Badge variant="outline">{data.totalPatients} pacientes</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(data.mobilidade).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Mobilidade</p>
                      <div className="space-y-1">
                        {Object.entries(data.mobilidade).map(([mob, count]) => (
                          <div key={mob} className="text-sm flex justify-between">
                            <span>{mob || "N/A"}:</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(data.alertStatus).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Status Alerta</p>
                      <div className="space-y-1">
                        {Object.entries(data.alertStatus).map(([status, count]) => (
                          <div key={status} className="text-sm flex justify-between">
                            <span>{status || "N/A"}:</span>
                            <Badge 
                              variant="outline"
                              className={
                                status === "critical" ? "bg-red-50 text-red-700" :
                                status === "alert" ? "bg-yellow-50 text-yellow-700" :
                                status === "pending" ? "bg-blue-50 text-blue-700" :
                                "bg-green-50 text-green-700"
                              }
                            >
                              {count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Tabela de Pacientes */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Todos os Pacientes ({patients.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Leito</th>
                  <th className="px-4 py-3 text-left font-medium">Nome</th>
                  <th className="px-4 py-3 text-left font-medium">Enfermaria</th>
                  <th className="px-4 py-3 text-left font-medium">Especialidade</th>
                  <th className="px-4 py-3 text-left font-medium">Mobilidade</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum paciente registrado
                    </td>
                  </tr>
                ) : (
                  patients.map((p, idx) => (
                    <tr key={`${p.leito}-${idx}`} className="border-b hover:bg-muted/50" data-testid={`row-patient-${idx}`}>
                      <td className="px-4 py-3 font-mono font-semibold text-primary">{p.leito}</td>
                      <td className="px-4 py-3">{p.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.dsEnfermaria || "N/A"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{p.dsEspecialidade || "N/A"}</td>
                      <td className="px-4 py-3">
                        {p.mobilidade ? (
                          <Badge variant="outline">{p.mobilidade}</Badge>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.alertStatus === "critical" ? (
                          <Badge className="bg-red-600">Crítico</Badge>
                        ) : p.alertStatus === "alert" ? (
                          <Badge className="bg-yellow-600">Alerta</Badge>
                        ) : p.alertStatus === "pending" ? (
                          <Badge className="bg-blue-600">Pendente</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700">OK</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Histórico de Imports */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Histórico de Importações ({history.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium">Enfermaria</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Importados</th>
                  <th className="px-4 py-3 text-right font-medium">Erros</th>
                  <th className="px-4 py-3 text-right font-medium">Duração</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum registro de importação
                    </td>
                  </tr>
                ) : (
                  history.map((h, idx) => (
                    <tr key={`${h.id}-${idx}`} className="border-b hover:bg-muted/50" data-testid={`row-import-${idx}`}>
                      <td className="px-4 py-3 font-mono text-xs">
                        {new Date(h.timestamp).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </td>
                      <td className="px-4 py-3 font-medium">{h.enfermaria}</td>
                      <td className="px-4 py-3 text-right">{h.total}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge className="bg-green-600">{h.importados}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {h.erros > 0 ? (
                          <Badge variant="destructive">{h.erros}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{h.duracao}ms</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-8 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <p>Relatório gerado em: {new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
          <p>Dados em tempo real do banco de dados PostgreSQL</p>
        </div>
      </div>
    </div>
  );
}
