import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ProjectTasksController } from './project-tasks.controller';
import { TasksController } from './tasks.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProjectTasksController, TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
