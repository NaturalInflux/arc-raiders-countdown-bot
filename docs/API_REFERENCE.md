# Arc Raiders Countdown Bot - API Reference

> **📖 Master Documentation**: See [../SYSTEM_DOCUMENTATION.md](../SYSTEM_DOCUMENTATION.md) for complete system overview and cross-references to other documentation.

## Overview

This document provides a comprehensive reference for all methods, functions, and APIs available in the Arc Raiders Countdown Bot system. Each entry includes function signatures, parameters, return values, and usage examples.

## Service APIs

### ConfigService

#### `loadServerConfigs()`
**Purpose**: Load server configurations from JSON file
**Returns**: `Object` - Server configurations object
**Throws**: `Error` - If file read fails or JSON is invalid
**Example**:
```javascript
const configs = configService.loadServerConfigs();
console.log(configs.servers);
```

#### `saveServerConfigs(configs)`
**Purpose**: Save server configurations with automatic backup
**Parameters**:
- `configs` (Object): Server configurations to save
**Returns**: `void`
**Throws**: `Error` - If file write fails
**Example**:
```javascript
configService.saveServerConfigs({
  servers: {
    "123456789": {
      channelId: "987654321",
      channelName: "countdown",
      postTime: "12:00"
    }
  }
});
```

#### `getServerConfig(guildId)`
**Purpose**: Get server configuration with defaults
**Parameters**:
- `guildId` (string): Discord guild ID
**Returns**: `Object` - Server configuration with defaults
**Example**:
```javascript
const config = configService.getServerConfig("123456789");
// Returns: { channelId: null, channelName: null, postTime: "12:00" }
```

#### `updateServerConfig(guildId, updates)`
**Purpose**: Update specific server configuration
**Parameters**:
- `guildId` (string): Discord guild ID
- `updates` (Object): Configuration updates
**Returns**: `Object` - Updated configuration
**Example**:
```javascript
const updated = configService.updateServerConfig("123456789", {
  channelId: "987654321",
  channelName: "countdown"
});
```

#### `removeServerConfig(guildId)`
**Purpose**: Remove server configuration and cleanup
**Parameters**:
- `guildId` (string): Discord guild ID
**Returns**: `void`
**Example**:
```javascript
configService.removeServerConfig("123456789");
```

#### `cleanupOrphanedConfigs()`
**Purpose**: Clean up configurations for removed servers
**Returns**: `void`
**Example**:
```javascript
configService.cleanupOrphanedConfigs();
```

### EmojiService

#### `getCustomEmoji(daysRemaining)`
**Purpose**: Get emojis based on days remaining
**Parameters**:
- `daysRemaining` (number): Days until release
**Returns**: `Array<string>` - Array of emoji strings
**Example**:
```javascript
const emojis = emojiService.getCustomEmoji(25);
// Returns: ["<:emoji1:123>", "<:emoji2:456>"]
```

#### `getEmojiPlacement(daysRemaining)`
**Purpose**: Get emoji placement in embed title
**Parameters**:
- `daysRemaining` (number): Days until release
**Returns**: `string` - Emoji placement string
**Example**:
```javascript
const placement = emojiService.getEmojiPlacement(25);
// Returns: "🎮 25 days until Arc Raiders launches! 🎮"
```

### RedditService

#### `getRedditAccessToken()`
**Purpose**: Get OAuth access token for Reddit API
**Returns**: `Promise<string>` - Access token
**Throws**: `Error` - If authentication fails
**Example**:
```javascript
const token = await redditService.getRedditAccessToken();
```

#### `getCachedRedditPost()`
**Purpose**: Get cached Reddit post (daily)
**Returns**: `Promise<Object|null>` - Cached post or null
**Example**:
```javascript
const post = await redditService.getCachedRedditPost();
if (post) {
  console.log(post.title);
}
```

#### `getTopArcRaidersPost(retries = 3)`
**Purpose**: Fetch top post from r/arcraiders with media
**Parameters**:
- `retries` (number): Number of retry attempts
**Returns**: `Promise<Object|null>` - Post object or null
**Example**:
```javascript
const post = await redditService.getTopArcRaidersPost(3);
if (post) {
  console.log(`Title: ${post.title}`);
  console.log(`Media: ${post.mediaUrl}`);
}
```

### MessageService

#### `postCountdownMessage(guildId)`
**Purpose**: Post countdown message to server
**Parameters**:
- `guildId` (string): Discord guild ID
**Returns**: `Promise<void>`
**Throws**: `Error` - If posting fails
**Example**:
```javascript
await messageService.postCountdownMessage("123456789");
```

#### `postTestCountdownMessage(guildId, testPhase)`
**Purpose**: Post test countdown message
**Parameters**:
- `guildId` (string): Discord guild ID
- `testPhase` (string): Test phase to use
**Returns**: `Promise<void>`
**Example**:
```javascript
await messageService.postTestCountdownMessage("123456789", "final_week");
```

#### `sendMessageWithRetry(channel, messageOptions, maxRetries = 3)`
**Purpose**: Send Discord message with retry logic
**Parameters**:
- `channel` (Discord.Channel): Discord channel
- `messageOptions` (Object): Message options
- `maxRetries` (number): Maximum retry attempts
**Returns**: `Promise<Discord.Message>`
**Example**:
```javascript
const message = await messageService.sendMessageWithRetry(
  channel,
  { embeds: [embed] },
  3
);
```

### HealthService

#### `startHealthServer(port = 3000)`
**Purpose**: Start HTTP health check server
**Parameters**:
- `port` (number): Port to listen on
**Returns**: `void`
**Example**:
```javascript
healthService.startHealthServer(3000);
```

#### `updateServerCount(count)`
**Purpose**: Update server count in monitoring data
**Parameters**:
- `count` (number): Current server count
**Returns**: `void`
**Example**:
```javascript
healthService.updateServerCount(5);
```

#### `getHealthData()`
**Purpose**: Get current health data
**Returns**: `Object` - Health data object
**Example**:
```javascript
const health = healthService.getHealthData();
console.log(health.uptime, health.servers);
```

## Utility Functions

### TimeUtil

#### `timeToCron(timeInput)`
**Purpose**: Convert time string to cron format
**Parameters**:
- `timeInput` (string): Time in various formats
**Returns**: `string` - Cron format string
**Example**:
```javascript
const cron = timeToCron("3pm");
// Returns: "0 15 * * *"
```

#### `getDaysRemaining(releaseDate)`
**Purpose**: Calculate days until release
**Parameters**:
- `releaseDate` (Date): Release date
**Returns**: `number` - Days remaining
**Example**:
```javascript
const days = getDaysRemaining(new Date("2025-10-30"));
// Returns: 25
```

#### `formatDate(date, locale = "en-US")`
**Purpose**: Format date for display
**Parameters**:
- `date` (Date): Date to format
- `locale` (string): Locale for formatting
**Returns**: `string` - Formatted date string
**Example**:
```javascript
const formatted = formatDate(new Date(), "en-US");
// Returns: "1/6/2025"
```

#### `parseTime(timeString)`
**Purpose**: Parse and validate time input
**Parameters**:
- `timeString` (string): Time string to parse
**Returns**: `Object` - Parsed time object
**Example**:
```javascript
const parsed = parseTime("3:30pm");
// Returns: { hour: 15, minute: 30, valid: true }
```

#### `validateTimeInput(timeInput)`
**Purpose**: Validate time input with helpful errors
**Parameters**:
- `timeInput` (string): Time input to validate
**Returns**: `Object` - Validation result
**Example**:
```javascript
const validation = validateTimeInput("25:00");
// Returns: { valid: false, error: "Hour must be between 0 and 23" }
```

### RetryUtil

#### `execute(fn, options)`
**Purpose**: Execute function with retry logic
**Parameters**:
- `fn` (Function): Function to execute
- `options` (Object): Retry options
**Returns**: `Promise<any>` - Function result
**Example**:
```javascript
const result = await execute(
  () => apiCall(),
  { maxRetries: 3, baseDelay: 1000 }
);
```

#### `shouldRetryDiscordError(error)`
**Purpose**: Check if Discord error should retry
**Parameters**:
- `error` (Error): Discord error
**Returns**: `boolean` - Whether to retry
**Example**:
```javascript
if (shouldRetryDiscordError(error)) {
  // Retry logic
}
```

#### `shouldRetryRedditError(error)`
**Purpose**: Check if Reddit error should retry
**Parameters**:
- `error` (Error): Reddit error
**Returns**: `boolean` - Whether to retry
**Example**:
```javascript
if (shouldRetryRedditError(error)) {
  // Retry logic
}
```

#### `sendDiscordMessage(channel, options, maxRetries = 3)`
**Purpose**: Send Discord message with retry logic
**Parameters**:
- `channel` (Discord.Channel): Discord channel
- `options` (Object): Message options
- `maxRetries` (number): Maximum retry attempts
**Returns**: `Promise<Discord.Message>`
**Example**:
```javascript
const message = await sendDiscordMessage(
  channel,
  { content: "Hello!" },
  3
);
```

#### `httpRequest(requestFn, options)`
**Purpose**: HTTP request with retry logic
**Parameters**:
- `requestFn` (Function): HTTP request function
- `options` (Object): Retry options
**Returns**: `Promise<any>` - Request result
**Example**:
```javascript
const response = await httpRequest(
  () => axios.get(url),
  { maxRetries: 3, baseDelay: 1000 }
);
```

## Command APIs

### BaseCommand

#### `execute(interaction)`
**Purpose**: Execute command (abstract method)
**Parameters**:
- `interaction` (Discord.Interaction): Discord interaction
**Returns**: `Promise<void>`
**Example**:
```javascript
class MyCommand extends BaseCommand {
  async execute(interaction) {
    // Command logic
  }
}
```

#### `validatePermissions(interaction)`
**Purpose**: Validate user permissions
**Parameters**:
- `interaction` (Discord.Interaction): Discord interaction
**Returns**: `boolean` - Whether user has permissions
**Example**:
```javascript
if (!this.validatePermissions(interaction)) {
  return interaction.reply({ content: "No permission", ephemeral: true });
}
```

### SetupCommand

#### `execute(interaction)`
**Purpose**: Set up bot for server
**Parameters**:
- `interaction` (Discord.Interaction): Discord interaction
**Returns**: `Promise<void>`
**Example**:
```javascript
// Usage: /countdown-setup channel:countdown
const command = new SetupCommand();
await command.execute(interaction);
```

### TimeCommand

#### `execute(interaction)`
**Purpose**: Update posting time
**Parameters**:
- `interaction` (Discord.Interaction): Discord interaction
**Returns**: `Promise<void>`
**Example**:
```javascript
// Usage: /countdown-time time:3pm
const command = new TimeCommand();
await command.execute(interaction);
```

### StatusCommand

#### `execute(interaction)`
**Purpose**: Show current configuration
**Parameters**:
- `interaction` (Discord.Interaction): Discord interaction
**Returns**: `Promise<void>`
**Example**:
```javascript
// Usage: /countdown-status
const command = new StatusCommand();
await command.execute(interaction);
```

### TestCommand

#### `execute(interaction)`
**Purpose**: Test countdown message posting
**Parameters**:
- `interaction` (Discord.Interaction): Discord interaction
**Returns**: `Promise<void>`
**Example**:
```javascript
// Usage: /countdown-test
const command = new TestCommand();
await command.execute(interaction);
```

### LoveCommand

#### `execute(interaction)`
**Purpose**: Show donation links
**Parameters**:
- `interaction` (Discord.Interaction): Discord interaction
**Returns**: `Promise<void>`
**Example**:
```javascript
// Usage: /countdown-love
const command = new LoveCommand();
await command.execute(interaction);
```

## Handler APIs

### InteractionHandler

#### `handleInteraction(interaction)`
**Purpose**: Handle Discord slash command interactions
**Parameters**:
- `interaction` (Discord.Interaction): Discord interaction
**Returns**: `Promise<void>`
**Example**:
```javascript
const handler = new InteractionHandler();
await handler.handleInteraction(interaction);
```

#### `registerCommands()`
**Purpose**: Register slash commands with Discord
**Returns**: `Promise<void>`
**Example**:
```javascript
const handler = new InteractionHandler();
await handler.registerCommands();
```

### GuildHandler

#### `handleGuildCreate(guild)`
**Purpose**: Handle guild join event
**Parameters**:
- `guild` (Discord.Guild): Discord guild
**Returns**: `Promise<void>`
**Example**:
```javascript
const handler = new GuildHandler();
await handler.handleGuildCreate(guild);
```

#### `handleGuildDelete(guild)`
**Purpose**: Handle guild leave event
**Parameters**:
- `guild` (Discord.Guild): Discord guild
**Returns**: `Promise<void>`
**Example**:
```javascript
const handler = new GuildHandler();
await handler.handleGuildDelete(guild);
```

### CronHandler

#### `createCronJob(guildId, postTime)`
**Purpose**: Create cron job for server
**Parameters**:
- `guildId` (string): Discord guild ID
- `postTime` (string): Posting time
**Returns**: `void`
**Example**:
```javascript
const handler = new CronHandler();
handler.createCronJob("123456789", "12:00");
```

#### `updateCronJob(guildId, postTime)`
**Purpose**: Update cron job for server
**Parameters**:
- `guildId` (string): Discord guild ID
- `postTime` (string): New posting time
**Returns**: `void`
**Example**:
```javascript
const handler = new CronHandler();
handler.updateCronJob("123456789", "15:00");
```

#### `removeCronJob(guildId)`
**Purpose**: Remove cron job for server
**Parameters**:
- `guildId` (string): Discord guild ID
**Returns**: `void`
**Example**:
```javascript
const handler = new CronHandler();
handler.removeCronJob("123456789");
```

#### `getCronJobStats()`
**Purpose**: Get cron job statistics
**Returns**: `Object` - Statistics object
**Example**:
```javascript
const stats = cronHandler.getCronJobStats();
console.log(`Active jobs: ${stats.activeJobs}`);
```

## Configuration APIs

### Environment Variables

#### Required Variables
- `DISCORD_TOKEN` (string): Discord bot token
- `RELEASE_DATE` (string): Game release date (optional, default: 2025-10-30)

#### Optional Variables
- `REDDIT_CLIENT_ID` (string): Reddit client ID
- `REDDIT_CLIENT_SECRET` (string): Reddit client secret
- `REDDIT_USERNAME` (string): Reddit username
- `REDDIT_PASSWORD` (string): Reddit password
- `HEALTH_PORT` (number): Health check port (default: 3000)

### Server Configuration Structure

```javascript
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

## Error Handling

### Error Types

#### Discord API Errors
- `50013`: Permission Denied
- `429`: Too Many Requests
- `10003`: Unknown Channel
- `50001`: Missing Access

#### Reddit API Errors
- `401`: Unauthorized
- `403`: Forbidden
- `429`: Rate Limited
- `500`: Internal Server Error

#### System Errors
- `ENOENT`: File Not Found
- `EACCES`: Permission Denied
- `EMFILE`: Too Many Open Files
- `ENOMEM`: Out of Memory

### Error Response Format

```javascript
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-06T12:00:00.000Z",
  "context": {
    "guildId": "123456789",
    "operation": "postMessage"
  }
}
```

## Rate Limits

### Discord API
- **Global Rate Limit**: 50 requests per second per bot
- **Retry After**: Respects `retry_after` header
- **Backoff Strategy**: Exponential backoff with jitter

### Reddit API
- **Rate Limit**: 60 requests per minute for OAuth applications
- **Token Caching**: 45-minute refresh cycle
- **Request Timeout**: 10 seconds

## Health Check API

### Endpoint
- **URL**: `http://localhost:3000/health`
- **Method**: GET
- **Response**: JSON

### Response Format
```javascript
{
  "status": "healthy",
  "uptime": 12345.67,
  "servers": 5,
  "activeCronJobs": 5,
  "memory": {
    "rss": 45678912,
    "heapTotal": 20971520,
    "heapUsed": 12345678,
    "external": 1234567
  },
  "timestamp": "2025-01-06T12:00:00.000Z"
}
```

---

This API reference provides comprehensive documentation for all methods, functions, and APIs available in the Arc Raiders Countdown Bot system. Each entry includes detailed information about parameters, return values, and usage examples.
