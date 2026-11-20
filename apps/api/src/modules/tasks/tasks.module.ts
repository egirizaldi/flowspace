import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ProjectTasksController } from './project-tasks.controller';
import { TasksController } from './tasks.controller';
import { ProjectLabelsController } from './project-labels.controller';
import { ProjectBoardController } from './project-board.controller';
import { AuthModule } from '../auth/auth.module';
import { ActivitiesModule } from '../activities/activities.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, ActivitiesModule, NotificationsModule],
  controllers: [
    ProjectTasksController,
    TasksController,
    ProjectLabelsController,
    ProjectBoardController,
  ],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
