crypto = require 'crypto'

module.exports = class SessionManager

    constructor: (@app) ->
        @sessions = { }

    # List all existing sessions
    list: ->
        return @sessions

    # Allow creation of new session
    create: (sid) ->
        session_id = crypto.createHash('sha1').update(sid).digest('hex')
        if session_id of @sessions
            throw 'Session already exists'
        
        @sessions[session_id] = {
            sockets: [sid]
            timestamp: Date.now()
            auth: false
            data: {}
        }

        return session_id

    # Check if session ID exists
    exists: (sid) ->
        if sid not of @sessions
            return false
        return true
    
    # Check if a socket.id exists in sessions
    check: (socket_id) ->
        for sid, sess of @sessions
            if socket_id in sess.sockets
                return true
        return false

    # Get session from socket.id
    get: (socket_id) ->
        for sid, sess of @sessions
            if socket_id in sess.sockets
                return sid
        return null
    
    # Check if a session is authentified
    is_auth: (sid) ->
        if sid not of @sessions
            throw 'Session does not exists'
        return @sessions[sid].auth

    # Authentify a session
    auth: (sid, authentified) ->
        if sid not of @sessions
            throw 'Session does not exists'
        @sessions[sid].auth = Boolean(authentified)
        @update sid

    # Delete a session
    destroy: (socket_id) ->
        sid = @get(socket_id)
        if sid
            delete @sessions[sid]

    # Add socket.id in session
    add: (sid, socket_id) ->
        if sid not of @sessions
            throw 'Session does not exists'
        if socket_id not in @sessions[sid].sockets
            @sessions[sid].sockets.push socket_id
        @update sid

    # Update session timestamp
    update: (sid) ->
        if sid not of @sessions
            throw 'Session does not exists'
        @sessions[sid].timestamp = Date.now()