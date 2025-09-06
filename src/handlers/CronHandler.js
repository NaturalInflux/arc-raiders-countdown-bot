/**
 * Cron Handler
 * Manages scheduled countdown messages
 */

const cron = require('node-cron');
const { CONFIG } = require('../config/constants');
const Logger = require('../utils/logger');
const TimeUtil = require('../utils/time');

class CronHandler {
  constructor() {
    this.activeCronJobs = new Map();
  }

  /**
   * Schedule countdown messages for all configured servers
   * @param {Object} client - Discord client
   * @param {Object} services - Service instances
   * @param {Date} releaseDate - Game release date
   */
  scheduleCountdownMessages(client, services, releaseDate) {
    const { configService, messageService } = services;
    
    // Check if the game has already launched
    if (TimeUtil.hasDatePassed(releaseDate)) {
      Logger.info(`Game has already launched! Skipping cron job scheduling.`);
      Logger.info(`Launch date: ${releaseDate.toISOString()}`);
      Logger.info(`Current time: ${new Date().toISOString()}`);
      return;
    }

    // Schedule daily countdown messages for all configured servers
    const configs = configService.getAllServerConfigs();
    
    for (const [guildId, serverConfig] of Object.entries(configs.servers)) {
      if (serverConfig.channelId) {
        this.scheduleServerCountdown(guildId, serverConfig, client, services, releaseDate);
      }
    }
  }

  /**
   * Schedule countdown messages for a specific server
   * @param {string} guildId - Discord guild ID
   * @param {Object} serverConfig - Server configuration
   * @param {Object} client - Discord client
   * @param {Object} services - Service instances
   * @param {Date} releaseDate - Game release date
   */
  scheduleServerCountdown(guildId, serverConfig, client, services, releaseDate) {
    const baseTime = serverConfig.postTime || CONFIG.CRON.DEFAULT_TIME;
    
    try {
      const baseSchedule = TimeUtil.timeToCron(baseTime);
      
      Logger.info(`Scheduling countdown for guild ${guildId} at ${baseTime} (UTC)`);
      
      // Destroy existing cron job if it exists
      if (this.activeCronJobs.has(guildId)) {
        this.activeCronJobs.get(guildId).destroy();
      }
      
      // Create new cron job
      const cronJob = cron.schedule(baseSchedule, () => {
        services.messageService.postCountdownMessage(guildId, client, services.configService, releaseDate);
      }, {
        scheduled: true,
        timezone: CONFIG.CRON.TIMEZONE
      });
      
      // Store cron job reference for cleanup
      this.activeCronJobs.set(guildId, cronJob);
      
      Logger.info(`Cron job created for guild ${guildId}`);
    } catch (error) {
      Logger.error(`Failed to schedule cron job for guild ${guildId}`, error);
    }
  }

  /**
   * Update cron job schedule for a server
   * @param {string} guildId - Discord guild ID
   * @param {string} newTime - New posting time
   * @param {Object} client - Discord client
   * @param {Object} services - Service instances
   * @param {Date} releaseDate - Game release date
   */
  updateServerSchedule(guildId, newTime, client, services, releaseDate) {
    const serverConfig = services.configService.getServerConfig(guildId);
    if (serverConfig.channelId) {
      this.scheduleServerCountdown(guildId, serverConfig, client, services, releaseDate);
      Logger.info(`Updated cron schedule for guild ${guildId} to ${newTime}`);
    }
  }

  /**
   * Stop cron job for a specific server
   * @param {string} guildId - Discord guild ID
   */
  stopServerCron(guildId) {
    if (this.activeCronJobs.has(guildId)) {
      const cronJob = this.activeCronJobs.get(guildId);
      cronJob.destroy();
      this.activeCronJobs.delete(guildId);
      Logger.info(`Stopped cron job for guild: ${guildId}`);
    }
  }

  /**
   * Stop all cron jobs
   */
  stopAllCronJobs() {
    for (const [guildId, cronJob] of this.activeCronJobs) {
      cronJob.destroy();
      Logger.info(`Stopped cron job for guild: ${guildId}`);
    }
    this.activeCronJobs.clear();
    Logger.info('All cron jobs stopped');
  }

  /**
   * Get active cron job count
   * @returns {number} - Number of active cron jobs
   */
  getActiveCronJobCount() {
    return this.activeCronJobs.size;
  }

  /**
   * Get cron job status for all servers
   * @returns {Object} - Cron job status information
   */
  getCronJobStatus() {
    const status = {
      totalJobs: this.activeCronJobs.size,
      activeJobs: 0,
      servers: []
    };

    for (const [guildId, cronJob] of this.activeCronJobs) {
      const isRunning = cronJob.running;
      if (isRunning) {
        status.activeJobs++;
      }
      
      status.servers.push({
        guildId,
        running: isRunning,
        nextRun: cronJob.nextDate ? cronJob.nextDate() : null
      });
    }

    return status;
  }

  /**
   * Validate cron schedule
   * @param {string} schedule - Cron schedule string
   * @returns {boolean} - True if schedule is valid
   */
  validateCronSchedule(schedule) {
    return cron.validate(schedule);
  }

  /**
   * Get next run time for a cron job
   * @param {string} guildId - Discord guild ID
   * @returns {Date|null} - Next run time or null
   */
  getNextRunTime(guildId) {
    const cronJob = this.activeCronJobs.get(guildId);
    return cronJob && cronJob.nextDate ? cronJob.nextDate() : null;
  }

  /**
   * Get cron handler statistics
   * @returns {Object} - Cron handler statistics
   */
  getStats() {
    return {
      activeJobs: this.activeCronJobs.size,
      status: this.getCronJobStatus()
    };
  }
}

module.exports = CronHandler;
