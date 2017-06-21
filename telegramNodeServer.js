const FS = require('fs');
const PATH = require('path');
const QUERYSTRING = require('querystring');

const HTTPS = require('https');
const HOSTNAME = 'xxx'; //Your hostname or server IP
const PORT = 8443; //Port NodeJS server is running on. Use either 443, 80, 88, 8443
const CERTIFICATE = FS.readFileSync(PATH.join(__dirname, 'fullchain.pem'), 'utf8');
const PRIVATEKEY = FS.readFileSync(PATH.join(__dirname, 'privkey.pem'), 'utf8');
const BOT_TOKEN = 'xxx'; //Bot token goes here.
const DEBUG_API_TOKEN ='xxx'; //Logging any errors/debug messages are passed to another bot specified by this token. If you wish to log in other way or not use it, simply delete it and any occurence of callHome()
const ADMIN_CHAT_ID = xxx; //Your personal chat id goes here.


function apiRequest(method, parameters) {

    var url = 'https://api.telegram.org/bot'+BOT_TOKEN+'/'+method+'?'+QUERYSTRING.stringify(parameters);

    var stuff = HTTPS.get(url,function (res) {
       //console.log(url); //Print link build from methodname + paramters
        var body = '';

        res.on('end', function () {
            var telegramJsonResponse = JSON.parse(body);
            if(telegramJsonResponse.ok == false)
                callHome("<b>Error</b> trying to execute \n\n" + url + "\n\n" + body);
            //Write error to some log file instead if you wish...
        });

        res.on('data', function (chunk) {
           body += chunk;
        });

    }).on('error', function (e) {
        callHome("<b>Error</b> trying to execute \n\n" + url + "\n\n" + body);
        console.error(e);
    });
}


function callHome(message) { //Can be used for sending out debug messages, occuring errors. This function is tied to a bot and specified chat_id
    HTTPS.get('https://api.telegram.org/bot'+DEBUG_API_TOKEN+'/sendMessage?chat_id='+ADMIN_CHAT_ID+'&parse_mode=HTML&text=' + encodeURIComponent(message));
}

function processMessage(message) {

    var text = message.text;
    var message_id = message.message_id;
    var chat_id = message.chat.id;

    if(text) {
     if(text == "/start") {
         apiRequest( "sendMessage", {
             parse_mode : 'HTML',
             chat_id : chat_id,
             text: "Welcome to this bot! You can try these commands:\n" +
                 "/urlbutton\n" +
                 "/inlinebtnvertically\n" +
                 "/inlinebtnhorizontally\n" +
                 "/inlinebtnmixed\n" +
                 "/inlinebtncallback"

        });
     }
     else if(text == "/urlbutton") {
         apiRequest( "sendMessage", {
             parse_mode : 'HTML',
             chat_id : chat_id,
             text: 'Here is a <b>clickable url link</b> for you',
             reply_markup: '{"inline_keyboard":[[{"text":"Link to Site","url":"www.example.com"}]]}' //now here needs to be an array of array

         });
     }
     else if(text == "/inlinebtnvertically") {
         apiRequest( "sendMessage", {
             parse_mode : 'HTML',
             chat_id : chat_id,
             text: 'Here are some <b>inline buttons</b> ordered <b>vertically</b>!',
             reply_markup: '{"inline_keyboard":[' +
                 '[{"text":"Button A","callback_data":"someData"}],' +
                 '[{"text":"Button B","callback_data":"someData"}],' +
                 '[{"text":"Button C","callback_data":"someData"}]' +
                 ']}'
         });
    }
     else if(text == "/inlinebtnhorizontally") {
         apiRequest( "sendMessage", {
             parse_mode : 'HTML',
             chat_id : chat_id,
             text: 'Here are some <b>inline buttons</b> ordered <b>horizontally</b>!',
             reply_markup: '{"inline_keyboard":[' +
                 '[{"text":"Button A","callback_data":"someData"},' + '{"text":"Button B","callback_data":"someData"},' + '{"text":"Button C","callback_data":"someData"}'
                 +']]}'
         });
     }
     else if(text == "/inlinebtnmixed") {
         apiRequest( "sendMessage", {
             parse_mode : 'HTML',
             chat_id : chat_id,
             text: 'Here are some buttons mixed both horizontally and vertically!',
             reply_markup: '{"inline_keyboard":[' +
                 '[{"text":"Button A","callback_data":"someData"},' + '{"text":"Button B","callback_data":"someData"}]' +
                 ', [{"text":"Button C","callback_data":"someData"}]'+
                 ', [{"text":"Button D","callback_data":"someData"}]'+
                 ', [{"text":"Button E","callback_data":"someData"},' + '{"text":"Button F","callback_data":"someData"},'+ '{"text":"Button G","callback_data":"someData"}]'
                 +']}'
         });
     }
     else if(text == "/inlinebtncallback") {
         apiRequest( "sendMessage", {
             parse_mode : 'HTML',
             chat_id : chat_id,
             text: 'I can tell the pressed button by help of <b>callback_data</b>!',
             reply_markup: '{"inline_keyboard":[' +
                 '[{"text":"Button A","callback_data":"btnA"},' + '{"text":"Button B","callback_data":"btnB"},' + '{"text":"Button C","callback_data":"btnC"}'
                 +']]}'
         });
     }
     else {
         //Echo text send from user if no matching answer from above
         apiRequest( "sendMessage", {
             parse_mode : 'HTML',
             chat_id : chat_id,
             text: '<i>Echoed from server </i>: ' + text
         });
     }
    }
}

const server = HTTPS.createServer( {
        cert:CERTIFICATE,
        key:PRIVATEKEY
    },
    function (req,res) {

    if (req.method == 'POST') { //Telegram's API will send POST requests to your server
        var body = '';

        req.on('data', function (data) {
            body += data; //Data received will be set together continuously till complete
            // Too much POST data, kill the connection!
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (body.length > 1e6)
                req.connection.destroy();
        });

        req.on('end', function () {


            var post = JSON.parse(body);

            if(post.hasOwnProperty('message')) //Bot user has send a message
                processMessage (post.message);
            else if(post.hasOwnProperty('callback_query')) { //Bot user has pressed inline button
                var callbackData = post.callback_query.data;
                var callback_query_id =  post.callback_query.id;

                var text;
                switch (callbackData) {
                    case "btnA":
                        text = "button A pressed!";
                        break;
                    case "btnB":
                        text = "button B pressed!";
                        break;
                    case "btnC":
                        text = "button C pressed!";
                        break;
                }

                if(text) {   //Only send out text when it is available. No text is available if button was pressed from any other menu than /inlinebtncallback
                    apiRequest( "answerCallbackQuery", {
                        callback_query_id : callback_query_id,
                        text: text,
                        show_alert : true
                    });
                } else {
                    apiRequest( "answerCallbackQuery", {
                        callback_query_id : callback_query_id
                    });
                }
            }

        });
    }
    res.writeHead(200);
    res.end();
});

server.listen(PORT, HOSTNAME, function() {
    console.log('Server started on port ' +PORT);
});