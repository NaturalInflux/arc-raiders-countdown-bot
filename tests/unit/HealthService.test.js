/**
 * HealthService Unit Tests
 * Tests for health monitoring and HTTP server functionality
 */

const fs = require('fs');
const http = require('http');
const HealthService = require('../../src/services/HealthService');

// Mock dependencies
jest.mock('fs');
jest.mock('http');

describe('HealthService', () => {
  let healthService;
  let mockServer;

  beforeEach(() => {
    mockServer = {
      listen: jest.fn(),
      close: jest.fn(),
      on: jest.fn()
    };

    http.createServer.mockReturnValue(mockServer);
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockImplementation(() => '{}');
    fs.writeFileSync.mockImplementation(() => {});
    
    // Clear environment variables to ensure default port is used
    delete process.env.HEALTH_PORT;
    
    healthService = new HealthService();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      expect(healthService.server).toBeNull();
      expect(healthService.port).toBe(3000);
      expect(healthService.monitorData).toEqual({
        servers: 0,
        last_updated: expect.any(String)
      });
    });

    test('should use custom port from environment', () => {
      const originalPort = process.env.HEALTH_PORT;
      process.env.HEALTH_PORT = '8080';

      const service = new HealthService();
      expect(service.port).toBe('8080');

      process.env.HEALTH_PORT = originalPort;
    });
  });

  describe('initialize', () => {
    test('should create and start HTTP server', () => {
      healthService.initialize();

      expect(http.createServer).toHaveBeenCalled();
      expect(mockServer.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    });

    test('should use custom port when specified', () => {
      healthService.port = 8080;
      healthService.initialize();

      expect(mockServer.listen).toHaveBeenCalledWith(8080, expect.any(Function));
    });

    test('should handle server creation errors', () => {
      http.createServer.mockImplementation(() => {
        throw new Error('Server creation failed');
      });

      expect(() => healthService.initialize()).toThrow('Server creation failed');
    });
  });

  describe('updateServerCount', () => {
    test('should update server count', () => {
      healthService.updateServerCount(5);
      expect(healthService.monitorData.servers).toBe(5);
    });

    test('should handle zero server count', () => {
      healthService.updateServerCount(0);
      expect(healthService.monitorData.servers).toBe(0);
    });

    test('should handle negative server count', () => {
      healthService.updateServerCount(-1);
      expect(healthService.monitorData.servers).toBe(-1);
    });
  });

  describe('getHealthStatus', () => {
    test('should return complete health status', () => {
      healthService.monitorData.servers = 3;

      const status = healthService.getHealthStatus();

      expect(status).toHaveProperty('status', 'healthy');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('servers', 3);
      expect(status).toHaveProperty('memory');
      expect(status).toHaveProperty('timestamp');
      expect(status.memory).toHaveProperty('rss');
      expect(status.memory).toHaveProperty('heapTotal');
      expect(status.memory).toHaveProperty('heapUsed');
      expect(status.memory).toHaveProperty('external');
    });

    test('should include memory usage information', () => {
      const status = healthService.getHealthStatus();

      expect(status.memory.rss).toBeGreaterThan(0);
      expect(status.memory.heapTotal).toBeGreaterThan(0);
      expect(status.memory.heapUsed).toBeGreaterThan(0);
      expect(status.memory.external).toBeGreaterThanOrEqual(0);
    });

    test('should include current timestamp', () => {
      const before = Date.now();
      const status = healthService.getHealthStatus();
      const after = Date.now();

      expect(status.timestamp).toBeDefined();
      const timestamp = new Date(status.timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('handleHealthRequest', () => {
    let mockRequest;
    let mockResponse;

    beforeEach(() => {
      mockRequest = {
        url: '/health',
        method: 'GET'
      };

      mockResponse = {
        writeHead: jest.fn(),
        end: jest.fn(),
        setHeader: jest.fn()
      };
    });

    test('should handle health endpoint request', () => {
      healthService.monitorData.servers = 2;

      healthService.handleHealthRequest(mockRequest, mockResponse);

      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
      expect(mockResponse.end).toHaveBeenCalled();
      
      const responseData = JSON.parse(mockResponse.end.mock.calls[0][0]);
      expect(responseData.status).toBe('healthy');
      expect(responseData.servers).toBe(2);
    });

    test('should handle errors gracefully', () => {
      // Mock process.memoryUsage to throw error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => {
        throw new Error('Memory usage error');
      });

      healthService.handleHealthRequest(mockRequest, mockResponse);

      expect(mockResponse.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
      expect(mockResponse.end).toHaveBeenCalled();

      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('stop', () => {
    test('should stop server if running', () => {
      healthService.server = mockServer;

      healthService.stop();

      expect(mockServer.close).toHaveBeenCalled();
    });

    test('should handle stopping when server is not running', () => {
      healthService.server = null;

      expect(() => healthService.stop()).not.toThrow();
    });

    test('should handle server close errors', () => {
      healthService.server = mockServer;
      mockServer.close.mockImplementation((callback) => {
        callback(new Error('Close error'));
      });

      expect(() => healthService.stop()).not.toThrow();
    });
  });

  describe('getMonitorData', () => {
    test('should return monitor data', () => {
      const monitorData = healthService.getMonitorData();

      expect(monitorData).toHaveProperty('servers');
      expect(monitorData).toHaveProperty('last_updated');
      expect(typeof monitorData.servers).toBe('number');
      expect(typeof monitorData.last_updated).toBe('string');
    });
  });

  describe('updateMetrics', () => {
    test('should update metrics', () => {
      const metrics = { activeCronJobs: 5, lastPost: '2025-01-01' };
      
      healthService.updateMetrics(metrics);

      expect(healthService.monitorData.activeCronJobs).toBe(5);
      expect(healthService.monitorData.lastPost).toBe('2025-01-01');
    });
  });

  describe('getStats', () => {
    test('should return service statistics', () => {
      const stats = healthService.getStats();

      expect(stats).toHaveProperty('port');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('memory');
      expect(stats).toHaveProperty('monitorData');
      expect(stats).toHaveProperty('serverRunning');
      expect(typeof stats.port).toBe('number');
      expect(typeof stats.uptime).toBe('number');
      expect(typeof stats.serverRunning).toBe('boolean');
    });
  });

  describe('server event handling', () => {
    test('should handle server listening event', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      healthService.initialize();
      
      // Simulate server listening event
      const listenCallback = mockServer.listen.mock.calls[0][1];
      listenCallback();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Health check server running'));

      consoleSpy.mockRestore();
    });

    test('should handle server error event', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      healthService.initialize();
      
      // Simulate server error event
      const errorCallback = mockServer.on.mock.calls.find(call => call[0] === 'error')[1];
      errorCallback(new Error('Server error'));

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Health server error'));

      consoleSpy.mockRestore();
    });
  });
});
