export type Role = 'admin' | 'user';
export type Status = 'pending' | 'approved' | 'rejected';
export type Importance = 'normal' | 'onemli' | 'acil';

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  role: Role;
  status: Status;
  created_at: string;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  importance: Importance;
  photo_url: string | null;
  created_by: string;
  author_name?: string;
  created_at: string;
  completed_at: string | null;
};

export type NoticeInput = Pick<Notice, 'title' | 'body' | 'importance' | 'photo_url'>;
export type Photo = { uri: string; base64?: string | null; mimeType?: string | null };
export type SignUpInput = { full_name: string; phone: string; email: string; password: string };
export type Table = 'profiles' | 'notices' | 'faults';
