export type Lead = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  notes: string | null;
  status: string;
  score: number;
  score_reason: string | null;
  email_sent: boolean;
  created_at: string;
  updated_at: string;
};

export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;

export const LEAD_SOURCES = ["manual", "website", "referral", "social", "email", "other"] as const;