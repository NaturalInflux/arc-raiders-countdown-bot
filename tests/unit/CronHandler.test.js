/**
 * CronHandler Unit Tests
 * Tests for scheduled countdown message management
 */

const cron = require('node-cron');
const CronHandler = require('../../src/handlers/CronHandler');

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
  validate: jest.fn()
}));

// Mock TimeUtil
jest.mock('../../src/utils/time', () => ({
  timeToCron: jest.fn(),
  hasDatePassed: jest.fn()
}));

const TimeUtil = require('../../src/utils/time');

describe('CronHandler', () => {
  let cronHandler;
  let mockClient;
  let mockServices;
  let mockReleaseDate;

  beforeEach(() => {
    cronHandler = new CronHandler();
    
    mockClient = {
      guilds: {
        cache: new Map([
          ['guild1', { id: 'guild1', name: 'Test Guild 1' }],
          ['guild2', { id: 'guild2', name: 'Test Guild 2' }]
        ])
      }
    };

    mockServices = {
      configService: {
        getAllServerConfigs: jest.fn(),
        getServerConfig: jest.fn()
      },
      messageService: {
        postCountdownMessage: jest.fn()
      }
    };

    mockReleaseDate = new Date('2025-10-30T00:00:00Z');

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with empty activeCronJobs Map', () => {
      expect(cronHandler.activeCronJobs).toBeInstanceOf(Map);
      expect(cronHandler.activeCronJobs.size).toBe(0);
    });
  });

  describe('scheduleCountdownMessages', () => {
    test('should skip scheduling when game has launched', () => {
      TimeUtil.hasDatePassed.mockReturnValue(true);

      cronHandler.scheduleCountdownMessages(mockClient, mockServices, mockReleaseDate);

      expect(TimeUtil.hasDatePassed).toHaveBeenCalledWith(mockReleaseDate);
      expect(mockServices.configService.getAllServerConfigs).not.toHaveBeenCalled();
    });

    test('should schedule messages for all configured servers', () => {
      TimeUtil.hasDatePassed.mockReturnValue(false);
      
      const mockConfigs = {
        servers: {
          'guild1': {
            channelId: 'channel1',
            channelName: 'general',
            postTime: '12:00'
          },
          'guild2': {
            channelId: 'channel2',
            channelName: 'announcements',
            postTime: '18:00'
          }
        }
      };

      mockServices.configService.getAllServerConfigs.mockReturnValue(mockConfigs);
      TimeUtil.timeToCron.mockReturnValue('0 0 12 * * *');
      
      const mockCronJob = {
        stop: jest.fn(),
        running: true,
        nextDate: jest.fn().mockReturnValue(new Date())
      };
      cron.schedule.mockReturnValue(mockCronJob);

      cronHandler.scheduleCountdownMessages(mockClient, mockServices, mockReleaseDate);

      expect(mockServices.configService.getAllServerConfigs).toHaveBeenCalled();
      expect(cron.schedule).toHaveBeenCalledTimes(2);
      expect(cronHandler.activeCronJobs.size).toBe(2);
    });

    test('should skip servers without channel configuration', () => {
      TimeUtil.hasDatePassed.mockReturnValue(false);
      
      const mockConfigs = {
        servers: {
          'guild1': {
            channelId: 'channel1',
            channelName: 'general',
            postTime: '12:00'
          },
          'guild2': {
            channelId: null, // No channel configured
            channelName: null,
            postTime: '18:00'
          }
        }
      };

      mockServices.configService.getAllServerConfigs.mockReturnValue(mockConfigs);
      TimeUtil.timeToCron.mockReturnValue('0 0 12 * * *');
      
      const mockCronJob = {
        stop: jest.fn(),
        running: true,
        nextDate: jest.fn().mockReturnValue(new Date())
      };
      cron.schedule.mockReturnValue(mockCronJob);

      cronHandler.scheduleCountdownMessages(mockClient, mockServices, mockReleaseDate);

      expect(cron.schedule).toHaveBeenCalledTimes(1); // Only guild1
      expect(cronHandler.activeCronJobs.size).toBe(1);
    });

    test('should handle cron schedule creation errors', () => {
      TimeUtil.hasDatePassed.mockReturnValue(false);
      
      const mockConfigs = {
        servers: {
          'guild1': {
            channelId: 'channel1',
            channelName: 'general',
            postTime: 'invalid-time'
          }
        }
      };

      mockServices.configService.getAllServerConfigs.mockReturnValue(mockConfigs);
      TimeUtil.timeToCron.mockImplementation(() => {
        throw new Error('Invalid time format');
      });

      cronHandler.scheduleCountdownMessages(mockClient, mockServices, mockReleaseDate);

      expect(cronHandler.activeCronJobs.size).toBe(0);
    });
  });

  describe('scheduleServerCountdown', () => {
    test('should create new cron job for server', () => {
      const serverConfig = {
        channelId: 'channel1',
        channelName: 'general',
        postTime: '12:00'
      };

      TimeUtil.timeToCron.mockReturnValue('0 0 12 * * *');
      
      const mockCronJob = {
        stop: jest.fn(),
        running: true,
        nextDate: jest.fn().mockReturnValue(new Date())
      };
      cron.schedule.mockReturnValue(mockCronJob);

      cronHandler.scheduleServerCountdown('guild1', serverConfig, mockClient, mockServices, mockReleaseDate);

      expect(TimeUtil.timeToCron).toHaveBeenCalledWith('12:00');
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 0 12 * * *',
        expect.any(Function),
        {
          scheduled: true,
          timezone: 'UTC'
        }
      );
      expect(cronHandler.activeCronJobs.has('guild1')).toBe(true);
    });

    test('should stop existing cron job before creating new one', () => {
      const serverConfig = {
        channelId: 'channel1',
        channelName: 'general',
        postTime: '12:00'
      };

      const existingCronJob = {
        stop: jest.fn(),
        running: true,
        nextDate: jest.fn().mockReturnValue(new Date())
      };

      cronHandler.activeCronJobs.set('guild1', existingCronJob);

      TimeUtil.timeToCron.mockReturnValue('0 0 12 * * *');
      
      const newCronJob = {
        stop: jest.fn(),
        running: true,
        nextDate: jest.fn().mockReturnValue(new Date())
      };
      cron.schedule.mockReturnValue(newCronJob);

      cronHandler.scheduleServerCountdown('guild1', serverConfig, mockClient, mockServices, mockReleaseDate);

      expect(existingCronJob.stop).toHaveBeenCalled();
      expect(cronHandler.activeCronJobs.get('guild1')).toBe(newCronJob);
    });

    test('should use default time when postTime not specified', () => {
      const serverConfig = {
        channelId: 'channel1',
        channelName: 'general'
        // No postTime specified
      };

      TimeUtil.timeToCron.mockReturnValue('0 0 12 * * *');
      
      const mockCronJob = {
        stop: jest.fn(),
        running: true,
        nextDate: jest.fn().mockReturnValue(new Date())
      };
      cron.schedule.mockReturnValue(mockCronJob);

      cronHandler.scheduleServerCountdown('guild1', serverConfig, mockClient, mockServices, mockReleaseDate);

      expect(TimeUtil.timeToCron).toHaveBeenCalledWith('12:00'); // Default time
    });

    test('should handle cron job creation errors', () => {
      const serverConfig = {
        channelId: 'channel1',
        channelName: 'general',
        postTime: 'invalid-time'
      };

      TimeUtil.timeToCron.mockImplementation(() => {
        throw new Error('Invalid time format');
      });

      cronHandler.scheduleServerCountdown('guild1', serverConfig, mockClient, mockServices, mockReleaseDate);

      expect(cronHandler.activeCronJobs.has('guild1')).toBe(false);
    });
  });

  describe('updateServerSchedule', () => {
    test('should update schedule for configured server', () => {
      const serverConfig = {
        channelId: 'channel1',
        channelName: 'general',
        postTime: '18:00'
      };

      mockServices.configService.getServerConfig.mockReturnValue(serverConfig);
      
      const mockCronJob = {
        stop: jest.fn(),
        running: true,
        nextDate: jest.fn().mockReturnValue(new Date())
      };
      cron.schedule.mockReturnValue(mockCronJob);
      TimeUtil.timeToCron.mockReturnValue('0 0 18 * * *');

      cronHandler.updateServerSchedule('guild1', '18:00', mockClient, mockServices, mockReleaseDate);

      expect(mockServices.configService.getServerConfig).toHaveBeenCalledWith('guild1');
      expect(cron.schedule).toHaveBeenCalled();
    });

    test('should not update schedule for unconfigured server', () => {
      const serverConfig = {
        channelId: null,
        channelName: null,
        postTime: '12:00'
      };

      mockServices.configService.getServerConfig.mockReturnValue(serverConfig);

      cronHandler.updateServerSchedule('guild1', '18:00', mockClient, mockServices, mockReleaseDate);

      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });

  describe('stopServerCron', () => {
    test('should stop and remove cron job for server', () => {
      const mockCronJob = {
        stop: jest.fn(),
        running: true,
        nextDate: jest.fn().mockReturnValue(new Date())
      };

      cronHandler.activeCronJobs.set('guild1', mockCronJob);

      cronHandler.stopServerCron('guild1');

      expect(mockCronJob.stop).toHaveBeenCalled();
      expect(cronHandler.activeCronJobs.has('guild1')).toBe(false);
    });

    test('should handle stopping non-existent cron job', () => {
      expect(() => cronHandler.stopServerCron('nonexistent')).not.toThrow();
    });
  });

  describe('stopAllCronJobs', () => {
    test('should stop all active cron jobs', () => {
      const mockCronJob1 = {
        stop: jest.fn(),
        running: true,
        nextDate: jest.fn().mockReturnValue(new Date())
      };
      const mockCronJob2 = {
        stop: jest.fn(),
        running: true,
        nextDate: jest.fn().mockReturnValue(new Date())
      };

      cronHandler.activeCronJobs.set('guild1', mockCronJob1);
      cronHandler.activeCronJobs.set('guild2', mockCronJob2);

      cronHandler.stopAllCronJobs();

      expect(mockCronJob1.stop).toHaveBeenCalled();
      expect(mockCronJob2.stop).toHaveBeenCalled();
      expect(cronHandler.activeCronJobs.size).toBe(0);
    });

    test('should handle empty cron jobs map', () => {
      expect(() => cronHandler.stopAllCronJobs()).not.toThrow();
    });
  });

  describe('getActiveCronJobCount', () => {
    test('should return correct count of active cron jobs', () => {
      expect(cronHandler.getActiveCronJobCount()).toBe(0);

      cronHandler.activeCronJobs.set('guild1', {});
      expect(cronHandler.getActiveCronJobCount()).toBe(1);

      cronHandler.activeCronJobs.set('guild2', {});
      expect(cronHandler.getActiveCronJobCount()).toBe(2);
    });
  });

  describe('getCronJobStatus', () => {
    test('should return status information for all cron jobs', () => {
      const mockCronJob1 = {
        running: true,
        nextDate: jest.fn().mockReturnValue(new Date('2025-01-01T12:00:00Z'))
      };
      const mockCronJob2 = {
        running: false,
        nextDate: jest.fn().mockReturnValue(null)
      };

      cronHandler.activeCronJobs.set('guild1', mockCronJob1);
      cronHandler.activeCronJobs.set('guild2', mockCronJob2);

      const status = cronHandler.getCronJobStatus();

      expect(status).toHaveProperty('totalJobs', 2);
      expect(status).toHaveProperty('activeJobs', 1);
      expect(status).toHaveProperty('servers');
      expect(status.servers).toHaveLength(2);
      expect(status.servers[0]).toHaveProperty('guildId');
      expect(status.servers[0]).toHaveProperty('running');
      expect(status.servers[0]).toHaveProperty('nextRun');
    });
  });

  describe('validateCronSchedule', () => {
    test('should validate cron schedule using node-cron', () => {
      cron.validate.mockReturnValue(true);

      const result = cronHandler.validateCronSchedule('0 0 12 * * *');

      expect(cron.validate).toHaveBeenCalledWith('0 0 12 * * *');
      expect(result).toBe(true);
    });

    test('should return false for invalid cron schedule', () => {
      cron.validate.mockReturnValue(false);

      const result = cronHandler.validateCronSchedule('invalid schedule');

      expect(result).toBe(false);
    });
  });

  describe('getNextRunTime', () => {
    test('should return next run time for existing cron job', () => {
      const nextRunDate = new Date('2025-01-01T12:00:00Z');
      const mockCronJob = {
        nextDate: jest.fn().mockReturnValue(nextRunDate)
      };

      cronHandler.activeCronJobs.set('guild1', mockCronJob);

      const result = cronHandler.getNextRunTime('guild1');

      expect(result).toBe(nextRunDate);
      expect(mockCronJob.nextDate).toHaveBeenCalled();
    });

    test('should return null for non-existent cron job', () => {
      const result = cronHandler.getNextRunTime('nonexistent');

      expect(result).toBeNull();
    });

    test('should return null when nextDate is not available', () => {
      const mockCronJob = {
        nextDate: jest.fn().mockReturnValue(null)
      };

      cronHandler.activeCronJobs.set('guild1', mockCronJob);

      const result = cronHandler.getNextRunTime('guild1');

      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    test('should return cron handler statistics', () => {
      const mockCronJob = {
        running: true,
        nextDate: jest.fn().mockReturnValue(new Date())
      };

      cronHandler.activeCronJobs.set('guild1', mockCronJob);

      const stats = cronHandler.getStats();

      expect(stats).toHaveProperty('activeJobs', 1);
      expect(stats).toHaveProperty('status');
      expect(stats.status).toHaveProperty('totalJobs', 1);
      expect(stats.status).toHaveProperty('activeJobs', 1);
      expect(stats.status).toHaveProperty('servers');
    });
  });
});
