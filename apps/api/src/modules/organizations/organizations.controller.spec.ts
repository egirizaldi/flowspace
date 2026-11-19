import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { SessionService } from '../auth/session.service';
import { Reflector } from '@nestjs/core';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let service: OrganizationsService;

  const mockOrganizationsService = {
    create: jest.fn(),
    listUserOrganizations: jest.fn(),
    findByIdForUser: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockSessionService = {
    getCookieName: jest.fn().mockReturnValue('flowspace_session'),
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        { provide: OrganizationsService, useValue: mockOrganizationsService },
        { provide: SessionService, useValue: mockSessionService },
        Reflector,
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    service = module.get<OrganizationsService>(OrganizationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call organizationsService.create and return standardized response', async () => {
      const mockOrg = {
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        createdBy: 'user-123',
        members: [{ id: 'mem-1', role: 'OWNER', userId: 'user-123' }],
      };

      mockOrganizationsService.create.mockResolvedValue(mockOrg);

      const dto = { name: 'Acme Corp', slug: 'acme-corp' };
      const result = await controller.create('user-123', dto);

      expect(mockOrganizationsService.create).toHaveBeenCalledWith('user-123', dto);
      expect(result).toEqual({
        success: true,
        message: 'Organization created successfully',
        data: mockOrg,
      });
    });
  });

  describe('listUserOrganizations', () => {
    it('should return list of user organizations', async () => {
      const mockList = [{ id: 'org-1', name: 'Acme', userRole: 'OWNER' }];
      mockOrganizationsService.listUserOrganizations.mockResolvedValue(mockList);

      const result = await controller.listUserOrganizations('user-123');

      expect(mockOrganizationsService.listUserOrganizations).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        success: true,
        message: 'Organizations retrieved successfully',
        data: mockList,
      });
    });
  });

  describe('getOrganizationDetail', () => {
    it('should return organization detail', async () => {
      const mockOrg = { id: 'org-1', name: 'Acme', currentUserRole: 'OWNER' };
      mockOrganizationsService.findByIdForUser.mockResolvedValue(mockOrg);

      const result = await controller.getOrganizationDetail('user-123', 'org-1');

      expect(mockOrganizationsService.findByIdForUser).toHaveBeenCalledWith('org-1', 'user-123');
      expect(result).toEqual({
        success: true,
        message: 'Organization details retrieved successfully',
        data: mockOrg,
      });
    });
  });

  describe('updateOrganization', () => {
    it('should update organization and return standardized response', async () => {
      const mockUpdated = { id: 'org-1', name: 'New Acme' };
      mockOrganizationsService.update.mockResolvedValue(mockUpdated);

      const dto = { name: 'New Acme' };
      const result = await controller.updateOrganization('user-123', 'org-1', dto);

      expect(mockOrganizationsService.update).toHaveBeenCalledWith('org-1', 'user-123', dto);
      expect(result).toEqual({
        success: true,
        message: 'Organization updated successfully',
        data: mockUpdated,
      });
    });
  });

  describe('deleteOrganization', () => {
    it('should delete organization and return standardized response', async () => {
      mockOrganizationsService.delete.mockResolvedValue(true);

      const result = await controller.deleteOrganization('user-123', 'org-1');

      expect(mockOrganizationsService.delete).toHaveBeenCalledWith('org-1', 'user-123');
      expect(result).toEqual({
        success: true,
        message: 'Organization deleted successfully',
      });
    });
  });
});
