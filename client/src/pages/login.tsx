import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${data.user?.name || data.user?.username}`,
      });
      setLocation("/modules");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no login",
        description: error.message || "Usuário ou senha inválidos",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha usuário e senha",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ username: username.trim(), password });
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: 'url("https://11care.com.br/wp-content/uploads/2025/10/Artigo-Profissionalizacao-da-enfermagem.jpg.webp")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-primary/10" />
      
      <div className="relative z-10 w-full max-w-md px-5">
        <Card className="p-8">
          <div className="text-center mb-8">
            <picture>
              <img 
                src="https://11care.com.br/wp-content/uploads/2024/05/logo-11Care-azul-1024x249.png.webp"
                alt="11Care Logo"
                className="max-w-[280px] mx-auto mb-6"
                loading="lazy"
                decoding="async"
              />
            </picture>
            <h1 className="text-[32px] font-bold text-primary mb-2">
              Plataforma de Enfermagem
            </h1>
            <p className="text-muted-foreground text-base">
              Sistema integrado de gestão hospitalar
            </p>
          </div>

          <form onSubmit={handleSubmit} data-testid="form-login">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold">
                  Usuário
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.trim())}
                  placeholder="Digite seu usuário"
                  className="h-[50px] text-base"
                  data-testid="input-username"
                  maxLength={100}
                  required
                  disabled={loginMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="h-[50px] text-base"
                  data-testid="input-password"
                  maxLength={255}
                  required
                  disabled={loginMutation.isPending}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold"
                data-testid="button-login"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>© 2025 11Care - Todos os direitos reservados</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
