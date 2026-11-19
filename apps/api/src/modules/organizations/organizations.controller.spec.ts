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
});
