import { Role } from '@prisma/client';

export interface CurrentUserData {
  id: string;
  email: string;
  role: Role;
  token_version: number;
}
