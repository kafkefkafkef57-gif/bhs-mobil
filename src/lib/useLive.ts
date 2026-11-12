import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { Table } from './types';

/** Veriyi yükler; ekrana dönüldüğünde ve ilgili tablolar değiştiğinde yeniler. */
export function useLive<T>(load: () => Promise<T>, tables: Table[], initial: T) {
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Veriler yüklenemedi.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  const key = tables.join(',');
  useEffect(() => (key ? api.subscribe(key.split(',') as Table[], reload) : undefined), [key, reload]);

  return { data, error, reload };
}
