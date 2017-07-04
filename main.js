var restify = require("restify");
var builder = require("botbuilder");
var AWS = require("aws-sdk");

AWS.config.update({
    region: "ca-central-1",
});

//Connecting to dynamoDB
var docClient = new AWS.DynamoDB.DocumentClient();
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

//Basic chat display.
server.get('/', restify.serveStatic({
    directory: __dirname,
    default: '/index.html'
}));

//Call that sends an approbation request to the appropriate user.
server.get('/approbation', function(req, res, next) {
    
   //Will create a request if it does not exist. 
    var params = {
        Item: {
            requestID: "5555-5555-5556",
            accountID: "0000-0000-0001",
            trxCode: "9999-9999-9990",
            state: "pending"
        },
        TableName: "requests"
    };

    docClient.put(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            session.send("Error occured when trying to put in dynamoDB: ", err);
            session.endDialog();
        }
        else {
            console.log("Successfully registered data in dynamoDB: " + JSON.stringify(params));
            session.send("Successfully registered data in dynamoDB: " + JSON.stringify(params));
            session.endDialog();
        }
    }); 


    var userInfo;
    var params = {
        TableName: table,
        Key: {
            id: 'U62N5L0EL:T63CBFV98' //Hardcoded for now, but could be any id.
        }
    };
    
    //Attempt to fetch the address information of the user's conversation
    docClient.get(params, function(err, data){
        if (err) {
            console.log("Error while trying to fetch the user for approbation: ", err);
        }
        else {
            console.log("Successfully fetched the user's information for approbation: ");
            userInfo = data.Item;   
            var address = { id: userInfo.otherId,
                channelId: userInfo.channelid,
                user: {
                    id: userInfo.id,
                    name: userInfo.userName },
                conversation: { id: userInfo.conversationid },
                bot: {
                    id: userInfo.botId,
                    name: userInfo.botName },
                serviceUrl: userInfo.serviceURL };
    
            console.log("Address to send approbation: ", address);
            res.send('triggered bot approbation successfully. Here\'s the address info: ' + JSON.stringify(address));
            
            bot.beginDialog(address, "approbation");
        }
    });
    next();  
});


//Where server receives answer from bot for approbation
server.post('/approb-answer', function approval(req, res, next) {
    
    var params = {
        Item: {
            requestID: "5555-5555-5556",
            accountID: "0000-0000-0001",
            trxCode: "9999-9999-9990",
            state: "approved"
        },
        TableName: "requests"
    };

    docClient.put(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            session.send("Error occured when trying to put in dynamoDB: ", err);
            session.endDialog();
        }
        else {
            console.log("Successfully registered data in dynamoDB: " + JSON.stringify(params));
            session.send("Successfully registered data in dynamoDB: " + JSON.stringify(params));
            session.endDialog();
        }
    }); 
    
});


//Receive message from user and respond accordingly.
var bot = new builder.UniversalBot(connector, function(session) {
    if (session.message.text == "register me"){
        session.beginDialog('address');
    }
    else {
        session.send("You said: %s", session.message.text);
        session.send("If you want to register yourself so that the bot can send you approbations, please type \"register me\"");
    }    
});


//Saving address of user if does not exist already.
bot.dialog('address', function (session, args) {
    
    var address = session.message.address;
    console.log("Address: ", address);
    
    var message = "You typed in \"register me\".";
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

    var paramsGet = {
        TableName: table,
        Key: {
            id: address.user.id
        }
    };


    //Verifying if user already exists in DynamoDB
    docClient.get(paramsGet, function(err, data) {
        if (err) {
            console.log("Error while trying to fetch user from dynamoDB: " + err);
        }
        else {
            console.log("Successfully performed the get method.");
            console.log("Attempting addition of user into dynamoDB if necessary.");
            if (Object.keys(data).length == 0){
                docClient.put(params, function(err, data) {
                    if (err) {
                        console.log(err, err.stack);
                        session.send("Error occured when trying to put in dynamoDB: ", err);
                        session.endDialog();
                    }
                    else {
                        console.log("Successfully registered data in dynamoDB: " + JSON.stringify(params));
                        session.send("Successfully registered data in dynamoDB: " + JSON.stringify(params));
                        session.endDialog();
                    }
                }); 
            }
            else {
                console.log("Type of Data: " + (typeof data));
                session.send("You are already registered in dynamoDB!");
                session.endDialog();
            }
        }

    });


});

//Basi dialog to test approbation.
bot.dialog('approbation', [
        function (session) {
            session.send('Hello world from approbation.');
            
            builder.Prompts.choice(session, 'Approval Request',"Approve|Decline");
        },
        function(session, results){
            approval(session, results);
            switch(results.response.entity) {
                case 'Approve':
                    session.send('You approved the transaction.');
                    break;
                case 'Decline':
                    session.send('You declined the transaction.');
                    break;
                default:
                    session.send('haHA!');
            }
        }
]);

//    var card = new builder.HeroCard(session)
//        .title('Approval Request')
//        .subtitle('trx-id: 9999-9999-9990')
//        .text('Amount: 0.000000000000001$')
//        .buttons([
//                builder.CardAction.dialogAction(session, 'approbation-answer', 'approved', 'Approve'),
//                builder.CardAction.dialogAction(session, 'approbation-answer', 'declined', 'Decline')
//        ]);
//    var msg = new builder.Message(session).addAttachment(card);
//
//
//
//    session.send(msg);
//
//    session.endDialog(); 
//}); 

//bot.beginDialogAction('approbation-answer', 'approbationAnswer');
//
//bot.dialog('approbationAnswer', function(session, args){
//    
//    var params = {
//        Item: {
//            requestID: "5555-5555-5556",
//            accountID: "0000-0000-0001",
//            trxCode: "9999-9999-9990",
//            state: "approved"
//        },
//        TableName: "requests"
//    };
//
//    docClient.put(params, function(err, data) {
//        if (err) {
//            console.log(err, err.stack);
//            session.send("Error occured when trying to put in dynamoDB: ", err);
//            session.endDialog();
//        }
//        else {
//            console.log("Successfully registered data in dynamoDB: " + JSON.stringify(params));
//            session.send("Successfully registered data in dynamoDB: " + JSON.stringify(params));
//            session.endDialog();
//        }
//    });
//    
//    session.endDialog("You %s the transaction", args.data);
//});

function approval(session, value) {
    var params = {
        Item: {
            requestID: "5555-5555-5556",
            accountID: "0000-0000-0001",
            trxCode: "9999-9999-9990",
            state: value.response.entity
        },
        TableName: "requests"
    };

    docClient.put(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            session.send("Error occured when trying to put in dynamoDB: ", err);
            session.endDialog();
        }
        else {
            console.log("Successfully registered data in dynamoDB: " + JSON.stringify(params));
            session.send("Successfully registered data in dynamoDB: " + JSON.stringify(params));
            session.endDialog();
        }
    });
};


server.listen(process.env.PORT || 8081);






