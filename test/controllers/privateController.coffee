module.exports = class PrivateController

    constructor: (@app) ->

    restricted: (req, reply) ->
        return { message: "Welcome on Private Area" }