import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Download,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Filter,
  X,
  ArrowLeft,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import type { Patient } from "@shared/schema";

const COLORS = ["#0056b3", "#007bff", "#28a745", "#dc3545", "#ffc107", "#17a2b8"];

export default function AnalyticsPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"leito" | "nome" | "especialidade">("leito");
  const [filterStatus, setFilterStatus] = useState<"all" | "complete" | "pending">("all");

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Filter and sort data
  const filteredPatients = useMemo(() => {
    let filtered = patients.filter((p) => {
      const matchesSearch =
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.leito.includes(searchTerm) ||
        (p.especialidadeRamal?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesStatus =
        filterStatus === "all" || p.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      if (sortBy === "leito") return a.leito.localeCompare(b.leito);
      if (sortBy === "nome") return a.nome.localeCompare(b.nome);
      if (sortBy === "especialidade")
        return (a.especialidadeRamal || "").localeCompare(b.especialidadeRamal || "");
      return 0;
    });

    return filtered;
  }, [patients, searchTerm, sortBy, filterStatus]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completeness: Record<string, { filled: number; total: number }> = {};
    const specialties: Record<string, number> = {};
    const mobilityTypes: Record<string, number> = {};
    let totalFields = 0;
    let filledFields = 0;

    patients.forEach((p) => {
      // Specialty distribution
      const spec = p.especialidadeRamal || "Não informado";
      specialties[spec] = (specialties[spec] || 0) + 1;

      // Mobility distribution
      const mobility = p.mobilidade || "N/A";
      mobilityTypes[mobility] = (mobilityTypes[mobility] || 0) + 1;

      // Field completeness
      const fields = [
        p.nome,
        p.registro,
        p.especialidadeRamal,
        p.dataNascimento,
        p.dataInternacao,
        p.diagnostico,
        p.alergias,
        p.mobilidade,
        p.dieta,
        p.dispositivos,
      ];

      fields.forEach((field) => {
        totalFields++;
        if (field) filledFields++;
      });
    });

    return {
      totalPatients: patients.length,
      completeRecords: patients.filter((p) => p.status === "complete").length,
      pendingRecords: patients.filter((p) => p.status === "pending").length,
      completenessPercent:
        totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0,
      specialties: Object.entries(specialties)
        .map(([name, count]) => ({ name, value: count }))
        .sort((a, b) => b.value - a.value),
      mobilityDistribution: Object.entries(mobilityTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [patients]);

  // Field completeness analysis
  const fieldCompleteness = useMemo(() => {
    const fields: Record<string, number> = {
      leito: 0,
      nome: 0,
      registro: 0,
      especialidadeRamal: 0,
      dataNascimento: 0,
      dataInternacao: 0,
      diagnostico: 0,
      alergias: 0,
      mobilidade: 0,
      dieta: 0,
      eliminacoes: 0,
      dispositivos: 0,
      atb: 0,
      curativos: 0,
    };

    patients.forEach((p) => {
      if (p.leito) fields.leito++;
      if (p.nome) fields.nome++;
      if (p.registro) fields.registro++;
      if (p.especialidadeRamal) fields.especialidadeRamal++;
      if (p.dataNascimento) fields.dataNascimento++;
      if (p.dataInternacao) fields.dataInternacao++;
      if (p.diagnostico) fields.diagnostico++;
      if (p.alergias) fields.alergias++;
      if (p.mobilidade) fields.mobilidade++;
      if (p.dieta) fields.dieta++;
      if (p.eliminacoes) fields.eliminacoes++;
      if (p.dispositivos) fields.dispositivos++;
      if (p.atb) fields.atb++;
      if (p.curativos) fields.curativos++;
    });

    return Object.entries(fields)
      .map(([name, count]) => ({
        name: name.replace(/([A-Z])/g, " $1").trim(),
        filled: count,
        empty: patients.length - count,
        percent: patients.length > 0 ? Math.round((count / patients.length) * 100) : 0,
      }))
      .sort((a, b) => b.percent - a.percent);
  }, [patients]);

  const exportData = () => {
    const dataToExport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPatients: stats.totalPatients,
        completeRecords: stats.completeRecords,
        pendingRecords: stats.pendingRecords,
        completenessPercent: stats.completenessPercent,
      },
      patients: filteredPatients,
      fieldCompleteness,
    };

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2))
    );
    element.setAttribute("download", `analytics-${new Date().getTime()}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
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
                <BarChart3 className="w-8 h-8 text-primary" />
                Análise Visual de Dados
              </h1>
              <p className="text-muted-foreground">
                Dashboard completo para análise dos dados de pacientes
              </p>
            </div>
          </div>
          <Button onClick={exportData} className="gap-2" data-testid="button-export">
            <Download className="w-4 h-4" />
            Exportar Análise
          </Button>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="text-3xl font-bold text-primary">{stats.totalPatients}</div>
            <div className="text-sm text-muted-foreground">Total de Pacientes</div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
            <div className="text-3xl font-bold text-green-600">{stats.completeRecords}</div>
            <div className="text-sm text-muted-foreground">Registros Completos</div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
            <div className="text-3xl font-bold text-amber-600">{stats.pendingRecords}</div>
            <div className="text-sm text-muted-foreground">Registros Pendentes</div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
            <div className="text-3xl font-bold text-blue-600">{stats.completenessPercent}%</div>
            <div className="text-sm text-muted-foreground">Preenchimento Geral</div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Specialties Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Distribuição de Especialidades
            </h3>
            {stats.specialties.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.specialties}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.specialties.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            )}
          </Card>

          {/* Mobility Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-chart-2" />
              Distribuição de Mobilidade
            </h3>
            {stats.mobilityDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stats.mobilityDistribution}
                  margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="type"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0056b3" name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            )}
          </Card>
        </div>

        {/* Field Completeness */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Análise de Preenchimento por Campo
          </h3>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {fieldCompleteness.map((field, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-32 text-sm font-medium truncate">{field.name}</div>
                <div className="flex-1">
                  <div className="h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${field.percent}%` }}
                    >
                      {field.percent > 20 && (
                        <span className="text-white text-xs font-semibold">
                          {field.percent}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-16 text-right text-xs text-muted-foreground">
                  {field.filled}/{patients.length}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Patients Table with Filters */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-lg font-semibold">Pacientes ({filteredPatients.length})</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("all");
                  setSortBy("leito");
                }}
              >
                <X className="w-3 h-3 mr-1" />
                Limpar Filtros
              </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-64 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por leito, nome ou especialidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">Todos os Status</option>
                <option value="complete">Completos</option>
                <option value="pending">Pendentes</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="leito">Ordenar por Leito</option>
                <option value="nome">Ordenar por Nome</option>
                <option value="especialidade">Ordenar por Especialidade</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Leito</th>
                    <th className="px-4 py-2 text-left font-semibold">Nome</th>
                    <th className="px-4 py-2 text-left font-semibold">Especialidade</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                    <th className="px-4 py-2 text-left font-semibold">Campos</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPatients.map((patient) => {
                    const filledFields = [
                      patient.nome,
                      patient.registro,
                      patient.especialidadeRamal,
                      patient.diagnostico,
                      patient.alergias,
                      patient.mobilidade,
                      patient.dispositivos,
                    ].filter(Boolean).length;

                    return (
                      <tr key={patient.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-2 font-bold text-primary">{patient.leito}</td>
                        <td className="px-4 py-2 truncate">{patient.nome}</td>
                        <td className="px-4 py-2 truncate text-muted-foreground">
                          {patient.especialidadeRamal || "-"}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant={patient.status === "complete" ? "default" : "secondary"}>
                            {patient.status === "complete" ? "Completo" : "Pendente"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {filledFields}/7
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredPatients.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum paciente encontrado
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
