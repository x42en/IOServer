(function() {
  var AccessMiddleware;

  module.exports = AccessMiddleware = class AccessMiddleware {
    // Requested function used by IOServer
    handle(app) {
      this.app = app;
      return (socket, next) => {
        var err, sid;
        try {
          sid = socket.handshake.auth.token;
          // Add socket.id in session
          this.app.sessions.add(sid, socket.id);
          this._checkSessionAuthentified(sid);
        } catch (error) {
          err = error;
          return next(new Error(err));
        }
        return next();
      };
    }

    _checkSessionAuthentified(sid) {
      if (!this.app.sessions.is_auth(sid)) {
        throw new Error('User is not authentified');
      }
    }

  };

}).call(this);
