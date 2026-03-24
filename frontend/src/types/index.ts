export interface DateRange {
  start: string;
  end: string;
}

export interface CreateJobRequest {
  report_type: string;
  date_range: DateRange;
  format: string;
}

export interface Job {
  job_id: string;
  user_id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  report_type: string;
  parameters: {
    date_range?: DateRange;
    format?: string;
  };
  created_at: string;
  updated_at: string;
  result_url: string | null;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user_id: string;
  token: string;
  username: string;
}

export interface LoginResponse {
  token: string;
  username: string;
}
