(function() {
  // During the test the env variable is set to test
  var AccessMiddleware, HOST, IOServer, IOServerError, InteractService, PORT, PrivateMiddleware, PrivateService, RegistrationService, SessionManager, StandardService, app, chai, end_point, opts, should, socketio_client;

  process.env.NODE_ENV = 'test';

  // Import required packages
  chai = require('chai');

  should = chai.should();

  socketio_client = require('socket.io-client');

  IOServer = require(`${__dirname}/../build/ioserver`);

  ({IOServerError} = require(`${__dirname}/../build/ioserver`));

  // Import Applications entities
  SessionManager = require(`${__dirname}/managers/sessionManager`);

  AccessMiddleware = require(`${__dirname}/middlewares/accessMiddleware`);

  PrivateMiddleware = require(`${__dirname}/middlewares/privateMiddleware`);

  // Import socket.io event classes
  StandardService = require(`${__dirname}/services/standardService`);

  InteractService = require(`${__dirname}/services/interactService`);

  RegistrationService = require(`${__dirname}/services/registrationService`);

  PrivateService = require(`${__dirname}/services/privateService`);

  // Setup client vars
  HOST = 'localhost';

  PORT = 8080;

  end_point = `http://${HOST}:${PORT}`;

  opts = {
    forceNew: true
  };

  // Instanciate IOServer
  app = new IOServer();

  // Add session manager used to access private namespace
  app.addManager({
    name: 'sessions',
    manager: SessionManager
  });

  // Add listening service on global namespace '/'
  app.addService({
    service: StandardService
  });

  // Add named listening service on '/interact'
  app.addService({
    name: 'interact',
    service: InteractService
  });

  // Add named listening service on '/registration'
  app.addService({
    name: 'registration',
    service: RegistrationService,
    middlewares: [AccessMiddleware]
  });

  // Add restricted service on '/private' namespace
  // Access is controlled in middleware
  app.addService({
    name: 'private',
    service: PrivateService,
    middlewares: [AccessMiddleware, PrivateMiddleware]
  });

  //##################### UNIT TESTS ##########################
  describe("IOServer simple HTTP working tests", function() {
    // Set global timeout
    this.timeout(4000);
    before(function() {
      // Start server
      console.log("Start IOServer");
      return app.start();
    });
    after(function() {
      // Stop server
      console.log("Stop IOServer");
      return app.stop();
    });
    it('Check public method', function(done) {
      var socket_client;
      socket_client = socketio_client(end_point, opts);
      socket_client.once('answer', function(data) {
        data.should.be.an('object');
        data.should.have.deep.property('status');
        data.should.have.deep.property('msg');
        data.status.should.be.equal('ok');
        data.msg.should.be.equal('Hello ABDEF!');
        socket_client.disconnect();
        return done();
      });
      return socket_client.emit('hello', 'ABDEF');
    });
    it('Check public method sync', function(done) {
      var socket_client;
      socket_client = socketio_client(end_point, opts);
      return socket_client.emit('sync_hello', 'ABDEF', function(data) {
        data.should.be.an('object');
        data.should.have.deep.property('status');
        data.should.have.deep.property('msg');
        data.status.should.be.equal('ok');
        data.msg.should.be.equal('Hello ABDEF!');
        socket_client.disconnect();
        return done();
      });
    });
    it('Check public method error', function(done) {
      var socket_client;
      socket_client = socketio_client(end_point, opts);
      socket_client.on('error', function(data) {
        data.should.be.an('object');
        data.type.should.be.equal('IOServerError');
        data.message.should.be.equal('I can not run');
        data.code.should.be.equal(-1);
        socket_client.disconnect();
        return done();
      });
      return socket_client.emit('errored');
    });
    it('Check public method error sync', function(done) {
      var socket_client;
      socket_client = socketio_client(end_point, opts);
      return socket_client.emit('errored', null, function(data) {
        data.status.should.be.equal('error');
        data.type.should.be.equal('IOServerError');
        data.message.should.be.equal('I can not run');
        data.code.should.be.equal(-1);
        socket_client.disconnect();
        return done();
      });
    });
    it('Check public method error sync with custom code', function(done) {
      var socket_client;
      socket_client = socketio_client(end_point, opts);
      return socket_client.emit('errored_typed', null, function(data) {
        data.status.should.be.equal('error');
        data.type.should.be.equal('IOServerError');
        data.message.should.be.equal('Custom error message');
        data.code.should.be.equal(3);
        socket_client.disconnect();
        return done();
      });
    });
    
    // it 'Check access forbidden method', (done) ->
    //     socket_client = socketio_client(end_point, opts)
    //     socket_client.emit '_forbidden', 'ABDEF'
    //     socket_client.once 'forbidden call', (data) ->
    //         console.error data
    //         socket_client.disconnect()
    //         done()

    //     socket_client.once 'error', (data) ->
    //         console.error data
    //         socket_client.disconnect()
    //         done()
    it('Check interact event from external source to global', function(done) {
      var socket_client;
      socket_client = socketio_client(end_point, opts);
      socket_client.once('external test', function(data) {
        data.should.be.an('object');
        data.should.have.deep.property('status');
        data.should.have.deep.property('msg');
        data.status.should.be.equal('ok');
        data.msg.should.be.equal('Sent event to global from external');
        socket_client.disconnect();
        return done();
      });
      
      // Give some times for socket to setup
      return setTimeout(function() {
        return app.sendTo({
          event: 'external test',
          data: {
            status: 'ok',
            msg: 'Sent event to global from external'
          }
        });
      }, 20);
    });
    it('Check interact event from external source to namespace', function(done) {
      var socket_client;
      socket_client = socketio_client(`${end_point}/interact`, opts);
      socket_client.once('external test', function(data) {
        data.should.be.an('object');
        data.should.have.deep.property('status');
        data.should.have.deep.property('msg');
        data.status.should.be.equal('ok');
        data.msg.should.be.equal('Sent event to /interact from external');
        socket_client.disconnect();
        return done();
      });
      
      // Give some times for socket to setup
      return setTimeout(function() {
        return app.sendTo({
          namespace: '/interact',
          event: 'external test',
          data: {
            status: 'ok',
            msg: 'Sent event to /interact from external'
          }
        });
      }, 20);
    });
    it('Check interact event from external source to socket in room', function(done) {
      var socket_client;
      socket_client = socketio_client(`${end_point}/interact`, opts);
      // Join room test
      socket_client.emit('restricted');
      socket_client.once('external test', function(data) {
        data.should.be.an('object');
        data.should.have.deep.property('status');
        data.should.have.deep.property('msg');
        data.status.should.be.equal('ok');
        data.msg.should.be.equal('Sent event to /interact room test from external');
        socket_client.disconnect();
        return done();
      });
      
      // Give some times for socket to setup
      return setTimeout(function() {
        return app.sendTo({
          namespace: '/interact',
          room: 'test',
          event: 'external test',
          data: {
            status: 'ok',
            msg: 'Sent event to /interact room test from external'
          }
        });
      }, 20);
    });
    it('Check interact event from external source to socket ID ', function(done) {
      var socket_client;
      socket_client = socketio_client(`${end_point}/interact`, opts);
      socket_client.once('external test', function(data) {
        data.should.be.an('object');
        data.should.have.deep.property('status');
        data.should.have.deep.property('msg');
        data.status.should.be.equal('ok');
        data.msg.should.be.equal('Sent event to socket.id from external');
        socket_client.disconnect();
        return done();
      });
      
      // Give some times for socket to setup
      return setTimeout(() => {
        return app.sendTo({
          namespace: '/interact',
          sid: socket_client.id,
          event: 'external test',
          data: {
            status: 'ok',
            msg: 'Sent event to socket.id from external'
          }
        });
      }, 20);
    });
    it('Check registration method', function(done) {
      var socket_client;
      socket_client = socketio_client(`${end_point}/registration`, opts);
      return socket_client.emit('register', 'ABDEF', function(data) {
        data.should.be.an('object');
        data.should.have.deep.property('status');
        data.should.have.deep.property('msg');
        data.should.have.deep.property('sessid');
        data.status.should.be.equal('ok');
        data.msg.should.be.equal('Registration is OK!');
        data.sessid.should.be.a('string');
        socket_client.disconnect();
        return done();
      });
    });
    return it('Check access private method', function(done) {
      var socket_client;
      socket_client = socketio_client(`${end_point}/registration`, opts);
      return socket_client.emit('register', null, function(data) {
        var auth_client;
        data.should.be.an('object');
        data.should.have.deep.property('status');
        data.should.have.deep.property('msg');
        data.should.have.deep.property('sessid');
        data.status.should.be.equal('ok');
        data.msg.should.be.equal('Registration is OK!');
        data.sessid.should.be.a('string');
        auth_client = socketio_client(`${end_point}/private`, {
          query: {
            auth: data.sessid
          }
        });
        auth_client.emit('message', 'area');
        auth_client.once('private answer', function(response) {
          response.should.be.a('string');
          return response.should.be.equal('PRIVATE: area');
        });
        socket_client.disconnect();
        return done();
      });
    });
  });

  //################### END UNIT TESTS #########################

}).call(this);
