import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, UserX } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { User } from "@/types";

interface UserRowProps {
  user: User;
  onEdit: (user: User) => void;
  onDeactivate: (userId: string) => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export const UserRow = memo(function UserRow({
  user,
  onEdit,
  onDeactivate,
}: UserRowProps) {
  const handleEdit = useCallback(() => {
    onEdit(user);
  }, [onEdit, user]);
  
  const handleDeactivate = useCallback(() => {
    if (confirm(`Desativar usuário "${user.name}"?`)) {
      onDeactivate(user.id);
    }
  }, [onDeactivate, user.id, user.name]);

  return (
    <tr
      className="border-t hover:bg-muted/30 transition-colors"
      data-testid={`row-user-${user.id}`}
    >
      <td className="px-4 py-3 font-medium">{user.name}</td>
      <td className="px-4 py-3 text-muted-foreground">{user.username}</td>
      <td className="px-4 py-3 text-muted-foreground">{user.email || "-"}</td>
      <td className="px-4 py-3 text-center">
        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
          {user.role === "admin" ? "Admin" : "Enfermagem"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-center">
        <Badge variant={user.isActive ? "outline" : "destructive"}>
          {user.isActive ? "Ativo" : "Inativo"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-center text-muted-foreground">
        {formatDate(user.lastLogin)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEdit}
            data-testid={`button-edit-${user.id}`}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          {user.isActive && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={handleDeactivate}
              data-testid={`button-deactivate-${user.id}`}
            >
              <UserX className="w-4 h-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.user.id === nextProps.user.id &&
    prevProps.user.isActive === nextProps.user.isActive &&
    prevProps.user.name === nextProps.user.name &&
    prevProps.user.username === nextProps.user.username &&
    prevProps.user.email === nextProps.user.email &&
    prevProps.user.role === nextProps.user.role &&
    prevProps.user.lastLogin === nextProps.user.lastLogin
  );
});
