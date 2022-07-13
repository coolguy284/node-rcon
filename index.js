var net = require('net');

// https://wiki.vg/RCON

class RCONClient {
  constructor() {
    this._requests = {};
    this._conn = new net.Socket();
    
    this._offset = 0;
    this._lengthBytes = [];
    this._length = null;
    this._conn.on('data', chunk => {
      if (this._lengthBytes < 4) this._lengthBytes.push(chunk[0]);
      
    });
  }
  
  async connect(host, port) {
    if (port == null) port = 25575;
    return new Promise((resolve, reject) => {
      this._conn.once('error', err => reject(err));
      this._conn.connect({ host, port }, () => {
        resolve();
        this._conn.removeAllListeners('error');
      });
    });
  }
  
  async login(password) {
    if (typeof password == 'string') password = Buffer.from(password);
    if (!Buffer.isBuffer(password)) throw new Error('Must login with string or buffer for password.');
    if (password.includes(0)) throw new Error('Password cannot contain null bytes.');
    
    let reqIDs = new Set(Object.keys(this._requests));
    
    if (reqIDs.size > 2 ** 32 - 2) throw new Error('Too many open requests.');
    
    let reqID;
    for (reqID = 0; reqID < 2 ** 32 - 1; reqID++) {
      if (!reqIDs.has('' + reqID))
        break;
    }
    
    let header = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0]);
    header.writeUInt32LE(password.length + 10, 0);
    header.writeUInt32LE(reqID, 4);
    
    this._conn.write(Buffer.concat([
      header,
      password,
      Buffer.from([0, 0])
    ]));
    
    return new Promise((resolve, reject) => {
      this._requests[reqID] = { resolve, reject };
    });
  }
}

module.exports = {
  RCONClient
};