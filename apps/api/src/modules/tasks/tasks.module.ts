import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ProjectTasksController } from './project-tasks.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProjectTasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
