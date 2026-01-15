import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (className utility)', () => {
  it('deve combinar classes simples', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('deve filtrar valores falsy', () => {
    const result = cn('class1', false, undefined, null, 'class2');
    expect(result).toBe('class1 class2');
  });

  it('deve suportar classes condicionais', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn('base', isActive && 'active', isDisabled && 'disabled');
    expect(result).toBe('base active');
  });

  it('deve fazer merge de classes Tailwind conflitantes', () => {
    // tailwind-merge deve manter apenas a ultima classe conflitante
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
  });

  it('deve funcionar com arrays de classes', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('deve funcionar com objetos de classes', () => {
    const result = cn({ active: true, disabled: false, highlight: true });
    expect(result).toBe('active highlight');
  });

  it('deve retornar string vazia quando nenhuma classe for passada', () => {
    const result = cn();
    expect(result).toBe('');
  });
});
