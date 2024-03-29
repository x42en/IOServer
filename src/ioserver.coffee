####################################################
#         IOServer - v1.5.3                        #
#                                                  #
#         Damn simple socket.io server             #
####################################################
#             -    Copyright 2023    -             #
#                                                  #
#   License: Apache v 2.0                          #
#   @Author: Ben Mz                                #
#   @Email: 0x42en (at) users.noreply.github.com   #
#                                                  #
####################################################
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Add required packages
fs       = require 'fs'
path     = require 'path'
fastify  = require 'fastify'

# Set global vars
VERSION    = '1.4.2'
PORT       = 8080
HOST       = 'localhost'
LOG_LEVEL  = ['EMERGENCY','ALERT','CRITICAL','ERROR','WARNING','NOTIFICATION','INFORMATION','DEBUG']
TRANSPORTS = ['websocket','htmlfile','xhr-polling','jsonp-polling']
RESERVED_NAMES = ['send', 'log', 'verbose']

module.exports = class IOServer
    # Define the variables used by the server
    constructor: (options = {}) ->
        # Set default options
        { verbose, host, port, cookie, mode, cors, routes } = options

        @host = if host then String(host) else HOST
        try
            @port = if port then Number(port) else PORT
            if @port <= 0
                throw new Error 'Invalid port'
            if @port > 65535
                throw new Error 'Invalid port'
        catch err
            throw new Error err
        
        _cookie = if Boolean(cookie) then Boolean(cookie) else false
        @verbose = if String(verbose).toUpperCase() in LOG_LEVEL then String(verbose).toUpperCase() else 'ERROR'
        # Does not yell if route directory does not exists... change that ?
        default_routes = path.join(process.cwd(), 'routes')
        @_routes = if fs.existsSync(routes) then String(routes) else default_routes
        
        # Process transport mode options
        _mode = []
        if mode
            if String(mode).toLowerCase() in TRANSPORTS
                _mode.push String(mode).toLowerCase()
            else if mode.constructor is Array
                for i,m of mode
                    if String(m).toLowerCase() in TRANSPORTS
                        _mode.push m
        else
            _mode.push 'websocket'
            _mode.push 'polling'
        
        # Setup CORS since necessary in socket.io v3
        _cors = if cors? and cors then cors else {}
        if not _cors.methods
            _cors.methods = ['GET','POST']
        if not _cors.origin
            _cors.origin = ["https://#{@host}","http://#{@host}"]
            
        # Setup internal lists
        @service_list = {}
        @manager_list = {}
        @method_list  = {}
        @watcher_list = {}
        
        @controller_list = {}
        @middleware_list = {}
        
        try
            # Instanciate server (needed to register controllers)
            @_webapp = fastify({
                    logger: @verbose
                    ignoreTrailingSlash: true
                    maxParamLength: 200
                    caseSensitive: true
                })
        catch err
            throw new Error "[!] Unable to instanciate server: #{err}"
        
        try
            # Register standard HTTP error shortcuts
            @_webapp.register(require('@fastify/sensible'), { errorHandler: false })
        catch err
            throw new Error "[!] Unable to register sensible plugin: #{err}"
        
        try
            # Allow developper to use throw Error directly in methods
            @_webapp.setErrorHandler (error, req, reply) ->
                # Handle IOServerError
                if (error instanceof IOServerError)
                    code = if error.getCode() < 0 then 500 else error.getCode()
                    reply.status(code).send(error)
                # Handle HTTPErrors
                else if (error.status?)
                    reply.status(error.status).send({message: error.message})
                # Handle standard Error
                else
                    reply.status(500).send(error.message)
        catch err
            throw new Error "[!] Unable to register error handler: #{err}"
        
        try
            # Register standard HTTP error shortcuts
            @_webapp.register(require('@fastify/cors'), _cors)
        catch err
            throw new Error "[!] Unable to register CORS plugin: #{err}"
        
        try
            # Register socket.io listener
            @_webapp.register( require('fastify-socket.io'), {
                transports: _mode,
                cookie: _cookie
                cors: _cors
            })
        catch err
            throw new Error "[!] Unable to register socket.io plugin: #{err}"

        # Register the global app handle
        # that will be passed to all entities
        @appHandle = {
            send: @sendTo
            log: @_logify
            verbose: @verbose
        }
    
    _logify: (level, text) ->
        current_level = LOG_LEVEL.indexOf @verbose

        if level <= current_level
            if level <= 4
                console.error text
            else
                console.log text
    
    _unique: (arr) ->
        hash = {}
        result = []

        i = 0
        l = arr.length
        while i < l
            unless hash.hasOwnProperty(arr[i])
                hash[arr[i]] = true
                result.push arr[i]
            ++i

        return result
    
    _method_exists: (klass, name) ->
        return klass[name]?
    
    _register_internal_class: (type, name, klass) ->
        if not name
            throw new Error "name is mandatory"
        if (type isnt 'service') and name.length < 2
            throw new Error "name MUST be longer than 2 characters"
        if name in RESERVED_NAMES
            throw new Error "Sorry this is a reserved name"
        
        if not (klass and klass.prototype)
            throw new Error "MUST be a function"
        
        if @["#{type}_list"][name]?
            throw new Error "Sorry this #{type} already exists"
        
        try
            # Register klass with handle reference
            @_logify 7, "[*] Register #{type} #{name}"
            @["#{type}_list"][name] = new klass(@appHandle)
        catch err
            throw new Error err

    
    addWatcher: ({name, watcher}) ->
        try
            @_register_internal_class 'watcher', name, watcher
        catch err
            throw new Error "[!] Error while instantiate #{name} watcher -> #{err}"

    addManager: ({name, manager}) ->
        try
            @_register_internal_class 'manager', name, manager
        catch err
            throw new Error "[!] Error while instantiate #{name} manager -> #{err}"

    # Allow to register easily a class to this server
    # this class will be bind to a specific namespace
    addService: ({name, service, middlewares}) ->
        # Allow global register for '/'
        if not name
            name = '/'
        try
            @_register_internal_class 'service', name, service
        catch err
            throw new Error "[!] Error while instantiate #{name} service -> #{err}"

        # list methods of object... it will be the list of io actions
        @method_list[name] = @_dumpMethods service
        # Register middlewares if necessary
        @middleware_list[name] = if middlewares then middlewares else []
    
    # Allow to register easily controllers for REST API
    # this method should be called automatically when fastify is started
    addController: ({name, controller, middlewares, prefix}) ->
        if not middlewares
            middlewares = []
        
        # Sanitize prefix
        if prefix and not prefix.startsWith('/')
            prefix = "/#{prefix}"
        
        if prefix and prefix.endsWith('/')
            prefix = prefix.slice(0, -1)
        
        try
            @_register_internal_class 'controller', name, controller
        catch err
            throw new Error "[!] Error while instantiate #{name} controller -> #{err}"
        
        if not fs.existsSync("#{@_routes}/#{name}.json")
            throw new Error "[!] Predicted routes file does not exists: #{@_routes}/#{name}.json"

        # Load defined routes
        controller_routes = require "#{@_routes}/#{name}.json"

        # Parse all routes found, and register corresponding controller method
        for entry in controller_routes

            # Auto load function or array of function for fastify routes options
            for option in ['onRequest', 'preParsing', 'preValidation', 'preHandler', 'preSerialization', 'onSend', 'onResponse', 'handler', 'errorHandler']
                # Avoid override undefined keys
                if not entry[option]?
                    continue
                # Adapt object using current controller name
                if @controller_list[name][entry[option]]?
                    entry[option] = @controller_list[name][entry[option]]
            
            # Adapt all urls if prefix is set, otherwise prefix with controller name
            entry.url = if prefix? then "#{prefix}#{entry.url}" else "/#{name}#{entry.url}"
            
            # Always setup preValidation middlewares
            if not entry.preValidation?
                entry.preValidation = []

            for middleware in middlewares
                mdwr = new middleware()
                entry.preValidation.push mdwr.handle(@appHandle)

            try
                @_logify 7, "[*] Register controller route #{entry.method} #{entry.url}"
                @_webapp.route entry
            catch err
                @_logify 3, "[!] Unable to register route entry: #{err}"

    # Get service running
    getService: (name) -> @service_list[name]

    # Launch socket IO and get ready to handle events on connection
    # Pass web server used for connections
    start: ->
        d = new Date()
        day = if d.getDate() < 10 then "0#{d.getDate()}" else d.getDate()
        month = if d.getMonth() < 10 then "0#{d.getMonth()}" else d.getMonth()
        hours = if d.getHours() < 10 then "0#{d.getHours()}" else d.getHours()
        minutes = if d.getMinutes() < 10 then "0#{d.getMinutes()}" else d.getMinutes()
        seconds = if d.getSeconds() < 10 then "0#{d.getSeconds()}" else d.getSeconds()
        @_logify 4, "################### IOServer v#{VERSION} ###################"
        @_logify 5, "################### #{day}/#{month}/#{d.getFullYear()} - #{hours}:#{minutes}:#{seconds} #########################"
        
        ns = {}

        # Register all managers
        for manager_name, manager of @manager_list
            @_logify 6, "[*] Register #{manager_name} manager"
            @appHandle[manager_name] = manager
        
        # Once webapp is ready
        @_webapp.ready (err) =>
            # Register each different services by its namespace
            for service_name of @service_list
                ns[service_name] = if service_name is '/' then @_webapp.io.of '/' else @_webapp.io.of "/#{service_name}"

                # Register middleware for namespace 
                for middleware in @middleware_list[service_name]
                    mdwr = new middleware()
                    ns[service_name].use mdwr.handle(@appHandle)

                # get ready for connection
                ns[service_name].on "connection", @_handleEvents(service_name)
                @_logify 6, "[*] service #{service_name} registered..."
        
        try
            # Start all watchers
            # Do not wait for watchers to finish...
            Promise.all Object.values(this.watcher_list).map (watcher) =>
                try
                    @_logify 6, "[*] Start watcher #{watcher.constructor.name}"
                    await watcher.watch()
                catch err
                    throw new Error "Unable to start #{watcher.constructor.name} watcher: #{err}"
        catch err
            throw new Error "[!] Error on watchers start: #{err}"
        
        try
            # Start web server
            @_logify 5, "[*] Starting server on https://#{@host}:#{@port} ..."
            await @_webapp.listen
                port: @port
                host: @host
        catch err
            @_logify 3, "[!] Unable to start server: #{err}"
        
    # Force server stop
    stop: ->
        try
            @_webapp.close () =>
                @_logify 6, "[*] Server stopped"
        catch err
            throw new Error "[!] Unable to stop server: #{err}"

    # Allow sending message from external app
    sendTo: ({namespace, event, data, room=null, sid=null}={}) =>
        if namespace?
            # Auto correct namespace
            if not namespace.startsWith('/')
                namespace = "/#{namespace}"
        
            # Search for namespace object
            ns = @_webapp.io.of(namespace)
        else
            ns = @_webapp.io.of('/')
        
        # Send event to specific sid if set
        if sid?
            ns.sockets.get(sid).emit event, data
        else
            # Restrict access to clients in room if set
            sockets = if room? then ns.in(room) else ns
            sockets.emit event, data

        return true

    # Once a client is connected, get ready to handle his events
    _handleEvents: (service_name) ->
        (socket, next) =>
            @_logify 5, "[*] received connection for service #{service_name}"
            
            # The register all user defined functions
            for index, action of @method_list[service_name]
                # does not listen for private methods
                if action.substring(0,1) is '_'
                    continue
                # do not listen for constructor method
                if action is 'constructor'
                    continue
                
                @_logify 6, "[*] method #{action} of #{service_name} listening..."
                socket.on action, @_handleCallback
                                    service: service_name
                                    method: action
                                    socket: socket

    # On a specific event call the appropriate method of object
    _handleCallback: ({service, method, socket}) ->
        return (data, callback) =>
            @_logify 6, "[*] call method #{method} of service #{service}"
            return new Promise (resolve, reject) =>
                try
                    await @service_list[service][method](socket, data, callback)
                    resolve()
                catch err
                    reject(err)
            .catch (err) =>
                if typeof err is 'string'
                    err = new IOServerError(err, -1)

                payload = { 
                    status: 'error',
                    type: err.constructor.name or 'Error',
                    message: err.message or null,
                    code: err.code or -1
                }

                @_logify 5, "Error on #{service}:#{method} execution: #{err}"
                if callback
                    callback payload
                else
                    socket.emit 'error', payload
            
    # Based on Kri-ban solution
    # http://stackoverflow.com/questions/7445726/how-to-list-methods-of-inherited-classes-in-coffeescript-or-javascript
    # Thanks ___ ;)
    _dumpMethods: (klass) ->
        result = []
        k = klass.prototype
        while k
            names = Object.getOwnPropertyNames(k)
            result = result.concat(names)
            k = Object.getPrototypeOf(k)
            break if not Object.getPrototypeOf(k) # avoid listing Object properties

        return @_unique(result).sort()

# IO Server error class
module.exports.IOServerError = class IOServerError extends Error
    constructor: (message, code = -1) ->
        super(message)
        @type = @constructor.name
        @code = code
    
    getMessage: () ->
        return @message
    
    getType: () ->
        return @type
    
    getCode: () ->
        return @code

    toJson: () ->
        return {
            message: @message
            type: @type
            code: @code
        }
