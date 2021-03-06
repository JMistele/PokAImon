'use strict';
var Pokedex = require('./zarel/data/pokedex.js').BattlePokedex;
/*
	This file is used for handling communication between each agent (bot) and server
	Information regarding battle logs will be collected and processed
	InterfaceLayer.battle which is a general Battle object keeps a local instant of Battle holding the processed data
*/

var simulator = require('./zarel/battle-engine.js').Battle;

class InterfaceLayer {
    constructor(id, username, cLayer, agent) {
        this.id = id;
        this.uname = username;
        this.battle = simulator.construct(this.id, 'ou', false, null);
        this.mySide = "";
        this.mySID = 0;
        this.firstTurn = false;
        this.cTurnOptions = {};
        this.cLayer = cLayer;
        this.agent = agent;
        this.format = '';
        // Because apparently, when zoroark is active, the server lies to everyone
        this.zoroarkActive = false;
    }

    convertTeamToSet(pokemon) {
        var nTeam = [];
        for (var i = 0; i < pokemon.length; i++) {
            var cpoke = pokemon[i];
            var nSet = {
                species: cpoke.details.split(',')[0],
                name: cpoke.details.split(',')[0],
                level: 100,
                gender: "",
                ability: cpoke.baseAbility,
                item: cpoke.item,
                moves: cpoke.moves,
                stats: cpoke.stats
            };
            if (cpoke.details.split(',')[1]) {
                if (cpoke.details.split(',')[1].startsWith(' L')) {
                    nSet.level = parseInt(cpoke.details.split(',')[1].split('L')[1]);
                }
                if (cpoke.details.split(',')[2]) {
                    nSet.gender = cpoke.details.split(',')[2].trim();
                }
                else if (cpoke.details.split(',').length == 2 && !cpoke.details.split(',')[1].startsWith(' L')) {
                    nSet.gender = cpoke.details.split(',')[1].trim();
                }
            }
            nTeam[i] = nSet;
        }
        return nTeam;
    }

    // It's all fine and good for the forward model to do switchin, but we shouldn't be invoking switch events when reflecting server state
    // Specifically, we need to avoid setting off beforeSwitch events
    // Those events will be sent over too, and we will handle those separately
    // This is pretty much the same thing as this.battle.switchin except it doesnt push anything to the event queue
    runExternalSwitch(pokemon, pos) {
        let side = pokemon.side;
        if (pos >= side.active.length) {
            throw new Error("Invalid switch position!");
        }
        if (side.active[pos]) {
            let oldActive = side.active[pos];
            if (oldActive.switchCopyFlag === 'copyvolatile') {
                delete oldActive.switchCopyFlag;
                pokemon.copyVolatileFrom(oldActive);
            }
        }
        if (side.active[pos]) {
            let oldActive = side.active[pos];
            oldActive.isActive = false;
            oldActive.isStarted = false;
            oldActive.usedItemThisTurn = false;
            oldActive.position = pokemon.position;
            pokemon.position = pos;
            side.pokemon[pokemon.position] = pokemon;
            side.pokemon[oldActive.position] = oldActive;
            this.battle.cancelMove(oldActive);
            oldActive.clearVolatile();
        }
        side.active[pos] = pokemon;
        pokemon.isActive = true;
        pokemon.isStarted = true;
        pokemon.activeTurns = 0;
        if (pokemon.statusData.stage) {
            pokemon.statusData.stage = 0;
        }
        for (let m in pokemon.moveset) {
            pokemon.moveset[m].used = false;
        }
    }

    // Once again, setstatus sets off a bunch of events, the data of which is sent later.
    // To avoid duplication, we only execute a small part of setStatus
    runExternalStatus(pokemon, status) {
        status = this.battle.getEffect(status);

        if (status == 'fnt') {
            pokemon.status = status.id;
            pokemon.fainted = true; //THIS FUCKING LINE TODO
            pokemon.isActive = false;
            pokemon.isStarted = false;
            pokemon.side.pokemonLeft--;
        }
        else if (pokemon.status != status.id) {
            pokemon.status = status.id;
            pokemon.statusData = { id: status.id, target: pokemon };
            if (status.duration) {
                pokemon.statusData.duration = status.duration;
            }
            if (status.durationCallback) {
                pokemon.statusData.duration = status.durationCallback.call(this.battle, pokemon);
            }
            // Modify the way sleep interacts with time, to Monty Hall framing
            pokemon.statusData.time = 0;
            pokemon.statusData.stage = 0;
        }
    }

    // See above
    runExternalWeather(status, source) {
        status = this.battle.getEffect(status);

        if (this.battle.weather != status.id) {
            let prevWeather = this.battle.weather;
            let prevWeatherData = this.battle.weatherData;
            this.battle.weather = status.id;
            this.battle.weatherData = { id: status.id };
            if (source) {
                this.battle.weatherData.source = source;
                this.battle.weatherData.sourcePosition = source.position;
            }
            if (status.duration) {
                this.battle.weatherData.duration = status.duration;
            }
            if (status.durationCallback) {
                this.battle.weatherData.duration = status.durationCallback.call(this.battle, source);
            }
        }

    }

    runExternalAddMove(pokemon, movename) {
    	var moveid = toId(movename);
        var move = this.battle.getMove(moveid);
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
        else { //move already revealed
        	//update pp
        	for (var i = 0; i < pokemon.moveset.length; i++) {
        		if (move.id == pokemon.moveset[i].id) {
					pokemon.moveset[i].pp -= 1
        		} //TODO: consider pressure
        	}
        }
    }

    runExternalAddAbility(pokemon, ability) {
        if (toId(ability) != pokemon.ability) {
            ability = this.battle.getAbility(toId(ability));
            pokemon.ability = ability.id;
            pokemon.abilityData = { id: ability.id };
        }
    }

    runExternalAddItem(pokemon, item) {
        if (toId(item) != pokemon.item) {
            item = this.battle.getItem(toId(item));
            pokemon.item = item.id;
            pokemon.itemData = { id: item.id };
        }
    }

    runExternalBoost(pokemon, stat, amt) {
        if (!amt) {
            amt = 1;
        }
        if (stat) {
            pokemon.boosts[stat] = pokemon.boosts[stat] + amt;
            if (pokemon.boosts[stat] > 6) {
                pokemon.boosts[stat] = 6;
            }
        }
    }

    runExternalUnboost(pokemon, stat, amt) {
        if (!amt) {
            amt = 1;
        }
        if (stat) {
            pokemon.boosts[stat] = pokemon.boosts[stat] - amt;
            if (pokemon.boosts[stat] < -6) {
                pokemon.boosts[stat] = -6;
            }
        }
    }

    // This is fine because no side condition has a problematic onStart
    runExternalSideCondition(side, status) {
        side.addSideCondition(status);
    }

    runExternalRemoveSideCondition(side, status) {
        side.removeSideCondition(status);
    }

    runExternalAddVolatile(pokemon, status) {
        // console.log('Volatile!');
        let result;
        status = this.battle.getEffect(status);
        if (!pokemon.hp && !status.affectsFainted) return false;
        if (pokemon.volatiles[status.id]) {
            if (!status.onRestart) return false;
            return this.battle.singleEvent('Restart', status, pokemon.volatiles[status.id], pokemon);
        }
        pokemon.volatiles[status.id] = { id: status.id };
        pokemon.volatiles[status.id].target = pokemon;
        pokemon.volatiles[status.id].source = pokemon.side.foe.active[0];
        if (status.duration) {
            pokemon.volatiles[status.id].duration = status.duration;
        }
        if (status.durationCallback) {
            pokemon.volatiles[status.id].duration = status.durationCallback.call(this.battle, pokemon);
        }

        result = this.battle.singleEvent('Start', status, pokemon.volatiles[status.id], pokemon); //TODO: cursedbody bug here
        if (!result) {
            // cancel
            delete pokemon.volatiles[status.id];
            return result;
        }
        //console.log(status + ' started!');
        //console.log(pokemon.volatiles);
        //console.log(pokemon.hp);
    }

    runExternalTypeChange(pokemon, ntype) {
        if (!ntype) throw new Error("Must pass type to setType");
        pokemon.types = (typeof ntype === 'string' ? [ntype] : ntype);
        pokemon.addedType = '';
        pokemon.knownType = true;
    }

    runExternalRemoveVolatile(pokemon, status) {
        pokemon.removeVolatile(status);
       // console.log(pokemon.volatiles);
    }

    runExternalFieldEffect(status) {
        if (status.endsWith('terrain')) {
            this.battle.setTerrain(status);
            console.log(this.battle.terrain);
        }
        else {
            console.log(status);
            this.battle.addPseudoWeather(status);
            console.log(this.battle.pseudoWeather);
        }
    }

    runExternalFieldEnd(status) {
        if (status.endsWith('terrain')) {
            this.battle.clearTerrain();
            console.log(this.battle.terrain);
        }
        else {
            console.log(status);
            this.battle.removePseudoWeather(status);
            console.log(this.battle.pseudoWeather);
        }
    }

    processLine(line) {

        // right now, super, immune, resist are counted as boring tags.  They do present relevant information in case the information given doesnt line up for whatever reason (see zororark), but in a very niche case, and takes more work to digest
        var boringTags = ["", " ", "init", "title", "j", "gametype", "gen", "seed", "rated", "choice", "-supereffective", "-resisted", "-miss", "-immune", "-crit", "faint", "raw", 'fail', 'cant', '-hitcount', '-singleturn', '-activate', '-fail', '-singlemove', '-notarget'];
        var arr = line.split("|");
        var tag = arr[1];

        if (tag == "player") { // |player|p2|Ultimateruffles13|279
            if (arr[3] == this.uname) { //['', 'player', 'p2', 'username', '279']
                this.mySide = arr[2];
                this.mySID = parseInt(this.mySide.substring(1)) - 1; //basically 0 or 1
            }
        }
        else if (tag == 'tier') {
            this.format = arr[2];
        }
        
        else if (tag == "request" && arr[2] != undefined && arr[2] != '' && arr[2] != null) { // |request|{"active":[{"moves":[{"move":"Night Slash","id":"nightslash","pp":24,"maxpp":24,"target":"normal","disabled":false},...
            var requestData = JSON.parse(arr[2]); //this is basically bot's team

            if (!this.firstTurn) { //if first turn hasn't started
                if (this.mySide == 'p1') {
                    // TODO: SEE battle-engine.js line 5000
                	//this is where bot's side is updated with a team
                    this.battle.join(this.mySide, this.uname, this.mySID, this.convertTeamToSet(requestData['side']['pokemon']));
                    //this is wehre opponent's side joins
                    this.battle.join((this.mySide == 'p1' ? 'p2' : 'p1'), 'opponent', 1 - this.mySID, []);
                }
                else { //do same thing as above, just the opposite case
                    this.battle.join((this.mySide == 'p1' ? 'p2' : 'p1'), 'opponent', 1 - this.mySID, []);
                    this.battle.join(this.mySide, this.uname, this.mySID, this.convertTeamToSet(requestData['side']['pokemon']));
                }
                //equate number of mon of opponent's to bot's side
                //might not work for custom
                this.battle.sides[1 - this.mySID].pokemonLeft = this.battle.sides[this.mySID].pokemonLeft;

            }
            this.cTurnOptions = {}; //current turn's options, basically check available moves (not disabled and pp > 0), can also be switch options
            this.cTurnMoves = {}; // current turn's move options
            if (requestData['active']) { //if has active pokemon
                for (var i = 0; i < requestData['active'][0]['moves'].length; i++) { //iterate through moveset
                    if (requestData['active'][0]['moves'][i]['disabled'] == false && requestData['active'][0]['moves'][i].pp > 0) { //if not disabled and pp > 0
                        this.cTurnOptions['move ' + requestData['active'][0]['moves'][i].id] = requestData['active'][0]['moves'][i]; //add each move to cTurnOptions
                        this.cTurnMoves['move ' + requestData['active'][0]['moves'][i].id] = requestData['active'][0]['moves'][i]; //add each move to cTurnMoves

                        if (this.battle.sides[this.mySID].active[0]) { // if active mon has moves
                            for (var j = 0; j < this.battle.sides[this.mySID].active[0].moveset.length; j++) { //iterate through moveset
                                if (requestData['active'][0]['moves'][i].id == this.battle.sides[this.mySID].active[0].moveset[j].id) {
                                    this.battle.sides[this.mySID].active[0].moveset[j].pp = requestData['active'][0]['moves'][i].pp; //update pp in moveset, but weird tho
                                }
                            }
                        }
                    }
                }
            }
            if (requestData['side'] && !(requestData['active'] && requestData['active'][0]['trapped'])) { //if active pokemon is not trapped, explore switch options
                // Basically, if we switch to zoroark, the request data will reflect it, but the switch event data will not.
                // Therefore, if a switch event happens on this turn, we override the swapped pokemon with zoroark
                this.zoroarkActive = requestData['side']['pokemon'][0].details.startsWith('Zoroark');

                for (var i = 1; i < requestData['side']['pokemon'].length; i++) { //iterate through pokemon list
                    if (requestData['side']['pokemon'][i].condition.indexOf('fnt') == -1) { //if pokemon not faint
                        this.cTurnOptions['switch ' + (i + 1)] = requestData['side']['pokemon'][i]; //add switch option
                    }
                }
            }
            for (var option in this.cTurnOptions) {
                this.cTurnOptions[option].choice = option; //what?
            }
            for (var option in this.cTurnMoves) {
                this.cTurnMoves[option].choice = option;
            }
            if (requestData['forceSwitch'] && requestData['forceSwitch'][0]) {
            	//this line below sends a response to the local simulator instead of server, thus we probably won't need it because we'll handle it ourselves
                //this.cLayer.send(this.id + '|/choose ' + this.agent.decide(this.battle, this.cTurnOptions, this.battle.sides[this.mySID], true), this.mySide);
            }

        }


        else if (tag == 'switch') {
            // As of right now, this only supports single battles. I haven't seen the protocol for doubles yet.

            if (arr[2].startsWith(this.mySide)) { // arr = ['', 'switch', 'p1a: Arcanine', 'Arcanine, L77, M', '265.265']
                var pName = arr[3].split(',')[0];
                if (this.zoroarkActive == true) {
                    pName = 'Zoroark';
                    this.zoroarkActive = false;
                }
                // iterate through pokemon, if name found, then switch using that object and pos 0, else generate a new one, and do shit
                for (var i = 0; i < this.battle.sides[this.mySID].pokemon.length; i++) {
                    if (pName == this.battle.sides[this.mySID].pokemon[i].species) {
                        this.runExternalSwitch(this.battle.sides[this.mySID].pokemon[i], 0);
                        break;
                    }
                }
                    // console.log(line);
            }
            else { //else it's the other side
                var found = false; //meaning new pokemon just got revealed, hence not found in team
                var pInfo = arr[3].split(','); // ['Arcanine', 'L77', 'M']
                var pName = pInfo[0]; //pokemon species
                if (arr[4]) {
                	var pHp = arr[4].split('/')[0]; //this is only a HP percentage
                }

                //iterate through team, if found (already revealed), update pokemon
                for (var i = 0; i < this.battle.sides[1 - this.mySID].pokemon.length; i++) {
                    if (pName == this.battle.sides[1 - this.mySID].pokemon[i].species) {
        				if (arr[4]) {
        					this.battle.sides[1 - this.mySID].pokemon[i].hp = (pHp/100)*this.battle.sides[1 - this.mySID].pokemon[i].maxhp;
        				}
                        this.runExternalSwitch(this.battle.sides[1 - this.mySID].pokemon[i], 0);
                        found = true;
                        break;
                    }
                }
                //otherwise it is a new pokemon, thus not found
                if (!found) {
                    var pLev = pInfo[1];
                    var pGen = '';
                    if (pInfo[1]) {
                        if (pInfo[1].startsWith(' L')) { //update level
                            pLev = parseInt(pInfo[1].split('L')[1]);
                        }
                        if (pInfo[2]) { //update gender
                            pGen = pInfo[2].trim();
                        }
                        else if (!pInfo[1].startsWith(' L')) { //if no level is indicated, it must be gender instead
                            pGen = pInfo[1].trim();
                        }
                    }
                    var npoke = this.agent.assumePokemon(pName, pLev, pGen, this.battle.sides[1 - this.mySID]); //newpoke
                    npoke.position = this.battle.sides[1 - this.mySID].pokemon.length;
                    this.battle.sides[1 - this.mySID].pokemon.push(npoke); //add newpoke to pokemon array
                    this.runExternalSwitch(npoke, 0); //update newpoke
                }
            }
        }

        //Dang: also commented for the time being
        else if (tag == 'turn') {
            // Because we never invoke the residual event (since that would set off a lot of other events), we need to manually update turn counters.
            if (this.battle.weatherData && this.battle.weatherData.duration) {
                this.battle.weatherData.duration--;
            }
            if (this.battle.terrainData.duration) {
                this.battle.terrainData.duration--;
            }
            for (var status in this.battle.pseudoWeather) {
                if (this.battle.pseudoWeather[status].duration) {
                    this.battle.pseudoWeather[status].duration--;
                }
                if (this.battle.pseudoWeather[status].time) {
                    this.battle.pseudoWeather[status].time++;
                }
                if (this.battle.pseudoWeather[status].stage) {
                    this.battle.pseudoWeather[status].stage++;
                }
            }
            for (var sideid in this.battle.sides) {
                var side = this.battle.sides[sideid];
                for (var status in side.sideConditions) {
                    if (side.sideConditions[status].duration) {
                        side.sideConditions[status].duration--;
                    }
                    if (side.sideConditions[status].time) {
                        side.sideConditions[status].time++;
                    }
                    if (side.sideConditions[status].stage) {
                        side.sideConditions[status].stage++;
                    }
                }
                var pokemon = this.battle.sides[sideid].active[0];
                // console.log(pokemon)
                // console.log(this.battle.sides[1]);

                if (pokemon.statusData.duration) {
                    pokemon.statusData.duration--;
                }
                if (pokemon.statusData.time) {
                    pokemon.statusData.time++;
                }
                if (pokemon.statusData.stage) {
                    pokemon.statusData.stage++;
                }
                for (var status in pokemon.volatiles) {
                    if (pokemon.volatiles[status].duration) {
                        pokemon.volatiles[status].duration--;
                    }
                    if (pokemon.volatiles[status].time) {
                        pokemon.volatiles[status].time++;
                    }
                    if (pokemon.volatiles[status].stage) {
                        pokemon.volatiles[status].stage++;
                    }
                }
            }

            if (!this.firstTurn) {
                this.firstTurn = true;
            }
            this.zoroarkActive = false;

            /* this part below basically means, at the end of every turn, a decision is made, thus this part is commented since
            making decision will be handled by our bot, not this piece of code

            var choice = '';
            // This happens if we locked ourselves into a move (See: Solarbeam, fly, outrage, phantom force).  Resolved by arbitrarily sending a random thing.
            if (Object.keys(this.cTurnOptions).length == 0) {
                choice = 'move 1';
            }
            else {
                choice = this.agent.decide(this.battle, this.cTurnOptions, this.battle.sides[this.mySID]);
            }
            console.log("I chose " + choice);
            this.cLayer.send(this.id + '|/choose ' + choice, this.mySide);
                // Add code that processes the end of a turn
            */

            //console.log("Options: \n");
            //console.log(this.cTurnOptions);
            //console.log("Active opp: \n");
            //console.log(pokemon = this.battle.sides[sideid].active[0]);
        }
        /*
        else if (tag == 'callback') {
            if (arr[2] == 'trapped') {
                // So this is where things get complicated.  maybetrapped means that something caused the opponent to be trapped
                // callback can confirm that they are trapped, but this doesnt tell us anything conclusive.
                // There's a specific confluence of events wherein a trapped callback reveals the ability of the opponent.
                this.cLayer.send(this.id + '|/choose ' + this.agent.decide(this.battle, this.cTurnMoves, this.battle.sides[this.mySID]), this.mySide);
                this.agent.digest(line);
            }
        }
        */

        else if (tag == 'move') { //|move|p1a: Arcanine|Will-O-Wisp|p2a: Seaking
            // Should also update lastmoveused
            // if arr[4] has [from] lockedmove and the user has the volatile twoturnmove, then we have to remove the volatile
            // fs.appendFile('log.txt', line + '\n', function (err) { });

            var sindex = parseInt(arr[2].substring(1)) - 1; //side index: 0 or 1
            if (arr[5] && arr[5] == '[from]lockedmove') {
                console.log(line);
                var sindex = parseInt(arr[2].substring(1)) - 1;
                this.runExternalRemoveVolatile(this.battle.sides[sindex].active[0], 'twoturnmove');
                this.runExternalRemoveVolatile(this.battle.sides[sindex].active[0], toId(arr[3]));
            }
            if (!arr[2].startsWith(this.mySide)) { //if not myside
                this.runExternalAddMove(this.battle.sides[1 - this.mySID].active[0], arr[3]); //update opponent's move
                this.battle.sides[1 - this.mySID].active[0].lastMove = this.battle.getMove(arr[3]).id; //update lastMove
                this.battle.sides[1 - this.mySID].active[0].activeTurns += 1;
                this.battle.sides[1 - this.mySID].active[0].newlySwitched = false;
            }
            else {
                this.battle.sides[this.mySID].active[0].lastMove = this.battle.getMove(arr[3]).id; //update my move
                this.battle.sides[this.mySID].active[0].activeTurns += 1;
                this.battle.sides[this.mySID].active[0].newlySwitched = false;
            }
        }


        // -damage Update model.  Change only opponent health to the fraction given.  Format: tag, pokemon, status (num/den status), maybe from
        else if (tag == '-damage' || tag == '-heal') { //TODO: update life orb
            if (arr[2].startsWith(this.mySide)) {
                var info = arr[3];
                var infoarr = info.split(' '); // 0/112 fnt/brn/frz
                var chealth = parseInt(infoarr[0].split('/')[0]);
                this.battle.sides[this.mySID].active[0].hp = chealth;
                if (infoarr[1]) {
                	this.runExternalStatus(this.battle.sides[this.mySID].active[0], infoarr[1]);
                }
            }
            else {
                var info = arr[3];
                var infoarr = info.split(' ');
                var chealth = parseInt(infoarr[0].split('/')[0]);
                if (infoarr[0].split('/')[1]) {
                    this.battle.sides[1 - this.mySID].active[0].hp = chealth / parseInt(infoarr[0].split('/')[1]) * this.battle.sides[1 - this.mySID].active[0].maxhp;
                }
                else {
                    this.battle.sides[1 - this.mySID].active[0].hp = chealth;
                }
                if (infoarr[1]) {
                    this.runExternalStatus(this.battle.sides[1 - this.mySID].active[0], infoarr[1]);
                }
                if (arr[4]){
					if (arr[4].startsWith('[from] ability')) { //for waterabsorb/voltabsorb
						var ability = arr[4].split(': ')[1];
						this.runExternalAddAbility(this.battle.sides[1-this.mySID].active[0], toId(ability));
					}
					if (arr[4].startsWith('[from] item')) { //for leftovers, life orb..
						var item = arr[4].split(': ')[1];
						this.runExternalAddItem(this.battle.sides[1-this.mySID].active[0], toId(item));
					}
                }
            }
        }


        else if (tag == '-sethp') {
        	var oppSide = 'p'+(2-this.mySID);
        	for (var i=2; i < arr.length; i++) {
        		if (arr[i].startsWith(oppSide)) { //opp
        			var infoarr = arr[i+1].split(' ');
					var numerator = infoarr[0].split('/')[0];
					var denominator = infoarr[0].split('/')[1];
					this.battle.sides[1-this.mySID].active[0].hp = (numerator/denominator)*this.battle.sides[1-this.mySID].active[0].maxhp;
        		}
        		else if (arr[i].startsWith(this.mySide)) { //bot
         			var infoarr = arr[i+1].split(' ');
 					var numerator = infoarr[0].split('/')[0];
 					var denominator = infoarr[0].split('/')[1];
                    this.battle.sides[this.mySID].active[0].hp = numerator;
        		}
        	}
        }
        else if (tag == '-immune') {
        	if (!arr[2].startsWith(this.mySide)) { //to handle water absorb/ volt absorb ability of opp
        		if (arr[4] && arr[4].startsWith('[from] ability')) {
        			var ability = arr[4].split(': ')[1];
        			this.runExternalAddAbility(this.battle.sides[1-this.mySID].active[0], toId(ability));
        		}
        	}
        }
        else if (tag == 'faint') {
        	var side = arr[2].split(' ')[0];
			if (side.startsWith(this.mySide)) {
				this.battle.sides[this.mySID].active[0].hp = 0;
                console.log('POKEMON HAS FAINTED');
			}
			else {
				this.battle.sides[1-this.mySID].active[0].hp = 0;
			}
        }
        // -weather  Update model.  Can be upkeep (just up the turn counter).  Second value becomes 'none' upon ending
        else if (tag == '-weather') {
            // Currently does not take into account whether the user has damp rock or similar items.  This is hidden information, so there's no really good way to do this.
            // The weather tag by itself doesn't have that information.  We could conceivably do some voodoo with -move, but that's for another time.
            if (arr[3] && arr[4]) {
                if (arr[4].split(' ')[1].startsWith(this.mySide)) {
                    this.runExternalWeather(arr[2], this.battle.sides[this.mySID].active[0]);
                }
                else {
                    this.runExternalWeather(arr[2], this.battle.sides[1 - this.mySID].active[0]);
                    if (arr[3].split(' ')[1].startsWith('ability')) {
                        this.runExternalAddAbility(this.battle.sides[1 - this.mySID].active[0], toId(arr[3].split(':')[1].trim()));
                    }
                }
            }
            else {
                this.runExternalWeather(arr[2]);
            }
        }
        // -status  Update model.  Almost purely informative.
        else if (tag == '-status') {
            var sindex = parseInt(arr[2].substring(1)) - 1;
            this.runExternalStatus(this.battle.sides[sindex].active[0], arr[3]);
        }
        else if (tag == '-curestatus') {
            var sindex = parseInt(arr[2].substring(1)) - 1;
            this.runExternalStatus(this.battle.sides[sindex].active[0], '');
        }
        // -ability digest
        else if (tag == '-ability') {
            //  fs.appendFile('log.txt', line + '\n', function (err) { });
            if (!arr[2].startsWith(this.mySide)) {
                this.runExternalAddAbility(this.battle.sides[1 - this.mySID].active[0], arr[3].trim());
            }
        }
        // -item   Update model.  Tells us what item they have
        else if (tag == '-item') {
            var sindex = parseInt(arr[2].substring(1)) - 1;
            this.runExternalAddItem(this.battle.sides[sindex].active[0], arr[3]);
        }
        // -enditem  Update model.  Item becomes unusable.
        else if (tag == '-enditem') {
            var sindex = parseInt(arr[2].substring(1)) - 1;
            this.runExternalAddItem(this.battle.sides[sindex].active[0], '');
        }
        // -unboost  Goes without saying
        else if (tag == '-unboost') {
            var sindex = parseInt(arr[2].substring(1)) - 1;
            this.runExternalUnboost(this.battle.sides[sindex].active[0], arr[3], parseInt(arr[4]));
        }
        // -boost  See Above
        else if (tag == '-boost') {
            var sindex = parseInt(arr[2].substring(1)) - 1;
            this.runExternalBoost(this.battle.sides[sindex].active[0], arr[3], parseInt(arr[4]));
        }
        // -sidestart refers to side level volatiles (entry hazards and such)
        else if (tag == '-sidestart') {
            var status = '';
            if (arr[3].startsWith('move')) {
                var move = this.battle.getMove(toId(arr[3].split(': ')[1].trim()));
                if (move.sideCondition) {
                    status = move.sideCondition;
                }
            }
            else {
                status = toId(arr[3]);
            }
            var sindex = parseInt(arr[2].substring(1)) - 1;
            this.runExternalSideCondition(this.battle.sides[sindex], status);
        }
        else if (tag == '-sideend') {
            var status = '';
            if (arr[3].startsWith('move')) {
                var move = this.battle.getMove(toId(arr[3].split(': ')[1].trim()));
                if (move.sideCondition) {
                    status = move.sideCondition;
                }
            }
            else if (this.battle.getMove(arr[3]).sideCondition) {
                var move = this.battle.getMove(toId(arr[3].trim()));
                if (move.sideCondition) {
                    status = move.sideCondition;
                }
            }
            else {
                status = toId(status);
            }
            var sindex = parseInt(arr[2].substring(1)) - 1;
            this.runExternalRemoveSideCondition(this.battle.sides[sindex], status);
        }
        else if (tag == '-prepare') {
            // -prepare is weird.  add the twoturnmove volatile.  Refers to multi turn attacks like solarbeam and fly.  The move name is in the line
            // adding twoturnmove doesn't work using runExternalAddVolatile, just because of the way it works (it actually adds a second volatile in its onstart event using data we can't really send externally)
            // we use the battleengine's addvolatile for twoturnmove since it shouldn't throw any really problematic events
            // we then remove the '' volatile that twoturnmove's onstart event adds
            // then we manually add the second volatile
            console.log(line);
            var sindex = parseInt(arr[2].substring(1)) - 1;
            this.battle.sides[sindex].active[0].addVolatile('twoturnmove', this.battle.sides[1 - sindex].active[0]);
            this.runExternalRemoveVolatile(this.battle.sides[sindex].active[0], '');
            this.runExternalAddVolatile(this.battle.sides[sindex].active[0], toId(arr[3]));
            for (var entry in this.battle.sides[sindex].active[0].volatiles) {
                console.log(entry);
            }
        }
        else if (tag == '-start') {
            var status = arr[3];
            var sindex = parseInt(arr[2].substring(1)) - 1;
            if (status == 'typechange') {
                var ntype = arr[4];
                this.runExternalTypeChange(this.battle.sides[sindex].active[0], ntype);
                if (arr[5] && arr[5].startsWith('[from]')) {
                    this.runExternalAddAbility(this.battle.sides[sindex].active[0], arr[5].split(' ')[1]);
                }
            }
            else {
                if (status.startsWith('move')) {
                    var move = this.battle.getMove(toId(arr[3].split(': ')[1].trim()));
                    if (move.volatileStatus) {
                        status = move.volatileStatus;
                    }
                }
                if (status.startsWith('ability')) {
                    status = arr[3].split(': ')[1].trim();
                }
                this.runExternalAddVolatile(this.battle.sides[sindex].active[0], toId(status));
            }
        }
        else if (tag == '-end') {
            var sindex = parseInt(arr[2].substring(1)) - 1;
            var status = arr[3];
            if (status.startsWith('move: ')) {
                status = status.split(': ')[1].trim();
            }
            if (status.startsWith('ability')) {
                status = arr[3].split(': ')[1].trim();
            }
            this.runExternalRemoveVolatile(this.battle.sides[sindex].active[0], status);
        }
        else if (tag == '-formechange') {
            var nForme = arr[3];
            var sindex = parseInt(arr[2].substring(1)) - 1;
            this.battle.sides[sindex].active[0].formeChange(nForme, false);
            console.log('Forme Change! ' + this.battle.sides[sindex].active[0].species + ' changed to ' + arr[3]);
        }
        // drag and switch are functionally identical
        else if (tag == 'drag') {
            if (arr[2].startsWith(this.mySide)) {
                var pName = arr[3].split(',')[0];
                if (this.zoroarkActive == true) {
                    pName = 'Zoroark';
                    this.zoroarkActive = false;
                }
                // iterate through pokemon, if name found, then switch using that object and pos 0, else generate a new one, and do shit
                for (var i = 0; i < this.battle.sides[this.mySID].pokemon.length; i++) {
                    if (pName == this.battle.sides[this.mySID].pokemon[i].species) {
                        this.runExternalSwitch(this.battle.sides[this.mySID].pokemon[i], 0);
                        break;
                    }
                }
            }
            else {
                var found = false;
                var pInfo = arr[3].split(',');
                var pName = pInfo[0];
                for (var i = 0; i < this.battle.sides[1 - this.mySID].pokemon.length; i++) {
                    if (pName == this.battle.sides[1 - this.mySID].pokemon[i].species) {
                        this.runExternalSwitch(this.battle.sides[1 - this.mySID].pokemon[i], 0);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    var pLev = 100;
                    var pGen = '';
                    if (pInfo[1]) {
                        if (pInfo[1].startsWith(' L')) {
                            pLev = parseInt(pInfo[1].split('L')[1]);
                        }
                        if (pInfo[2]) {
                            pGen = pInfo[2].trim();
                        }
                        else if (!pInfo[1].startsWith(' L')) {
                            pGen = pInfo[1].trim();
                        }
                    }
                    var npoke = this.agent.assumePokemon(pName, pLev, pGen, this.battle.sides[1 - this.mySID]);
                    npoke.position = this.battle.sides[1 - this.mySID].pokemon.length;
                    this.battle.sides[1 - this.mySID].pokemon.push(npoke);
                    this.runExternalSwitch(npoke, 0);
                }
            }
        }
        else if (tag == '-setboost') {
            var sindex = parseInt(arr[2].substring(1)) - 1;
            var statname = arr[3];
            var statamt = parseInt(arr[4]);
            var setStat = {};
            setStat[statname] = statamt;
            this.battle.sides[sindex].active[0].setBoost(setStat);
        }
        else if (tag == '-clearboost') {
            var sindex = parseInt(arr[2].substring(1)) - 1;
            this.battle.sides[sindex].active[0].clearBoosts();
        }
        // Haze, and only Haze
        else if (tag == '-clearallboost') {
            this.battle.sides[0].active[0].clearBoosts();
            this.battle.sides[1].active[0].clearBoosts();
        }
        // Pretty much white herb, and only white herb
        else if (tag == '-restoreboost') {
            var sindex = parseInt(arr[2].substring(1)) - 1;
            var boosts = {};
            for (let i in this.battle.sides[sindex].active[0].boosts) {
                if (this.battle.sides[sindex].active[0].boosts[i] < 0) {
                    boosts[i] = 0;
                }
            }
            this.battle.sides[sindex].active[0].setBoost(boosts);
        }
        // -detailschange is irrelevant here.  No ubers means no primal means no detailchanges
        else if (tag == 'detailschange') {
        	var sps = arr[3].split(', ')[0];
        	if (arr[2].startsWith(this.mySide)) {
        		this.battle.sides[this.mySID].active[0].species = sps;
        		var activePoke = this.battle.sides[this.mySID].active[0];

        		//update stats here
        		var baseStats = Pokedex[toId(sps)].baseStats //this is a dictionary of base stats of mega poke
        		for (var statname in baseStats) { //iterate through basestats of mega poke, calculate actual stats, and update stats
        			var stat = baseStats[statname];
        			stat = Math.floor(Math.floor(2 * stat + activePoke.set.ivs[statname] + Math.floor(activePoke.set.evs[statname] / 4)) * activePoke.level / 100 + 5);
        			activePoke.stats[statname] = stat;
        		}

        		//update mega types
				activePoke.types = Pokedex[toId(sps)].types
        		//update mega abilities
        		activePoke.ability = toId(Pokedex[toId(sps)].abilities[0]);
        	}
        	else {
				this.battle.sides[1-this.mySID].active[0].species = sps;
				var activePoke = this.battle.sides[1-this.mySID].active[0];

				var Pokemon = Pokedex[toId(sps)];
				var ability = Pokemon.abilities[0];
				var types = Pokemon.types;
				console.log('MEGA ABILITY (IN INTERFACELAYER): ' + ability);
				this.runExternalAddAbility(this.battle.sides[1-this.mySID].active[0], toId(ability));
				this.battle.sides[1-this.mySID].active[0].types = types;

				//TODO: update mega stats
				var baseStats = Pokedex[toId(sps)].baseStats //this is a dictionary of base stats of mega poke
        		for (var statname in baseStats) { //iterate through basestats of mega poke, calculate actual stats, and update stats
        			var stat = baseStats[statname];
        			stat = Math.floor(Math.floor(2 * stat + activePoke.set.ivs[statname] + Math.floor(activePoke.set.evs[statname] / 4)) * activePoke.level / 100 + 5);
        			activePoke.stats[statname] = stat;
        		}
        	}

        }

        // -fieldstart refers to pseudoweather as well as terrain.  Because they are processed differently, we have to check whether it is a pseudoweather or a terrain when this line is processed
        else if (tag == '-fieldstart') {
            console.log(line);
            var status = arr[2]
            if (status.startsWith('move:')) {
                status = toId(status.split(': ')[1]);
            }
            this.runExternalFieldEffect(status);
        }
        else if (tag == '-fieldend') {
            console.log(line);
            var status = arr[2]
            if (status.startsWith('move:')) {
                status = toId(status.split(': ')[1]);
            }
            this.runExternalFieldEnd(status);
        }
        // transform to the best of my knowledge doesn't set off any weird things, so we can just call that directly
        else if (tag == '-transform') {
            var sindex = parseInt(arr[2].substring(1)) - 1;
            this.battle.sides[sindex].active[0].transformInto(this.battle.sides[1 - sindex].active[0], this.battle.sides[sindex].active[0]);
        }
        // replace is for zoroark.  Sends the same data as drag and switch.
        else if (tag == 'replace') {
            if (!arr[2].startsWith(this.mySide)) {
                var found = false;
                var pInfo = arr[3].split(',');
                var pName = pInfo[0];
                for (var i = 0; i < this.battle.sides[1 - this.mySID].pokemon.length; i++) {
                    if (pName == this.battle.sides[1 - this.mySID].pokemon[i].species) {
                        this.runExternalSwitch(this.battle.sides[1 - this.mySID].pokemon[i], 0);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    var pLev = 100;
                    var pGen = '';
                    if (pInfo[1]) {
                        if (pInfo[1].startsWith(' L')) {
                            pLev = parseInt(pInfo[1].split('L')[1]);
                        }
                        if (pInfo[2]) {
                            pGen = pInfo[2].trim();
                        }
                        else if (!pInfo[1].startsWith(' L')) {
                            pGen = pInfo[1].trim();
                        }
                    }
                    var npoke = this.agent.assumePokemon(pName, pLev, pGen, this.battle.sides[1 - this.mySID]);
                    npoke.position = this.battle.sides[1 - this.mySID].pokemon.length;
                    this.battle.sides[1 - this.mySID].pokemon.push(npoke);
                    this.runExternalSwitch(npoke, 0);
                }
            }
        }
        else if (boringTags.indexOf(tag) > -1) {
            // Tags that don't tell us anything new
        }
        else if (tag == 'win') {
            if (arr[2] == this.uname) {
                console.log('I won!');
            }
            else {
                console.log('I lost!');
            }
        }
            // teampreview Standards ou only, requires a response of |/team ######|1 (where ###### is the preferred order of pokemon, which we have to reorder in the model)
            // poke is a part of team preview.  Has roughly the same information as switch. |poke|p1|details|hasitem
        else {
            //    fs.appendFile('log.txt', line + '\n', function (err) { });
            if (tag != 'updateuser' && tag != 'challstr'){
            console.log(line);
            }
        }
    }
    process(text) {
        // console.log(text);
        var arr = text.split("\n");
        for (var i = 0; i < arr.length; i++) {
            this.processLine(arr[i]);
        }
    }
}

exports.InterfaceLayer = InterfaceLayer