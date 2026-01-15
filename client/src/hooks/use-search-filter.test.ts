import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSearchFilter } from './use-search-filter';

describe('useSearchFilter', () => {
  const mockData = [
    { id: 1, nome: 'João Silva', leito: '101A', idade: 65 },
    { id: 2, nome: 'Maria Santos', leito: '102B', idade: 45 },
    { id: 3, nome: 'Pedro Costa', leito: '103C', idade: 70 },
    { id: 4, nome: 'Ana Oliveira', leito: '101B', idade: 55 },
  ];

  describe('filtragem por nome', () => {
    it('deve filtrar por nome (case insensitive)', () => {
      const { result } = renderHook(() =>
        useSearchFilter({
          data: mockData,
          searchKeys: ['nome', 'leito'],
        })
      );

      act(() => {
        result.current.setSearchTerm('joão');
      });

      expect(result.current.filteredData).toHaveLength(1);
      expect(result.current.filteredData[0].nome).toBe('João Silva');
    });

    it('deve filtrar por nome parcial', () => {
      const { result } = renderHook(() =>
        useSearchFilter({
          data: mockData,
          searchKeys: ['nome', 'leito'],
        })
      );

      act(() => {
        result.current.setSearchTerm('silva');
      });

      expect(result.current.filteredData).toHaveLength(1);
      expect(result.current.filteredData[0].nome).toBe('João Silva');
    });
  });

  describe('filtragem por leito', () => {
    it('deve filtrar por leito', () => {
      const { result } = renderHook(() =>
        useSearchFilter({
          data: mockData,
          searchKeys: ['nome', 'leito'],
        })
      );

      act(() => {
        result.current.setSearchTerm('101');
      });

      expect(result.current.filteredData).toHaveLength(2);
      expect(result.current.filteredData[0].leito).toBe('101A');
      expect(result.current.filteredData[1].leito).toBe('101B');
    });
  });

  describe('filtragem por número (idade)', () => {
    it('deve filtrar por idade', () => {
      const { result } = renderHook(() =>
        useSearchFilter({
          data: mockData,
          searchKeys: ['nome', 'leito', 'idade'],
        })
      );

      act(() => {
        result.current.setSearchTerm('65');
      });

      expect(result.current.filteredData).toHaveLength(1);
      expect(result.current.filteredData[0].idade).toBe(65);
    });
  });

  describe('casos especiais', () => {
    it('deve retornar todos quando search vazio', () => {
      const { result } = renderHook(() =>
        useSearchFilter({
          data: mockData,
          searchKeys: ['nome', 'leito'],
        })
      );

      expect(result.current.filteredData).toHaveLength(4);
    });

    it('deve retornar array vazio quando data é undefined', () => {
      const { result } = renderHook(() =>
        useSearchFilter({
          data: undefined,
          searchKeys: ['nome', 'leito'],
        })
      );

      expect(result.current.filteredData).toHaveLength(0);
    });

    it('deve retornar array vazio quando nenhum resultado encontrado', () => {
      const { result } = renderHook(() =>
        useSearchFilter({
          data: mockData,
          searchKeys: ['nome', 'leito'],
        })
      );

      act(() => {
        result.current.setSearchTerm('xyz123');
      });

      expect(result.current.filteredData).toHaveLength(0);
    });

    it('deve ignorar espaços no search term', () => {
      const { result } = renderHook(() =>
        useSearchFilter({
          data: mockData,
          searchKeys: ['nome', 'leito'],
        })
      );

      act(() => {
        result.current.setSearchTerm('   ');
      });

      // Deve retornar todos (search vazio após trim)
      expect(result.current.filteredData).toHaveLength(4);
    });
  });

  describe('atualização de search term', () => {
    it('deve atualizar filteredData quando searchTerm muda', () => {
      const { result } = renderHook(() =>
        useSearchFilter({
          data: mockData,
          searchKeys: ['nome', 'leito'],
        })
      );

      // Primeiro filtro
      act(() => {
        result.current.setSearchTerm('joão');
      });

      expect(result.current.filteredData).toHaveLength(1);

      // Segundo filtro
      act(() => {
        result.current.setSearchTerm('maria');
      });

      expect(result.current.filteredData).toHaveLength(1);
      expect(result.current.filteredData[0].nome).toBe('Maria Santos');
    });

    it('deve limpar filtro quando searchTerm é limpo', () => {
      const { result } = renderHook(() =>
        useSearchFilter({
          data: mockData,
          searchKeys: ['nome', 'leito'],
        })
      );

      // Filtrar
      act(() => {
        result.current.setSearchTerm('joão');
      });

      expect(result.current.filteredData).toHaveLength(1);

      // Limpar
      act(() => {
        result.current.setSearchTerm('');
      });

      expect(result.current.filteredData).toHaveLength(4);
    });
  });
});
