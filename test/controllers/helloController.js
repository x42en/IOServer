(function() {
  var HelloController;

  module.exports = HelloController = class HelloController {
    constructor(app) {
      this.app = app;
    }

    _isAuthentified(req, reply, next) {
      if (req.headers['x-authentication'] == null) {
        return reply.forbidden();
      }
      return next();
    }

    world(req, reply) {
      return {
        message: "Hello world"
      };
    }

    display(req, reply) {
      return {
        message: `Hello ${req.params.message}`
      };
    }

    restricted(req, reply) {
      return {
        message: "Welcome on Private Area"
      };
    }

  };

}).call(this);
