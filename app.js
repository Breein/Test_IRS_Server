const
  app = require('express')(),
  http = require('http').createServer(app),
  io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


let count = 0;
let connected = {};

io.on('connection', (socket) => {

  connected[socket.handshake.query.user] = {
    user: {
      id: 0,
      name: "Not found!",
      avatar: ""
    },
    connection: socket
  };
  count++;
  io.emit('counter change', count);

  socket.on('log in', (res) =>{
    const connection = connected[res.id];

    if(connection){
      connection.user.id = res.id;
      connection.user.name = res.name;
      connection.user.avatar = res.avatar;

      sendMessage(io, res.id, 'login');
    }
  });

  //console.log('Новый пользователь подключен', `Всего подключено: ${count}`);

  socket.on('disconnect', ()=>{
    count--;
    const id = socket.handshake.query.user;

    sendMessage(io, id, 'logout');
    delete connected[id];
    io.emit('counter change', count);

    //console.log("Пользователь отключился", `Всего подключено: ${count}`);
  });

  socket.on('chat message', (msg) => {
    sendMessage(io, msg.user, msg.text);
  });
});

http.listen(80, () => {
  console.log('listening on *: 80');
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
  }
}