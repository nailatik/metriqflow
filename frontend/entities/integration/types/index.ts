export interface TgAccount {
  telegram_username: string | null;
  first_name: string;
  linked_at: string;
}

export interface TgChannel {
  id: number;
  channel_id: number;
  title: string;
  username: string | null;
}

export interface TgStatus {
  linked: boolean;
  account: TgAccount | null;
}

export interface TgTokenData {
  token: string;
  expiresAt: string;
}
