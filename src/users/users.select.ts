import { Prisma } from '@prisma/client';

export const publicUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  email: true,
  role: true,
  is_active: true,
  last_login: true,
  created_at: true,
  githubOwner: true,
  githubRepo: true,
  jiraHost: true,
  jiraEmail: true,
  jiraProjectKey: true,
});

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;