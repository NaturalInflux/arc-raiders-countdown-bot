/**
 * Configuration Service
 * Handles server configuration management with backup and cleanup
 */

const fs = require('fs');
const path = require('path');
const { CONFIG } = require('../config/constants');
const Logger = require('../utils/logger');

class ConfigService {
  constructor() {
    this.configFile = path.join(process.cwd(), CONFIG.FILES.CONFIG_FILE);
    this.backupPrefix = CONFIG.FILES.BACKUP_PREFIX;
    this.maxBackups = CONFIG.FILES.MAX_BACKUPS;
  }

  /**
   * Load server configurations from JSON file
   * @returns {Object} - Server configurations
   */
  loadServerConfigs() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      Logger.error('Error loading server configs', error);
    }
    return { servers: {} };
  }

  /**
   * Save server configurations with automatic backup
   * @param {Object} configs - Server configurations to save
   */
  saveServerConfigs(configs) {
    try {
      // Create backup before saving
      this.createBackup();
      
      // Save main configuration
      fs.writeFileSync(this.configFile, JSON.stringify(configs, null, 2));
      Logger.info('Server configurations saved successfully');
    } catch (error) {
      Logger.error('Error saving server configs', error);
    }
  }

  /**
   * Create a timestamped backup of the configuration file
   */
  createBackup() {
    try {
      if (fs.existsSync(this.configFile)) {
        const timestamp = Date.now();
        const backupFile = this.configFile.replace('.json', `-backup-${timestamp}.json`);
        fs.copyFileSync(this.configFile, backupFile);
        
        // Clean up old backups
        this.cleanupOldBackups();
        
        Logger.debug(`Configuration backup created: ${backupFile}`);
      }
    } catch (error) {
      Logger.warn('Failed to create configuration backup', error);
    }
  }

  /**
   * Clean up old backup files, keeping only the most recent ones
   */
  cleanupOldBackups() {
    try {
      const backupDir = path.dirname(this.configFile);
      const backupFiles = fs.readdirSync(backupDir)
        .filter(file => file.startsWith(this.backupPrefix) && file.endsWith('.json'))
        .sort()
        .reverse();
      
      if (backupFiles.length > this.maxBackups) {
        const filesToDelete = backupFiles.slice(this.maxBackups);
        filesToDelete.forEach(file => {
          const filePath = path.join(backupDir, file);
          fs.unlinkSync(filePath);
          Logger.debug(`Deleted old backup: ${file}`);
        });
      }
    } catch (error) {
      Logger.warn('Failed to cleanup old backups', error);
    }
  }

  /**
   * Get server configuration with defaults
   * @param {string} guildId - Discord guild ID
   * @returns {Object} - Server configuration
   */
  getServerConfig(guildId) {
    const configs = this.loadServerConfigs();
    const serverConfig = configs.servers[guildId] || {};
    
    return {
      channelId: serverConfig.channelId || null,
      channelName: serverConfig.channelName || null,
      postTime: serverConfig.postTime || CONFIG.CRON.DEFAULT_TIME
    };
  }

  /**
   * Update server configuration
   * @param {string} guildId - Discord guild ID
   * @param {Object} updates - Configuration updates
   */
  updateServerConfig(guildId, updates) {
    const configs = this.loadServerConfigs();
    if (!configs.servers[guildId]) {
      configs.servers[guildId] = {};
    }
    
    Object.assign(configs.servers[guildId], updates);
    this.saveServerConfigs(configs);
    
    Logger.info(`Server configuration updated for guild: ${guildId}`, updates);
  }

  /**
   * Remove server configuration
   * @param {string} guildId - Discord guild ID
   */
  removeServerConfig(guildId) {
    const configs = this.loadServerConfigs();
    if (configs.servers[guildId]) {
      delete configs.servers[guildId];
      this.saveServerConfigs(configs);
      Logger.info(`Server configuration removed for guild: ${guildId}`);
    }
  }

  /**
   * Get all server configurations
   * @returns {Object} - All server configurations
   */
  getAllServerConfigs() {
    return this.loadServerConfigs();
  }

  /**
   * Get server count
   * @returns {number} - Number of configured servers
   */
  getServerCount() {
    const configs = this.loadServerConfigs();
    return Object.keys(configs.servers).length;
  }

  /**
   * Check if a server is configured
   * @param {string} guildId - Discord guild ID
   * @returns {boolean} - True if server is configured
   */
  isServerConfigured(guildId) {
    const configs = this.loadServerConfigs();
    return configs.servers[guildId] && configs.servers[guildId].channelId;
  }

  /**
   * Get servers with valid configurations
   * @returns {Array} - Array of guild IDs with valid configurations
   */
  getConfiguredServers() {
    const configs = this.loadServerConfigs();
    return Object.keys(configs.servers).filter(guildId => 
      configs.servers[guildId].channelId
    );
  }

  /**
   * Clean up orphaned server configurations
   * @param {Array} currentGuildIds - Array of current guild IDs
   * @returns {number} - Number of orphaned configs removed
   */
  cleanupOrphanedConfigs(currentGuildIds) {
    const configs = this.loadServerConfigs();
    let removedCount = 0;
    
    for (const guildId of Object.keys(configs.servers)) {
      if (!currentGuildIds.includes(guildId)) {
        Logger.info(`Removing orphaned configuration for guild: ${guildId} (bot no longer in server)`);
        delete configs.servers[guildId];
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      this.saveServerConfigs(configs);
      Logger.info(`Cleaned up ${removedCount} orphaned server configurations`);
    }

    return removedCount;
  }

  /**
   * Validate server configuration
   * @param {Object} config - Server configuration to validate
   * @returns {Object} - Validation result
   */
  validateServerConfig(config) {
    const errors = [];
    
    if (!config.channelId) {
      errors.push('Channel ID is required');
    }
    
    if (!config.channelName) {
      errors.push('Channel name is required');
    }
    
    if (!config.postTime) {
      errors.push('Post time is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration statistics
   * @returns {Object} - Configuration statistics
   */
  getConfigStats() {
    const configs = this.loadServerConfigs();
    const servers = Object.keys(configs.servers);
    
    return {
      totalServers: servers.length,
      configuredServers: servers.filter(id => configs.servers[id].channelId).length,
      servers: servers.map(id => ({
        guildId: id,
        channelName: configs.servers[id].channelName,
        postTime: configs.servers[id].postTime,
        isConfigured: !!configs.servers[id].channelId
      }))
    };
  }
}

module.exports = ConfigService;
