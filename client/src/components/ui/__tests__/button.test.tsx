import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../button';

describe('Button', () => {
  it('deve renderizar com texto', () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByText('Clique aqui')).toBeInTheDocument();
  });

  it('deve chamar onClick quando clicado', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clique</Button>);

    await userEvent.click(screen.getByText('Clique'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('deve estar desabilitado quando disabled=true', () => {
    render(<Button disabled>Desabilitado</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('nao deve chamar onClick quando desabilitado', async () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Desabilitado</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('deve aplicar variante destructive', () => {
    render(<Button variant="destructive">Deletar</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('deve aplicar tamanho small', () => {
    render(<Button size="sm">Pequeno</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('min-h-8');
  });

  it('deve renderizar como child element quando asChild=true', () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/test');
  });
});
