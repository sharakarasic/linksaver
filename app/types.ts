export interface User {
  id: string;
  username: string;
  passwordHash: string;
}

export interface PublicUser {
  id: string;
  username: string;
}

export interface TagEntry {
  name: string;
  isPrivate: boolean;
}

export interface SavedLink {
  id: string;
  ownerId: string;
  url: string;
  title?: string;
  tags: TagEntry[];
  isPrivate: boolean;
  createdAt: number;
}

// Link shape for the global feed, includes owner's username.
export interface FeedLink extends SavedLink {
  ownerUsername: string;
}

export type LinksByTag = Record<string, SavedLink[]>;