(function() {
  var SessionManager, crypto,
    indexOf = [].indexOf;

  crypto = require('crypto');

  module.exports = SessionManager = class SessionManager {
    constructor(app) {
      this.app = app;
      this.sessions = {};
    }

    // List all existing sessions
    list() {
      return this.sessions;
    }

    // Allow creation of new session
    create(sid) {
      var session_id;
      session_id = crypto.createHash('sha1').update(sid).digest('hex');
      if (session_id in this.sessions) {
        throw 'Session already exists';
      }
      this.sessions[session_id] = {
        sockets: [sid],
        timestamp: Date.now(),
        auth: false,
        data: {}
      };
      return session_id;
    }

    // Check if session ID exists
    exists(sid) {
      if (!(sid in this.sessions)) {
        return false;
      }
      return true;
    }

    
      // Check if a socket.id exists in sessions
    check(socket_id) {
      var ref, sess, sid;
      ref = this.sessions;
      for (sid in ref) {
        sess = ref[sid];
        if (indexOf.call(sess.sockets, socket_id) >= 0) {
          return true;
        }
      }
      return false;
    }

    // Get session from socket.id
    get(socket_id) {
      var ref, sess, sid;
      ref = this.sessions;
      for (sid in ref) {
        sess = ref[sid];
        if (indexOf.call(sess.sockets, socket_id) >= 0) {
          return sid;
        }
      }
      return null;
    }

    
      // Check if a session is authentified
    is_auth(sid) {
      if (!(sid in this.sessions)) {
        throw 'Session does not exists';
      }
      return this.sessions[sid].auth;
    }

    // Authentify a session
    auth(sid, authentified) {
      if (!(sid in this.sessions)) {
        throw 'Session does not exists';
      }
      this.sessions[sid].auth = Boolean(authentified);
      return this.update(sid);
    }

    // Delete a session
    destroy(socket_id) {
      var sid;
      sid = this.get(socket_id);
      if (sid) {
        return delete this.sessions[sid];
      }
    }

    // Add socket.id in session
    add(sid, socket_id) {
      if (!(sid in this.sessions)) {
        throw 'Session does not exists';
      }
      if (indexOf.call(this.sessions[sid].sockets, socket_id) < 0) {
        this.sessions[sid].sockets.push(socket_id);
      }
      return this.update(sid);
    }

    // Update session timestamp
    update(sid) {
      if (!(sid in this.sessions)) {
        throw 'Session does not exists';
      }
      return this.sessions[sid].timestamp = Date.now();
    }

  };

}).call(this);
