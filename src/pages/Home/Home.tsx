import { Link } from 'react-router-dom';
import { Button } from '@components/common/Button';

const Home = () => {
  return (
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Bem-vindo ao Frontend Plantão
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Sistema de gerenciamento de plantões médicos
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-3">Organize Plantões</h2>
          <p className="text-gray-600 mb-4">
            Gerencie escalas de plantões médicos de forma eficiente e
            organizada.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-3">Acompanhe em Tempo Real</h2>
          <p className="text-gray-600 mb-4">
            Monitore o status dos plantões e receba atualizações instantâneas.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-3">Relatórios Completos</h2>
          <p className="text-gray-600 mb-4">
            Gere relatórios detalhados sobre plantões realizados e estatísticas.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-3">Interface Intuitiva</h2>
          <p className="text-gray-600 mb-4">
            Experiência de usuário moderna e fácil de usar para todos os níveis.
          </p>
        </div>
      </div>

      <div className="mt-12 flex gap-4 justify-center">
        <Link to="/dashboard">
          <Button variant="primary" size="large">
            Acessar Dashboard
          </Button>
        </Link>
        <Link to="/login">
          <Button variant="secondary" size="large">
            Fazer Login
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Home;
