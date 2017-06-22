var restify = require("restify");
var builder = require("botbuilder");

//Restify Server
var server = restify.createServer();

//Chat connector
var connector = new builder.ChatConnector({
    appId: process.env.APP_ID,
    appPassword: process.env.APP_PASSWORD
});


//Listen for messages
server.post('api/messages', connector.listen());

//Receive message from user and respond accordingly.
var bot = new builder.UniversalBot(connector, function(session) {
    session.send("You said: %s", session.message.text);
});

server.get('/', restify.serveStatic ({
    directory: __dirname,
    default: '/index.html'
}));


//server.get('/send', restify)


server.listen(process.env.PORT || 8081);
