import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  X,
  Copy,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  ArrowLeft,
} from "lucide-react";
import type { Patient } from "@shared/schema";

interface TextFieldItem {
  leito: string;
  nome: string;
  campo: string;
  conteudo: string;
  tamanho: number;
}

export default function TextViewerPage() {
  const [, setLocation] = useLocation();
  const [selectedText, setSelectedText] = useState<TextFieldItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients", { paginate: "false" }],
    queryFn: async () => {
      const response = await fetch("/api/patients?paginate=false", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
  });

  // Extrair todos os textos grandes
  const textFields = useMemo(() => {
    const fields: TextFieldItem[] = [];

    patients.forEach((p) => {
      // Evolução do N8N (campo mais importante)
      const evolucao = (p.dadosBrutosJson as any)?.ds_evolucao;
      if (evolucao && typeof evolucao === "string" && evolucao.length > 0) {
        fields.push({
          leito: p.leito,
          nome: p.nome,
          campo: "Evolução Completa (N8N)",
          conteudo: evolucao,
          tamanho: evolucao.length,
        });
      }

      // Observações
      if (
        p.observacoes &&
        p.observacoes.length > 10
      ) {
        fields.push({
          leito: p.leito,
          nome: p.nome,
          campo: "Observações",
          conteudo: p.observacoes,
          tamanho: p.observacoes.length,
        });
      }

      // Diagnóstico
      if (
        p.diagnostico &&
        p.diagnostico.length > 10
      ) {
        fields.push({
          leito: p.leito,
          nome: p.nome,
          campo: "Diagnóstico",
          conteudo: p.diagnostico,
          tamanho: p.diagnostico.length,
        });
      }
    });

    // Filtrar por busca
    if (searchTerm) {
      return fields.filter(
        (f) =>
          f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.leito.includes(searchTerm) ||
          f.conteudo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return fields.sort((a, b) => b.tamanho - a.tamanho);
  }, [patients, searchTerm]);

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportTexts = () => {
    const data = {
      timestamp: new Date().toISOString(),
      totalTextos: textFields.length,
      tamanhoTotal: textFields.reduce((sum, f) => sum + f.tamanho, 0),
      textos: textFields.map((f) => ({
        leito: f.leito,
        paciente: f.nome,
        campo: f.campo,
        tamanho: f.tamanho,
        conteudo: f.conteudo,
      })),
    };

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:application/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(data, null, 2))
    );
    element.setAttribute("download", `textos-${new Date().getTime()}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Modal Visualizador */}
      {selectedText && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-96 flex flex-col bg-card">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold">{selectedText.campo}</h3>
                <p className="text-sm text-muted-foreground">
                  Leito {selectedText.leito} - {selectedText.nome}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSelectedText(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-black text-green-400 font-mono text-sm whitespace-pre-wrap break-words">
              {selectedText.conteudo}
            </div>

            <div className="flex gap-2 p-6 border-t bg-muted/30">
              <Button
                size="sm"
                onClick={() =>
                  copyToClipboard(selectedText.conteudo, "modal-copy")
                }
              >
                {copiedId === "modal-copy" ? (
                  "✓ Copiado"
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const element = document.createElement("a");
                  element.setAttribute(
                    "href",
                    "data:text/plain;charset=utf-8," +
                      encodeURIComponent(selectedText.conteudo)
                  );
                  element.setAttribute(
                    "download",
                    `texto-${selectedText.leito}-${selectedText.campo}.txt`
                  );
                  element.style.display = "none";
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
              >
                <Download className="w-3 h-3 mr-1" />
                Baixar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
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
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <FileText className="w-8 h-8 text-primary" />
                  Visualizador de Textos Grandes
                </h1>
                <p className="text-muted-foreground">
                  Explore campos de texto grandes da API
                </p>
              </div>
            </div>
            <Button onClick={exportTexts} className="gap-2" data-testid="button-export">
              <Download className="w-4 h-4" />
              Exportar Todos ({textFields.length})
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-primary/5">
              <div className="text-2xl font-bold text-primary">
                {textFields.length}
              </div>
              <div className="text-xs text-muted-foreground">Total de Textos</div>
            </Card>
            <Card className="p-4 bg-chart-2/5">
              <div className="text-2xl font-bold text-chart-2">
                {(
                  textFields.reduce((sum, f) => sum + f.tamanho, 0) / 1024
                ).toFixed(1)}
                KB
              </div>
              <div className="text-xs text-muted-foreground">Tamanho Total</div>
            </Card>
            <Card className="p-4 bg-chart-3/5">
              <div className="text-2xl font-bold text-chart-3">
                {Math.max(...textFields.map((f) => f.tamanho), 0)}
              </div>
              <div className="text-xs text-muted-foreground">Max Chars</div>
            </Card>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar em textos, leito, paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <Button
                variant="outline"
                onClick={() => setSearchTerm("")}
                size="sm"
              >
                Limpar
              </Button>
            )}
          </div>

          {/* Textos Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto max-h-screen">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      Leito
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Paciente
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">Campo</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Tamanho
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {textFields.map((item, idx) => {
                    const id = `${item.leito}-${idx}`;
                    const isExpanded = expandedRows.has(id);
                    const preview = item.conteudo.substring(0, 100);

                    return (
                      <tr
                        key={id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-bold text-primary">
                          {item.leito}
                        </td>
                        <td className="px-4 py-3 truncate text-sm">
                          {item.nome}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="secondary">{item.campo}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                          {item.tamanho} chars
                        </td>
                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleRow(id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedText(item)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(item.conteudo, `copy-${id}`)
                            }
                          >
                            {copiedId === `copy-${id}` ? (
                              "✓"
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {textFields.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum texto encontrado
                </div>
              )}
            </div>
          </Card>

          {/* Expandable previews */}
          <div className="space-y-3">
            {textFields.map((item, idx) => {
              const id = `${item.leito}-${idx}`;
              const isExpanded = expandedRows.has(id);

              return (
                <Card
                  key={id}
                  className="overflow-hidden"
                  onClick={() => toggleRow(id)}
                >
                  <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-primary">
                          Leito {item.leito}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {item.nome}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {item.campo}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.tamanho} chars
                        </Badge>
                      </div>
                      {!isExpanded && (
                        <p className="text-sm text-muted-foreground truncate">
                          {item.conteudo.substring(0, 100)}...
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedText(item);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t bg-black text-green-400 font-mono text-xs max-h-64 overflow-y-auto whitespace-pre-wrap break-words">
                      {item.conteudo}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
