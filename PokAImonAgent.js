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

	this.stateScore = function (gameState, copiedState, mySID) {
	 //TODO: Use neural net to give state a score
	}

    this.decide = function (gameState, options, mySide, forceSwitch) {
    	//AI algo goes here
    	//basic idea: this function will first make a copy of gameState (in order to avoid tampering with gameState which
    	//is what hold our actual battle information), after that the copy of gameState will be modified as we simulate
    	//future turns by sending choice request to local simulator, and return the best choice

    	//sending choice request to local simulator by invoking copiedState.receive(...) or copiedState.choose(sideid, input, rqid)
    	//where copiedState is the copy of gameState. receive() will eventually call choose() method, so we need to consider
    	//whether we call choose() directly or we call receive(). Basically after copiedState.choose() is invoked,
    	//local simulation will take place and copiedState will be modified accordingly, that is why we use copiedState
    	//instead of gameState since we don't want gameState to be modified by our simulation.

    	//at any simulated state, use this.getOptions(state, mySID) to get an array of feasible options
    	//options has the form of "move blabla" or "switch number". message sent will be |\choose move blabbla or |\choose switch 3

    	//servcom.js will call this decide function and it will send final choice to server as the bot's decision
		this.mySID = mySide.n;
    	var botSide = mySide.id;
    	//console.log("mySide:");
    	//console.log(botSide); //p2

    	var copiedState = gameState.copy();

		this.oppAction(gameState, this.mySID, true);
		if (options && copiedState.sides[1-this.mySID].active[0] && copiedState.sides[this.mySID].active[0]) {
			var results = this.minimax(copiedState, options, 1, this.mySID, forceSwitch); //MINIMAX
			console.log('\n');
			console.log(results); //an Object
			console.log('\n');
			console.log(copiedState.sides[this.mySID].active[0]);

			var bestScore = -10000;
			var bestScoreAction = [];
			for (var action in results) { //to discourage protect and destiny bond if previously used
				if (action == 'move protect' || action == 'move destinybond' || action == 'move spikyshield' ||  action == 'move kingsshield') {
					if (gameState.sides[this.mySID].active[0].lastMove == 'protect' || gameState.sides[this.mySID].active[0].lastMove == 'destinybond' || gameState.sides[this.mySID].active[0].lastMove == 'spikyshield' || gameState.sides[this.mySID].active[0].lastMove == 'kingsshield') {
						results[action]['Current Score'].effscore -= 30;
					}
				}
				if ((action == 'move fakeout' || action == 'move firstimpression') && !gameState.sides[this.mySID].active[0].newlySwitched) {
					results[action]['Current Score'].effscore -= 50;
				}

				if (results[action]['Current Score'].effscore > bestScore) {
					bestScore = results[action]['Current Score'].effscore;
				}
			}
			for (var action in results) { //to score an array of bestScoreActions
				if (results[action]['Current Score'].effscore == bestScore) {
					bestScoreAction.push(action);
				}
			}
			if (bestScoreAction.length == 1) { //if there is only one best scored action
				var item = gameState.sides[this.mySID].active[0].item;
				console.log('Item: '+ item + ' line 701')
				console.log((item.endsWith('ite') || item.endsWith('itex') || item.endsWith('itey')));
				console.log(bestScoreAction[0].startsWith('move'));
				if ((item.endsWith('ite') || item.endsWith('itex') || item.endsWith('itey')) && bestScoreAction[0].startsWith('move')) { //basically if item is a megastone
					if (item != 'eviolite') {
						console.log('Mega item: '+item);
						gameState.sides[this.mySID].active[0].item = ''; //to prevent sending mega request thereafter
						return bestScoreAction[0]+ ' mega';
					}
				}
				return bestScoreAction[0];
			}
			else {
				var strongestMove;
				var bestDamage = 0;
				var KOMoves = [];
				var attacker = gameState.sides[this.mySID].active[0];
				var defender = gameState.sides[1-this.mySID].active[0];
				var hpleft = defender.hp;
				for (var i=0; i < bestScoreAction.length; i++) { //iterate through best scored ones
					if (bestScoreAction[i].startsWith('move')) { //only choose moves, ignore switches
						var moveid = bestScoreAction[i].split(' ')[1]; //this is only a move id
						var damage = gameState.getDamage(attacker, defender, moveid, null);
						if (damage > hpleft) {
                        	KOMoves.push(moveid); //store a list of moves that kills
                        }
						if (damage > bestDamage) {
							bestDamage = damage;
							strongestMove = moveid;
						}
					}
				}
				var item = gameState.sides[this.mySID].active[0].item;
				if (KOMoves.length > 0) {
                	var bestAccuracy = 0;
                	var mostAccurateMove;
                	for (i=0; i < KOMoves.length; i++) {
                		var move = KOMoves[i]
                		var accuracy = gameState.getMove(move).accuracy;
                		if (typeof(accuracy)!= 'number') accuracy = 110;
                		if (accuracy > bestAccuracy) {
                			bestAccuracy = accuracy;
                			mostAccurateMove = move;
                		}
                	}
                	console.log('Item: '+ item + ' line 743') //TODO: mega evo failure comes from this (probably fixed)
                	if (item.endsWith('ite') || item.endsWith('itex') || item.endsWith('itey')) {
                		if (item != 'eviolite') {
                			console.log('Mega item: '+item);
                			gameState.sides[this.mySID].active[0].item = ''; //to prevent sending mega request thereafter
                			return 'move ' + mostAccurateMove + ' mega'
                		}
                	}
                	return 'move ' + mostAccurateMove;
                }
                else if (strongestMove) { //return strongestMove
                	console.log('Item: '+ item + ' line 754')
                	if (item.endsWith('ite') || item.endsWith('itex') || item.endsWith('itey')) {
                		if (item != 'eviolite') {
                			gameState.sides[this.mySID].active[0].item = ''; //to prevent sending mega request thereafter
                			return 'move ' + strongestMove + ' mega'
                		}
                	}
                	return 'move ' + strongestMove;
                }
                else {
                	console.log('Item: '+ item + ' line 765')
                	if ((item.endsWith('ite') || item.endsWith('itex') || item.endsWith('itey')) && bestScoreAction[0].startsWith('move')) {
                		if (item != 'eviolite') {
                			console.log('Mega item: '+item);
                			gameState.sides[this.mySID].active[0].item = ''; //to prevent sending mega request thereafter
                			return bestScoreAction[0]+' mega';
                		}
                	}
                	else return bestScoreAction[0];
                }
			}

		}

		//JUST LOGGGING STUFF
		if (copiedState.sides[1-this.mySID].active[0]) {
			//this.oppAction(gameState, mySID);
			//console.log(copiedState.sides[1-this.mySID].active[0]);
			console.log(copiedState.sides[1-this.mySID].active[0].hp + '/' +copiedState.sides[1-this.mySID].active[0].maxhp);
			//console.log(gameState.sides[1-this.mySID].active[0].moveset);
			//if (gameState.sides[1-this.mySID].active[0].moveset[0]) console.log(gameState.getMove(gameState.sides[1-this.mySID].active[0].moveset[0].id));
			//this.oppAction (gameState, mySID, true);
		}
		if (gameState.sides[this.mySID].active[0]) {
			//console.log(this.getOptions(gameState, mySID));
			console.log(copiedState.sides[this.mySID].active[0].fullname);
        	//console.log(gameState.sides[this.mySID].active[0].moves);
        	//console.log(gameState.sides[1-this.mySID].active[0].moveset); //important: contains pp
        	//console.log(Object.keys(gameState.sides[this.mySID].pokemon).length);
			//console.log(gameState.sides[this.mySID].pokemon[0].fainted);
        	//console.log(copiedState.sides[1-this.mySID].active[0].hp + '/' +copiedState.sides[1-this.mySID].active[0].maxhp);
        }

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
