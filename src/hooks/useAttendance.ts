// src/hooks/useAttendance.ts
import { useState, useEffect } from 'react';
import { db } from '../services/database';
import { Attendance } from '../types';

export function useAttendance() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const data = await db.getAllAttendance();
      setAttendance(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const markAttendance = async (record: Omit<Attendance, 'id'>) => {
    const created = await db.markAttendance(record);
    setAttendance(prev => [...prev, created]);
    return created;
  };

  const getEmployeeAttendance = async (empId: string) =>
    await db.getAttendanceByEmployee(empId);

  const updateAttendance = async (record: Attendance) => {
    await db.updateAttendance(record);
    setAttendance(prev => prev.map(a => a.id === record.id ? record : a));
  };

  return {
    attendance,
    loading,
    markAttendance,
    getEmployeeAttendance,
    updateAttendance,
    refetch: fetch,
  };
}