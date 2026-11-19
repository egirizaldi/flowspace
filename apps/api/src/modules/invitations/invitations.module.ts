import { Module } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
