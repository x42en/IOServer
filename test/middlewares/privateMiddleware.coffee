module.exports = class AccessMiddleware
    # Requested function used by IOServer
    handle: (@app) ->
        (socket, next) =>
            try
                sid = socket.handshake.auth.token
                # Add socket.id in session
                @app.sessions.add sid, socket.id
                @_checkSessionAuthentified sid
            catch err
                return next(new Error(err))
            next()
    
    _checkSessionAuthentified: (sid) ->
        if not @app.sessions.is_auth sid
            throw new Error 'User is not authentified'
