import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { User } from '@prisma/client';
import { CreateUserData } from './dto/create-user.dto';

// Safe user profile without passwordHash
export type SafeUser = Omit<User, 'passwordHash'>;

export function sanitizeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        name: data.name.trim(),
        passwordHash: data.passwordHash,
        avatarUrl: data.avatarUrl ?? null,
        emailVerifiedAt: data.emailVerifiedAt ?? null,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        email: data.email ? data.email.toLowerCase().trim() : undefined,
      },
    });
  }
}
