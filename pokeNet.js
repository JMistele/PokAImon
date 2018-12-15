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
	var inputLayer = new Synaptic.Layer(153);
	var hiddenLayer = new Synaptic.Layer(1);
	var outputLayer = new Synaptic.Layer(1);

	inputLayer.project(hiddenLayer);
	hiddenLayer.project(outputLayer);

	this.net = new Synaptic.Network({
		input: inputLayer,
		hidden: [hiddenLayer],
		output: outputLayer
	});
	var dataEx = this.readNet();
	console.log(dataEx);
	if(!makeNew && dataEx){
		this.net = Synaptic.Network.fromJSON(dataEx);
	}
	//TODO: 20 is a magic number, pulled out me hat
}

PokeNet.prototype.readNet = function(){
	var data = fs.readFileSync(this.file);
	return JSON.parse(data);
};

function boostStat(baseStat, statname, boost){
	var stat = baseStat;
	let boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
	if (boost > 6) boost = 6;
	if (boost < -6) boost = -6;
	if (boost >= 0) {
		stat = Math.floor(stat * boostTable[boost]);
	} else {
		stat = Math.floor(stat / boostTable[-boost]);
	}
	return stat;
}

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
		// Constant for bias
		phi.push(1);
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
		/*
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
		*/
		var ourActive = gameState.sides[mySID].active[0];
		var oppActive = gameState.sides[1-mySID].active[0];

		//stats
		//Opponent Boosts
		phi.push(oppActive.hp/oppActive.maxhp);
		if(oppActive != null){
			var oppBoost = oppActive.boosts;
			phi.push(boostStat(oppActive.baseStats.atk,"atk",oppBoost['atk'])/200);
			phi.push(boostStat(oppActive.baseStats.def,"def",oppBoost['def'])/200);
			phi.push(boostStat(oppActive.baseStats.spa,"spa",oppBoost['spa'])/200);
			phi.push(boostStat(oppActive.baseStats.spd,"spd",oppBoost['spd'])/200);
			phi.push(boostStat(oppActive.baseStats.spe,"spe",oppBoost['spe'])/200);
		}
		else{
			phi.push(oppActive.baseStats.atk/200);
			phi.push(oppActive.baseStats.def/200);
			phi.push(oppActive.baseStats.spa/200);
			phi.push(oppActive.baseStats.spd/200);
			phi.push(oppActive.baseStats.spe/200);
		}

		//Adds six stats per loop
		for(var i=0; i<6; i++){
			if(i < oppPoke.length){
				if(oppPoke[i].species!=oppActive.species) {
					phi.push(oppPoke[i].hp/oppPoke[i].maxhp);
					phi.push(oppPoke[i].baseStats.atk/200);
					phi.push(oppPoke[i].baseStats.def/200);
					phi.push(oppPoke[i].baseStats.spa/200);
					phi.push(oppPoke[i].baseStats.spd/200);
					phi.push(oppPoke[i].baseStats.spe/200);
				}
			}
			else{
					for(var j=0; j<6; j++) {
						phi.push(1);
					}
			}
		}

		//ourBoosts
		phi.push(ourActive.hp/ourActive.maxhp);
		if(ourActive != null){
			var ourBoost = oppActive.boosts;
			phi.push(boostStat(ourActive.baseStats.atk,"atk",ourBoost['atk'])/200);
			phi.push(boostStat(ourActive.baseStats.def,"def",ourBoost['def'])/200);
			phi.push(boostStat(ourActive.baseStats.spa,"spa",ourBoost['spa'])/200);
			phi.push(boostStat(ourActive.baseStats.spd,"spd",ourBoost['spd'])/200);
			phi.push(boostStat(ourActive.baseStats.spe,"spe",ourBoost['spe'])/200);
		}
		else{
			phi.push(ourActive.baseStats.atk/200);
			phi.push(ourActive.baseStats.def/200);
			phi.push(ourActive.baseStats.spa/200);
			phi.push(ourActive.baseStats.spd/200);
			phi.push(ourActive.baseStats.spe/200);
		}

		for(var i=0; i<poke.length; i++){
			if(poke[i].species!=ourActive.species){
				phi.push(poke[i].hp/poke[i].maxhp);
				phi.push(poke[i].baseStats.atk/200);
				phi.push(poke[i].baseStats.def/200);
				phi.push(poke[i].baseStats.spa/200);
				phi.push(poke[i].baseStats.spd/200);
				phi.push(poke[i].baseStats.spe/200);
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
				if(oppPoke[i].species != oppActive.species){
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
				for(var j=0; j<6; j++){
					if(j!=5){
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
			if(poke[i].species != ourActive.species){
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
		console.log(phi.length);
		return phi;
	};

	PokeNet.prototype.learn = function(stateArray, mySID, learningRate){
		var rewardArray = this.reward(stateArray, mySID);
		for(var i = 0; i < stateArray.length; i++){
			//console.log(this.net);
			var vecta = this.featurizeState(stateArray[i], mySID)
			if(!isNaN(this.net.activate(vecta))){
				this.net.propagate(learningRate, [rewardArray[i]]);
			}
		}
	};

	PokeNet.prototype.reward  = function(stateArray, mySID){
		//TODO: Reward function from gameState array
		// TD Learning: val[i] = r + gamma val[i+1]
		// Baby gets bonus for doing fat damage
		var rewardArray = [];
		var gamma = .95;
		// Reward for kills ONLY
		// Punish for deaths Only
		for(var i = 0; i < stateArray.length; i++){
			liveMons = 0;
			enemyMons = 0;
			for(var Poke in endState.sides[mySID].pokemon){
				if(endState.sides[mySID].pokemon[Poke].hp > 0){
					liveMons += 1;
				}
			}
			for(var Poke in endState.sides[1-mySID].pokemon){
				if(endState.sides[1-mySID].pokemon[Poke].hp > 0){
					enemyMons += 1;
				}
			}
			var val = (liveMons - enemyMons)/(liveMons + enemyMons);
			val = (val + 1)/2;
			rewardArray.push(val);
		}

		console.log(rewardArray);
		return rewardArray;
	}


	PokeNet.prototype.evaluate = function(gameState, mySID){
		if(gameState == null) {
			console.log("GAMESTATE WAS NULL BREAKING NOW ===============");
			return 0;
		}
		var vecta = this.featurizeState(gameState, mySID);
		for(var i=0; i<vecta.length; i++){
			if(vecta[i]==null || typeof vecta[i] === 'undefined'){
					console.log("FEATURE VECTOR MACHINE BROKE ===========")
					return 0;
			}
		}
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
