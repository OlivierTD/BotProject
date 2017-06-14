var restify = require("restify");
var builder = require("botbuilder");

//Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3000, function () {
    console.log("%s listening to %s", server.name, server.url);
});

//Chat connector
var connector = new builder.ChatConnector({
    appId: process.env.APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

//Listen for messages
server.post('api/messages', connector.listen());

//Receive message from user and respond accordingly.
var bot = new builder.UniversalBot(connector, function(session) {
    session.send("You said: %s", session.message.text);
});



