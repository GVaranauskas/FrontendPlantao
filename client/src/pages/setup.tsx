import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function SetupPage() {
  const [setupKey, setSetupKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSetup = async () => {
    if (!setupKey.trim()) {
      toast({ title: "Erro", description: "Informe a chave de setup", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupKey }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({ 
          title: "Setup concluído!", 
          description: data.alreadySetup ? "Admin já existe" : "Usuários criados com sucesso" 
        });
      } else {
        toast({ title: "Erro", description: data.error?.message || "Falha no setup", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha na requisição", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup Inicial</CardTitle>
          <CardDescription>
            Configure o usuário administrador para o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Chave de Setup</label>
            <Input
              type="password"
              placeholder="Digite a chave SETUP_KEY"
              value={setupKey}
              onChange={(e) => setSetupKey(e.target.value)}
              data-testid="input-setup-key"
            />
          </div>
          
          <Button 
            onClick={handleSetup} 
            disabled={loading}
            className="w-full"
            data-testid="button-setup"
          >
            {loading ? "Executando..." : "Executar Setup"}
          </Button>

          {result && (
            <div className="mt-4 p-4 rounded-md bg-muted">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {result?.credentials && (
            <div className="mt-4 p-4 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Credenciais criadas:</h4>
              <p className="text-sm"><strong>Admin:</strong> {result.credentials.admin.username} / {result.credentials.admin.password}</p>
              <p className="text-sm"><strong>Enfermeiro:</strong> {result.credentials.enfermeiro.username} / {result.credentials.enfermeiro.password}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
