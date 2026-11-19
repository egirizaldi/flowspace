export interface CreateUserData {
  email: string;
  name: string;
  passwordHash: string;
  avatarUrl?: string | null;
  emailVerifiedAt?: Date | null;
}
