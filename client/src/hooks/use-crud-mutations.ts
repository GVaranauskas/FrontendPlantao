import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UseCrudMutationsOptions<T> {
  endpoint: string;
  queryKey: string[];
  entityName: string;
  additionalQueryKeys?: string[][];
}

export function useCrudMutations<T>({ endpoint, queryKey, entityName, additionalQueryKeys = [] }: UseCrudMutationsOptions<T>) {
  const { toast } = useToast();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey });
    additionalQueryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: Partial<T>) => {
      return apiRequest("POST", endpoint, data);
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: `${entityName} criado(a) com sucesso!` });
    },
    onError: (error: Error) => {
      toast({
        title: `Erro ao criar ${entityName}`,
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      return apiRequest("PATCH", `${endpoint}/${id}`, data);
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: `${entityName} atualizado(a) com sucesso!` });
    },
    onError: (error: Error) => {
      toast({
        title: `Erro ao atualizar ${entityName}`,
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `${endpoint}/${id}`);
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: `${entityName} excluído(a) com sucesso!` });
    },
    onError: (error: Error) => {
      toast({
        title: `Erro ao excluir ${entityName}`,
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
