const path = require('path');
const https = require('https');
const express = require('express');
const socketIO = require('socket.io');
const fs = require('fs');
//const {generateMessage} = require('./utils/message');
const publicPath = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;
var app = express();
var options = {
    key: fs.readFileSync('server/fake-keys/privatekey.pem'),
    cert: fs.readFileSync('server/fake-keys/certificate.pem')
};
var server = https.createServer(options,app);
var io = socketIO(server);

app.use(express.static(publicPath));

io.sockets.on('connection', function(socket) {
  socket.on('offer', function(data) {
    console.log('offer:'+data);
    socket.broadcast.emit('offer', data);
  });

  socket.on('answer', function(data) {
    console.log('answer:'+data);
    socket.broadcast.emit('answer', data);
  });

  socket.on('ice', function(data) {
    console.log('ice:'+data);
    socket.broadcast.emit('ice', data);
  });

  socket.on('disconnect', function(data) {
    console.log('disconnect:'+data);
    socket.broadcast.emit('stop', true);
  });
});

server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});
