module.exports = class RestMiddleware 
    handle: (@app) ->
        (req, reply, next) =>
            if not req.headers['x-authentication']?
                return reply.forbidden()
            
            next()