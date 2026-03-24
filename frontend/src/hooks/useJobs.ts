import { useState, useEffect, useCallback, useRef } from 'react';
import { jobsApi } from '../services/api';
import { WS_URL } from '../config';
import type { Job, JobListResponse } from '../types';

const WS_RECONNECT_BASE = 1000;
const WS_RECONNECT_MAX = 30000;

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchJobs = useCallback(async (pageNum?: number) => {
    const targetPage = pageNum ?? page;
    setLoading(true);
    setError(null);
    try {
      const data: JobListResponse = await jobsApi.list(targetPage, perPage);
      setJobs(data.jobs);
      setTotal(data.total);
      setHasNext(data.has_next);
      if (pageNum !== undefined) {
        setPage(pageNum);
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al obtener los reportes';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, perPage]);

  // WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/ws/jobs?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempt.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'job_update' && data.job) {
            setJobs(prev => prev.map(j => 
              j.job_id === data.job.job_id ? { ...j, ...data.job } : j
            ));
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = (event) => {
        wsRef.current = null;
        // Don't reconnect if closed intentionally (4001 = auth error)
        if (event.code === 4001) return;
        
        // Exponential backoff reconnection
        const delay = Math.min(
          WS_RECONNECT_BASE * Math.pow(2, reconnectAttempt.current),
          WS_RECONNECT_MAX,
        );
        reconnectAttempt.current += 1;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Initial fetch only (no polling interval)
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const nextPage = useCallback(() => {
    if (hasNext) {
      fetchJobs(page + 1);
    }
  }, [fetchJobs, hasNext, page]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      fetchJobs(page - 1);
    }
  }, [fetchJobs, page]);

  const refresh = useCallback(() => {
    fetchJobs(page);
  }, [fetchJobs, page]);

  return {
    jobs,
    total,
    page,
    perPage,
    hasNext,
    loading,
    error,
    nextPage,
    prevPage,
    refresh,
  };
}
