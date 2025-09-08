export type DashboardRecord = {
  id: string;
  type: "loan" | "leave";
  name: string;
  amount?: number;
  status: string;
  date: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
};

export interface DashboardResponse {
  total: number;
  page: number;
  limit: number;
  records: DashboardRecord[];
}

export interface Event {
  id?: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface EventResponse {
  total: number;
  page: number;
  limit: number;
  records: Event[];
}
