import { BaseWatcher } from "../../../src";

export class ChatWatcher extends BaseWatcher {
  private readonly CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private readonly STATS_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_MESSAGES_PER_ROOM = 1000;

  async watch(): Promise<void> {
    this.appHandle.log(6, "ChatWatcher started");

    // Start periodic cleanup
    setInterval(() => {
      this.cleanupOldMessages();
    }, this.CLEANUP_INTERVAL);

    // Start periodic stats logging
    setInterval(() => {
      this.logStats();
    }, this.STATS_INTERVAL);

    // Start health monitoring
    setInterval(() => {
      this.monitorHealth();
    }, 60000); // Every minute
  }

  private cleanupOldMessages(): void {
    this.appHandle.log(6, "Running message cleanup...");

    // This would typically clean up old messages from the chat service
    // For now, we'll just log the action
    this.appHandle.log(6, "Message cleanup completed");
  }

  private logStats(): void {
    if (this.appHandle.statsManager) {
      const stats = this.appHandle.statsManager.getStats();
      this.appHandle.log(
        6,
        `Chat Stats - Users: ${stats.totalUsers}, Rooms: ${stats.activeRooms}, Messages: ${stats.messagesCount}, Peak: ${stats.peakConcurrentUsers}, Uptime: ${stats.uptime}`
      );
    }
  }

  private monitorHealth(): void {
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    if (memUsageMB > 500) {
      // Alert if memory usage > 500MB
      this.appHandle.log(4, `High memory usage detected: ${memUsageMB}MB`);
    }

    this.appHandle.log(7, `Health check - Memory: ${memUsageMB}MB`);
  }
}
