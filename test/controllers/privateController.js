(function() {
  var PrivateController;

  module.exports = PrivateController = class PrivateController {
    constructor(app) {
      this.restricted = this.restricted.bind(this);
      this.app = app;
    }

    restricted(req, reply) {
      return {
        message: "Welcome on Private Area"
      };
    }

  };

}).call(this);
