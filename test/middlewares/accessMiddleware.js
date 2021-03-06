(function() {
  var AccessMiddleware;

  module.exports = AccessMiddleware = class AccessMiddleware {
    handle(app) {
      this.app = app;
      return (socket, next) => {
        var err;
        try {
          if (!this.app.sessions.exists(socket.id)) {
            this.app.sessions.create(socket.id);
          }
        } catch (error) {
          err = error;
          return next(new Error(err));
        }
        return next();
      };
    }

  };

}).call(this);
