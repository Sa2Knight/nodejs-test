// 各種モジュールをロード
var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var http = require('http');
var socketIO = require('socket.io');
var Master = require('./game/master');
var Map = require('./game/map');
var Player = require('./game/player');

// express準備
var app = express();

// ビュー設定
app.set('views' , __dirname + '/views');
app.set('view engine' , 'ejs');

// ミドルウェアのロード
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
//app.use(express.methodOverride());

// ルーティングルール
var router = require('./routes/router');
app.use(logger('dev'));
app.use(express.static(__dirname + '/public'));

// ルーティング
app.get('/' , router.index);

// ゲームマスターを準備
var master = new Master(Map , Player);

// サーバ起動
var server = http.createServer(app);  //expressを用いてWebサーバ準備
server.listen(8081);                  //Webサーバを8081番ポートで起動
var io = socketIO.listen(server);     //socket.io起動

// ソケット通信内容を定義
io.sockets.on('connection' , function(socket) {
  // 矢印キー入力
  socket.on('move' , function(direction) {
    master.movePlayer(socket.id , direction);
  });
  // 爆弾設置
  socket.on('put' , function(direction) {
    master.putBom(socket.id , direction);
  });
  // 切断
  socket.on('disconnect' , function() {
    master.removePlayer(socket.id);
  });
  master.addPlayer(socket.id); 
});
setInterval(function() {
  io.sockets.emit('map' , master.map.maps);
  var deadClients = master.checkPlayerAlive();
  deadClients.forEach(function(c) {
    io.sockets.to(c).emit('dead');
  });
} , 100);
