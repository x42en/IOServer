module.exports = class SessionWatcher

    constructor: (@app) ->
        @_forget = 3600

    # Process to timeout sessions, default forget of 1hour
    watch: ->
        @app.log 7, "[*] Watching for expired sessions..."
        # Convert seconds to milliseconds
        forget = Number(@_forget * 1000)
        # Run every seconds
        setInterval () =>
            @app.log 7, "[*] Clean old sessions"
            now = Date.now()

            sessions = @app.sessions.list()
            for sid, sess of sessions
                # If session as expired
                if (sess.timestamp + forget) < now
                    @app.log 4, "[!] Session #{sid} as expired..."
                    @app.sessions.destroy sid
        , 1000