import { BaseManager } from "../../../src";

interface UserStats {
  totalUsers: number;
  activeRooms: number;
  messagesCount: number;
  peakConcurrentUsers: number;
}

export class StatsManager extends BaseManager {
  private stats: UserStats = {
    totalUsers: 0,
    activeRooms: 0,
    messagesCount: 0,
    peakConcurrentUsers: 0,
  };

  private startTime: Date;

  constructor(appHandle: any) {
    super(appHandle);
    this.startTime = new Date();
  }

  incrementUsers(): void {
    this.stats.totalUsers++;
    this.updatePeakUsers();
    this.appHandle.log(
      6,
      `Total users incremented to ${this.stats.totalUsers}`
    );
  }

  decrementUsers(): void {
    if (this.stats.totalUsers > 0) {
      this.stats.totalUsers--;
    }
    this.appHandle.log(
      6,
      `Total users decremented to ${this.stats.totalUsers}`
    );
  }

  setActiveRooms(count: number): void {
    this.stats.activeRooms = count;
  }

  incrementMessages(): void {
    this.stats.messagesCount++;
  }

  private updatePeakUsers(): void {
    if (this.stats.totalUsers > this.stats.peakConcurrentUsers) {
      this.stats.peakConcurrentUsers = this.stats.totalUsers;
    }
  }

  getStats(): UserStats & { uptime: string } {
    const uptime = this.getUptime();
    return {
      ...this.stats,
      uptime,
    };
  }

  private getUptime(): string {
    const now = new Date();
    const diffMs = now.getTime() - this.startTime.getTime();

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  }

  reset(): void {
    this.stats = {
      totalUsers: 0,
      activeRooms: 0,
      messagesCount: 0,
      peakConcurrentUsers: 0,
    };
    this.startTime = new Date();
    this.appHandle.log(6, "Stats reset");
  }
}
