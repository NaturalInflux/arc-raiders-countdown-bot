/**
 * ConfigService Unit Tests
 * Tests for server configuration management
 */

const fs = require('fs');
const path = require('path');
const ConfigService = require('../../src/services/ConfigService');

// Mock fs module
jest.mock('fs');

describe('ConfigService', () => {
  let configService;
  const testConfigPath = path.join(__dirname, '../fixtures/server-config.json');
  const testConfig = {
    servers: {
      '123456789': {
        channelId: '111111111',
        channelName: 'general',
        postTime: '12:00'
      }
    }
  };

  beforeEach(() => {
    configService = new ConfigService();
    jest.clearAllMocks();
    
    // Mock fs.readFileSync to return test config
    fs.readFileSync.mockReturnValue(JSON.stringify(testConfig));
    fs.existsSync.mockReturnValue(true);
    fs.writeFileSync.mockImplementation(() => {});
    fs.copyFileSync.mockImplementation(() => {});
    fs.readdirSync.mockReturnValue([]);
  });

  describe('loadServerConfigs', () => {
    test('should load configurations from file', () => {
      const configs = configService.loadServerConfigs();
      
      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('server-config.json'),
        'utf8'
      );
      expect(configs).toEqual(testConfig);
    });

    test('should return empty config if file does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const configs = configService.loadServerConfigs();
      
      expect(configs).toEqual({ servers: {} });
    });

    test('should handle invalid JSON gracefully', () => {
      fs.readFileSync.mockReturnValue('invalid json');
      
      const configs = configService.loadServerConfigs();
      expect(configs).toEqual({ servers: {} });
    });
  });

  describe('getServerConfig', () => {
    test('should return server configuration', () => {
      const serverConfig = configService.getServerConfig('123456789');
      
      expect(serverConfig).toEqual({
        channelId: '111111111',
        channelName: 'general',
        postTime: '12:00'
      });
    });

    test('should return empty config for unknown server', () => {
      const serverConfig = configService.getServerConfig('999999999');
      
      expect(serverConfig).toEqual({
        channelId: null,
        channelName: null,
        postTime: '12:00' // Default time from constants
      });
    });
  });

  describe('updateServerConfig', () => {
    test('should update server configuration', () => {
      const newConfig = {
        channelId: '222222222',
        channelName: 'countdown',
        postTime: '18:00'
      };
      
      // Mock fs.readFileSync to return updated config after update
      fs.readFileSync
        .mockReturnValueOnce(JSON.stringify(testConfig)) // First call for updateServerConfig
        .mockReturnValueOnce(JSON.stringify({ // Second call for getServerConfig
          servers: {
            ...testConfig.servers,
            '123456789': newConfig
          }
        }));
      
      configService.updateServerConfig('123456789', newConfig);
      
      const updatedConfig = configService.getServerConfig('123456789');
      expect(updatedConfig).toEqual(newConfig);
    });

    test('should create new server configuration', () => {
      const newConfig = {
        channelId: '333333333',
        channelName: 'announcements',
        postTime: '09:00'
      };
      
      // Mock fs.readFileSync to return updated config after update
      fs.readFileSync
        .mockReturnValueOnce(JSON.stringify(testConfig)) // First call for updateServerConfig
        .mockReturnValueOnce(JSON.stringify({ // Second call for getServerConfig
          servers: {
            ...testConfig.servers,
            '999999999': newConfig
          }
        }));
      
      configService.updateServerConfig('999999999', newConfig);
      
      const serverConfig = configService.getServerConfig('999999999');
      expect(serverConfig).toEqual(newConfig);
    });
  });

  describe('removeServerConfig', () => {
    test('should remove server configuration', () => {
      // Mock fs.readFileSync to return updated config after removal
      fs.readFileSync
        .mockReturnValueOnce(JSON.stringify(testConfig)) // First call for removeServerConfig
        .mockReturnValueOnce(JSON.stringify({ // Second call for getServerConfig
          servers: {
            // Remove the server from the config
          }
        }));
      
      configService.removeServerConfig('123456789');
      
      const serverConfig = configService.getServerConfig('123456789');
      expect(serverConfig.channelId).toBeNull();
    });

    test('should handle removal of non-existent server', () => {
      expect(() => configService.removeServerConfig('999999999')).not.toThrow();
    });
  });

  describe('saveServerConfigs', () => {
    test('should save configurations to file', () => {
      configService.saveServerConfigs(testConfig);
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('server-config.json'),
        JSON.stringify(testConfig, null, 2)
      );
    });

    test('should create backup before saving', () => {
      configService.saveServerConfigs(testConfig);
      
      expect(fs.copyFileSync).toHaveBeenCalled();
    });
  });
});
