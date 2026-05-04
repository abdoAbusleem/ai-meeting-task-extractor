import { Role } from '@prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenSubject {
  id: string;
  email: string;
  role: Role;
  token_version: number;
}

export interface AuthTokensResponse extends TokenPair {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    is_active: boolean;
    last_login: Date | null;
    created_at: Date;
  };
}