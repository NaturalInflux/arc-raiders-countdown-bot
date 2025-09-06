/**
 * Health Service
 * Handles health monitoring and status reporting
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { CONFIG } = require('../config/constants');
const Logger = require('../utils/logger');

class HealthService {
  constructor() {
    this.monitorFile = path.join(process.cwd(), CONFIG.FILES.MONITOR_FILE);
    this.server = null;
    this.port = process.env.HEALTH_PORT || CONFIG.HEALTH.DEFAULT_PORT;
    this.monitorData = {
      servers: 0,
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Initialize the health service
   */
  initialize() {
    this.loadMonitorData();
    this.startHealthServer();
    Logger.info(`Health service initialized on port ${this.port}`);
  }

  /**
   * Load monitoring data from file
   */
  loadMonitorData() {
    if (fs.existsSync(this.monitorFile)) {
      try {
        this.monitorData = JSON.parse(fs.readFileSync(this.monitorFile, 'utf8'));
      } catch (error) {
        Logger.warn('Failed to load monitor data, using defaults', error);
        this.monitorData = {
          servers: 0,
          last_updated: new Date().toISOString()
        };
      }
    }
  }

  /**
   * Save monitoring data to file
   */
  saveMonitorData() {
    try {
      this.monitorData.last_updated = new Date().toISOString();
      fs.writeFileSync(this.monitorFile, JSON.stringify(this.monitorData, null, 2));
    } catch (error) {
      Logger.error('Failed to save monitor data', error);
    }
  }

  /**
   * Update server count
   * @param {number} serverCount - Current server count
   */
  updateServerCount(serverCount) {
    this.monitorData.servers = serverCount;
    this.saveMonitorData();
    Logger.debug(`Server count updated: ${serverCount}`);
  }

  /**
   * Start the health check HTTP server
   */
  startHealthServer() {
    this.server = http.createServer((req, res) => {
      if (req.url === CONFIG.HEALTH.ENDPOINT && req.method === 'GET') {
        this.handleHealthRequest(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    this.server.listen(this.port, () => {
      Logger.info(`Health check server running on port ${this.port}`);
    });

    // Handle server errors
    this.server.on('error', (error) => {
      Logger.error('Health server error', error);
    });
  }

  /**
   * Handle health check requests
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   */
  handleHealthRequest(req, res) {
    try {
      const healthData = this.generateHealthData();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(healthData, null, 2));
      
      Logger.debug('Health check request served');
    } catch (error) {
      Logger.error('Error handling health request', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  /**
   * Generate health data response
   * @param {Object} additionalData - Additional data to include
   * @returns {Object} - Health data object
   */
  generateHealthData(additionalData = {}) {
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      uptime: process.uptime(),
      servers: this.monitorData.servers,
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external
      },
      timestamp: new Date().toISOString(),
      ...additionalData
    };
  }

  /**
   * Get current health status
   * @returns {Object} - Current health status
   */
  getHealthStatus() {
    return this.generateHealthData();
  }

  /**
   * Stop the health server
   */
  stop() {
    if (this.server) {
      this.server.close(() => {
        Logger.info('Health server stopped');
      });
    }
  }

  /**
   * Get monitoring data
   * @returns {Object} - Current monitoring data
   */
  getMonitorData() {
    return { ...this.monitorData };
  }

  /**
   * Update monitoring data with additional metrics
   * @param {Object} metrics - Additional metrics to store
   */
  updateMetrics(metrics) {
    Object.assign(this.monitorData, metrics);
    this.saveMonitorData();
  }

  /**
   * Get service statistics
   * @returns {Object} - Service statistics
   */
  getStats() {
    return {
      port: this.port,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      monitorData: this.getMonitorData(),
      serverRunning: !!this.server
    };
  }
}

module.exports = HealthService;
