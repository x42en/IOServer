import { BaseService } from "../../../src";

interface User {
  id: string;
  username: string;
  room: string;
  joinedAt: Date;
}

interface Message {
  id: string;
  username: string;
  room: string;
  content: string;
  timestamp: Date;
  type: "message" | "system";
}

export class ChatService extends BaseService {
  private static readonly MAX_MESSAGES_PER_ROOM = 1000;
  private static readonly MAX_ROOMS = 100;
  private static readonly MAX_USERNAME_LENGTH = 20;
  private static readonly MAX_ROOM_LENGTH = 32;
  private static readonly MAX_MESSAGE_LENGTH = 2000;

  private users: Map<string, User> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private messageHistory: Map<string, Message[]> = new Map();
  private usernames: Set<string> = new Set();

  constructor(appHandle: any) {
    super(appHandle);
    // Initialize default room
    this.rooms.set("general", new Set());
    this.messageHistory.set("general", []);
  }

  async login(
    socket: any,
    data: { username?: unknown },
    callback?: (response: any) => void
  ): Promise<void> {
    const username = data?.username;

    if (typeof username !== "string" || username.trim().length === 0) {
      const error = { status: "error", message: "Username is required" };
      if (callback) callback(error);
      else socket.emit("login_error", error);
      return;
    }

    const cleanUsername = username.trim();

    if (cleanUsername.length > ChatService.MAX_USERNAME_LENGTH) {
      const error = { status: "error", message: "Username is too long" };
      if (callback) callback(error);
      else socket.emit("login_error", error);
      return;
    }

    // Check if username is already taken
    if (this.usernames.has(cleanUsername.toLowerCase())) {
      const error = { status: "error", message: "Username already taken" };
      if (callback) callback(error);
      else socket.emit("login_error", error);
      return;
    }

    // Create user and add to default room
    const user: User = {
      id: socket.id,
      username: cleanUsername,
      room: "general",
      joinedAt: new Date(),
    };

    this.users.set(socket.id, user);
    this.usernames.add(cleanUsername.toLowerCase());

    // Join default room
    await socket.join("general");
    this.rooms.get("general")?.add(socket.id);

    // Send system message to room
    const systemMessage: Message = {
      id: Date.now().toString(),
      username: "System",
      room: "general",
      content: `${cleanUsername} joined the chat`,
      timestamp: new Date(),
      type: "system",
    };

    this._recordMessage("general", systemMessage);

    // Notify room about new user
    socket.to("general").emit("user_joined", {
      username: cleanUsername,
      message: systemMessage,
    });

    // Send success response with room info
    const response = {
      status: "success",
      user: { username: cleanUsername, room: "general" },
      roomUsers: this._getRoomUsers("general"),
      recentMessages: this._getRecentMessages("general"),
      availableRooms: this._getAvailableRooms(),
    };

    if (callback) callback(response);
    else socket.emit("login_success", response);

    this.appHandle.log(6, `User ${cleanUsername} logged in`);
  }

  async send_message(
    socket: any,
    data: { content?: unknown },
    callback?: (response: any) => void
  ): Promise<void> {
    const user = this.users.get(socket.id);

    if (!user) {
      const error = { status: "error", message: "User not logged in" };
      if (callback) callback(error);
      return;
    }

    const content = data?.content;

    if (typeof content !== "string" || content.trim().length === 0) {
      const error = { status: "error", message: "Message cannot be empty" };
      if (callback) callback(error);
      return;
    }

    const cleanContent = content.trim();

    if (cleanContent.length > ChatService.MAX_MESSAGE_LENGTH) {
      const error = { status: "error", message: "Message is too long" };
      if (callback) callback(error);
      return;
    }

    const message: Message = {
      id: Date.now().toString(),
      username: user.username,
      room: user.room,
      content: cleanContent,
      timestamp: new Date(),
      type: "message",
    };

    // Store message in history
    this._recordMessage(user.room, message);

    // Broadcast to room (including sender)
    this.appHandle.send({
      namespace: "chat",
      event: "new_message",
      data: message,
      room: user.room,
    });

    if (callback) callback({ status: "success" });
    this.appHandle.log(6, `Message sent by ${user.username} in ${user.room}`);
  }

  async join_room(
    socket: any,
    data: { room?: unknown },
    callback?: (response: any) => void
  ): Promise<void> {
    const user = this.users.get(socket.id);

    if (!user) {
      const error = { status: "error", message: "User not logged in" };
      if (callback) callback(error);
      return;
    }

    const room = data?.room;

    if (typeof room !== "string" || room.trim().length === 0) {
      const error = { status: "error", message: "Room name is required" };
      if (callback) callback(error);
      return;
    }

    const cleanRoom = room.trim().toLowerCase();

    if (cleanRoom.length > ChatService.MAX_ROOM_LENGTH) {
      const error = { status: "error", message: "Room name is too long" };
      if (callback) callback(error);
      return;
    }

    if (
      !this.rooms.has(cleanRoom) &&
      this.rooms.size >= ChatService.MAX_ROOMS
    ) {
      const error = {
        status: "error",
        message: "Too many rooms, try another name",
      };
      if (callback) callback(error);
      return;
    }

    const oldRoom = user.room;

    // Leave old room
    await socket.leave(oldRoom);
    this.rooms.get(oldRoom)?.delete(socket.id);

    // Join new room
    await socket.join(cleanRoom);
    if (!this.rooms.has(cleanRoom)) {
      this.rooms.set(cleanRoom, new Set());
      this.messageHistory.set(cleanRoom, []);
    }
    this.rooms.get(cleanRoom)?.add(socket.id);

    // Update user's room
    user.room = cleanRoom;

    // Send system messages
    const leftMessage: Message = {
      id: Date.now().toString(),
      username: "System",
      room: oldRoom,
      content: `${user.username} left the room`,
      timestamp: new Date(),
      type: "system",
    };

    const joinedMessage: Message = {
      id: (Date.now() + 1).toString(),
      username: "System",
      room: cleanRoom,
      content: `${user.username} joined the room`,
      timestamp: new Date(),
      type: "system",
    };

    this._recordMessage(oldRoom, leftMessage);
    this._recordMessage(cleanRoom, joinedMessage);

    // Notify old room
    socket.to(oldRoom).emit("user_left", {
      username: user.username,
      message: leftMessage,
      roomUsers: this._getRoomUsers(oldRoom),
    });

    // Notify new room
    socket.to(cleanRoom).emit("user_joined", {
      username: user.username,
      message: joinedMessage,
      roomUsers: this._getRoomUsers(cleanRoom),
    });

    // Send success response
    const response = {
      status: "success",
      room: cleanRoom,
      roomUsers: this._getRoomUsers(cleanRoom),
      recentMessages: this._getRecentMessages(cleanRoom),
    };

    if (callback) callback(response);
    this.appHandle.log(6, `User ${user.username} joined room ${cleanRoom}`);
  }

  async get_room_users(
    socket: any,
    data: any,
    callback?: (response: any) => void
  ): Promise<void> {
    const user = this.users.get(socket.id);

    if (!user) {
      const error = { status: "error", message: "User not logged in" };
      if (callback) callback(error);
      return;
    }

    const roomUsers = this._getRoomUsers(user.room);

    if (callback) callback({ status: "success", users: roomUsers });
    else socket.emit("room_users", { users: roomUsers });
  }

  async get_available_rooms(
    socket: any,
    data: any,
    callback?: (response: any) => void
  ): Promise<void> {
    const availableRooms = this._getAvailableRooms();

    if (callback) callback({ status: "success", rooms: availableRooms });
    else socket.emit("available_rooms", { rooms: availableRooms });
  }

  async typing(
    socket: any,
    data: { isTyping?: unknown },
    _callback?: (response: any) => void
  ): Promise<void> {
    const user = this.users.get(socket.id);

    if (!user) return;

    socket.to(user.room).emit("user_typing", {
      username: user.username,
      isTyping: Boolean(data?.isTyping),
    });
  }

  // Handle disconnect
  async disconnect(socket: any): Promise<void> {
    const user = this.users.get(socket.id);

    if (user) {
      // Remove from room
      this.rooms.get(user.room)?.delete(socket.id);

      // Send system message
      const systemMessage: Message = {
        id: Date.now().toString(),
        username: "System",
        room: user.room,
        content: `${user.username} left the chat`,
        timestamp: new Date(),
        type: "system",
      };

      this._recordMessage(user.room, systemMessage);

      // Notify room
      socket.to(user.room).emit("user_left", {
        username: user.username,
        message: systemMessage,
        roomUsers: this._getRoomUsers(user.room),
      });

      // Clean up
      this.users.delete(socket.id);
      this.usernames.delete(user.username.toLowerCase());

      this.appHandle.log(6, `User ${user.username} disconnected`);
    }
  }

  private _recordMessage(room: string, message: Message): void {
    const history = this.messageHistory.get(room);
    if (!history) {
      return;
    }

    history.push(message);
    if (history.length > ChatService.MAX_MESSAGES_PER_ROOM) {
      history.splice(0, history.length - ChatService.MAX_MESSAGES_PER_ROOM);
    }
  }

  private _getRoomUsers(room: string): string[] {
    const userIds = this.rooms.get(room) || new Set();
    return Array.from(userIds)
      .map((id) => this.users.get(id))
      .filter((user) => user !== undefined)
      .map((user) => user!.username);
  }

  private _getRecentMessages(room: string, limit: number = 50): Message[] {
    const messages = this.messageHistory.get(room) || [];
    return messages.slice(-limit);
  }

  private _getAvailableRooms(): Array<{ name: string; userCount: number }> {
    return Array.from(this.rooms.entries()).map(([name, users]) => ({
      name,
      userCount: users.size,
    }));
  }
}
