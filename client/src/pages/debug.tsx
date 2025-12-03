import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Copy, RefreshCw, ArrowLeft } from "lucide-react";
import type { Patient, Alert } from "@shared/schema";

interface Enfermaria {
  codigo: string;
  nome: string;
}

export default function DebugPage() {
  const [, setLocation] = useLocation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    patients: true,
    alerts: true,
    enfermarias: true,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedEnfermaria, setSelectedEnfermaria] = useState("10A02");

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
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">Paciente #{idx + 1}</span>
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
