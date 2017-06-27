var restify = require("restify");
var builder = require("botbuilder");
var AWS = require("aws-sdk");

AWS.config.update({
    region: "ca-central-1",
    //endpoint: "http://localhost:8000"
});

//Connecting to dynamoDB
var dynamodb = new AWS.DynamoDB.DocumentClient();
var table = "botids";


//Restify Server
var server = restify.createServer();

//Chat connector
var connector = new builder.ChatConnector({
    appId: process.env.APP_ID,
    appPassword: process.env.APP_PASSWORD
});


//Listen for messages
server.post('api/messages', connector.listen());

server.get('/', restify.serveStatic({
    directory: __dirname,
    default: '/index.html'
}));

//Receive message from user and respond accordingly.
var bot = new builder.UniversalBot(connector, function(session) {
    session.send("You said: %s", session.message.text);
});


//Saving address of user if does not exist already.
bot.dialog('/address', function (session, args) {
    
    var address = session.message.address;
    console.log("Address: ", address);

    var message = "Hello world from bot. Saving your address in dynamoDB for further use.";
    session.send(message);

    //Attempting to save user address in dynamoDB
    var params = {
        Item: {
            "id": {
                S: address
            },
            "name": {
                S: " "
            }   
        },
        ReturnConsumedCapacity: "TOTAL",
        TableName: table
    };

    dynamodb.putItem(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            session.send("Error occured when trying to putItem in dynamoDB: ", err);
        }
        else {
            console.log("Successfully registered data in dynamoDB: ", data);
            session.end("Successfully registered data in dynamoDB: ", data);
        }
    });
});



server.listen(process.env.PORT || 8081);
