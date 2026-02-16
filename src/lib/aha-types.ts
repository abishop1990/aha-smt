export interface AhaPagination {
  total_records: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

export interface AhaWorkflowStatus {
  id: string;
  name: string;
  color: string;
  position: number;
  complete: boolean;
}

export interface AhaUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface AhaFeature {
  id: string;
  reference_num: string;
  name: string;
  score?: number | null;
  work_units?: number | null;
  original_estimate?: number | null;
  workflow_status?: AhaWorkflowStatus;
  assigned_to_user?: AhaUser | null;
  tags?: string[];
  team_location?: string;
  position: number;
  created_at: string;
  updated_at?: string;
  description?: { body?: string };
  requirements?: Array<{ id: string; name: string; body?: string }>;
  release?: { id: string; reference_num: string; name: string };
}

export interface AhaIteration {
  id: string;
  name: string;
  reference_num: string;
  status: "complete" | "started" | "planning";
  start_date: string | null;
  end_date: string | null;
  capacity?: number | null;
  feature_count?: number;
}

export interface AhaRelease {
  id: string;
  reference_num: string;
  name: string;
  start_date?: string | null;
  release_date?: string | null;
  progress: number;
  parking_lot: boolean;
  project?: { id: string; name: string };
}

export interface AhaProduct {
  id: string;
  reference_prefix: string;
  name: string;
  product_line?: boolean;
  workspace_type?: string;
}

export interface AhaTeamMember {
  user: AhaUser;
  role?: string;
}

export interface AhaTeam {
  id: string;
  name: string;
  team_members?: AhaTeamMember[];
}

export interface AhaSchedule {
  user_id: string;
  story_points_per_day?: number;
}

export interface AhaApiResponse<T> {
  pagination?: AhaPagination;
  [key: string]: T[] | AhaPagination | T | undefined;
}
