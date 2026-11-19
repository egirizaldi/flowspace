import { Module } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { OrganizationInvitationsController } from './organization-invitations.controller';
import { WorkspaceInvitationsController } from './workspace-invitations.controller';
import { ProjectInvitationsController } from './project-invitations.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [
    InvitationsController,
    OrganizationInvitationsController,
    WorkspaceInvitationsController,
    ProjectInvitationsController,
  ],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
