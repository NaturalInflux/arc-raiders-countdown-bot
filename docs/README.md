# Arc Raiders Countdown Bot - Documentation

## 📚 Documentation Overview

This directory contains comprehensive documentation for the Arc Raiders Countdown Bot system, organized for optimal LLM and human consumption.

## 📖 Documentation Files

### [ARCHITECTURE.md](./ARCHITECTURE.md)
**System Design & Structure**
- Service-oriented architecture patterns
- Component relationships and data flow
- Design patterns and principles
- Error handling strategies
- Performance considerations
- Security considerations
- Scalability roadmap

### [API_REFERENCE.md](./API_REFERENCE.md)
**Complete Method & Function Documentation**
- Service method signatures and parameters
- Command handler documentation
- Utility function reference
- Configuration API documentation
- Error handling reference
- Rate limit information
- Health check API

### [TESTING.md](./TESTING.md)
**Testing Framework & Coverage**
- Jest testing infrastructure
- Test coverage analysis (64.73% overall)
- Mock utilities and strategies
- Test categories and examples
- Quality assurance practices
- Missing test coverage areas
- Testing best practices

### [DEPLOYMENT.md](./DEPLOYMENT.md)
**Production Operations**
- Production deployment procedures
- PM2 configuration and management
- Monitoring and health checks
- Logging and debugging
- Troubleshooting guide
- Security considerations
- Backup and recovery procedures

## 🚀 Quick Start

For users wanting to get started quickly, see the main [README.md](../README.md) in the project root.

## 🔧 For Developers

- **System Understanding**: Start with [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Reference**: Use [API_REFERENCE.md](./API_REFERENCE.md) for method documentation
- **Testing**: See [TESTING.md](./TESTING.md) for testing framework details
- **Deployment**: Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup

## 📊 System Overview

The Arc Raiders Countdown Bot is a Discord bot that posts daily countdown messages for the Arc Raiders game release. It features:

- **Multi-Server Support**: Independent configurations per Discord server
- **Reddit Integration**: Automatic inclusion of top r/arcraiders posts
- **Dynamic Emoji System**: 5-phase emoji progression based on days remaining
- **Health Monitoring**: HTTP endpoint for external monitoring
- **Comprehensive Testing**: 166 passing tests with 64.73% code coverage

## 🏗️ Architecture Summary

The system uses a **service-oriented architecture** with clear separation of concerns:

- **Services**: ConfigService, EmojiService, RedditService, MessageService, HealthService
- **Commands**: SetupCommand, TimeCommand, StatusCommand, TestCommand, LoveCommand
- **Handlers**: InteractionHandler, GuildHandler, CronHandler
- **Utils**: TimeUtil, RetryUtil, Logger

## 🧪 Testing Summary

- **Framework**: Jest with comprehensive mocking
- **Coverage**: 64.73% overall (166 passing tests)
- **Components**: All core services and utilities tested
- **Missing**: Command and handler classes need test coverage

## 🚀 Deployment Summary

- **Process Management**: PM2 with automatic restart
- **Health Monitoring**: HTTP endpoint on configurable port
- **Logging**: Comprehensive logging to files
- **Backup**: Automatic configuration backups

---

For detailed information on any aspect of the system, refer to the specific documentation files listed above.
