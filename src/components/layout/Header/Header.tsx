import { Link } from 'react-router-dom';

export const Header = () => {
  return (
    <header className="bg-white shadow-sm">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-600">
            Frontend Plantão
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Início
            </Link>
            <Link
              to="/dashboard"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
};
