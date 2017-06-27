var restify = require("restify");
var builder = require("botbuilder");
var AWS = require("aws-sdk");

AWS.config.update({
    region: "ca-central-1",
    //endpoint: "http://localhost:8000"
});

//Connecting to dynamoDB
var docClient = new AWS.DynamoDB.DocumentClient();
var table = "botids";

//global variable to test approbation.


//Restify Server
var server = restify.createServer();

//Chat connector
var connector = new builder.ChatConnector({
    appId: process.env.APP_ID,
    appPassword: process.env.APP_PASSWORD
});

//Listen for messages
server.post('api/messages', connector.listen());

//Basic chat display.
server.get('/', restify.serveStatic({
    directory: __dirname,
    default: '/index.html'
}));

//Call that sends an approbation request to the appropriate user.
server.get('/approbation', function(req, res, next) {
    
    var address;
    var userInfo;
    var params = {
        TableName: 'botids',
        Key: {
            id: '29:17l_jznYUiJIaDy7kFmCLx6dGc10_GUGpF6B0CV8imgY'
        }
    };

    docClient.get(params, function(err, data){
        if (err) {
            console.log("Error while trying to fetch the user for approbation: ", err);
        }
        else {
            console.log("Successfully fetched the user's information for approbation: ", data);
            userInfo = data;   
        }
    });

    address = { id: userInfo.otherId,
        channelId: userInfo.channelid,
        user: {
            id: userInfo.id,
            name: userInfo.userName },
        conversation: { id: userInfo.conversationid },
        bot: {
            id: userInfo.botId,
            name: userInfo.botName },
        serviceUrl: userInfo.serviceURL };
    
    console.log("User info: ", address)

    startProactiveDialog(address);
    res.send('triggered bot approbation successfully. Here\' the info of the user.', address);
    next();  
});

function startProactiveDialog(){
    bot.beginDialog(address, "approbation");
}


//Receive message from user and respond accordingly.
var bot = new builder.UniversalBot(connector, function(session) {
    session.send("You said: %s", session.message.text);
    session.beginDialog('address');
});


//Saving address of user if does not exist already.
bot.dialog('address', function (session, args) {
    
    var address = session.message.address;
    console.log("Address: ", address);
    
    var message = "Hello world from bot. Saving your address in dynamoDB for further use.";
    session.send(message);

    //Attempting to save user address in dynamoDB
    var params = {
        Item: {
            id: address.user.id,
            userName: address.user.name,
            channelid: address.channelId,
            conversationid: address.conversation.id,
            botId: address.bot.id,
            botName: address.bot.name,
            serviceURL: address.serviceUrl,
            otherId: address.id
        },
        TableName: table
    };

    docClient.put(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            session.send("Error occured when trying to put in dynamoDB: ", err);
            session.endDialog();
        }
        else {
            console.log("Successfully registered data in dynamoDB: ", params);
            session.send("Successfully registered data in dynamoDB: ", params);
            session.endDialog();
        }
    });
});

//Basic dialog to test approbation.
bot.dialog('approbation', function(session, args) {
    console.log('Hello world from approbation.');
    session.send('Hello world from approbation.');
    session.endDialog(); 
});

server.listen(process.env.PORT || 8081);
