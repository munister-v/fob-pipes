/** CRM domain models: Customer, Deal, Activity */

export interface Customer {
  id: string;
  name: string;
  phones: string[];
  email: string;
  city: string;
  company: string;
  clientType: 'private' | 'shop' | 'construction' | 'other';
  tags: string[];
  note: string;
  createdAt: number;
  lastContactAt: number;
  /** Total revenue from all closed deals */
  totalRevenue: number;
  /** Total number of deals */
  totalDeals: number;
}

export type DealStage =
  | 'new'           // Новая
  | 'contacted'     // Контакт
  | 'proposal_sent' // КП отправлено
  | 'negotiation'   // Переговоры
  | 'won'           // Выиграна
  | 'lost';         // Проиграна

export const DEAL_STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: 'new',           label: 'Новая',          color: '#7fe39a' },
  { id: 'contacted',     label: 'Контакт',        color: '#6fc3f7' },
  { id: 'proposal_sent', label: 'КП отправлено',  color: '#f0c060' },
  { id: 'negotiation',   label: 'Переговоры',     color: '#e89060' },
  { id: 'won',           label: 'Выиграна',       color: '#28a745' },
  { id: 'lost',          label: 'Проиграна',      color: '#ff7e7e' },
];

export interface Deal {
  id: string;
  customerId: string;
  title: string;
  stage: DealStage;
  /** Deal value in RUB */
  value: number;
  /** Linked quote id (optional) */
  quoteId?: string;
  source: string;
  createdAt: number;
  updatedAt: number;
  expectedCloseAt?: number;
  lostReason?: string;
  note: string;
}

export type ActivityType = 'call' | 'note' | 'task' | 'email' | 'meeting' | 'system';

export interface Activity {
  id: string;
  customerId: string;
  dealId?: string;
  type: ActivityType;
  text: string;
  author: string;
  createdAt: number;
  dueAt?: number;
  done?: boolean;
}

/** Helper: normalize phone to digits only for dedup matching */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^8/, '7');
}
