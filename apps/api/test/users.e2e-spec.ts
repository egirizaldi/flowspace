import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { UsersService } from '../src/modules/users/users.service';
import { AppModule } from '../src/app.module';
import { ConflictException } from '@nestjs/common';

describe('User Model Database Constraints (Integration)', () => {
  let prisma: PrismaService;
  let usersService: UsersService;

  const testEmail = `test-user-${Date.now()}@flowspace-test.internal`;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    usersService = moduleRef.get<UsersService>(UsersService);
    await prisma.$connect();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { email: { contains: 'test-user-' } },
      });
      await prisma.$disconnect();
    }
  });

  it('should successfully persist a user with UUID and timestamps in PostgreSQL', async () => {
    const user = await usersService.create({
      email: testEmail,
      name: 'Constraint Test User',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakehash',
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe(testEmail.toLowerCase());
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('should enforce unique email constraint and reject duplicate registration', async () => {
    await expect(
      usersService.create({
        email: testEmail,
        name: 'Duplicate Attempt User',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakehash2',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
