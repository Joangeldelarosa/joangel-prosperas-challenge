import { useState, useEffect, useCallback, useRef } from 'react';
import { jobsApi } from '../services/api';
import type { Job, JobListResponse } from '../types';

export function useJobs(pollInterval = 5000) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to fetch jobs';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, perPage]);

  // Initial fetch + polling
  useEffect(() => {
    fetchJobs();

    intervalRef.current = setInterval(() => {
      fetchJobs();
    }, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchJobs, pollInterval]);

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
