(function() {
  var SessionWatcher;

  module.exports = SessionWatcher = class SessionWatcher {
    constructor(app) {
      this.app = app;
      this._forget = 3600;
    }

    // Process to timeout sessions, default forget of 1hour
    watch() {
      var forget;
      this.app.log(7, "[*] Watching for expired sessions...");
      // Convert seconds to milliseconds
      forget = Number(this._forget * 1000);
      // Run every seconds
      return setInterval(() => {
        var now, results, sess, sessions, sid;
        this.app.log(7, "[*] Clean old sessions");
        now = Date.now();
        sessions = this.app.sessions.list();
        results = [];
        for (sid in sessions) {
          sess = sessions[sid];
          // If session as expired
          if ((sess.timestamp + forget) < now) {
            this.app.log(4, `[!] Session ${sid} as expired...`);
            results.push(this.app.sessions.destroy(sid));
          } else {
            results.push(void 0);
          }
        }
        return results;
      }, 1000);
    }

  };

}).call(this);
