import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { SessionService } from '../auth/session.service';

describe('CommentsController', () => {
  let controller: CommentsController;
  let service: CommentsService;

  const mockCommentsService = {
    createComment: jest.fn(),
    getTaskComments: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
  };

  const mockSessionService = {
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        { provide: CommentsService, useValue: mockCommentsService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    service = module.get<CommentsService>(CommentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createComment', () => {
    it('should create comment and return api response', async () => {
      const mockResult = {
        id: 'c-1',
        taskId: 't-1',
        userId: 'u-1',
        content: 'Nice task',
      };
      mockCommentsService.createComment.mockResolvedValue(mockResult);

      const res = await controller.createComment('t-1', 'u-1', {
        content: 'Nice task',
      });

      expect(res).toEqual({
        success: true,
        message: 'Comment created successfully',
        data: mockResult,
      });
      expect(mockCommentsService.createComment).toHaveBeenCalledWith(
        't-1',
        'u-1',
        { content: 'Nice task' },
      );
    });
  });

  describe('getComments', () => {
    it('should return comments with pagination meta', async () => {
      const mockResult = {
        comments: [{ id: 'c-1', content: 'Feedback' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockCommentsService.getTaskComments.mockResolvedValue(mockResult);

      const res = await controller.getComments('t-1', 'u-1', {
        page: 1,
        limit: 20,
      });

      expect(res).toEqual({
        success: true,
        message: 'Comments retrieved successfully',
        data: mockResult.comments,
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
      expect(mockCommentsService.getTaskComments).toHaveBeenCalledWith(
        't-1',
        'u-1',
        { page: 1, limit: 20 },
      );
    });
  });

  describe('updateComment', () => {
    it('should update comment and return updated result', async () => {
      const mockUpdated = {
        id: 'c-1',
        taskId: 't-1',
        userId: 'u-1',
        content: 'Updated content',
      };
      mockCommentsService.updateComment.mockResolvedValue(mockUpdated);

      const res = await controller.updateComment('t-1', 'c-1', 'u-1', {
        content: 'Updated content',
      });

      expect(res).toEqual({
        success: true,
        message: 'Comment updated successfully',
        data: mockUpdated,
      });
      expect(mockCommentsService.updateComment).toHaveBeenCalledWith(
        't-1',
        'c-1',
        'u-1',
        { content: 'Updated content' },
      );
    });
  });

  describe('deleteComment', () => {
    it('should soft-delete comment and return message', async () => {
      mockCommentsService.deleteComment.mockResolvedValue({
        message: 'Comment deleted successfully',
      });

      const res = await controller.deleteComment('t-1', 'c-1', 'u-1');

      expect(res).toEqual({
        success: true,
        message: 'Comment deleted successfully',
      });
      expect(mockCommentsService.deleteComment).toHaveBeenCalledWith(
        't-1',
        'c-1',
        'u-1',
      );
    });
  });
});
