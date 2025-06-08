export { IOServer as default, IOServer } from "./IOServer";
export { IOServerError } from "./IOServerError";
export type {
  IOServerOptions,
  ServiceOptions,
  ControllerOptions,
  ManagerOptions,
  WatcherOptions,
  SendToOptions,
  AppHandle,
  LogLevel,
  TransportMode,
} from "./IOServer";

// Base classes for extending
export abstract class BaseService {
  protected appHandle: any;

  constructor(appHandle: any) {
    this.appHandle = appHandle;
  }
}

export abstract class BaseController {
  protected appHandle: any;

  constructor(appHandle: any) {
    this.appHandle = appHandle;
  }
}

export abstract class BaseManager {
  protected appHandle: any;

  constructor(appHandle: any) {
    this.appHandle = appHandle;
  }
}

export abstract class BaseWatcher {
  protected appHandle: any;

  constructor(appHandle: any) {
    this.appHandle = appHandle;
  }

  abstract watch(): Promise<void>;
}

export abstract class BaseMiddleware {
  abstract handle(appHandle: any): (req: any, reply: any, done: any) => void;
}
