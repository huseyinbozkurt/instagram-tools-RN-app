export interface IGUser {
  pk: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  is_verified: boolean;
  is_private: boolean;
}

export interface IGPageResult {
  users: IGUser[];
  next_max_id: string | null;
}

export interface IGMediaCandidate {
  url: string;
  width: number;
  height: number;
}

export interface IGVideoVersion {
  url: string;
  width: number;
  height: number;
  type: number;
}

export interface IGMediaItem {
  pk: string;
  media_type: 1 | 2 | 8;
  image_versions2?: { candidates: IGMediaCandidate[] };
  video_versions?: IGVideoVersion[];
  carousel_media?: IGMediaItem[];
}

export interface DownloadableItem {
  id: string;
  index: number;
  type: 'photo' | 'video';
  thumbnailUrl: string;
  downloadUrl: string;
  extension: 'jpg' | 'mp4';
  label: string;
}

export interface NonFollower {
  id: string;
  username: string;
  fullName: string;
  avatar: string;
  isVerified: boolean;
  isPrivate: boolean;
}
