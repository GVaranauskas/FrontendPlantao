import { useAuth } from '@hooks/useAuth';
import { Button } from '@components/common/Button';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Olá, {user.name}</span>
            <Button variant="secondary" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Plantões Agendados
          </h3>
          <p className="text-3xl font-bold text-blue-600">12</p>
          <p className="text-sm text-gray-500 mt-1">Este mês</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Em Andamento
          </h3>
          <p className="text-3xl font-bold text-green-600">3</p>
          <p className="text-sm text-gray-500 mt-1">Agora</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Concluídos
          </h3>
          <p className="text-3xl font-bold text-gray-600">48</p>
          <p className="text-sm text-gray-500 mt-1">Total</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Próximos Plantões</h2>
        <div className="space-y-3">
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <p className="font-medium">Dr. João Silva - Cardiologia</p>
            <p className="text-sm text-gray-600">27/11/2025 - 08:00</p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <p className="font-medium">Dra. Maria Santos - Pediatria</p>
            <p className="text-sm text-gray-600">27/11/2025 - 14:00</p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <p className="font-medium">Dr. Pedro Costa - Ortopedia</p>
            <p className="text-sm text-gray-600">28/11/2025 - 09:00</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Bem-vindo ao Dashboard!
        </h3>
        <p className="text-blue-800">
          Esta é a sua área de trabalho. Aqui você pode visualizar e gerenciar
          todos os plantões do sistema. As funcionalidades completas serão
          implementadas em breve.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
