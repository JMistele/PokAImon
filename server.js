//just gon try some bullshit

var communication = require('./communication');
var communication2 = require('./communication2');
var communication3 = require('./communication3');
var communication4 = require('./communication4');
var communication5 = require('./communication5');
var communication6 = require('./communication6');
var communication7 = require('./communication7');
var communication8 = require('./communication8');
var communication9 = require('./communication9');
var communication10 = require('./communication10');
var bot0 = new communication.Bot();

//var bot1 = new communication10.Bot();
var bot2 = new communication2.Bot();
var bot3 = new communication3.Bot();
var bot4 = new communication4.Bot();
var bot5 = new communication5.Bot();
//var bot6 = new communication6.Bot();
//var bot7 = new communication7.Bot();
//var bot8 = new communication8.Bot();
//var bot9 = new communication9.Bot();

bot0.initializeBot();
bot2.initializeBot();
bot3.initializeBot();
bot4.initializeBot();
bot5.initializeBot();
//bot6.initializeBot();
//bot7.initializeBot();
//bot8.initializeBot();
//bot9.initializeBot();



/*
//create server
var express = require('express');
var app = express();
app.use(express.static("public")); //static files go to public folder

//set view engine to ejs
app.set('view engine', 'ejs');

//express form data from server side
var bodyParser = require('body-parser');
//urlencoded
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());


//default ID that the bot will use to login
var ID = require('./userID.js').ID;

//create bot
var communication = require('./communication');
var bot = new communication.Bot();

//Later this should be put together in a game object -> neater
var battleformat ='';
var userID ='';
var password = '';

app.listen(process.env.app_port || 8080);

bot.initializeBot();

//index
app.get('/', function(req, res) {
	res.render('pages/index');
});

app.post('/confirminput', function (req, res) {
	userID = req.body.userID;
	password = req.body.password;
	battleformat = req.body.battleformat;
	//console.log(req.body);
	console.log('Logging in');
	console.log(userID)
	console.log(password)
  console.log(battleformat)
	//login to server
	if (userID != null && password != null) {
		bot.setID(userID, password, battleformat);
	}
});

app.post('/sendingchallenge', function (req, res) {
	userID = req.body.userID;
	battleformat = req.body.battleformat;
	customTeam = req.body.customTeam;
	//console.log(req.body);
	console.log('Sending Challenge Request');

	bot.setID(ID.userID, ID.password, battleformat);

	setTimeout(function() {
		bot.sendingChallenge(userID, battleformat, customTeam);
	}, 5000)

});


app.get('/startbattle', function(req,res){
	console.log('Initiating Battle');
	bot.startRandomBattle();
});
*/
