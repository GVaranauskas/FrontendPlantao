import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './button';

describe('Button Component', () => {
  it('deve renderizar com texto', () => {
    render(<Button>Clique aqui</Button>);

    expect(screen.getByText('Clique aqui')).toBeInTheDocument();
  });

  it('deve chamar onClick quando clicado', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Clique</Button>);

    await user.click(screen.getByText('Clique'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('deve estar desabilitado quando disabled=true', () => {
    render(<Button disabled>Desabilitado</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('não deve chamar onClick quando desabilitado', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button disabled onClick={handleClick}>
        Desabilitado
      </Button>
    );

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('deve renderizar com variante destructive', () => {
    render(<Button variant="destructive">Excluir</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('deve renderizar com size small', () => {
    render(<Button size="sm">Pequeno</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('min-h-8');
  });
});
