import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Copy } from "lucide-react";
import type { Patient, ImportHistory, NursingUnitTemplate } from "@shared/schema";

export default function DatabaseViewerPage() {
  const [view, setView] = useState<"patients" | "imports" | "templates">("patients");
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [expandedImport, setExpandedImport] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: history = [] } = useQuery<ImportHistory[]>({
    queryKey: ["/api/import/history"],
  });

  const { data: templates = [] } = useQuery<NursingUnitTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Visualizador de Banco de Dados</h1>
          <p className="text-muted-foreground">
            Visualize todos os dados das tabelas em tempo real
          </p>
        </div>

        <div className="flex gap-2 mb-8">
          <Button
            onClick={() => setView("patients")}
            variant={view === "patients" ? "default" : "outline"}
            data-testid="button-view-patients"
          >
            Pacientes ({patients.length})
          </Button>
          <Button
            onClick={() => setView("imports")}
            variant={view === "imports" ? "default" : "outline"}
            data-testid="button-view-imports"
          >
            Importações ({history.length})
          </Button>
          <Button
            onClick={() => setView("templates")}
            variant={view === "templates" ? "default" : "outline"}
            data-testid="button-view-templates"
          >
            Templates ({templates.length})
          </Button>
        </div>

        {/* Pacientes View */}
        {view === "patients" && (
          <div className="space-y-4">
            {patients.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                Nenhum paciente registrado
              </Card>
            ) : (
              patients.map((patient, idx) => {
                const isExpanded = expandedPatient === `${patient.leito}-${idx}`;
                const key = `${patient.leito}-${idx}`;

                return (
                  <Card 
                    key={key}
                    className="overflow-hidden hover-elevate cursor-pointer transition-colors"
                  >
                    <div 
                      onClick={() => setExpandedPatient(isExpanded ? null : key)}
                      className="p-4 flex items-center justify-between bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-primary text-lg">
                            {patient.leito}
                          </span>
                          <span className="font-semibold">{patient.nome}</span>
                          <Badge variant="outline">{patient.dsEnfermaria}</Badge>
                          {patient.alertStatus && (
                            <Badge 
                              className={
                                patient.alertStatus === "critical" ? "bg-red-600" :
                                patient.alertStatus === "alert" ? "bg-yellow-600" :
                                patient.alertStatus === "pending" ? "bg-blue-600" :
                                "bg-green-600"
                              }
                            >
                              {patient.alertStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t bg-background">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Leito</p>
                              <p className="font-mono">{patient.leito}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Nome</p>
                              <p>{patient.nome}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Enfermaria</p>
                              <p>{patient.dsEnfermaria}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Especialidade</p>
                              <p>{patient.dsEspecialidade || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Mobilidade</p>
                              <p>{patient.mobilidade || "N/A"}</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Alert Status</p>
                              <p>{patient.alertStatus || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">ID Evolução</p>
                              <p className="font-mono text-xs break-all">{patient.idEvolucao || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Registro</p>
                              <p className="font-mono">{patient.registro || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Códigos de Cuidado</p>
                              <p className="font-mono text-xs break-all">
                                {Array.isArray(patient.codigoCuidados) 
                                  ? patient.codigoCuidados.join(", ") 
                                  : patient.codigoCuidados || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* JSON Raw */}
                        <div className="mt-6 pt-6 border-t">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-muted-foreground">JSON Completo</p>
                            <Button 
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(JSON.stringify(patient, null, 2))}
                              data-testid={`button-copy-patient-${idx}`}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="bg-muted p-3 rounded font-mono text-xs overflow-x-auto max-h-40 overflow-y-auto">
                            <pre>{JSON.stringify(patient, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Importações View */}
        {view === "imports" && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                Nenhum registro de importação
              </Card>
            ) : (
              history.map((item, idx) => {
                const isExpanded = expandedImport === `${item.id}-${idx}`;
                const key = `${item.id}-${idx}`;
                const timestamp = new Date(item.timestamp).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

                return (
                  <Card key={key} className="overflow-hidden hover-elevate cursor-pointer transition-colors">
                    <div 
                      onClick={() => setExpandedImport(isExpanded ? null : key)}
                      className="p-4 flex items-center justify-between bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-muted-foreground">{timestamp}</span>
                          <Badge variant="outline">{item.enfermaria}</Badge>
                          <span className="text-sm">
                            <span className="text-green-600 font-semibold">{item.importados}</span>
                            {" / "}
                            <span className="text-red-600 font-semibold">{item.erros}</span>
                            {" / "}
                            <span>{item.total}</span>
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t bg-background">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                            <p className="font-mono text-xs">{timestamp}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Enfermaria</p>
                            <p>{item.enfermaria}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total</p>
                            <p className="font-semibold">{item.total}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Importados</p>
                            <p className="text-green-600 font-semibold">{item.importados}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Erros</p>
                            <p className="text-red-600 font-semibold">{item.erros}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Duração</p>
                            <p className="font-mono">{item.duracao}ms</p>
                          </div>
                        </div>

                        {/* Detalhes JSON */}
                        <div className="mt-6 pt-6 border-t">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-muted-foreground">JSON Completo</p>
                            <Button 
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(JSON.stringify(item, null, 2))}
                              data-testid={`button-copy-import-${idx}`}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="bg-muted p-3 rounded font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
                            <pre>{JSON.stringify(item, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Templates View */}
        {view === "templates" && (
          <div className="space-y-4">
            {templates.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                Nenhum template configurado
              </Card>
            ) : (
              templates.map((template, idx) => {
                const isExpanded = expandedTemplate === `${template.id}-${idx}`;
                const key = `${template.id}-${idx}`;

                return (
                  <Card key={key} className="overflow-hidden hover-elevate cursor-pointer transition-colors">
                    <div 
                      onClick={() => setExpandedTemplate(isExpanded ? null : key)}
                      className="p-4 flex items-center justify-between bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{template.name}</span>
                          <Badge variant="outline">{template.enfermariaCodigo}</Badge>
                          {template.isActive && <Badge className="bg-green-600">Ativo</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t bg-background space-y-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Informações Básicas</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">ID</p>
                              <p className="font-mono text-sm">{template.id}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Enfermaria</p>
                              <p>{template.enfermariaCodigo}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Status</p>
                              <p>{template.isActive ? "Ativo" : "Inativo"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Criado em</p>
                              <p className="font-mono text-xs">
                                {new Date(template.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Configuração de Campos */}
                        {template.fieldsConfiguration && (
                          <div className="pt-4 border-t">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Configuração de Campos</p>
                            <div className="bg-muted p-3 rounded font-mono text-xs overflow-x-auto max-h-40 overflow-y-auto">
                              <pre>{JSON.stringify(template.fieldsConfiguration, null, 2)}</pre>
                            </div>
                          </div>
                        )}

                        {/* Regras Especiais */}
                        {template.specialRules && (
                          <div className="pt-4 border-t">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Regras Especiais</p>
                            <div className="bg-muted p-3 rounded font-mono text-xs overflow-x-auto max-h-40 overflow-y-auto">
                              <pre>{JSON.stringify(template.specialRules, null, 2)}</pre>
                            </div>
                          </div>
                        )}

                        {/* JSON Completo */}
                        <div className="pt-4 border-t">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-muted-foreground">JSON Completo</p>
                            <Button 
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(JSON.stringify(template, null, 2))}
                              data-testid={`button-copy-template-${idx}`}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="bg-muted p-3 rounded font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
                            <pre>{JSON.stringify(template, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <p>Clique em qualquer registro para expandir e visualizar todos os detalhes</p>
          <p>Use o botão de copiar para copiar dados em formato JSON</p>
        </div>
      </div>
    </div>
  );
}
