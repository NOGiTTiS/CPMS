export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export interface User {
  id: string
  student_id?: string | null
  email: string
  full_name: string
  role: Role
  room?: string | null
  academic_year?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
  teacher_assignments?: TeacherAssignment[]
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  is_leader: boolean
  joined_at: string
  user?: User
}

export interface ProjectGroup {
  id: string
  project_name_th: string
  project_name_en: string
  advisor_id?: string | null
  advisor_name?: string | null
  advisor?: User | null
  academic_year: string
  room?: string | null
  created_at: string
  updated_at: string
  members?: GroupMember[]
  submissions?: Submission[]
  booking?: PresentationBooking | null
}

export interface ProjectStep {
  id: string
  step_name: string
  description: string
  step_order: number
  file_form_path?: string | null
  file_example_path?: string | null
  deadline?: string | null
  is_active: boolean
  max_score: number
  created_at?: string
  updated_at?: string
}

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface Submission {
  id: string
  group_id: string
  step_id: string
  submitted_by: string
  submission_type: "file" | "link"
  file_path: string
  status: SubmissionStatus
  comment?: string | null
  score?: number | null
  revision_number: number
  submitted_at: string
  reviewed_at?: string | null
  step?: ProjectStep
  submitter?: User
  group?: ProjectGroup
}

export interface PresentationSlot {
  id: string
  academic_year: string
  start_time: string
  end_time: string
  location: string
  max_groups: number
  bookings?: PresentationBooking[]
  created_at?: string
  updated_at?: string
}

export interface PresentationBooking {
  id: string
  slot_id: string
  group_id: string
  booked_at: string
  slot?: PresentationSlot
  group?: ProjectGroup
  scores?: PresentationScore[]
}

export interface PresentationCriteria {
  id: string
  label: string
  description?: string
  max_score: number
  criteria_order: number
  is_active: boolean
  created_at?: string
}

export interface PresentationScore {
  id: string
  booking_id: string
  scorer_id: string
  criteria_data: Record<string, number>
  total_score: number
  comments?: string
  scored_at: string
  updated_at?: string
  scorer?: User
}

export interface TeacherAssignment {
  id: string
  teacher_id: string
  room: string
  academic_year?: string
  created_at?: string
  teacher?: User
}

export interface Announcement {
  id: string
  title: string
  content: string
  is_pinned: boolean
  created_by: string
  created_at: string
  updated_at?: string
  author?: User
}

export interface AcademicYear {
  id: string
  year: string
  term: string
  is_current: boolean
  is_active: boolean
  group_count?: number
  student_count?: number
  created_at?: string
}

export interface ActivityLog {
  id: string;
  user_id?: string | null;
  user_role: string;
  action: string;
  description: string;
  ip_address: string;
  created_at: string;
  user?: User;
}

export interface LoginResponse {
  message?: string;
  success?: boolean;
  user?: User;
  token?: string;
  access_token?: string;
  refresh_token?: string;
  data?: {
    access_token?: string;
    token?: string;
    refresh_token?: string;
    user: User;
  };
}

export interface MatrixStepCell {
  step_id: string;
  status: SubmissionStatus | "NOT_SUBMITTED";
  score: number | null;
  submission_id?: string;
}

export interface MatrixRow {
  group_id: string;
  project_name_th: string;
  project_name_en: string;
  room: string;
  advisor_name?: string;
  members: {
    id: string;
    student_id?: string;
    full_name: string;
    room?: string;
    is_leader: boolean;
  }[];
  steps: Record<string, MatrixStepCell>;
  total_score: number;
}
