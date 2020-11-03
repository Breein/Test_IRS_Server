const
  app = require('express')(),
  http = require('http').createServer(app),
  io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.send('Server is running!');
});

const historyLimit = 10;
let count = 0;
let connected = {};
let history = [];

io.on('connection', (socket) => {

  const id = socket.handshake.query.user;

  if(connected[id]){
    connected[id].connection.push(socket.id);
  }else{
    connected[id] = {
      user: {
        id: null,
        name: "Not found!",
        avatar: ""
      },
      connection: [socket.id]
    };
    count++;
  }

  sendHistory(socket.id);
  io.emit('get user data', id);
  io.emit('counter change', count);

  socket.on('log in', (res) =>{
    const connection = connected[res.id];

    if(connection && connection.user.id === null){
      connection.user.id = res.id;
      connection.user.name = res.name;
      connection.user.avatar = res.avatar;

      sendMessage(io, res.id, 'login');
    }
  });
  console.log(`Сокет подключен: ${socket.id} |`, `Всего: ${count}`);

  socket.on('disconnect', ()=>{
    const id = socket.handshake.query.user;
    const connectionID = connected[id].connection.indexOf(socket.id);

    connected[id].connection.splice(connectionID, 1);

    if(connected[id].connection.length === 0){
      count--;
      sendMessage(io, id, 'logout');
      delete connected[id];
      io.emit('counter change', count);
    }

    console.log(`Сокет отключен: ${socket.id} |`, `Всего: ${count}`);
  });

  socket.on('chat message', (msg) => {
    console.log("Получено сообщение:", msg);
    sendMessage(io, msg.user, msg.text);
  });
});

http.listen(process.env.PORT || 5000, () => {
  console.log('listening on *:' + (process.env.PORT || 5000));
});

/**
 * @param io {io}
 * @param userID {number|string}
 * @param text {string}
 */
function sendMessage(io, userID, text){
  const connection = connected[userID];

  if(connection){
    switch(text){
      case 'login':
        text = `${connection.user.name} вошел в чат!`;
        break;

      case 'logout':
        text = `${connection.user.name} покинул в чат...`;
        break;
    }

    const message = {
      user: connection.user.name,
      text: text,
      avatar: connection.user.avatar
    };

    io.emit('chat message', message);
    historyHandler(message);
  }
}

function historyHandler(message){
  history.push(message);
  if(history.length >= historyLimit) history.shift();
}

function sendHistory(sid){
  if(history.length) io.to(sid).emit('chat message', history);
}