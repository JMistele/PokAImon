'use strict';

var Pokemon = require('./zarel/battle-engine.js').BattlePokemon;
var BattleSide = require('./zarel/battle-engine.js').BattleSide;
var TypeChart = require('./zarel/data/typechart.js').BattleTypeChart;
var MoveSets = require('./zarel/data/formats-data.js').BattleFormatsData;
var PokeNet = require('./pokeNet.js');


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
		var attacker = gameState.sides[1-mySID].active[0];
		var defender = gameState.sides[mySID].active[0];
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

	this.stateScore = function (gameState, mySID, myNet) {
	 return myNet.evaluate(gameState, mySID);
	}

	this.decide = function (gameState, options, mySide, forceSwitch, myNet) {
				var fakePhi = [];
				for(var i = 0; i < 189; i++){
					fakePhi.push(1);
				}
				console.log(myNet.net.activate(fakePhi));
				var fakePhi = [];
				for(var i = 0; i < 189; i++){
					fakePhi.push(500);
				}
				console.log(myNet.net.activate(fakePhi));
				var fakePhi = [];
				for(var i = 0; i < 189; i++){
					fakePhi.push(.1);
				}
				console.log(myNet.net.activate(fakePhi));
				var fakePhi = [];
				for(var i = 0; i < 189; i++){
					fakePhi.push(-1);
				}
				console.log(myNet.net.activate(fakePhi));
        var mySID = mySide.n;
        console.log('My SID');
        console.log(mySID);
        //FROM CYNTHIAI
        if (options.constructor === Object) { //basically if it is an object, make it an array
            var options = Object.keys(options);
        }
        var choices = options;
        //Just fucking pray
        // if(!(choices.length > 0)){
        //     throw "options failure.";
        // }
        if(choices==null){
            console.log('ah rip');
            choices = this.getOptions(gameState, mySID);
            console.log(choices.length);
        }
        //if need to switch
    if(forceSwitch) {
                var newOptions = [];
                for(var i=0; i<choices.length; i++) {
                        if(choices[i].includes("switch")) {
                                newOptions.push(choices[i]);
                        }
                }
                choices = newOptions;
        }
        var botSide = 'p'+(mySID+1);
        var oppSide = 'p'+(2-mySID);
        var bestAction = null;
        var bestScore = -10
        for(var i = 0; i<choices.length; i++) {
            var action = choices[i];
            var succState = gameState.copy();
            succState.p1.currentRequest = 'move';
            succState.p2.currentRequest = 'move';
            if(forceSwitch){
                succState.choose(oppSide, 'forceskip');
                succState.choose(botSide, action);
                succState.choose(botSide, action);
                var score = this.stateScore(succState,mySID, myNet)
                if(score > bestScore){
                    bestScore = score;
                    bestAction = action;
                }
            }
            else{
                var opponScore = 100;
                var oppMoves = this.getOpponentActions(gameState,mySID);
                var finalState = null;
                for(var j=0; j<oppMoves.length; j++){

                    /*
                    if (oppMoves[j].startsWith('move')) { //predict worst move when less than 2 moves have been revealed
                        var moveid = oppMoves[j].split(' ')[1];
                        if (succState.sides[1-mySID].active[0].moves.indexOf(moveid) == -1) {
                            this.addFakeMove(succState, moveid, mySID); //add fake move so that sim would work
                        }
                    }
                    */

                    var oppState = succState.copy();
                    oppState.choose(oppSide, oppMoves[j]);
                    oppState.choose(botSide, action);
                    var oScore = this.stateScore(oppState, mySID, myNet);
                    console.log(oScore);
                    if(opponScore>oScore) {
                        opponScore = oScore;
                        finalState = oppState;
                    }
                }
                var score = this.stateScore(finalState ,mySID, myNet);
                if(score >bestScore){
                    bestScore = score;
                    bestAction = action;
                }
            }
        }
        console.log(bestAction);
        if(bestAction == null){
            console.log("RETURNED NULL AS BESTACTION ==============");
        }
        return bestAction;
  }
	this.assumePokemon = function (pname, plevel, pgender, side) { //maybe add heuristics to predict certain poke's ability, item
			var nSet = {
					species: pname,
					name: pname,
					level: plevel,
					gender: pgender,
					evs: { hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84 }, //apparently all evs are 84, as heard from somebody
					ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
					nature: "Hardy",
					ability: "Honey Gather",
					item: "Old Amber" //TODO: check if item was recorded in gamestate
			};
			// If the species only has one ability, then the pokemon's ability can only have the one ability.
			// Barring zoroark, skill swap, and role play nonsense.
			// This will be pretty much how we digest abilities as well
			if (Object.keys(Tools.getTemplate(pname).abilities).length == 1) {
					nSet.ability = Tools.getTemplate(pname).abilities['0'];
			}

			var basePokemon = new Pokemon(nSet, side);

			return basePokemon;
	}
}

module.exports.PokAImonAgent = PokAImonAgent
