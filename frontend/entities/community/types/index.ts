export interface Community {
  id: number;
  community_id: string;
  name: string;
  screen_name: string;
  photo_url: string | null;
  member_count: number | null;
}
