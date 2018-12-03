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

class PokeNet {
	constructor(mySID, netPath) {
		this.featureKey = {};
		this.featureCount = 0;
		this.mySID = mySID;
		if(!netPath){
			this.file = 'pokeNet.json'
		} else {
			this.file = netPath;
		}
		fs.readFile(this.file, function(err, data){
			if(err) {
				console.log('neural net does not exist, creating...');
				this.net = new Synaptic.Architect.Perceptron(featureCount, 20, 1)
				//TODO: 20 is a magic number, pulled out me hat
			} else {
				this.net = Network.fromJSON(data);
			}
		})
	}

	featurizeState(gameState){
		//TODO: Featurize
		var phi = [];
		for(var i = 0; i < featureCount; i++){
			phi.push(0);
		}
	}
	
	learn(stateArray, rewardArray, learningRate){
		for(var i = 0; i < stateArray.length; i++){
			this.net.activate([featurizeState(stateArray[i])]);
			this.net.propagate(learningRate, rewardArray[i]);
		}
	}

	saveNet(path){
		fs.access(path, fs.constants.W_OK, function(err){
			if(err){
				console.log(err);
				return;
			}
			else{
				var netStream = fs.createWriteStream(this.file, {'flags': 'w'});
				var exported = myNetwork.toJSON();
				netStream.write(exported);
			}
		})
	}

	evaluate(gameState){
		return this.net.activate(featurizeState(gameState));
	}

}






