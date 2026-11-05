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
  /** Sum of feature estimates Aha reports for the iteration. */
  planned_points?: number | null;
  /** Only set when the iteration's features were fetched. */
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


/** One vote cast through Aha's planning-poker extension (aha-develop.planning-poker). */
export interface PlanningPokerVote {
  userId: string;
  name: string;
  /** null when the voter picked "?" (unknown) */
  estimate: number | null;
  updatedAt: string;
}

/** Per-member capacity Aha Develop sets on an iteration's team. */
export interface IterationMemberCapacity {
  userId: string;
  name: string;
  storyPoints: number;
  /** True when Aha already accounts for this member's non-working days. */
  hasNonWorkingDays: boolean;
}
