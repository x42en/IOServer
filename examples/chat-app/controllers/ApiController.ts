import { BaseController } from "../../../src";

export class ApiController extends BaseController {
  async getStatus(request: any, reply: any): Promise<void> {
    reply.send({
      status: "OK",
      timestamp: new Date().toISOString(),
      service: "IOServer Chat App API",
      version: "2.0.0",
    });
  }

  async getStats(request: any, reply: any): Promise<void> {
    const statsManager = this.appHandle.statsManager;

    if (statsManager) {
      const stats = statsManager.getStats();
      reply.send({
        status: "OK",
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } else {
      reply.send({
        status: "OK",
        data: { message: "Stats manager not available" },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
