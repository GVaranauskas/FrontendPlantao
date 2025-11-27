import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByText('Click me');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    const button = screen.getByText('Click me');
    expect(button).toBeDisabled();
  });

  it('should show loading state', () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('should not call onClick when loading', () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} isLoading>
        Click me
      </Button>
    );

    const button = screen.getByText('Carregando...');
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render with primary variant by default', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByText('Click me');
    expect(button).toHaveClass('bg-blue-600');
  });

  it('should render with secondary variant', () => {
    render(<Button variant="secondary">Click me</Button>);
    const button = screen.getByText('Click me');
    expect(button).toHaveClass('bg-gray-200');
  });

  it('should render with danger variant', () => {
    render(<Button variant="danger">Click me</Button>);
    const button = screen.getByText('Click me');
    expect(button).toHaveClass('bg-red-600');
  });
});
