'use strict';

var Pokemon = require('./zarel/battle-engine.js').BattlePokemon;
var BattleSide = require('./zarel/battle-engine.js').BattleSide;
var TypeChart = require('./zarel/data/typechart.js').BattleTypeChart;
var MoveSets = require('./zarel/data/formats-data.js').BattleFormatsData;

function PokAImonAgent() {
	//working well
	this.getOptions = function (gameState, mySID) { //this function only returns BOT's options
		var options = [];
		var moves = gameState.sides[mySID].active[0].moves;
		for (var i=0; i < moves.length; i++) { //iterate through moves
			var action = 'move ' + moves[i];
			options.push(action);
		}
		if (gameState.sides[mySID] && !(gameState.sides[mySID].active[0] && gameState.sides[mySID].active[0].trapped)) {
			for (var j=1; j < Object.keys(gameState.sides[mySID].pokemon).length; j++) {
				var Pokemon = gameState.sides[mySID].pokemon[j];
				if (!Pokemon.fainted) {
					var action = 'switch ' + (j+1);
					options.push(action);
				}
			}
		}
		return options;
	}

  this.getOpponentActions = function(gameState,mySID) { //this function returns opponent's options
		var options = [];
		var moves = gameState.sides[1-mySID].active[0].moves;
		for (var i=0; i < moves.length; i++) { //iterate through moves
			var action = 'move ' + moves[i];
			options.push(action);
		}
		if(moves.length == 0) {
			for (var i = 0; i < MoveSets[toId(attacker.name)].randomBattleMoves.length; i++) {
				var moveid = MoveSets[toId(attacker.species)].randomBattleMoves[i]; //this is only a move id
				var action = 'move ' + moveid;
				options.push(action);
			}
		}
		if (gameState.sides[1-mySID] && !(gameState.sides[1-mySID].active[0] && gameState.sides[1-mySID].active[0].trapped)) {
			for (var j=1; j < Object.keys(gameState.sides[1-mySID].pokemon).length; j++) {
				var Pokemon = gameState.sides[1-mySID].pokemon[j];
				if (!Pokemon.fainted) {
					var action = 'switch ' + (j+1);
					options.push(action);
				}
			}
		}
		return options;
	}

	this.round = function(number, decimal) {
		if (decimal == 2) return Math.round(number*100)/100;
		else return Math.round(number*10)/10;
	}

	this.addFakeMove = function (gameState, moveid, mySID) { //moves always added to opp
		var move = gameState.getMove(moveid);
		var pokemon = gameState.sides[1-mySID].active[0];
		if (move.id && pokemon.moves.indexOf(move.id)==-1) { //if move not yet revealed
			pokemon.moves.push(move.id);
 			var nMove = {
				move: move.name,
				id: move.id,
				pp: (move.noPPBoosts ? move.pp : move.pp * 8 / 5)-1,
				maxpp: (move.noPPBoosts ? move.pp : move.pp * 8 / 5),
				target: move.target,
				disabled: false,
				disabledSource: '',
				used: false,
			};
		pokemon.baseMoveset.push(nMove);
		pokemon.moveset.push(nMove);
		}
	}

	this.stateScore = function (gameState, mySID) {
	 //TODO: Use neural net to give state a score
	 return 1;
	}

  this.decide = function (gameState, options, mySide, forceSwitch) {
		var choices = options;
		var mySID = mySide.n;
		//if need to switch
    if(forceSwitch) {
				var newOptions = [];
				for(var i=0; i<options.length; i++) {
						if(options[i].includes("switch")) {
								newOptions.push(options[i]);
						}
				}
				choices = newOptions;
		}
		var botSide = 'p'+(mySID+1);
		var oppSide = 'p'+(2-mySID);
		var bestAction = null;
		var bestScore = -1000000000
		for(var i = 0; i<choices.length; i++) {
			var action = choices[i];
			var succState = gameState.copy();
			succState.p1.currentRequest = 'move';
			succState.p2.currentRequest = 'move';
			if(forceSwitch){
				succState.choose(oppSide, 'forceskip');
				succState.choose(botSide, action);
				succState.choose(botSide, action);
				var score = stateScore(succState,mySID)
				if(score >bestScore){
					bestScore = score;
					bestAction = action;
				}
			}
			else{
				var opponScore = 100000000;
				var oppMoves = getOpponentActions(gameState,mySID);
				var finalState = null;
				for(var j=0; j<oppMoves.length; i++){

					/*
					if (oppMoves[j].startsWith('move')) { //predict worst move when less than 2 moves have been revealed
						var moveid = oppMoves[j].split(' ')[1];
						if (succState.sides[1-mySID].active[0].moves.indexOf(moveid) == -1) {
							this.addFakeMove(succState, moveid, mySID); //add fake move so that sim would work
						}
					}
					*/

					var oppState = succState;
					oppState.choose(oppSide, oppMoves[j]);
					oppState.choose(botSide, action);
					var oScore = stateScore(oppState,mySID)
					if(opponScore>oScore) {
						opponScore = oScore;
						finalState = oppState;
					}
				}
				var score = stateScore(succState,mySID)
				if(score >bestScore){
					bestScore = score;
					bestAction = action;
				}
			}
		}
		return bestAction;
  }
}

module.exports.PokAImonAgent = PokAImonAgent
