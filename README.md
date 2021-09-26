# IOServer

[![NPM](https://nodei.co/npm/ioserver.png?compact=true)](https://nodei.co/npm/ioserver/)

[![Downloads per month](https://img.shields.io/npm/dm/ioserver.svg?maxAge=2592000)](https://www.npmjs.org/package/ioserver)
[![npm version](https://img.shields.io/npm/v/ioserver.svg)](https://www.npmjs.org/package/ioserver)
[![Build Status](https://travis-ci.org/x42en/IOServer.svg?branch=master)](https://travis-ci.org/x42en/IOServer)
[![Known Vulnerabilities](https://snyk.io/test/github/x42en/ioserver/badge.svg)](https://snyk.io/test/github/x42en/ioserver)


Damn simple way to setup your [Socket.io](http://socket.io) server using coffeescript or vanilla JS.

This will launch a server on hots:port specified (default: localhost:8080) and will register all method of the class set as service, except ones starting by '_' (underscore). The web server is based on [Fastify](https://fastify.io/) so you can even add REST routes and interact with your socket.io rooms and namespaces.  
  
The socket.io's registrated methods will then be accessible as standard client-side socket.io event:
```coffeescript
  socket.emit 'method_name', data
```

**Warning: Version 1.2.x removed embedded HTTP(S) server and then changed constructor arguments !!**  

**Warning: Version 1.1.x changed 'interact' method to 'sendTo', and rename its arguments:**  
**- service -> namespace**  
**- method -> event**  

## Install

Install with npm:
  ```bash
    npm install ioserver
  ```
  
## Basic Usage

Require the module:
  ```coffeescript
    IOServer = require 'ioserver'

    app = new IOServer
          verbose: true
  ```

Add manager using:
  ```coffeescript
    app.addManager
      name:      'manager_name'
      manager:   ManagerClass
  ```

Add services using:
  ```coffeescript
    app.addService
      name:      'service_name'
      service:   ServiceClass
  ```

Add watchers using:
  ```coffeescript
    app.addWatcher
      name:      'watcher_name'
      watcher:   WatcherClass
  ```

Add controller using:
  ```coffeescript
    app.addController
      name:      'controller_name'
      controller:   ControllerClass
  ```

Start the server...
  ```coffeescript
    app.start()
  ```


## Extended usage

You can add services with Middlewares:
  ```coffeescript
    app.addService
      name:      'service_name'
      service:   ServiceClass
      middlewares: [
        AccessMiddleware
      ]
  ```
Middlewares are invoked at the socket connection to namespaces, they are usually used for restricting access, validate connection method and parameters.  

You can send event from external process
  ```coffeescript
    app.sendTo
      event:   'event name'
      data:     data
  ```

to specific namespace ...
  ```coffeescript
    app.sendTo
      namespace: '/namespace'
      event:     'event name'
      data:      data
  ```

... or specific room
  ```coffeescript
    app.sendTo
      namespace: '/namespace'
      room:      'room_name'
      event:     'event name'
      data:      data
  ```
and even specific socket.id
  ```coffeescript
    app.sendTo
      namespace: '/namespace'
      sid:       socket.id
      event:     'event name'
      data:      data
  ```

You can add controller with Middlewares and routes prefix:
  ```coffeescript
    app.addController
      name:      'controller_name'
      prefix: '/my_prefix/'
      controller:   ControllerClass
      middlewares: [
        RESTMiddleware
      ]
  ```

You cann add watchers class that will be launched at start using watch() method
  ```coffeescript
    app.addWatcher
      name:      'watcher_name'
      watcher:   WatcherClass
  ```

In order to meet the fastify requirements, some pre-requised are needed to setup REST endpoints.
1. First your JS class will define your accessible controller's methods
  ```coffeescript
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
  ```

2. Then setup a routes description file (by default it will be looked-up into a `routes/${controller_name}.json` directory at root level of your project). *You can use different location by specifying `routes` options on IOServer instanciation (see unit-tests for examples).*
  ```json
  [
    {
      "method": "GET",
      "url": "/",
      "handler": "world"
    },
    {
      "method": "GET",
      "url": "/:message",
      "handler": "display"
    },
    {
      "method": "GET",
      "url": "/private/",
      "handler": "restricted",
      "preValidation": "_isAuthentified"
    }
  ]
  ```
**All routes options from [fastify](https://www.fastify.io/docs/latest/Routes/#full-declaration) are supported**


Common options are:
  ```coffeescript
    app = require 'ioserver'
      port:     8443                         # change listening port
      host:     '192.168.1.10'               # change listening host
      mode:     ['websocket']                # Set socket.io client
                                             # transport modes
                                             # default is:
                                             #  ['websocket','polling']
                                             # available methods are:
                                             #  ['websocket','htmlfile','polling','jsonp-polling']
      verbose:  'DEBUG'                      # set verbosity level
      cookies: false                         # Enable cookie usage for
                                             # Socket.io v3

      cors: {                                # Set up CORS as requested
        origin: 'http://mydomain.com'        # in Socket.io v3
        methods: ['GET','POST']
      }
  ```

## Example

1. Write a simple class (singleChat.coffee)
  ```coffeescript
    module.exports = class SingleChat
      
      constructor: (@app) ->
      
      replay: (socket, text) ->
        console.log "Someone say: #{text}."
        socket.broadcast.emit 'message', text

      # Synchronous event are supported
      sync_replay: (socket, text, callback) ->
        console.log "Someone say: #{text}."
        callback text

      # All methods starting with '_' are meant private
      # and will not be published
      _notAccessible: (socket) ->
        console.error "You should not be here !!"
  ```

2. Start server-side ioserver process (server.coffee)
  ```coffeescript
    IOServer      = require 'ioserver'
    ChatService = require './singleChat'

    app = new IOServer()

    app.addService
      name:  'chat'
      service:   ChatService

    app.start()
  ```

3. Compile and run server
  ```bash
    coffee -c *.coffee
    node server.js
  ```

4. Write simple client wich interact with server class method as socket.io events
  ```coffeescript
    $           = require 'jquery'
    io          = require 'socket.io-client'
    NODE_SERVER = 'Your-server-ip'
    NODE_PORT   = 'Your-server-port' # Default 8080

    socket = io.connect "http://#{NODE_SERVER}:#{NODE_PORT}/chat"
    
    # When server emit action
    socket.on 'message', msg, ->
      $('.message_list').append "<div class='message'>#{msg}</div>"

    # Jquery client action
    $('button.send').on 'click', ->
      msg = $('input[name="message"]').val()
      socket.emit 'replay', msg
    
    # You can also use callback for synchronous actions
    $('button.send').on 'click', ->
      msg = $('input[name="message"]').val()
      socket.emit 'sync_replay', msg, (data) ->
        $('.message_list').append "<div class='message'>#{data}</div>"

  ```
For further case study you can also check de demo Chat application...  
(link provided in few ~~days~~ weeks ;) )

## Developers

If you want to contribute to this project you are more than welcome !  

### Run tests
```bash
npm test
```

**Please use Coffeescript for development language**  

### Compilation

Use coffeescript to compile your tests
```bash
coffee --no-header -wc ./test
```

Use coffeescript to compile your changes in IOServer
```bash
npm run build
```

### Publish

The NPM publishing is automated, just commit (or better merge) into master with comment 'Release v1.0.x' in order to publish corresponding package in NPM.

### Bump version

```sh
npm --no-git-tag-version version [<newversion> | major | minor | patch]
```

## TODO
* [ ] write better doc
* [ ] publish chat demo example
* [x] improve unit tests for complete coverage (restricted method)
* [x] Add REST API support
