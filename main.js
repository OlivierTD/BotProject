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
server.use(restify.bodyParser());

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
    default: '/approbForm.html'
}));

//Call that sends an approbation request to the appropriate user.
server.post('/approbation/:requestID&:accountID&:trxCode', function(req, res, next) {
   
    console.log("Request from post: " + req.params);

   //Will create a request if it does not exist. 
    var params = {
        Item: {
            requestID: req.params.requestID,
            accountID: req.params.accountID,
            trxCode: req.params.trxCode,
            state: "pending"
        },
        TableName: "requests"
    };

    docClient.put(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
        }
        else {
            console.log("Successfully registered data in dynamoDB: " + JSON.stringify(params));
        }
    }); 



    //-------------------------------------------------------------------------
    var userInfo;
    var userParams = {
        TableName: table,
        Key: {
            id: 'U62N5L0EL:T63CBFV98' //Hardcoded for now, but could be any id.
        }
    };
    //-------------------------------------------------------------------------


    //Attempt to fetch the address information of the user's conversation
    docClient.get(userParams, function(err, data){
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
            res.send('triggered bot approbation successfully. Here\'s the address info: ' 
                    + JSON.stringify(address) +"\n\nHere's the parameters sent: " + params);
            
            bot.beginDialog(address, "approbation", params.Item);
        }
    });
    return next();  
});

//Receive message from user and respond accordingly.
var bot = new builder.UniversalBot(connector, function(session) {
    if (session.message.text == "register me"){
        session.beginDialog('address');
    }
    else {
        session.send("You said: %s", session.message.text);
    
	    //-------------------------------------------------------------------------
    	var userInfo;
    	var userParams = {
        	TableName: table,
        	Key: {
            	id: 'U62N5L0EL:T63CBFV98' //Hardcoded for now, but could be any id.
        	}
    	};
    	//-------------------------------------------------------------------------


    	//Attempt to fetch the address information of the user's conversation
    	docClient.get(userParams, function(err, data){
        	if (err) {
            		console.log("Error while trying to fetch the user for approbation: ", err);
        	}
        	else {
            		userInfo = data.Item;   
     	 	  	session.send("If you want to register yourself so that the bot can send you approbations, please type \"register me\"");
        	}
    	});
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

//Dialog to test approbation.
bot.dialog('approbation', [
        
        function (session, params) {
            session.send('Hello world from approbation.');
            for (var k in params) {
                session.send(k + ": " + params[k]);
            }
            builder.Prompts.choice(session, 'Approval Request',"Approve|Decline");
        },
        
        function(session, results){
            
            session.send('You approved the transaction.');
            var params = {
                Item: {
                    requestID: params.requestID,
                    accountID: params.accountID,
                    trxCode: params.trxCode,
                    state: results
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
                    session.endDialog();
                }
            });
                 
        }
        
]);


server.listen(process.env.PORT || 8081);






