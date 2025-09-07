# Arc Raiders Countdown Bot - Master System Documentation

## 📚 Documentation Structure

This is the **master reference document** for the Arc Raiders Countdown Bot system. For detailed information on specific topics, refer to the specialized documentation files:

- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System design, patterns, and component relationships
- **[docs/API_REFERENCE.md](./docs/API_REFERENCE.md)** - Complete method and function documentation
- **[docs/TESTING.md](./docs/TESTING.md)** - Testing framework, coverage, and test utilities
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Production deployment, monitoring, and operations
- **[README.md](./README.md)** - User-facing documentation and quick start guide

## 🎯 Project Overview

### What is the Arc Raiders Countdown Bot?
The Arc Raiders Countdown Bot is a Discord bot that posts daily countdown messages for the Arc Raiders game release (configurable, default: October 30, 2025). It features multi-server support, Reddit integration, dynamic emoji systems, and comprehensive monitoring.

### Key Capabilities
- **Multi-Server Support**: Each Discord server can have its own channel and posting time
- **Reddit Integration**: Automatically includes top posts from r/arcraiders with media
- **Dynamic Emoji System**: 5-phase emoji progression based on days remaining
- **Social Messages**: Developer can add custom messages for countdown posts
- **Health Monitoring**: HTTP endpoint for external monitoring
- **Automatic Game Launch Detection**: Stops countdown when release date is reached

### Target Use Case
Perfect for Discord communities waiting for Arc Raiders release, providing daily engagement with countdown updates, community content from Reddit, and dynamic visual progression through emoji phases.

## 🏗️ System Architecture

> **📖 Detailed Architecture Information**: See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for comprehensive system design, patterns, and component relationships.

### Technology Stack
- **Runtime**: Node.js (>=16.0.0)
- **Discord API**: Discord.js v14 (Discord API v10)
- **Scheduling**: Node-cron
- **HTTP Client**: Axios
- **Process Management**: PM2
- **Data Storage**: JSON files
- **Health Monitoring**: Built-in HTTP server
- **Testing Framework**: Jest with comprehensive unit tests

### Core Components
- **Services**: ConfigService, EmojiService, RedditService, MessageService, HealthService
- **Commands**: SetupCommand, TimeCommand, StatusCommand, TestCommand, LoveCommand
- **Handlers**: InteractionHandler, GuildHandler, CronHandler
- **Utils**: TimeUtil, RetryUtil, Logger

## ⚙️ Configuration System

### Environment Variables (.env)
```bash
# Required
DISCORD_TOKEN=your_bot_token_here

# Optional - Release Date Configuration
RELEASE_DATE=2025-10-30T00:00:00Z

# Optional Reddit Integration
REDDIT_CLIENT_ID=your_reddit_client_id_here
REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
REDDIT_USERNAME=your_reddit_username_here
REDDIT_PASSWORD=your_reddit_password_here

# Optional Health Check Server
HEALTH_PORT=3000
```

### Server Configuration Management
**File**: `server-config.json` (auto-generated)
**Structure**:
```json
{
  "servers": {
    "guild_id": {
      "channelId": "channel_id",
      "channelName": "channel_name",
      "postTime": "12:00"
    }
  }
}
```

## 🤖 Discord Integration

### Bot Setup Requirements
- **Required Intents**: Guilds, Guild Messages
- **Required Permissions**: Send Messages, Embed Links, Attach Files, Use External Emojis
- **Bot Invite URL**: `https://discord.com/api/oauth2/authorize?client_id=1413486967525478462&permissions=234881024&scope=bot`

### Discord Commands
1. **`/countdown-setup channel:<name>`** - Set up bot for the server
2. **`/countdown-time time:<time>`** - Update posting time
3. **`/countdown-status`** - Show current configuration
4. **`/countdown-test`** - Test countdown message posting
5. **`/countdown-love`** - Show donation links

## 🔗 Reddit Integration

### Features
- OAuth authentication with Reddit API
- Fetches #1 top-voted post from r/arcraiders daily
- Media support (images/videos) from Reddit posts
- Graceful degradation if Reddit API fails

### API Details
- **Rate Limit**: 60 requests per minute for OAuth applications
- **Token Caching**: 45-minute refresh cycle
- **Daily Caching**: Reddit posts fetched once per day, cached for all servers
- **Retry Logic**: 3 attempts with exponential backoff

## 😀 Emoji System

### Phase Structure
| Phase | Days Remaining | Emoji Count | Mood |
|-------|----------------|-------------|------|
| Phase 1 | 55+ days | 1 emoji | Depressed/Melancholy |
| Phase 2 | 30-54 days | 2 emojis | Hopeful/Excited |
| Phase 3 | 15-29 days | 3 emojis | Hype Building |
| Phase 4 | 7-14 days | 4 emojis | Maximum Hype |
| Phase 5 | 1-6 days | 4 emojis | Insane Hype |

### Technical Implementation
- 200+ custom emojis from various Discord servers
- No duplicate emojis in same message
- Character limit compliance (Discord's 256 character title limit)
- Random selection with 100-attempt limit

## 📝 Social Messages System

### Features
- One-time use messages (consumed after posting)
- All servers get the same message on next post
- Developer-only access via `node add-message.js "message"`
- Automatic file management (deletion after consumption)

## 🏥 Monitoring & Health Checks

### Health Check System
**HTTP Endpoint**: `http://localhost:3000/health` (configurable port)
**Response Format**: JSON with status, uptime, server count, memory usage

### Monitoring System
- Tracks current server count
- Stores data in `monitor-data.json`
- Updates automatically when servers join/leave
- Health check endpoint for external monitoring

## ⏰ Scheduling System

### Cron Job Management
- Per-server scheduling with individual cron jobs
- Time format conversion (user-friendly input to cron format)
- UTC timezone for consistency
- Memory management with active cron job tracking

### Supported Time Formats
- **12-hour format**: "3am", "3pm", "12am", "12pm"
- **24-hour format**: "15:00", "00:30", "23:59"
- **Mixed format**: "3:30pm", "11:45am"

## 🛡️ Error Handling & Recovery

### Error Classification
- **Discord API Errors**: Rate limits, permission errors, network issues
- **Reddit API Errors**: Authentication, rate limits, content issues
- **Configuration Errors**: File corruption, invalid data, missing files
- **System Errors**: Memory issues, process crashes, startup failures

### Error Recovery
- **Retry Logic**: Automatic retry with exponential backoff
- **Graceful Degradation**: Continue operation with reduced functionality
- **Error Logging**: Comprehensive error logging for debugging
- **User Notification**: Inform users of errors when appropriate

## 🧪 Testing Framework

> **📖 Detailed Testing Information**: See [docs/TESTING.md](./docs/TESTING.md) for comprehensive testing framework documentation, coverage analysis, and test utilities.

### Overview
The bot includes a comprehensive unit testing framework built with Jest, providing automated validation of core functionality and ensuring code quality through continuous testing.

### Test Coverage
- **Current Status**: 166 passing tests (100% success rate)
- **Code Coverage**: 64.73% overall coverage
- **Components Tested**: All core services and utilities
- **Missing Coverage**: Command and handler classes need tests

### Test Categories
- **TimeUtil Tests**: Time conversion and date calculations
- **RetryUtil Tests**: Retry logic and error handling
- **ConfigService Tests**: Configuration file operations
- **EmojiService Tests**: Emoji selection and phase management
- **HealthService Tests**: Health monitoring and HTTP server
- **MessageService Tests**: Message creation and posting
- **RedditService Tests**: Reddit API integration
- **CronHandler Tests**: Scheduled message management

## 🚀 Deployment & Operations

> **📖 Detailed Deployment Information**: See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for comprehensive production deployment, monitoring, and operations guidance.

### PM2 Configuration
- Automatic restart on crashes
- 1GB memory limit with automatic restart
- Comprehensive logging to `./logs/` directory
- Automatic startup on system boot

### Production Setup
1. Clone repository and install dependencies
2. Copy `env.example` to `.env` and configure
3. Run `./deploy.sh` for deployment
4. Start with `npm start`

### Monitoring
- **Health Endpoint**: HTTP health check on configurable port
- **PM2 Monitoring**: Process management and resource monitoring
- **Log Management**: Comprehensive logging with rotation
- **Backup System**: Automatic configuration backups

## 🔧 Development & Maintenance

### Code Structure
- **Modular Architecture**: Service-based design with clear separation of concerns
- **Error Handling**: Comprehensive try-catch blocks with retry logic
- **Logging**: Consistent logging format throughout
- **Testing**: Full unit test coverage for core utilities and services

### Development Workflow
1. Run tests to ensure baseline: `npm test`
2. Check test coverage: `npm run test:coverage`
3. Make changes to code
4. Run tests again to verify no regressions
5. Add new tests for new functionality

### Performance Optimization
- **Memory Management**: 50-100MB typical usage, 1GB PM2 limit
- **API Efficiency**: Token caching, daily post caching, smart retry logic
- **System Optimization**: File descriptor limits, Node.js memory optimization

## 📚 Specialized Documentation Reference

For detailed information on specific aspects of the system, refer to these specialized documentation files:

### [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
**System Design & Structure**
- Service-oriented architecture patterns
- Component relationships and data flow
- Design patterns and principles
- Error handling strategies
- Performance considerations
- Security considerations
- Scalability roadmap

### [docs/API_REFERENCE.md](./docs/API_REFERENCE.md)
**Complete Method & Function Documentation**
- Service method signatures and parameters
- Command handler documentation
- Utility function reference
- Configuration API documentation
- Error handling reference
- Rate limit information
- Health check API

### [docs/TESTING.md](./docs/TESTING.md)
**Testing Framework & Coverage**
- Jest testing infrastructure
- Test coverage analysis (64.73% overall)
- Mock utilities and strategies
- Test categories and examples
- Quality assurance practices
- Missing test coverage areas
- Testing best practices

### [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
**Production Operations**
- Production deployment procedures
- PM2 configuration and management
- Monitoring and health checks
- Logging and debugging
- Troubleshooting guide
- Security considerations
- Backup and recovery procedures

### [README.md](./README.md)
**User-Facing Documentation**
- Quick start guide
- Bot setup instructions
- Command reference
- Self-hosting guide
- Monitoring system overview

---

This master documentation provides a comprehensive overview of the Arc Raiders Countdown Bot system, optimized for both human understanding and LLM comprehension. The logical flow from overview through implementation details ensures complete coverage while maintaining clarity and navigability.