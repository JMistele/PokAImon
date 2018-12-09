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


//==============================================================
//==================   FEATURES  ===============================
// Feature construction!
var featureKey = {};
var featureCount = 0;
// Damage threat features, integer values, quantity <= 144
for(var i = 1; i < 7; i++) {
	for(var j = 1; j < 7; j++){
		for(var k = 1; k < 5; k++){
			featureKey['opp_'+i+'_move_'+k+'_on_our_'+j+'_dmg'] = featureCount;
			featureCount++;
		}
	}
}

// Stat effect features, binary values, quantity <= 72
// Burn, Par, Tox, Slp, Encore, Taunt
// Their pokemon
for(var j = 1; j < 7; j++){
	featureKey['opp_'+i+'_stat_effect_burn'] = featureCount;
	featureKey['opp_'+i+'_stat_effect_par'] = featureCount + 1;
	featureKey['opp_'+i+'_stat_effect_tox'] = featureCount + 2;
	featureKey['opp_'+i+'_stat_effect_slp'] = featureCount + 3;
	featureKey['opp_'+i+'_stat_effect_enc'] = featureCount + 4;
	featureKey['opp_'+i+'_stat_effect_taun'] = featureCount + 5;
	featureCount += 6;
}
// our pokemon
for(var j = 1; j < 7; j++){
	featureKey['our_'+i+'_stat_effect_burn'] = featureCount;
	featureKey['our_'+i+'_stat_effect_par'] = featureCount + 1;
	featureKey['our_'+i+'_stat_effect_tox'] = featureCount + 2;
	featureKey['our_'+i+'_stat_effect_slp'] = featureCount + 3;
	featureKey['our_'+i+'_stat_effect_enc'] = featureCount + 4;
	featureKey['our_'+i+'_stat_effect_taun'] = featureCount + 5;
	featureCount += 6;
}

//================================================================
//================   INTERFACE   =================================

function PokeNet(netPath){
	this.file = netPath;
	this.net = new Synaptic.Architect.Perceptron(featureCount, 20, 1);
	if(this.readNet()){
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

	PokeNet.prototype.featurizeState = function(gameState, mySID){
		//TODO: Featurize
		var phi = [];
		//getting opponent highest dmg move
		var oppPoke= gameState.sides[1-mySID].pokemon;
		var oppMoves = gameState.sides[1-mySID].active[0].moves;
		var maxDmg = 0;
		for(var i=0; i<4; i++) {
			var damage = 0;
			if(moves.length>i){
				var attacker = gameState.sides[1-mySID].active[0];
				var defender = gameState.sides[mySID].active[0];
				var damage = gameState.getDamage(attacker, defender, moves[i], null);
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
			var attacker = gameState.sides[mySID].active[0];
			var defender = gameState.sides[1-mySID].active[0];
		  var damage = gameState.getDamage(attacker, defender, moves[i], null);
			if(damage>maxDmgU){
				maxDmgU = damage;
			}
		}
		phi.push(maxDmgU)
		//types
		for(var i=0; i<18; i++){
			if(i=0 && gameState.sides[1-mySID].active[0].types.includes("Grass")){
				phi(push(1));
			}
			else if(i==1 && gameState.sides[1-mySID].active[0].types.includes("Water")){
				phi(push(1));
			}
			else if(i==2 && gameState.sides[1-mySID].active[0].types.includes("Fire")){
				phi(push(1));
			}
			else if(i==3 && gameState.sides[1-mySID].active[0].types.includes("Normal")){
				phi(push(1));
			}
			else if(i==4 && gameState.sides[1-mySID].active[0].types.includes("Fighting")){
				phi(push(1));
			}
			else if(i==5 && gameState.sides[1-mySID].active[0].types.includes("Flying")){
				phi(push(1));
			}
			else if(i==6 && gameState.sides[1-mySID].active[0].types.includes("Poison")){
				phi(push(1));
			}
			else if(i==7 && gameState.sides[1-mySID].active[0].types.includes("Electric")){
				phi(push(1));
			}
			else if(i==8 && gameState.sides[1-mySID].active[0].types.includes("Ground")){
				phi(push(1));
			}
			else if(i==9 && gameState.sides[1-mySID].active[0].types.includes("Psychic")){
				phi(push(1));
			}
			else if(i==10 && gameState.sides[1-mySID].active[0].types.includes("Rock")){
				phi(push(1));
			}
			else if(i==11 && gameState.sides[1-mySID].active[0].types.includes("Ice")){
				phi(push(1));
			}
			else if(i==12 && gameState.sides[1-mySID].active[0].types.includes("Bug")){
				phi(push(1));
			}
			else if(i==13 && gameState.sides[1-mySID].active[0].types.includes("Dragon")){
				phi(push(1));
			}
			else if(i==14 && gameState.sides[1-mySID].active[0].types.includes("Ghost")){
				phi(push(1));
			}
			else if(i==15 && gameState.sides[1-mySID].active[0].types.includes("Dark")){
				phi(push(1));
			}
			else if(i==16 && gameState.sides[1-mySID].active[0].types.includes("Steel")){
				phi(push(1));
			}
			else if(i==17 && gameState.sides[1-mySID].active[0].types.includes("Fairy")){
				phi(push(1));
			}
			else{
				phi(push(0));
			}
		}
		for(var i=0; i<18; i++){
			if(i=0 && gameState.sides[mySID].active[0].types.includes("Grass")){
				phi(push(1));
			}
			else if(i==1 && gameState.sides[mySID].active[0].types.includes("Water")){
				phi(push(1));
			}
			else if(i==2 && gameState.sides[mySID].active[0].types.includes("Fire")){
				phi(push(1));
			}
			else if(i==3 && gameState.sides[mySID].active[0].types.includes("Normal")){
				phi(push(1));
			}
			else if(i==4 && gameState.sides[mySID].active[0].types.includes("Fighting")){
				phi(push(1));
			}
			else if(i==5 && gameState.sides[mySID].active[0].types.includes("Flying")){
				phi(push(1));
			}
			else if(i==6 && gameState.sides[mySID].active[0].types.includes("Poison")){
				phi(push(1));
			}
			else if(i==7 && gameState.sides[mySID].active[0].types.includes("Electric")){
				phi(push(1));
			}
			else if(i==8 && gameState.sides[mySID].active[0].types.includes("Ground")){
				phi(push(1));
			}
			else if(i==9 && gameState.sides[mySID].active[0].types.includes("Psychic")){
				phi(push(1));
			}
			else if(i==10 && gameState.sides[mySID].active[0].types.includes("Rock")){
				phi(push(1));
			}
			else if(i==11 && gameState.sides[mySID].active[0].types.includes("Ice")){
				phi(push(1));
			}
			else if(i==12 && gameState.sides[mySID].active[0].types.includes("Bug")){
				phi(push(1));
			}
			else if(i==13 && gameState.sides[mySID].active[0].types.includes("Dragon")){
				phi(push(1));
			}
			else if(i==14 && gameState.sides[mySID].active[0].types.includes("Ghost")){
				phi(push(1));
			}
			else if(i==15 && gameState.sides[mySID].active[0].types.includes("Dark")){
				phi(push(1));
			}
			else if(i==16 && gameState.sides[mySID].active[0].types.includes("Steel")){
				phi(push(1));
			}
			else if(i==17 && gameState.sides[mySID].active[0].types.includes("Fairy")){
				phi(push(1));
			}
			else{
				phi(push(0));
			}
		}

		var ourActive = gameState.sides[mySID].active[0];
		var oppActive = gameState.sides[1-mySID].active[0];

		//stats
		phi.push(oppActive.species.baseStats.hp);
		phi.push(oppActive.species.baseStats.atk);
		phi.push(oppActive.species.baseStats.def);
		phi.push(oppActive.species.baseStats.spa);
		phi.push(oppActive.species.baseStats.spd);
		phi.push(oppActive.species.baseStats.spe);


		for(var i=0; i<6; i++){
			if(oppPoke.length>i){
				if(oppPoke[i].species!=oppActive.species) {
					phi.push(oppPoke[i].species.baseStats.hp);
					phi.push(oppPoke[i].species.baseStats.atk);
					phi.push(oppPoke[i].species.baseStats.def);
					phi.push(oppPoke[i].species.baseStats.spa);
					phi.push(oppPoke[i].species.baseStats.spd);
					phi.push(oppPoke[i].species.baseStats.spe);
				}
			}
			else{
				for(var i=0; i<6; i++) [
					phi.push(0);
				}
			}
		}

		phi.push(ourActive.species.baseStats.hp);
		phi.push(ourActive.species.baseStats.atk);
		phi.push(ourActive.species.baseStats.def);
		phi.push(ourActive.species.baseStats.spa);
		phi.push(ourActive.species.baseStats.spd);
		phi.push(ourActive.species.baseStats.spe);

		for(var i=0; i<poke.length; i++){
			if(poke[i].species!=oppActive.species)
				phi.push(poke[i].species.baseStats.hp);
				phi.push(poke[i].species.baseStats.atk);
				phi.push(poke[i].species.baseStats.def);
				phi.push(poke[i].species.baseStats.spa);
				phi.push(poke[i].species.baseStats.spd);
				phi.push(poke[i].species.baseStats.spe);
		}


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
		return phi;
	};

	PokeNet.prototype.learn = function(stateArray, mySID, learningRate){
		var rewardArray = this.reward(stateArray);
		for(var i = 0; i < stateArray.length; i++){
			//console.log(this.net);
			this.net.activate(this.featurizeState(stateArray[i]));
			this.net.propagate(learningRate, rewardArray[i]);
		}
	};

	PokeNet.prototype.reward  = function(stateArray){
		//TODO: Reward function from gameState array
		var rewardArray = [];
		for(var i = 0; i < stateArray.length; i++){
			rewardArray.push(0);
		}
		return rewardArray;
	}


	PokeNet.prototype.evaluate = function(gameState, mySID){
		return this.net.activate(this.featurizeState(gameState, mySID));
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
