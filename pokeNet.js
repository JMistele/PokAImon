'use strict'

// Use Synaptic library for neural nets
var Synaptic = require('synaptic');

// Use file stream to save neural nets
var fs = require('fs');

// Using Zarel libraries to parse Pokemon battle information
var Pokemon = require('./zarel/battle-engine.js').BattlePokemon;
var BattleSide = require('./zarel/battle-engine.js').BattleSide;
var TypeChart = require('./zarel/data/typechart.js').BattleTypeChart;
var MoveSets = require('./zarel/data/formats-data.js').BattleFormatsData;



//================================================================
//================   INTERFACE   =================================

function PokeNet(netPath, makeNew){
	this.file = netPath;
	this.net = new Synaptic.Architect.Perceptron(145, 20, 1);
	var phifake = [];
	for(var i = 0; i < 75; i++){
		phifake.push(-5);
		phifake.push(200)
	}
	console.log('HERE I AM =====================================================================');
	console.log(this.net.activate(phifake));
	if(!makeNew && this.readNet()){
		this.net = Synaptic.Network.fromJSON(dataEx);
	}
	//TODO: 20 is a magic number, pulled out me hat
}

PokeNet.prototype.readNet = function(){
	var dataEx;
	fs.readFile(this.file, function(err, data){
		if(err) {
			console.log(err);
			return;
		} else {
			/*if(data[0] != '{'){
				console.log('File is not a good net!');
				return;
			}*/
			dataEx = JSON.parse(data);
			console.log(dataEx);
			console.log('net read');
			return dataEx;
		}
	})
};

PokeNet.prototype.saveNet = function(path){
		var exported = this.net.toJSON();
		var exportString = JSON.stringify(exported);
		fs.writeFile(path, exportString, (err) => {if(err) console.log(err);});
};

//==============================================================
//==================   FEATURES  ===============================
// Feature construction!
	PokeNet.prototype.featurizeState = function(gameState, mySID){
		//TODO: Featurize
		var phi = [];
		//getting opponent highest dmg move
		var oppPoke= gameState.sides[1-mySID].pokemon;
		var oppMoves = gameState.sides[1-mySID].active[0].moves;
		var maxDmg = 0;
		for(var i=0; i<4; i++) {
			var damage = 0;
			if(oppMoves.length>i){
				var attacker = gameState.sides[1-mySID].active[0];
				var defender = gameState.sides[mySID].active[0];
				var damage = gameState.getDamage(attacker, defender, oppMoves[i], null);
			}
			if(damage>maxDmg){
				maxDmg = damage;
			}
		}
		phi.push(maxDmg);
		//getting our highest dmg move
		var poke= gameState.sides[mySID].pokemon;
		var moves = gameState.sides[mySID].active[0].moves;
		var maxDmgU = 0;
		for(var i=0; i<4; i++) {
			if(moves.length>i){
			var attacker = gameState.sides[mySID].active[0];
			var defender = gameState.sides[1-mySID].active[0];
		  var damage = gameState.getDamage(attacker, defender, moves[i], null);
			if(damage>maxDmgU){
				maxDmgU = damage;
			}
			}
		}
		phi.push(maxDmgU)
		//types
		for(var i=0; i<18; i++){
			if(i==0 && gameState.sides[1-mySID].active[0].types.includes("Grass")){
				phi.push(1);
			}
			else if(i==1 && gameState.sides[1-mySID].active[0].types.includes("Water")){
				phi.push(1);
			}
			else if(i==2 && gameState.sides[1-mySID].active[0].types.includes("Fire")){
				phi.push(1);
			}
			else if(i==3 && gameState.sides[1-mySID].active[0].types.includes("Normal")){
				phi.push(1);
			}
			else if(i==4 && gameState.sides[1-mySID].active[0].types.includes("Fighting")){
				phi.push(1);
			}
			else if(i==5 && gameState.sides[1-mySID].active[0].types.includes("Flying")){
				phi.push(1);
			}
			else if(i==6 && gameState.sides[1-mySID].active[0].types.includes("Poison")){
				phi.push(1);
			}
			else if(i==7 && gameState.sides[1-mySID].active[0].types.includes("Electric")){
				phi.push(1);
			}
			else if(i==8 && gameState.sides[1-mySID].active[0].types.includes("Ground")){
				phi.push(1);
			}
			else if(i==9 && gameState.sides[1-mySID].active[0].types.includes("Psychic")){
				phi.push(1);
			}
			else if(i==10 && gameState.sides[1-mySID].active[0].types.includes("Rock")){
				phi.push(1);
			}
			else if(i==11 && gameState.sides[1-mySID].active[0].types.includes("Ice")){
				phi.push(1);
			}
			else if(i==12 && gameState.sides[1-mySID].active[0].types.includes("Bug")){
				phi.push(1);
			}
			else if(i==13 && gameState.sides[1-mySID].active[0].types.includes("Dragon")){
				phi.push(1);
			}
			else if(i==14 && gameState.sides[1-mySID].active[0].types.includes("Ghost")){
				phi.push(1);
			}
			else if(i==15 && gameState.sides[1-mySID].active[0].types.includes("Dark")){
				phi.push(1);
			}
			else if(i==16 && gameState.sides[1-mySID].active[0].types.includes("Steel")){
				phi.push(1);
			}
			else if(i==17 && gameState.sides[1-mySID].active[0].types.includes("Fairy")){
				phi.push(1);
			}
			else{
				phi.push(0);
			}
		}
		for(var i=0; i<18; i++){
			if(i==0 && gameState.sides[mySID].active[0].types.includes("Grass")){
				phi.push(1);
			}
			else if(i==1 && gameState.sides[mySID].active[0].types.includes("Water")){
				phi.push(1);
			}
			else if(i==2 && gameState.sides[mySID].active[0].types.includes("Fire")){
				phi.push(1);
			}
			else if(i==3 && gameState.sides[mySID].active[0].types.includes("Normal")){
				phi.push(1);
			}
			else if(i==4 && gameState.sides[mySID].active[0].types.includes("Fighting")){
				phi.push(1);
			}
			else if(i==5 && gameState.sides[mySID].active[0].types.includes("Flying")){
				phi.push(1);
			}
			else if(i==6 && gameState.sides[mySID].active[0].types.includes("Poison")){
				phi.push(1);
			}
			else if(i==7 && gameState.sides[mySID].active[0].types.includes("Electric")){
				phi.push(1);
			}
			else if(i==8 && gameState.sides[mySID].active[0].types.includes("Ground")){
				phi.push(1);
			}
			else if(i==9 && gameState.sides[mySID].active[0].types.includes("Psychic")){
				phi.push(1);
			}
			else if(i==10 && gameState.sides[mySID].active[0].types.includes("Rock")){
				phi.push(1);
			}
			else if(i==11 && gameState.sides[mySID].active[0].types.includes("Ice")){
				phi.push(1);
			}
			else if(i==12 && gameState.sides[mySID].active[0].types.includes("Bug")){
				phi.push(1);
			}
			else if(i==13 && gameState.sides[mySID].active[0].types.includes("Dragon")){
				phi.push(1);
			}
			else if(i==14 && gameState.sides[mySID].active[0].types.includes("Ghost")){
				phi.push(1);
			}
			else if(i==15 && gameState.sides[mySID].active[0].types.includes("Dark")){
				phi.push(1);
			}
			else if(i==16 && gameState.sides[mySID].active[0].types.includes("Steel")){
				phi.push(1);
			}
			else if(i==17 && gameState.sides[mySID].active[0].types.includes("Fairy")){
				phi.push(1);
			}
			else{
				phi.push(0);
			}
		}

		var ourActive = gameState.sides[mySID].active[0];
		var oppActive = gameState.sides[1-mySID].active[0];

		//let boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
		//stats
		phi.push(oppActive.hp);
		//if(oppPoke.boosts['atk']>=0) {
		//	var boost
		phi.push(oppActive.baseStats.atk);
		phi.push(oppActive.baseStats.def);
		phi.push(oppActive.baseStats.spa);
		phi.push(oppActive.baseStats.spd);
		phi.push(oppActive.baseStats.spe);


		for(var i=0; i<6; i++){
			if(oppPoke.length>i){
				if(oppPoke[i].species!=oppActive.species) {
					phi.push(oppPoke[i].hp);
					phi.push(oppPoke[i].baseStats.atk);
					phi.push(oppPoke[i].baseStats.def);
					phi.push(oppPoke[i].baseStats.spa);
					phi.push(oppPoke[i].baseStats.spd);
					phi.push(oppPoke[i].baseStats.spe);
				}
			}
			else{
					for(var i=0; i<6; i++) {
						phi.push(0);
					}
			}
		}
		phi.push(ourActive.hp);
		phi.push(ourActive.baseStats.atk);
		phi.push(ourActive.baseStats.def);
		phi.push(ourActive.baseStats.spa);
		phi.push(ourActive.baseStats.spd);
		phi.push(ourActive.baseStats.spe);

		for(var i=0; i<poke.length; i++){
			if(poke[i].species!=ourActive.species){
				phi.push(poke[i].hp);
				phi.push(poke[i].baseStats.atk);
				phi.push(poke[i].baseStats.def);
				phi.push(poke[i].baseStats.spa);
				phi.push(poke[i].baseStats.spd);
				phi.push(poke[i].baseStats.spe);
			}
		}

//status

		if(oppActive.status == 'psn'){
			phi.push(1);
		}
		else{
			phi.push(0);
		}
		if(oppActive.status == 'tox'){
			phi.push(1);
		}
		else{
			phi.push(0);
		}
		if(oppActive.status == 'brn'){
			phi.push(1);
		}
		else{
			phi.push(0);
		}
		if(oppActive.status == 'par'){
			phi.push(1);
		}
		else{
			phi.push(0);
		}
		if(oppActive.status == 'slp'){
			phi.push(1);
		}
		else{
			phi.push(0);
		}
		phi.push(0)

		for(var i=0; i<6; i++){
			if(oppPoke.length>i) {
				if(oppPoke[i].species !=oppActive.species){
					if(oppPoke[i].status == 'psn'){
						phi.push(1);
					}
					else{
						phi.push(0);
					}
					if(oppPoke[i].status == 'tox'){
						phi.push(1);
					}
					else{
						phi.push(0);
					}
					if(oppPoke[i].status == 'brn'){
						phi.push(1);
					}
					else{
						phi.push(0);
					}
					if(oppPoke[i].status == 'par'){
						phi.push(1);
					}
					else{
						phi.push(0);
					}
					if(oppPoke[i].status == 'slp'){
						phi.push(1);
					}
					else{
						phi.push(0);
					}
					phi.push(0);
				}
			}
			else{
				for(var i=0; i<6; i++){
					if(i!=5){
						phi.push(0);
					}
					else{
						phi.push(1);
					}
				}
			}
		}

		if(ourActive.status == 'psn'){
			phi.push(1);
		}
		else{
			phi.push(0);
		}
		if(ourActive.status == 'tox'){
			phi.push(1);
		}
		else{
			phi.push(0);
		}
		if(ourActive.status == 'brn'){
			phi.push(1);
		}
		else{
			phi.push(0);
		}
		if(ourActive.status == 'par'){
			phi.push(1);
		}
		else{
			phi.push(0);
		}
		if(ourActive.status == 'slp'){
			phi.push(1);
		}
		else{
			phi.push(0);
		}
		for(var i=0; i<6; i++){
			if(poke[i].species !=poke.species){
					if(poke[i].status == 'psn'){
						phi.push(1);
					}
					else{
						phi.push(0);
					}
					if(poke[i].status == 'tox'){
						phi.push(1);
					}
					else{
						phi.push(0);
					}
					if(poke[i].status == 'brn'){
						phi.push(1);
					}
					else{
						phi.push(0);
					}
					if(poke[i].status == 'par'){
						phi.push(1);
					}
					else{
						phi.push(0);
					}
					if(poke[i].status == 'slp'){
						phi.push(1);
					}
					else{
						phi.push(0);
					}
			}
		}
		//If pokemon are fainted
		for(var i=0; i<6; i++){
			if(oppPoke.length>i){
				if(oppPoke[i].fainted == true){
					phi.push(1);
				}
				else {
					phi.push(0);
				}
			}
			else{
				phi.push(0);
			}
		}
		for(var i=0; i<6; i++){
				if(poke[i].fainted == true){
					phi.push(1);
				}
				else {
					phi.push(0);
				}
		}

		var phiClean = [];
		for(var i = 0; i < phi.length; i++){
			if(typeof phi[i] !== 'undefined'){
				phiClean.push(phi[i]);
			}
		}
		console.log(phiClean.length);
		return phi;
	};

	PokeNet.prototype.learn = function(stateArray, mySID, learningRate){
		var rewardArray = this.reward(stateArray, mySID);
		for(var i = 0; i < stateArray.length; i++){
			//console.log(this.net);
			this.net.activate(this.featurizeState(stateArray[i], mySID));
			this.net.propagate(learningRate, rewardArray[i]);
		}
	};

	PokeNet.prototype.reward  = function(stateArray, mySID){
		//TODO: Reward function from gameState array
		// TD Learning: val[i] = r + gamma val[i+1]
		// Baby gets bonus for doing fat damage
		var rewardArray = [];
		var gamma = .9;
		for(var i = 0; i < stateArray.length - 1; i++){
			rewardArray.push(gamma*this.evaluate(stateArray[i+1], mySID));
		}
		var endscore = .5;
		var endState = stateArray[stateArray.length - 1];
		// Score for remaining pokemon
		for(var Poke in endState.sides[mySID].pokemon){
			if(endState.sides[mySID].pokemon[Poke].hp > 0){
				endscore += .08;
			}
		}
		for(var Poke in endState.sides[1-mySID].pokemon){
			if(endState.sides[1-mySID].pokemon[Poke].hp > 0){
				endscore -= .08;
			}
		}
		rewardArray.push(endscore);
		return rewardArray;
	}


	PokeNet.prototype.evaluate = function(gameState, mySID){
		var vecta = this.featurizeState(gameState, mySID);
		var count = 0;
		var exporti = this.net.toJSON();
		for(var i = 0; i < exporti.neurons.length; i++){
			if(exporti.neurons[i].layer == 'input'){
				count++;
			}
		}
		console.log(count);
		console.log(vecta.length);
		for(var i = 100; i < 150; i++) {
			console.log(vecta[i]);
		}
		console.log(this.net.activate(vecta));
		return this.net.activate(vecta);
	}
/* class PokeNet {

	constructor(netPath) {
		if(!netPath){
			this.file = 'pokeNet.json'
		} else {
			this.file = netPath;
		}
		fs.readFile(this.file, function(err, data){
			if(err) {
				console.log('neural net does not exist, creating...');
				this.net = new Synaptic.Architect.Perceptron(featureCount, 20, 1);
				//TODO: 20 is a magic number, pulled out me hat
			} else {
				this.net = Network.fromJSON(data);
			}
		})
		this.saveNet(this.file);
	}

	saveNet(path){
		fs.access(path, fs.constants.W_OK, function(err){
			var netStream = fs.createWriteStream(path, {'flags': 'w'});
			var exported = this.net.toJSON();
			netStream.write(exported);
		})
	}

	featurizeState(gameState, mySID){
		//TODO: Featurize
		var phi = [];
		for(var i = 0; i < featureCount; i++){
			phi.push(0);
		}
	}

	learn(stateArray, mySID, learningRate){
		for(var i = 0; i < stateArray.length; i++){
			console.log(this.net);
			this.net.activate(this.featurizeState(stateArray[i]));
			this.net.propagate(learningRate, this.reward(rewardArray[i]));
		}
	}

	reward(stateArray){
		//TODO: Reward function from gameState array
		return 0;
	}


	evaluate(gameState, mySID){
		return this.net.activate(this.featurizeState(gameState, mySID));
	}

} */

module.exports.PokeNet = PokeNet
