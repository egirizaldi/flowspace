import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SessionService } from '../auth/session.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const mockNotificationsService = {
    getUserNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  };

  const mockSessionService = {
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue({ unreadCount: 5 });

      const res = await controller.getUnreadCount('u-1');
      expect(res).toEqual({
        success: true,
        message: 'Unread count retrieved successfully',
        data: { unreadCount: 5 },
      });
      expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledWith('u-1');
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications', async () => {
      mockNotificationsService.getUserNotifications.mockResolvedValue({
        notifications: [{ id: 'n-1', title: 'Test notification' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const res = await controller.getUserNotifications('u-1', { page: 1, limit: 20 });
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
      expect(mockNotificationsService.getUserNotifications).toHaveBeenCalledWith('u-1', {
        page: 1,
        limit: 20,
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = { id: 'n-1', isRead: true };
      mockNotificationsService.markAsRead.mockResolvedValue(mockNotification);

      const res = await controller.markAsRead('n-1', 'u-1');
      expect(res).toEqual({
        success: true,
        message: 'Notification marked as read',
        data: mockNotification,
      });
      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith('n-1', 'u-1');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockNotificationsService.markAllAsRead.mockResolvedValue({ success: true, count: 3 });

      const res = await controller.markAllAsRead('u-1');
      expect(res).toEqual({
        success: true,
        message: 'All notifications marked as read',
        data: { success: true, count: 3 },
      });
      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith('u-1');
    });
  });
});
