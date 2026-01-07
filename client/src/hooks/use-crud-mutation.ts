/**
 * Hook genérico para operações CRUD (Create, Read, Update, Delete)
 * Elimina duplicação de código em mutações do React Query
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface UseCrudMutationOptions<TData = any, TVariables = any> {
  /**
   * Endpoint da API (ex: "/api/users")
   */
  endpoint: string;

  /**
   * Método HTTP (padrão: POST)
   */
  method?: HttpMethod;

  /**
   * Ação sendo realizada para mensagens de sucesso/erro
   * Ex: "criar", "atualizar", "deletar"
   */
  action?: string;

  /**
   * Nome do recurso para mensagens (ex: "usuário", "template")
   */
  resourceName?: string;

  /**
   * Query keys para invalidar após sucesso
   * Se não fornecido, invalida automaticamente o endpoint
   */
  invalidateQueries?: string[];

  /**
   * Callback customizado de sucesso
   */
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;

  /**
   * Callback customizado de erro
   */
  onError?: (error: Error, variables: TVariables) => void;

  /**
   * Mensagens customizadas
   */
  messages?: {
    success?: string;
    error?: string;
  };

  /**
   * Desabilitar toast de sucesso (útil quando há callback customizado)
   */
  disableSuccessToast?: boolean;

  /**
   * Desabilitar toast de erro (útil quando há callback customizado)
   */
  disableErrorToast?: boolean;

  /**
   * Transformação dos dados antes de enviar
   */
  transformData?: (variables: TVariables) => any;
}

/**
 * Hook genérico para mutações CRUD
 *
 * @example
 * // Criar usuário
 * const createUser = useCrudMutation({
 *   endpoint: "/api/users",
 *   method: "POST",
 *   action: "criar",
 *   resourceName: "usuário",
 *   onSuccess: () => setIsDialogOpen(false),
 * });
 *
 * @example
 * // Atualizar template
 * const updateTemplate = useCrudMutation({
 *   endpoint: "/api/templates",
 *   method: "PUT",
 *   action: "atualizar",
 *   resourceName: "template",
 *   invalidateQueries: ["/api/templates", "/api/templates/active"],
 * });
 *
 * @example
 * // Deletar com confirmação customizada
 * const deleteItem = useCrudMutation({
 *   endpoint: "/api/items",
 *   method: "DELETE",
 *   action: "deletar",
 *   resourceName: "item",
 *   messages: {
 *     success: "Item removido permanentemente",
 *     error: "Não foi possível remover o item",
 *   },
 * });
 */
export function useCrudMutation<TData = any, TVariables = any>({
  endpoint,
  method = "POST",
  action = "criar",
  resourceName = "registro",
  invalidateQueries,
  onSuccess: customOnSuccess,
  onError: customOnError,
  messages,
  disableSuccessToast = false,
  disableErrorToast = false,
  transformData,
}: UseCrudMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Capitalizar primeira letra para mensagens
  const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  // Determinar verbo no particípio para mensagem de sucesso
  const getSuccessVerb = (verb: string): string => {
    const verbMap: Record<string, string> = {
      criar: "criado",
      atualizar: "atualizado",
      deletar: "deletado",
      remover: "removido",
      desativar: "desativado",
      ativar: "ativado",
      aprovar: "aprovado",
      rejeitar: "rejeitado",
      sincronizar: "sincronizado",
      importar: "importado",
      exportar: "exportado",
    };
    return verbMap[verb.toLowerCase()] || "processado";
  };

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const data = transformData ? transformData(variables) : variables;

      const response = await apiRequest(method, endpoint, data);

      // Se for DELETE, pode não ter body de resposta
      if (method === "DELETE" && response.status === 204) {
        return {} as TData;
      }

      return response.json();
    },

    onSuccess: async (data, variables) => {
      // Invalidar queries relacionadas
      const queriesToInvalidate = invalidateQueries || [endpoint];

      await Promise.all(
        queriesToInvalidate.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        )
      );

      // Toast de sucesso
      if (!disableSuccessToast) {
        const defaultMessage = `${capitalizeFirst(resourceName)} ${getSuccessVerb(action)} com sucesso!`;
        toast({
          title: "Sucesso!",
          description: messages?.success || defaultMessage,
        });
      }

      // Callback customizado
      if (customOnSuccess) {
        await customOnSuccess(data, variables);
      }
    },

    onError: (error: Error, variables) => {
      // Toast de erro
      if (!disableErrorToast) {
        const defaultMessage = error.message || "Ocorreu um erro. Tente novamente.";
        toast({
          title: `Erro ao ${action} ${resourceName}`,
          description: messages?.error || defaultMessage,
          variant: "destructive",
        });
      }

      // Callback customizado
      if (customOnError) {
        customOnError(error, variables);
      }
    },
  });
}

/**
 * Variação específica para CREATE (POST)
 */
export function useCreateMutation<TData = any, TVariables = any>(
  options: Omit<UseCrudMutationOptions<TData, TVariables>, "method" | "action">
) {
  return useCrudMutation({
    ...options,
    method: "POST",
    action: "criar",
  });
}

/**
 * Variação específica para UPDATE (PUT/PATCH)
 */
export function useUpdateMutation<TData = any, TVariables = any>(
  options: Omit<UseCrudMutationOptions<TData, TVariables>, "method" | "action">
) {
  return useCrudMutation({
    ...options,
    method: "PUT",
    action: "atualizar",
  });
}

/**
 * Variação específica para DELETE
 */
export function useDeleteMutation<TData = any, TVariables = any>(
  options: Omit<UseCrudMutationOptions<TData, TVariables>, "method" | "action">
) {
  return useCrudMutation({
    ...options,
    method: "DELETE",
    action: "deletar",
  });
}

/**
 * Helper para operações que alteram status (ativar/desativar)
 */
export function useToggleMutation<TData = any, TVariables = any>(
  options: Omit<UseCrudMutationOptions<TData, TVariables>, "method"> & {
    isActivating: boolean;
  }
) {
  const { isActivating, ...rest } = options;
  return useCrudMutation({
    ...rest,
    method: "PATCH",
    action: isActivating ? "ativar" : "desativar",
  });
}
