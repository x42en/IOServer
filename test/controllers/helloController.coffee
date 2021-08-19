module.exports = class HelloController

    constructor: (@app) ->

    _isAuthentified: (req, reply, next) ->
        if not req.headers['x-authentication']?
            return reply.forbidden()
        
        next()
    
    world: (req, reply) ->
        return { message: "Hello world" }
    
    display: (req, reply) ->
        return { message: "Hello #{req.params.message}" }
    
    restricted: (req, reply) ->
        return { message: "Welcome on Private Area" }