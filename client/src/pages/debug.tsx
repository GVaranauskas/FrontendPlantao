import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Copy, RefreshCw, ArrowLeft, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Patient, Alert } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Enfermaria {
  codigo: string;
  nome: string;
}

interface BulkImportResult {
  success: boolean;
  message: string;
  stats: {
    total: number;
    created: number;
    deleted: number;
    errors: Array<{ index: number; leito: string; error: string }>;
  };
}

export default function DebugPage() {
  const [, setLocation] = useLocation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    patients: true,
    alerts: true,
    enfermarias: true,
    bulkImport: true,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedEnfermaria, setSelectedEnfermaria] = useState("10A02");
  const [jsonInput, setJsonInput] = useState("");
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkImportMutation = useMutation({
    mutationFn: async (data: unknown[]) => {
      const response = await apiRequest("POST", "/api/import/bulk-json", { data });
      return response.json() as Promise<BulkImportResult>;
    },
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
    onError: (error) => {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : "Erro desconhecido",
        stats: { total: 0, created: 0, deleted: 0, errors: [] }
      });
    }
  });

  const { data: patients, refetch: refetchPatients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: alerts, refetch: refetchAlerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: enfermarias } = useQuery<Enfermaria[]>({
    queryKey: ["/api/enfermarias"],
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setLocation("/modules")}
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Visualizador JSON - Debug</h1>
            <p className="text-muted-foreground">
              Visualize todos os campos e informações que a API está enviando
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="p-4 bg-muted/30">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => { refetchPatients(); refetchAlerts(); }}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Recarregar dados
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const res = await fetch("/api/import/evolucoes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ enfermaria: selectedEnfermaria }),
                });
                const data = await res.json();
                console.log("Import response:", data);
                refetchPatients();
                alert(`Importação concluída: ${data.stats.importados} registros importados`);
              }}
            >
              Importar {selectedEnfermaria}
            </Button>
          </div>
        </Card>

        {/* BULK JSON IMPORT SECTION */}
        <Card className="overflow-hidden">
          <div
            className="p-4 bg-gradient-to-r from-amber-500/10 to-transparent cursor-pointer hover:bg-amber-500/20 transition-colors flex items-center justify-between"
            onClick={() => toggleSection("bulkImport")}
            data-testid="section-bulk-import-toggle"
          >
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" /> Importação JSON em Massa
            </h2>
            {expandedSections.bulkImport ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>

          {expandedSections.bulkImport && (
            <div className="p-4 space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Atenção:</strong> Esta importação irá <strong>SUBSTITUIR TODOS</strong> os dados de pacientes existentes. 
                    Faça backup dos dados atuais antes de prosseguir.
                  </span>
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = event.target?.result as string;
                          setJsonInput(content);
                          setImportResult(null);
                        };
                        reader.readAsText(file);
                      }
                    }}
                    data-testid="input-json-file"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-file"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Carregar arquivo JSON
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setJsonInput("");
                      setImportResult(null);
                    }}
                    data-testid="button-clear-json"
                  >
                    Limpar
                  </Button>
                </div>

                <textarea
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    setImportResult(null);
                  }}
                  placeholder='Cole aqui o JSON com array de pacientes, ex: [{"leito": "101A", "nome": "Paciente 1"}, ...]'
                  className="w-full h-48 p-3 rounded-lg border bg-background font-mono text-xs resize-y"
                  data-testid="textarea-json-input"
                />

                <div className="flex gap-2 flex-wrap items-center">
                  <Button
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(jsonInput);
                        const dataArray = Array.isArray(parsed) ? parsed : parsed.data || parsed.patients || [parsed];
                        if (dataArray.length === 0) {
                          setImportResult({
                            success: false,
                            message: "O JSON não contém dados para importar",
                            stats: { total: 0, created: 0, deleted: 0, errors: [] }
                          });
                          return;
                        }
                        bulkImportMutation.mutate(dataArray);
                      } catch (e) {
                        setImportResult({
                          success: false,
                          message: "JSON inválido: " + (e instanceof Error ? e.message : String(e)),
                          stats: { total: 0, created: 0, deleted: 0, errors: [] }
                        });
                      }
                    }}
                    disabled={!jsonInput.trim() || bulkImportMutation.isPending}
                    data-testid="button-import-json"
                  >
                    {bulkImportMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Importar e Substituir Dados
                      </>
                    )}
                  </Button>
                  {jsonInput && (
                    <span className="text-xs text-muted-foreground">
                      {jsonInput.length.toLocaleString()} caracteres
                    </span>
                  )}
                </div>
              </div>

              {importResult && (
                <div
                  className={`p-4 rounded-lg border ${
                    importResult.success
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-red-500/10 border-red-500/30"
                  }`}
                  data-testid="import-result"
                >
                  <div className="flex items-start gap-2">
                    {importResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    )}
                    <div className="space-y-2">
                      <p className={importResult.success ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}>
                        {importResult.message}
                      </p>
                      {importResult.stats && (
                        <div className="text-sm space-y-1">
                          <p>Total processado: <strong>{importResult.stats.total}</strong></p>
                          <p>Registros criados: <strong>{importResult.stats.created}</strong></p>
                          <p>Registros anteriores removidos: <strong>{importResult.stats.deleted}</strong></p>
                          {importResult.stats.errors.length > 0 && (
                            <div className="mt-2">
                              <p className="text-red-600 dark:text-red-400 font-medium">Erros ({importResult.stats.errors.length}):</p>
                              <ul className="list-disc ml-4 text-xs mt-1">
                                {importResult.stats.errors.slice(0, 5).map((err, i) => (
                                  <li key={i}>Leito {err.leito}: {err.error}</li>
                                ))}
                                {importResult.stats.errors.length > 5 && (
                                  <li>... e mais {importResult.stats.errors.length - 5} erros</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* PATIENTS SECTION */}
        <Card className="overflow-hidden">
          <div
            className="p-4 bg-gradient-to-r from-primary/10 to-transparent cursor-pointer hover:bg-primary/20 transition-colors flex items-center justify-between"
            onClick={() => toggleSection("patients")}
          >
            <h2 className="text-xl font-semibold flex items-center gap-2">
              👥 Pacientes ({patients?.length || 0})
            </h2>
            {expandedSections.patients ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>

          {expandedSections.patients && (
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {patients?.length === 0 ? (
                <p className="text-muted-foreground">Nenhum paciente importado</p>
              ) : (
                patients?.map((patient, idx) => (
                  <div key={patient.id} className="border rounded-lg p-3 bg-card/50 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">Paciente #{idx + 1}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="font-medium">{patient.nome}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-xs text-muted-foreground">Leito: {patient.leito}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {patient.importedAt && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Importado: {new Date(patient.importedAt).toLocaleString("pt-BR")}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard(JSON.stringify(patient, null, 2), `patient-${patient.id}`)
                          }
                        >
                          {copiedId === `patient-${patient.id}` ? "✓ Copiado" : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                    <pre className="bg-black text-green-400 p-2 rounded text-xs overflow-x-auto max-h-48">
                      {JSON.stringify(patient, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* ALERTS SECTION */}
        <Card className="overflow-hidden">
          <div
            className="p-4 bg-gradient-to-r from-chart-3/10 to-transparent cursor-pointer hover:bg-chart-3/20 transition-colors flex items-center justify-between"
            onClick={() => toggleSection("alerts")}
          >
            <h2 className="text-xl font-semibold flex items-center gap-2">
              🚨 Alertas ({alerts?.length || 0})
            </h2>
            {expandedSections.alerts ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>

          {expandedSections.alerts && (
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {alerts?.length === 0 ? (
                <p className="text-muted-foreground">Nenhum alerta</p>
              ) : (
                alerts?.map((alert, idx) => (
                  <div key={alert.id} className="border rounded-lg p-3 bg-card/50 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">Alerta #{idx + 1}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(JSON.stringify(alert, null, 2), `alert-${alert.id}`)
                        }
                      >
                        {copiedId === `alert-${alert.id}` ? "✓ Copiado" : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                    <pre className="bg-black text-blue-400 p-2 rounded text-xs overflow-x-auto max-h-48">
                      {JSON.stringify(alert, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* ENFERMARIAS SECTION */}
        <Card className="overflow-hidden">
          <div
            className="p-4 bg-gradient-to-r from-primary/10 to-transparent cursor-pointer hover:bg-primary/20 transition-colors flex items-center justify-between"
            onClick={() => toggleSection("enfermarias")}
          >
            <h2 className="text-xl font-semibold flex items-center gap-2">
              🏥 Enfermarias ({enfermarias?.length || 0})
            </h2>
            {expandedSections.enfermarias ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>

          {expandedSections.enfermarias && (
            <div className="p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Selecione uma enfermaria para importar:</label>
                <div className="flex gap-2">
                  <select
                    value={selectedEnfermaria}
                    onChange={(e) => setSelectedEnfermaria(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md bg-background"
                  >
                    {enfermarias?.map((e) => (
                      <option key={e.codigo} value={e.codigo}>
                        {e.nome} ({e.codigo})
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={async () => {
                      const res = await fetch("/api/import/evolucoes", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ enfermaria: selectedEnfermaria }),
                      });
                      const data = await res.json();
                      console.log("Import response:", data);
                      refetchPatients();
                      alert(
                        `✓ Importação concluída\n\nTotal: ${data.stats.total}\nImportados: ${data.stats.importados}\nErros: ${data.stats.erros}`
                      );
                    }}
                  >
                    Importar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Todas as enfermarias:</p>
                <div className="bg-black text-green-400 p-3 rounded text-xs overflow-x-auto max-h-48">
                  <pre>{JSON.stringify(enfermarias, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Raw JSON Export */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">📋 Exportar todos os dados em JSON</h3>
          <Button
            size="sm"
            onClick={() => {
              const allData = {
                timestamp: new Date().toISOString(),
                patients,
                alerts,
                enfermarias,
              };
              copyToClipboard(JSON.stringify(allData, null, 2), "all-data");
            }}
          >
            {copiedId === "all-data" ? "✓ Copiado para clipboard" : "Copiar tudo como JSON"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
