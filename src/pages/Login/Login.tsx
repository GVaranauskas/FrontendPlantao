import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { useAuth } from '@hooks/useAuth';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // TODO: Implement actual login API call
      // For now, this is a mock login
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock successful login
      login(
        {
          id: '1',
          name: 'Usuário Teste',
          email: email,
        },
        'mock-token-123'
      );

      navigate('/dashboard');
    } catch (err) {
      setError('Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Entrar na sua conta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistema de Gerenciamento de Plantões
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
            <Input
              label="Senha"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <Button
              type="submit"
              variant="primary"
              size="large"
              isLoading={isLoading}
              className="w-full"
            >
              Entrar
            </Button>
          </div>

          <div className="text-center text-sm">
            <a href="#" className="text-blue-600 hover:text-blue-500">
              Esqueceu sua senha?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
