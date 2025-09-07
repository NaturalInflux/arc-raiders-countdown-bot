# Arc Raiders Countdown Bot - System Architecture

> **📖 Master Documentation**: See [../SYSTEM_DOCUMENTATION.md](../SYSTEM_DOCUMENTATION.md) for complete system overview and cross-references to other documentation.

## Overview

The Arc Raiders Countdown Bot is built using a **service-oriented architecture** with clear separation of concerns. The system is designed for scalability, maintainability, and comprehensive testing.

## Architecture Principles

- **Single Responsibility**: Each service handles one specific domain
- **Dependency Injection**: Services are injected where needed
- **Error Handling**: Comprehensive error handling with retry logic
- **Testing**: Full unit test coverage for all core components
- **Configuration**: Centralized configuration management
- **Logging**: Structured logging throughout the system

## System Components

### Core Services Layer

#### ConfigService
**Purpose**: Server configuration management and persistence
**Responsibilities**:
- Load/save server configurations from JSON
- Backup management (5 most recent backups)
- Orphaned configuration cleanup
- Configuration validation

#### EmojiService
**Purpose**: Dynamic emoji selection and phase management
**Responsibilities**:
- Phase determination based on days remaining
- Emoji selection with no duplicates
- Character limit compliance
- Fallback protection

#### RedditService
**Purpose**: Reddit API integration and content fetching
**Responsibilities**:
- OAuth token management and caching
- Daily post fetching and caching
- Content filtering and validation
- Media attachment handling

#### MessageService
**Purpose**: Discord message creation and posting
**Responsibilities**:
- Countdown embed creation
- Social message integration
- Reddit content integration
- Error message posting

#### HealthService
**Purpose**: Health monitoring and HTTP server
**Responsibilities**:
- HTTP health endpoint
- Server count tracking
- Memory usage monitoring
- Graceful shutdown handling

### Command Layer

#### BaseCommand
**Purpose**: Base class for all Discord slash commands
**Features**:
- Permission validation
- Error handling
- Response formatting
- Game launch detection

#### Command Implementations
- **SetupCommand**: Channel configuration
- **TimeCommand**: Posting time configuration
- **StatusCommand**: Configuration display
- **TestCommand**: Test message posting
- **LoveCommand**: Developer appreciation

### Handler Layer

#### InteractionHandler
**Purpose**: Discord slash command routing
**Responsibilities**:
- Command registration
- Interaction routing
- Permission validation
- Error handling

#### GuildHandler
**Purpose**: Server join/leave event handling
**Responsibilities**:
- Welcome message posting
- Configuration cleanup
- Cron job management
- Server count updates

#### CronHandler
**Purpose**: Scheduled message management
**Responsibilities**:
- Cron job creation and management
- Schedule validation
- Game launch detection
- Statistics tracking

### Utility Layer

#### TimeUtil
**Purpose**: Time conversion and calculation utilities
**Functions**:
- Time string to cron format conversion
- Days remaining calculations
- Date formatting and parsing
- Time validation

#### RetryUtil
**Purpose**: Retry logic with exponential backoff
**Functions**:
- Discord API retry logic
- Reddit API retry logic
- HTTP request retry logic
- Error classification

#### Logger
**Purpose**: Structured logging utility
**Features**:
- Consistent log formatting
- Error tracking
- Debug information
- Performance monitoring

## Data Flow

### Message Posting Flow
1. **Cron Trigger**: Scheduled cron job triggers
2. **Game Launch Check**: Verify game hasn't launched
3. **Configuration Load**: Load server configuration
4. **Reddit Content**: Fetch cached Reddit post
5. **Emoji Selection**: Determine phase and select emojis
6. **Message Creation**: Build Discord embed
7. **Social Message**: Integrate custom message if available
8. **Message Posting**: Send to Discord with retry logic
9. **Error Handling**: Handle any posting errors

### Command Processing Flow
1. **Interaction Received**: Discord slash command interaction
2. **Permission Check**: Validate user permissions
3. **Command Routing**: Route to appropriate command handler
4. **Parameter Validation**: Validate command parameters
5. **Business Logic**: Execute command-specific logic
6. **Response Generation**: Create response embed
7. **Response Sending**: Send response to user

### Configuration Management Flow
1. **Configuration Request**: User requests configuration change
2. **Validation**: Validate new configuration
3. **Backup Creation**: Create timestamped backup
4. **Configuration Update**: Update configuration file
5. **Cron Job Update**: Update associated cron job
6. **Response**: Confirm configuration change

## Design Patterns

### Service Pattern
- **Implementation**: Each service is a class with specific responsibilities
- **Benefits**: Clear separation of concerns, testability, maintainability
- **Usage**: Services are instantiated and injected where needed

### Command Pattern
- **Implementation**: Each Discord command is a separate class extending BaseCommand
- **Benefits**: Consistent command handling, easy to add new commands
- **Usage**: Commands are registered and routed through InteractionHandler

### Retry Pattern
- **Implementation**: Exponential backoff with configurable retry attempts
- **Benefits**: Resilience to temporary failures, API rate limit handling
- **Usage**: Applied to Discord API calls, Reddit API calls, HTTP requests

### Observer Pattern
- **Implementation**: Event handlers for Discord events
- **Benefits**: Loose coupling, easy to add new event handlers
- **Usage**: Guild join/leave events, interaction events

## Error Handling Strategy

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

## Performance Considerations

### Memory Management
- **Typical Usage**: 50-100MB under normal operation
- **Peak Usage**: Up to 200MB during Reddit API calls
- **PM2 Limit**: 1GB with automatic restart
- **Caching**: Emoji arrays loaded once, Reddit posts cached daily

### API Efficiency
- **Token Caching**: Reddit tokens cached for 45 minutes
- **Daily Caching**: Reddit posts fetched once per day for all servers
- **Request Timeouts**: 10-second timeout for all API requests
- **Rate Limit Handling**: Smart retry with exponential backoff

## Security Considerations

### Token Management
- **Environment Variables**: All sensitive data in .env file
- **File Exclusions**: .env and server-config.json excluded from version control
- **Reddit Credentials**: Stored securely, not logged
- **Discord Token**: Bot token in environment variables

### Permission System
- **Discord Permissions**: Require Manage Guild or Administrator
- **Channel Access**: Validate channel exists and is accessible
- **Command Restrictions**: Commands restricted to authorized users
- **Error Handling**: Graceful handling of permission errors

## Scalability Considerations

### Current Limitations
- **JSON Storage**: File-based configuration storage
- **Single Process**: Single Node.js process
- **Memory Limits**: PM2 memory limit of 1GB

### Future Scalability
- **Database Migration**: Move from JSON to database storage
- **Load Balancing**: Multiple bot instances for large servers
- **Redis Caching**: Distributed caching layer
- **Microservices**: Split into multiple services

## Testing Architecture

### Test Structure
- **Unit Tests**: Individual component testing
- **Mock Utilities**: Comprehensive mocking framework
- **Test Coverage**: 64.73% overall coverage
- **Test Categories**: Services, utilities, handlers, commands

### Testing Strategy
- **Service Testing**: All services have comprehensive unit tests
- **Utility Testing**: Core utilities fully tested
- **Mock Testing**: Discord API, Reddit API, file system mocking
- **Error Testing**: Error scenarios and edge cases

## Monitoring and Observability

### Health Monitoring
- **HTTP Endpoint**: Health check endpoint on configurable port
- **Metrics**: Server count, memory usage, uptime
- **Logging**: Structured logging with error tracking
- **Monitoring Data**: Persistent monitoring data storage

### Alerting
- **PM2 Monitoring**: Process monitoring and restart
- **Health Checks**: External health check capability
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: Memory and performance tracking

## Configuration Management

### Configuration Types
- **Environment Variables**: Bot tokens, API credentials, settings
- **Server Configuration**: Per-server settings in JSON
- **Application Constants**: Centralized constants and settings
- **Emoji Configuration**: Phase-based emoji definitions

### Configuration Validation
- **Startup Validation**: Validate required environment variables
- **Runtime Validation**: Validate configuration changes
- **Error Handling**: Handle corrupted or invalid configurations
- **Backup System**: Automatic configuration backups

## Deployment Architecture

### Process Management
- **PM2**: Process management with automatic restart
- **Memory Limits**: 1GB memory limit with restart
- **Logging**: Comprehensive logging to files
- **Startup**: Automatic startup on system boot

### Deployment Strategy
- **Git-based**: Git pull for updates
- **Zero-downtime**: PM2 restart for updates
- **Rollback**: Configuration backups for rollback
- **Monitoring**: Health checks and monitoring

## Future Architecture Considerations

### Planned Improvements
- **Database Integration**: Move from JSON to database
- **API Layer**: REST API for external integrations
- **Web Dashboard**: Web interface for configuration
- **Analytics**: Usage analytics and reporting

### Scalability Roadmap
- **Microservices**: Split into multiple services
- **Load Balancing**: Multiple bot instances
- **Caching Layer**: Redis for distributed caching
- **Message Queue**: Queue system for message processing

---

This architecture document provides a comprehensive overview of the system design, patterns, and considerations for the Arc Raiders Countdown Bot. It serves as a reference for understanding the system structure and making informed decisions about future development.
