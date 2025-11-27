export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-gray-600 text-sm">
          <p>
            © {currentYear} Frontend Plantão. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
