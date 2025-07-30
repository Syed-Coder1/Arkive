// src/hooks/useEmployees.ts
import { useState, useEffect } from 'react';
import { db } from '../services/database';
import { Employee } from '../types';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      const data = await db.getAllEmployees();
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const createEmployee = async (e: Omit<Employee, 'id'>) => {
    const created = await db.createEmployee(e);
    setEmployees(prev => [...prev, created]);
    return created;
  };

  const updateEmployee = async (e: Employee) => {
    await db.updateEmployee(e);
    setEmployees(prev => prev.map(p => p.id === e.id ? e : p));
  };

  const deleteEmployee = async (id: string) => {
    await db.deleteEmployee(id);
    setEmployees(prev => prev.filter(p => p.id !== id));
  };

  return { employees, loading, createEmployee, updateEmployee, deleteEmployee, refetch: fetchEmployees };
}