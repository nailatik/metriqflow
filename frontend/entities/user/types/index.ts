export interface User {
  id: number;
  email: string;
  full_name?: string;
  birth_date?: string;
  organization?: string;
  phone?: string;
  is_profile_completed?: boolean;
  email_verified?: boolean;
  password_length?: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  birthDate: string;
  organization?: string;
  phone: string;
  agreedToProcessing: boolean;
  locale?: string;
}
