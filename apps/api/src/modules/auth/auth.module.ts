import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { UsersModule } from '../users/users.module';
import { AuthGuard } from '../../common/guards/auth.guard';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionService, AuthGuard],
  exports: [AuthService, PasswordService, SessionService, AuthGuard],
})
export class AuthModule {}
