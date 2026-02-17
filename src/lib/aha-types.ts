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
  workflow_kind?: { id: string; name: string };
  assigned_to_user?: AhaUser | null;
  tags?: string[];
  team_location?: string;
  position: number;
  created_at: string;
  updated_at?: string;
  description?: { body?: string };
  requirements?: Array<{ id: string; name: string; body?: string }>;
  release?: { id: string; reference_num: string; name: string };
  epic?: { id: string; reference_num: string; name: string } | null;
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
  status?: "not_started" | "in_progress" | "complete" | string;
  progress: number;
  parking_lot: boolean;
  project?: { id: string; name: string };
}

export interface AhaEpic {
  id: string;
  reference_num: string;
  name: string;
  start_date?: string | null;
  due_date?: string | null;
  workflow_status?: { name: string; color?: string; complete?: boolean };
  progress?: number;
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


export interface AhaVote {
  id: string;
  user: AhaUser;
  created_at?: string;
}
