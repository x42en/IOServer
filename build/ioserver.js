(function() {
  //###################################################
  //         IOServer - v1.3.3                        #
  //                                                  #
  //         Damn simple socket.io server             #
  //###################################################
  //             -    Copyright 2020    -             #
  //                                                  #
  //   License: Apache v 2.0                          #
  //   @Author: Ben Mz                                #
  //   @Email: 0x42en (at) users.noreply.github.com   #
  //                                                  #
  //###################################################

  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at

  //     http://www.apache.org/licenses/LICENSE-2.0

  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  // Add required packages
  var HOST, IOServer, IOServerError, LOG_LEVEL, PORT, RESERVED_NAMES, TRANSPORTS, VERSION, fastify, fs, path,
    indexOf = [].indexOf;

  fs = require('fs');

  path = require('path');

  fastify = require('fastify');

  // Set global vars
  VERSION = '1.3.3';

  PORT = 8080;

  HOST = 'localhost';

  LOG_LEVEL = ['EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR', 'WARNING', 'NOTIFICATION', 'INFORMATION', 'DEBUG'];

  TRANSPORTS = ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling'];

  RESERVED_NAMES = ['send', 'log', 'verbose'];

  module.exports = IOServer = class IOServer {
    // Define the variables used by the server
    constructor(options = {}) {
      var _cookie, _cors, _mode, cookie, cors, default_routes, err, host, i, m, mode, port, ref, ref1, ref2, routes, verbose;
      // Allow sending message from external app
      this.sendTo = this.sendTo.bind(this);
      // Set default options
      ({verbose, host, port, cookie, mode, cors, routes} = options);
      this.host = host ? String(host) : HOST;
      try {
        this.port = port ? Number(port) : PORT;
        if (this.port <= 0) {
          throw new Error('Invalid port');
        }
        if (this.port > 65535) {
          throw new Error('Invalid port');
        }
      } catch (error1) {
        err = error1;
        throw new Error(err);
      }
      _cookie = Boolean(cookie) ? Boolean(cookie) : false;
      this.verbose = (ref = String(verbose).toUpperCase(), indexOf.call(LOG_LEVEL, ref) >= 0) ? String(verbose).toUpperCase() : 'ERROR';
      // Does not yell if route directory does not exists... change that ?
      default_routes = path.join(process.cwd(), 'routes');
      this._routes = fs.existsSync(routes) ? String(routes) : default_routes;
      
      // Process transport mode options
      _mode = [];
      if (mode) {
        if (ref1 = String(mode).toLowerCase(), indexOf.call(TRANSPORTS, ref1) >= 0) {
          _mode.push(String(mode).toLowerCase());
        } else if (mode.constructor === Array) {
          for (i in mode) {
            m = mode[i];
            if (ref2 = String(m).toLowerCase(), indexOf.call(TRANSPORTS, ref2) >= 0) {
              _mode.push(m);
            }
          }
        }
      } else {
        _mode.push('websocket');
        _mode.push('polling');
      }
      
      // Setup CORS since necessary in socket.io v3
      _cors = (cors != null) && cors ? cors : {};
      if (!_cors.methods) {
        _cors.methods = ['GET', 'POST'];
      }
      if (!_cors.origin) {
        _cors.origin = [`https://${this.host}`, `http://${this.host}`];
      }
      
      // Setup internal lists
      this.service_list = {};
      this.manager_list = {};
      this.method_list = {};
      this.watcher_list = {};
      this.controller_list = {};
      this.middleware_list = {};
      try {
        // Instanciate server (needed to register controllers)
        this._webapp = fastify({
          logger: this.verbose,
          ignoreTrailingSlash: true,
          maxParamLength: 200,
          caseSensitive: true
        });
      } catch (error1) {
        err = error1;
        throw new Error(`[!] Unable to instanciate server: ${err}`);
      }
      try {
        // Register standard HTTP error shortcuts
        this._webapp.register(require('@fastify/sensible'), {
          errorHandler: false
        });
      } catch (error1) {
        err = error1;
        throw new Error(`[!] Unable to register sensible plugin: ${err}`);
      }
      try {
        // Allow developper to use throw Error directly in methods
        this._webapp.setErrorHandler(function(error, req, reply) {
          var code;
          // Handle IOServerError
          if (error instanceof IOServerError) {
            code = error.getCode() < 0 ? 500 : error.getCode();
            return reply.status(code).send(error);
          // Handle HTTPErrors
          } else if ((error.status != null)) {
            return reply.status(error.status).send({
              message: error.message
            });
          } else {
            // Handle standard Error
            return reply.status(500).send(error.message);
          }
        });
      } catch (error1) {
        err = error1;
        throw new Error(`[!] Unable to register error handler: ${err}`);
      }
      try {
        // Register standard HTTP error shortcuts
        this._webapp.register(require('@fastify/cors'), _cors);
      } catch (error1) {
        err = error1;
        throw new Error(`[!] Unable to register CORS plugin: ${err}`);
      }
      try {
        // Register socket.io listener
        this._webapp.register(require('fastify-socket.io'), {
          transports: _mode,
          cookie: _cookie,
          cors: _cors
        });
      } catch (error1) {
        err = error1;
        throw new Error(`[!] Unable to register socket.io plugin: ${err}`);
      }
      // Register the global app handle
      // that will be passed to all entities
      this.appHandle = {
        send: this.sendTo,
        log: this._logify,
        verbose: this.verbose
      };
    }

    _logify(level, text) {
      var current_level;
      current_level = LOG_LEVEL.indexOf(this.verbose);
      if (level <= current_level) {
        if (level <= 4) {
          return console.error(text);
        } else {
          return console.log(text);
        }
      }
    }

    _unique(arr) {
      var hash, i, l, result;
      hash = {};
      result = [];
      i = 0;
      l = arr.length;
      while (i < l) {
        if (!hash.hasOwnProperty(arr[i])) {
          hash[arr[i]] = true;
          result.push(arr[i]);
        }
        ++i;
      }
      return result;
    }

    _method_exists(klass, name) {
      return klass[name] != null;
    }

    _register_internal_class(type, name, klass) {
      var err;
      if (!name) {
        throw new Error("name is mandatory");
      }
      if ((type !== 'service') && name.length < 2) {
        throw new Error("name MUST be longer than 2 characters");
      }
      if (indexOf.call(RESERVED_NAMES, name) >= 0) {
        throw new Error("Sorry this is a reserved name");
      }
      if (!(klass && klass.prototype)) {
        throw new Error("MUST be a function");
      }
      if (this[`${type}_list`][name] != null) {
        throw new Error(`Sorry this ${type} already exists`);
      }
      try {
        // Register klass with handle reference
        this._logify(7, `[*] Register ${type} ${name}`);
        return this[`${type}_list`][name] = new klass(this.appHandle);
      } catch (error1) {
        err = error1;
        throw new Error(err);
      }
    }

    addWatcher({name, watcher}) {
      var err;
      try {
        return this._register_internal_class('watcher', name, watcher);
      } catch (error1) {
        err = error1;
        throw new Error(`[!] Error while instantiate ${name} watcher -> ${err}`);
      }
    }

    addManager({name, manager}) {
      var err;
      try {
        return this._register_internal_class('manager', name, manager);
      } catch (error1) {
        err = error1;
        throw new Error(`[!] Error while instantiate ${name} manager -> ${err}`);
      }
    }

    // Allow to register easily a class to this server
    // this class will be bind to a specific namespace
    addService({name, service, middlewares}) {
      var err;
      // Allow global register for '/'
      if (!name) {
        name = '/';
      }
      try {
        this._register_internal_class('service', name, service);
      } catch (error1) {
        err = error1;
        throw new Error(`[!] Error while instantiate ${name} service -> ${err}`);
      }
      // list methods of object... it will be the list of io actions
      this.method_list[name] = this._dumpMethods(service);
      // Register middlewares if necessary
      return this.middleware_list[name] = middlewares ? middlewares : [];
    }

    
      // Allow to register easily controllers for REST API
    // this method should be called automatically when fastify is started
    addController({name, controller, middlewares, prefix}) {
      var controller_routes, entry, err, j, len, len1, len2, mdwr, middleware, n, o, option, ref, results;
      if (!middlewares) {
        middlewares = [];
      }
      
      // Sanitize prefix
      if (prefix && !prefix.startsWith('/')) {
        prefix = `/${prefix}`;
      }
      if (prefix && prefix.endsWith('/')) {
        prefix = prefix.slice(0, -1);
      }
      try {
        this._register_internal_class('controller', name, controller);
      } catch (error1) {
        err = error1;
        throw new Error(`[!] Error while instantiate ${name} controller -> ${err}`);
      }
      if (!fs.existsSync(`${this._routes}/${name}.json`)) {
        throw new Error(`[!] Predicted routes file does not exists: ${this._routes}/${name}.json`);
      }
      // Load defined routes
      controller_routes = require(`${this._routes}/${name}.json`);
// Parse all routes found, and register corresponding controller method
      results = [];
      for (j = 0, len = controller_routes.length; j < len; j++) {
        entry = controller_routes[j];
        ref = ['onRequest', 'preParsing', 'preValidation', 'preHandler', 'preSerialization', 'onSend', 'onResponse', 'handler', 'errorHandler'];
        // Auto load function or array of function for fastify routes options
        for (n = 0, len1 = ref.length; n < len1; n++) {
          option = ref[n];
          // Avoid override undefined keys
          if (entry[option] == null) {
            continue;
          }
          // Adapt object using current controller name
          if (this.controller_list[name][entry[option]] != null) {
            entry[option] = this.controller_list[name][entry[option]];
          }
        }
        
        // Adapt all urls if prefix is set, otherwise prefix with controller name
        entry.url = prefix != null ? `${prefix}${entry.url}` : `/${name}${entry.url}`;
        
        // Always setup preValidation middlewares
        if (entry.preValidation == null) {
          entry.preValidation = [];
        }
        for (o = 0, len2 = middlewares.length; o < len2; o++) {
          middleware = middlewares[o];
          mdwr = new middleware();
          entry.preValidation.push(mdwr.handle(this.appHandle));
        }
        try {
          this._logify(7, `[*] Register controller route ${entry.method} ${entry.url}`);
          results.push(this._webapp.route(entry));
        } catch (error1) {
          err = error1;
          results.push(this._logify(3, `[!] Unable to register route entry: ${err}`));
        }
      }
      return results;
    }

    // Get service running
    getService(name) {
      return this.service_list[name];
    }

    // Launch socket IO and get ready to handle events on connection
    // Pass web server used for connections
    async start() {
      var d, day, err, hours, manager, manager_name, minutes, month, ns, ref, ref1, seconds, watcher, watcher_name;
      d = new Date();
      day = d.getDate() < 10 ? `0${d.getDate()}` : d.getDate();
      month = d.getMonth() < 10 ? `0${d.getMonth()}` : d.getMonth();
      hours = d.getHours() < 10 ? `0${d.getHours()}` : d.getHours();
      minutes = d.getMinutes() < 10 ? `0${d.getMinutes()}` : d.getMinutes();
      seconds = d.getSeconds() < 10 ? `0${d.getSeconds()}` : d.getSeconds();
      this._logify(4, `################### IOServer v${VERSION} ###################`);
      this._logify(5, `################### ${day}/${month}/${d.getFullYear()} - ${hours}:${minutes}:${seconds} #########################`);
      ns = {};
      ref = this.manager_list;
      // Register all managers
      for (manager_name in ref) {
        manager = ref[manager_name];
        this._logify(6, `[*] Register ${manager_name} manager`);
        this.appHandle[manager_name] = manager;
      }
      
      // Once webapp is ready
      this._webapp.ready((err) => {
        var j, len, mdwr, middleware, ref1, results, service_name;
// Register each different services by its namespace
        results = [];
        for (service_name in this.service_list) {
          ns[service_name] = service_name === '/' ? this._webapp.io.of('/') : this._webapp.io.of(`/${service_name}`);
          ref1 = this.middleware_list[service_name];
          // Register middleware for namespace 
          for (j = 0, len = ref1.length; j < len; j++) {
            middleware = ref1[j];
            mdwr = new middleware();
            ns[service_name].use(mdwr.handle(this.appHandle));
          }
          // get ready for connection
          ns[service_name].on("connection", this._handleEvents(service_name));
          results.push(this._logify(6, `[*] service ${service_name} registered...`));
        }
        return results;
      });
      ref1 = this.watcher_list;
      
      // Start all watchers
      for (watcher_name in ref1) {
        watcher = ref1[watcher_name];
        try {
          this._logify(6, `[*] Start watcher ${watcher_name}`);
          // Do not wait for watcher to finish...
          watcher.watch();
        } catch (error1) {
          err = error1;
          throw new Error(`Unable to start watch method of watcher ${watcher_name}: ${err}`);
        }
      }
      try {
        // Start web server
        this._logify(5, `[*] Starting server on https://${this.host}:${this.port} ...`);
        return (await this._webapp.listen({
          port: this.port,
          host: this.host
        }));
      } catch (error1) {
        err = error1;
        return this._logify(3, `[!] Unable to start server: ${err}`);
      }
    }

    
      // Force server stop
    stop() {
      var err;
      try {
        return this._webapp.close(() => {
          return this._logify(6, "[*] Server stopped");
        });
      } catch (error1) {
        err = error1;
        throw new Error(`[!] Unable to stop server: ${err}`);
      }
    }

    sendTo({namespace, event, data, room = null, sid = null} = {}) {
      var ns, sockets;
      if (namespace != null) {
        // Auto correct namespace
        if (!namespace.startsWith('/')) {
          namespace = `/${namespace}`;
        }
        
        // Search for namespace object
        ns = this._webapp.io.of(namespace);
      } else {
        ns = this._webapp.io.of('/');
      }
      
      // Send event to specific sid if set
      if (sid != null) {
        ns.sockets.get(sid).emit(event, data);
      } else {
        // Restrict access to clients in room if set
        sockets = room != null ? ns.in(room) : ns;
        sockets.emit(event, data);
      }
      return true;
    }

    // Once a client is connected, get ready to handle his events
    _handleEvents(service_name) {
      return (socket, next) => {
        var action, index, ref, results;
        this._logify(5, `[*] received connection for service ${service_name}`);
        ref = this.method_list[service_name];
        
        // The register all user defined functions
        results = [];
        for (index in ref) {
          action = ref[index];
          // does not listen for private methods
          if (action.substring(0, 1) === '_') {
            continue;
          }
          // do not listen for constructor method
          if (action === 'constructor') {
            continue;
          }
          this._logify(6, `[*] method ${action} of ${service_name} listening...`);
          results.push(socket.on(action, this._handleCallback({
            service: service_name,
            method: action,
            socket: socket
          })));
        }
        return results;
      };
    }

    // On a specific event call the appropriate method of object
    _handleCallback({service, method, socket}) {
      return (data, callback) => {
        this._logify(6, `[*] call method ${method} of service ${service}`);
        return new Promise(async(resolve, reject) => {
          var err;
          try {
            await this.service_list[service][method](socket, data, callback);
            return resolve();
          } catch (error1) {
            err = error1;
            return reject(err);
          }
        }).catch((err) => {
          var payload;
          if (typeof err === 'string') {
            err = new IOServerError(err, -1);
          }
          payload = {
            status: 'error',
            type: err.constructor.name || 'Error',
            message: err.message || null,
            code: err.code || -1
          };
          this._logify(5, `Error on ${service}:${method} execution: ${err}`);
          if (callback) {
            return callback(payload);
          } else {
            return socket.emit('error', payload);
          }
        });
      };
    }

    
      // Based on Kri-ban solution
    // http://stackoverflow.com/questions/7445726/how-to-list-methods-of-inherited-classes-in-coffeescript-or-javascript
    // Thanks ___ ;)
    _dumpMethods(klass) {
      var k, names, result;
      result = [];
      k = klass.prototype;
      while (k) {
        names = Object.getOwnPropertyNames(k);
        result = result.concat(names);
        k = Object.getPrototypeOf(k);
        if (!Object.getPrototypeOf(k)) { // avoid listing Object properties
          break;
        }
      }
      return this._unique(result).sort();
    }

  };

  // IO Server error class
  module.exports.IOServerError = IOServerError = class IOServerError extends Error {
    constructor(message, code = -1) {
      super(message);
      this.type = this.constructor.name;
      this.code = code;
    }

    getMessage() {
      return this.message;
    }

    getType() {
      return this.type;
    }

    getCode() {
      return this.code;
    }

    toJson() {
      return {
        message: this.message,
        type: this.type,
        code: this.code
      };
    }

  };

}).call(this);

//# sourceMappingURL=ioserver.js.map
