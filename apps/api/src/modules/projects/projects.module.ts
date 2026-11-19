import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectMembersController } from './project-members.controller';
import { WorkspaceProjectsController } from './workspace-projects.controller';
import { ProjectStatusesController } from './project-statuses.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [
    WorkspaceProjectsController,
    ProjectsController,
    ProjectMembersController,
    ProjectStatusesController,
  ],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
