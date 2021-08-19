(function() {
  var RestMiddleware;

  module.exports = RestMiddleware = class RestMiddleware {
    handle(app) {
      this.app = app;
      return (req, reply, next) => {
        if (req.headers['x-authentication'] == null) {
          return reply.forbidden();
        }
        return next();
      };
    }

  };

}).call(this);
