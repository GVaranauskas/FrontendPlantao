import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Patient } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useSyncPatient() {
  const { toast } = useToast();

  const syncSinglePatient = useMutation({
    mutationFn: async (leito: string) => {
      const res = await apiRequest("POST", `/api/sync/patient/${leito}`);
      return res.json() as Promise<Patient>;
    },
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Sucesso",
        description: `Paciente do leito ${patient.leito} sincronizado da API externa`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao sincronizar paciente",
        variant: "destructive",
      });
    },
  });

  const syncMultiplePatients = useMutation({
    mutationFn: async (leitos: string[]) => {
      const res = await apiRequest("POST", "/api/sync/patients", { leitos });
      return res.json() as Promise<Patient[]>;
    },
    onSuccess: (patients) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Sucesso",
        description: `${patients.length} paciente(s) sincronizado(s) da API externa`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao sincronizar pacientes",
        variant: "destructive",
      });
    },
  });

  return {
    syncSinglePatient,
    syncMultiplePatients,
  };
}
