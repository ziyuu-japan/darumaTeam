// WebSocket Server
// 事前に
// npm i ws
// それから
// node ./bridge.js
// 同じものを、 ws://4191333.xyz:3051/?room=xxxx で利用可能

/*
  Raspiに置く方法
  
  - このファイルを bridge-ssl-pi.js という名前で ~/pi/Desktop/gc あたりに保存
  - $ cd ~/pi/Desktop/gc
  - $ npm install ws
  - $ node ./bridge-ssl-pi.js
  これで WebSocket Serverが立ち上がる
  
  次に、クライアント側のブラウザから、
  https://jsbin.com/lelajoxipu/1/edit?html,js,output
  にアクセスする。
  
  このままだと、リトアニア (https://4191333.xyz) に繋がってしまうので、
  > WebSocket("wss://4191333.xyz:3052/?room=test");
  のところを、WebSocket Serverを起動した Raspberry Pi 3のIPアドレスに変える。
  
  IPアドレスの確認は、ターミナルを立ち上げた後に、
  
  - $ ifconfig
  例えば、IPアドレスが、 10.0.128.135 なら、
  > WebSocket("wss://10.0.128.135:3052/?room=test");
  とする。
  
  ただし、これだけだと、まだ繋がらない。
  Raspi3に入っているSSL証明書が「オレオレ証明書」なので、ブラウザがブロックしている。
  このブロックを解除するのは、クライアント側のブラウザから、
  
  https:// rapiのipアドレス :3052
  
  にアクセスし、
  セキュリティエラー画面から、「詳細設定」→「****にアクセスする（安全じゃない。みたいなの）」を押す
  
  その後にアクセスすると、繋がる
  
*/
const exec = require("child_process").exec;

const fs = require("fs");

const https = require('https');
const port = 3052;

const server = https.createServer({
  cert: fs.readFileSync('/home/pi/_gc/srv/crt/server.crt'),
  key: fs.readFileSync('/home/pi/_gc/srv/crt/server.key')
});

server.listen(port,()=> {
  console.log("https server started.");
});

var WebSocket = require('ws');
var wss = new WebSocket.Server({server:server, verifyClient:checkRejectConnection}); 

function checkRejectConnection(info){
  console.log(info.req.url);

  var room = parseRoomname(info.req.url);
  if(room == null){
    console.log("connection rejected, due to no room number in query parameter.");
    return false;
  }else{
    console.log("will be connected.");
    return true;
  }
}

process.on('unhandledRejection', console.dir);

var connections = new Map;
var rooms = new Map;

wss.on('connection', (ws,req)=> {
  let id=ws._ultron.id;
  console.log(id);

  var conn = {ws:ws, uid:ws._socket._handle.fd, room:null};
  connections.set(conn.uid,conn);
  console.log("[new connection]uid:"+conn.uid);

  conn.room = parseRoomname(req.url);
  var cons = rooms.get(conn.room);
  if(cons == null){
    cons = new Map();
  }
  cons.set(conn.uid,conn);
  rooms.set(conn.room,cons);

  conn.ws.on('close', ()=>{
    console.log("[connection closed]uid:"+conn.uid);
    var cons = rooms.get(conn.room);
    cons.delete(conn.uid);
    if(cons.size == 0){
      rooms.delete(conn.room);
    }
    connections.delete(conn.uid);

  });
  conn.ws.on('message', (message)=>{
    console.log("[onmessage]:"+message);
    playVoice(getVoice());
    broadcastMessage(message,conn);
  });
  conn.ws.on('error', (err)=>{
    console.log(err);
  });
});

function parseRoomname(param){
//  console.log("p="+param)
  param = param.replace(/\//,"");
  param = param.replace(/\?/,"");
  params = param.split('\&');
  for(var cnt=0;cnt < params.length;cnt ++){
    var name = params[cnt].split('=');
    if(name.length == 2){
      if(name[1] != ""){
        if(name[0] == "room"){
          return name[1];
        }
      }
    }
  }
  return null;
}

function broadcastMessage(message, peer) {
  var cons = rooms.get(peer.room);

  cons.forEach(function (conn, key) {
    if(key != peer.uid){
      if(conn.ws.readyState == 1){
        conn.ws.send(message);
      }
    }
  });
};

function playVoice(fileName) {
  //exec("aplay /home/pi/Desktop/gc/top/sounds/" + fileName + ".wav", (err, stdout, stderr) => {:

  exec("aplay /home/pi/Desktop/gc/top/sounds/" + fileName + ".wav", (err, stdout, stderr) => {
    if (err) console.log(err);
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);
  });
};

function getVoice() {
  return "0";
};
