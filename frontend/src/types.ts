export type ComplaintCategory = 'water' | 'road' | 'electricity' | 'sanitation' | 'other';
export type ComplaintPriority = 'critical' | 'high' | 'medium' | 'low';
export type ComplaintStatus = 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';

export interface StatusHistory {
  id: number;
  complaint_id: number;
  status: ComplaintStatus;
  note: string;
  created_at: string;
}

export interface Complaint {
  id: number;
  ticket_id: string;
  transcript_tamil: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  issue: string;
  location: string;
  duration: string;
  affected_people: string;
  urgency_reason: string | null;
  department: string;
  summary_tamil: string;
  summary_english: string;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  status_history?: StatusHistory[];
}

export interface DashboardStats {
  total: number;
  pending: number;
  highPriority: number;
  resolved: number;
  categories: {
    water: number;
    road: number;
    electricity: number;
    sanitation: number;
    other: number;
  };
}
