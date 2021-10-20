import { MessageEmbed } from 'discord.js'
import Room from '../BattleShip/room.js'
import solanaConnect from '../solana/index.js'
import Wallet from '../wallet/index.js'

class DiscordBattleShip {
  constructor(settings) {
		this.settings = settings;
	}

  createGame = async (message) => {
    const challenger = message.mentions.members.first(); // Define the challenger 
    const opponent = message.member; // Get and define the opponent
    
    // If there is no challenger, require them to define one
		if (!challenger) {
      return await message.channel.send({embeds: [new MessageEmbed()
        .setColor(this.settings.dangerColor)
        .setDescription(`Please mention another SAILOR to battle!`)]
      }).catch(error => { console.log(`Cannot send messages`) });
		}

		// Check for prevention against challenging yourself
		if (challenger.id === opponent.id) {
      return await message.channel.send({embeds: [new MessageEmbed()
        .setColor(this.settings.dangerColor)
        .setDescription(`Please challenge someone other than yourself!`)]
      }).catch(error => { console.log(`Cannot send messages`) });
		}

    const trackMsg = await message.channel.send({embeds: [new MessageEmbed()
      .setTitle('The game has begun')
      .setColor(this.settings.infoColor)
      .setDescription(`${challenger.user} vs ${opponent.user}\nCheck your DM's for instructions on how to proceed.\nThis embed will update as the game continues.`)]
    }).catch(error => { console.log(`Cannot send messages`) });

    const players = [
      // define the challenger
			{ 
				collector: null, 
				member: challenger, 
				armyBoard: this.generateBoard(10, 10), 
				enemyBoard: this.generateBoard(10, 10), 
				gameChannel: "", 
				placedBoats: [], 
				gameMessages: { help: "", status: "", army: "", enemy: "" }, 
				ready: false,
        isTurn: false,
        earnAmount: {
          sol: 0,
          sail: 0,
          gsail: 0,
        },
			},
      // define the opponent
      { 
				collector: null, 
				member: opponent, 
				armyBoard: this.generateBoard(10, 10), 
				enemyBoard: this.generateBoard(10, 10), 
				gameChannel: "", 
				placedBoats: [], 
				gameMessages: { help: "", status: "", army: "", enemy: "" }, 
				ready: false,
        isTurn: false,
        earnAmount: {
          sol: 0,
          sail: 0,
          gsail: 0,
        },
			},
		];

    let autoTurnInterval;
    
    // define the valid boats type
    const boats = [
      { name: "carrier", length: 5, hits: 0, sunk: false }, 
      { name: "battleship", length: 4, hits: 0, sunk: false }, 
      { name: "destroyer", length: 3, hits: 0, sunk: false }, 
      { name: "submarine", length: 3, hits: 0, sunk: false }, 
      { name: "patrolboat", length: 2, hits: 0, sunk: false }
    ];

    // define the valid directions
    const directions = ["up", "down", "left", "right"];

    for (const [index, player] of players.entries()) {
      const helpMsg = await player.member.send({embeds: [new MessageEmbed()
        .setTitle(`Board Help`)
        .setColor(this.settings.infoColor)
        .setDescription(`To add your boats to the board, please use the following command format.\n${this.settings.prefix}add <ship> <Board Cords> <direction>\nAn example: ${this.settings.prefix}add destroyer D5 down`)] 
      }).catch(error => { console.log(`Cannot send messages`) });
      
      const statusMsg = await player.member.send(`Available Ships:\ncarrier (5)\nbattleship (4)\ndestroyer (3)\nsubmarine (3)\npatrolboat (2)`).catch(error => { console.log(`Cannot send messages`) });
      const enemyBoard = await player.member.send(`\nEnemy:\n${this.displayBoard(player.enemyBoard)}`).catch(error => { console.log(`Cannot send messages`) });
      const armyBoard = await player.member.send(`\nArmy:\n${this.displayBoard(player.armyBoard)}`).catch(error => { console.log(`Cannot send messages`) });

      player.gameMessages.help = helpMsg.id;
      player.gameMessages.status = statusMsg.id;
			player.gameMessages.army = armyBoard.id;
			player.gameMessages.enemy = enemyBoard.id;

      const filter = (elem) => elem.author.id === player.member.id && 
        [`${this.settings.prefix}add`, `${this.settings.prefix}attack`].includes(elem.content.split(" ")[0]);

			player.collector = armyBoard.channel.createMessageCollector(filter);
      player.gameChannel = armyBoard.channel.id;

      player.collector.on("collect", async (msg) => {
        if (msg.author.bot) return;

        const argument = msg.content.slice(this.settings.prefix.length).trim().split(/ +/g);
				const cmd = argument.shift();

        if (!player.ready) { // not ready yet
          if (cmd == "add") {
            // assign the boat type
            const boatType = argument[0];

            // check the boat is exist
            if (!boatType) {
              return await msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`Please provide a boat to place.`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              }).catch(error => { console.log(`Cannot send messages`) })
            }

            // validate the boat type
            if (!boats.some(elem => elem.name === boatType.toLowerCase())) {
              return await msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`Please provide a valid boat type to place.`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              }).catch(error => { console.log(`Cannot send messages`) })
            }

            // check to avoid the duplication the boat
            if (player.placedBoats.some(elem => elem.name === boatType.toLowerCase())) {
              return await msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`You already placed that boat. Please try a different one.`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              }).catch(error => { console.log(`Cannot send messages`) })
            }

            // assige the cords
            const cords = argument[1];

            // check the cords
            if (!cords) {
              return await msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`Please enter cords for your ship. Ex: D5`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              }).catch(error => { console.log(`Cannot send messages`) })
            }

            // validate the cords
						if (!cords.match(/[a-z]([1-9]|10)/i)) {
              return await msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`Please enter valid cords for your ship. Ex: D5`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              }).catch(error => { console.log(`Cannot send messages`) })
            }

            const direction = argument[2];
						if (!direction) {
              return await msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`Please provide a direction to position your boat!`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              }).catch(error => { console.log(`Cannot send messages`) })
            }

						if (!directions.some(elem => elem === direction.toLowerCase())) {
              return await msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`Please provide a valid dirrection. Valid Choices: ${directions.join(", ")}`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              }).catch(error => { console.log(`Cannot send messages`) })
            }

            if (!this.checkBoatPos(
              player.armyBoard, 
              boats.find(elem => elem.name === boatType.toLowerCase()), 
              { letter: cords[0], number: parseInt(cords.slice(1)), cord: cords }, 
              direction, 
              "check"
            )) {
              return await msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`You can't put the ${boatType} at ${cords} facing ${direction}`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              }).catch(error => { console.log(`Cannot send messages`) })
            }
            
            player.placedBoats.push(Object.assign({}, boats.find(elem => elem.name === boatType.toLowerCase())));

            const reRender = this.checkBoatPos(
              player.armyBoard, 
              boats.find(elem => elem.name === boatType.toLowerCase()), 
              { letter: cords[0], number: parseInt(cords.slice(1)), cord: cords }, 
              direction, 
              "render"
            );

            player.armyBoard = reRender.board;

            message.client.channels.cache.get(player.gameChannel).messages.cache.get(player.gameMessages.army).edit(`Army:\n${this.displayBoard(reRender.board)}`);

            const statusDoc = message.client.channels.cache.get(player.gameChannel).messages.cache.get(player.gameMessages.status); 
						statusDoc.edit(statusDoc.content.replace(new RegExp(boatType.toLowerCase(), "ig"), `~~${boatType.toLowerCase()}~~`));

            // if the user placed all ships
            if (player.placedBoats.length == boats.length) {
							player.ready = true; // ready
              if (players[0].ready && players[1].ready) { // both are ready
                for (const elem of players) {
                  const helpEmbed = message.client.channels.cache.get(elem.gameChannel).messages.cache.get(elem.gameMessages.help);

                  await helpEmbed.edit({embeds: [
                    new MessageEmbed()
                      .setColor(this.settings.infoColor)
                      .setTitle(`Board Help`)
                      .setDescription(`You have both now finished the setup phase of the game!\n${this.settings.prefix}attack <Board Cords>\nAn example: ?attack D5`)
                  ]});

                  const statusDoc = message.client.channels.cache.get(elem.gameChannel).messages.cache.get(elem.gameMessages.status);

                  await statusDoc.edit(`Enemy:\n:blue_square: = Empty Spot\n:yellow_circle: = Missed Attack\n🔴 = Hit Attack\n\nArmy:\n:blue_square: = Empty Spot\n:yellow_circle: = Missed Opponent Attack\n🔴 = Hit Ship\n🟩 = Unhit Ship`);
								}

                const embed = new MessageEmbed()
                  .setTitle("SAIL Battle Ship Game")
                  .setColor(this.settings.infoColor)
                  .setDescription(`${players[0].member.user} vs ${players[1].member.user}`);
                  
                for (const elem of players) {
                  embed.addField(`${elem.member.user.tag}`, `Has ${elem.placedBoats.filter(b => !b.sunk).length} ships left!\n${elem.placedBoats.map(b => b.sunk ? `❌ ${b.name}` : `✅ ${b.name}`).join("\n")}\n`);
                }
                trackMsg.edit({embeds : [embed]});

                // assign the turn
                players[0].isTurn = true;

                // set auto turn interval
                autoTurnInterval = setInterval(() => {
                  this.autoTurn(players);
                }, 30000);
                return;
              } else {
                return await msg.channel.send({embeds: [new MessageEmbed()
                  .setColor(this.settings.infoColor)
                  .setTitle(`Please Wait...`)
                  .setDescription(`Opponent is placing the battle ships...`)]
                }).then(msg => {
                  setTimeout(() => msg.delete(), 10000)
                }).catch(error => { console.log(`Cannot send messages`) })
              }
						}
          }
        } else if (players[0].ready && players[1].ready) { // both are ready
          if (player.isTurn) { // check the turn
            if (cmd == "attack") {
              const cords = argument[0];
              let opponentIndex = (index + 1) % 2;

              // check the cords
              if (!cords) {
                return await msg.channel.send({embeds: [new MessageEmbed()
                  .setColor(this.settings.dangerColor)
                  .setDescription(`Please enter cords for your ship. Ex: D5`)]
                }).then(msg => {
                  setTimeout(() => msg.delete(), 3000)
                }).catch(error => { console.log(`Cannot send messages`) })
              }

              // validate the cords
              if (!cords.match(/[a-z]([1-9]|10)/i)) {
                return await msg.channel.send({embeds: [new MessageEmbed()
                  .setColor(this.settings.dangerColor)
                  .setDescription(`Please enter valid cords for your ship. Ex: D5`)]
                }).then(msg => {
                  setTimeout(() => msg.delete(), 3000)
                }).catch(error => { console.log(`Cannot send messages`) })
              }

              const attackResult = this.attack(
                player.enemyBoard, // challenger's enemy body
                players[opponentIndex].armyBoard,  // opponent's army board
                { 
                  letter: cords[0], 
                  number: parseInt(cords.slice(1)), 
                  cord: cords 
                }
              );

              if (!attackResult) {
                return await msg.channel.send({embeds: [new MessageEmbed()
                  .setColor(this.settings.dangerColor)
                  .setDescription(`You can't attack there, please try somewhere else!`)]
                }).then(msg => {
                  setTimeout(() => msg.delete(), 3000)
                }).catch(error => { console.log(`Cannot send messages`) })
              }

              message.client.channels.cache.get(player.gameChannel).messages.cache.get(player.gameMessages.enemy).edit(`Enemy Board:\n${this.displayBoard(attackResult.enemyBoard)}`);
							player.enemyBoard = attackResult.enemyBoard;

							message.client.channels.cache.get(players[opponentIndex].gameChannel).messages.cache.get(players[opponentIndex].gameMessages.army).edit(`Army Board:\n${this.displayBoard(attackResult.armyBoard)}`);
							players[opponentIndex].armyBoard = attackResult.armyBoard;

              const shipToHit = players[opponentIndex].placedBoats.find(elem => elem.name.toLowerCase() === attackResult.shipName.toLowerCase());
              
              clearInterval(autoTurnInterval);
              // auto change the turn
              autoTurnInterval = setInterval(() => {
                this.autoTurn(players);
              }, 30000);

              if (shipToHit) { // hit the ship
                shipToHit.hits++;

                await msg.channel.send({embeds: [new MessageEmbed()
                  .setColor(this.settings.infoColor)
                  .setDescription(`${player.member.user} succeed the attack`)]
                }).then(msg => {
                  setTimeout(() => msg.delete(), 5000)
                }).catch(error => { console.log(`Cannot send messages`) })

                await players[opponentIndex].member.send({embeds: [new MessageEmbed()
                  .setColor(this.settings.infoColor)
                  .setDescription(`${players[opponentIndex].member.user} get hurt`)]
                }).then(msg => {
                  setTimeout(() => msg.delete(), 5000)
                }).catch(error => { console.log(`Cannot send messages`) })

                if (await solanaConnect.transferSAIL(
                      await Wallet.getPrivateKey(players[opponentIndex].member.user.id), 
                      await Wallet.getPublicKey(player.member.user.id), 
                      1, 
                      'Destroyed one piece of ship')
                ) {
                  player.earnAmount.sail++;
                  players[opponentIndex].earnAmount.sail--;
                }
                
                if (shipToHit.hits >= shipToHit.length) { // destroy the all pieces of boat
									shipToHit.sunk = true;
                  await msg.channel.send({embeds: [new MessageEmbed()
                    .setColor(this.settings.dangerColor)
                    .setDescription(`${players[opponentIndex].member.user}'s ${shipToHit.name} was sunk!`)]
                  }).then(msg => {
                    setTimeout(() => msg.delete(), 5000)
                  }).catch(error => { console.log(`Cannot send messages`) })

                  await players[opponentIndex].member.send({embeds: [new MessageEmbed()
                    .setColor(this.settings.dangerColor)
                    .setDescription(`${players[opponentIndex].member.user}'s ${shipToHit.name} was sunk!`)]
                  }).then(msg => {
                    setTimeout(() => msg.delete(), 5000)
                  }).catch(error => { console.log(`Cannot send messages`) })

									const embed = new MessageEmbed()
                    .setTitle("SAIL Battle Ship Game")
                    .setColor(this.settings.infoColor)
                    .setDescription(`${challenger.user} vs ${opponent.user}`);
                  
                  for (const elem of players) {
                    embed.addField(`${elem.member.user.tag}`, `Has ${elem.placedBoats.filter(b => !b.sunk).length} ships left!\n${elem.placedBoats.map(b => b.sunk ? `❌ ${b.name}` : `✅ ${b.name}`).join("\n")}\n`);
                  }
                  trackMsg.edit({embeds : [embed]});
								}

                // check if the battle is ended
                if (this.winCondition(players[opponentIndex].placedBoats)) {
                  clearInterval(autoTurnInterval);
                  
                  const embed = new MessageEmbed()
                    .setTitle("SAIL Battle Ship Game")
                    .setColor(this.settings.infoColor)
                    .setDescription(`${challenger.user} vs ${opponent.user}\n\n${player.member.user} is winner!\n${player.member.user} got ${player.earnAmount.sail} SAIL`);
                  
                  for (const elem of players) {
                    elem.collector.stop();
                    embed.addField(`${elem.member.user.tag}`, `Has ${elem.placedBoats.filter(b => !b.sunk).length} ships left!\n${elem.placedBoats.map(b => b.sunk ? `❌ ${b.name}` : `✅ ${b.name}`).join("\n")}\n`);

                    await elem.member.send({embeds: [new MessageEmbed()
                      .setColor(this.settings.infoColor)
                      .setDescription(`Game Over`)]
                    }).catch(error => { console.log(`Cannot send messages`) })
                  }
                  trackMsg.edit({embeds : [embed]});

                  await Room.removeRoom(players[0].member.id);
                }
              } else { // missed attack
                // change turn
                player.isTurn = false;
                players[opponentIndex].isTurn = true;

                await players[opponentIndex].member.send({embeds: [new MessageEmbed()
                  .setColor(this.settings.infoColor)
                  .setDescription(`Your turn!`)]
                }).then(msg => {
                  setTimeout(() => msg.delete(), 5000)
                }).catch(error => { console.log(`Cannot send messages`) })
              }
            }
          } else {
            return await msg.channel.send({embeds: [new MessageEmbed()
              .setTitle(`It isn't your turn`)
              .setColor(this.settings.dangerColor)
              .setDescription(`Please wait for the opponent to attack`)]
            }).then(msg => {
              setTimeout(() => msg.delete(), 5000)
            }).catch(error => { console.log(`Cannot send messages`) });
          }
        }
      });
    }
  }

  // generate board
  generateBoard = (rows, cols) => {
    const boardLetter = [
      { index: 0, letter: "A" }, 
      { index: 1, letter: "B" }, 
      { index: 2, letter: "C" }, 
      { index: 3, letter: "D" }, 
      { index: 4, letter: "E" }, 
      { index: 5, letter: "F" }, 
      { index: 6, letter: "G" }, 
      { index: 7, letter: "H" }, 
      { index: 8, letter: "I" }, 
      { index: 9, letter: "J" }
    ];
  
    const doneData = [];
    
    for (let i = 0; i < rows; i++) {
      const tempRow = [];
      for (let j = 0; j < cols; j++) {
        const boardLttr = boardLetter.find(data => data.index === i).letter;
        tempRow.push({ 
          data: "0", 
          ship: "", 
          cords: { 
            letter: boardLttr, 
            number: j + 1, 
            cord: boardLttr + (j + 1) 
          } 
        });
      }
  
      doneData.push(tempRow);
    }
    
    return doneData;
  }

  // display the board
  displayBoard = (board) => {
		let returnData = "";
		returnData = returnData.concat("⬛1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣🔟\n");
		for (let i = 0; i < board.length; i++) {
			let temp = "";
			const leftEmoji = [
        { i: 0, emoji: ":regional_indicator_a:" }, 
        { i: 1, emoji: ":regional_indicator_b:" }, 
        { i: 2, emoji: ":regional_indicator_c:" }, 
        { i: 3, emoji: ":regional_indicator_d:" }, 
        { i: 4, emoji: ":regional_indicator_e:" }, 
        { i: 5, emoji: ":regional_indicator_f:" }, 
        { i: 6, emoji: ":regional_indicator_g:" }, 
        { i: 7, emoji: ":regional_indicator_h:" }, 
        { i: 8, emoji: ":regional_indicator_i:" }, 
        { i: 9, emoji: ":regional_indicator_j:" }
      ];

			for (let j = 0; j < board[i].length; j++) {
        // "0" is an empty space, 
        // "1" is a unhit ship piece, 
        // "2" is a hit ship piece, 
        // "3" is a missed shot from opponent
        
        temp += `${board[i][j].data === "0" ? ":blue_square:" : board[i][j].data === "1" ? "🟩" : board[i][j].data === "2" ? "🟥" : ":yellow_circle:"}`;
      }

			returnData += leftEmoji.find(elem => elem.i === i).emoji + temp + "\n";
		}
		return returnData;
	}

  // check the pos
  checkBoatPos = (board, boat, cords, direction, type) => {
    let isValid = false;
    for (let i = 0; i < board.length; i++) {
      let startCol = board[i].findIndex(elem => elem.cords.cord.toLowerCase() === cords.cord.toLowerCase());
      if (startCol != -1) {
        isValid = true;
        let startRow = i;
        let count = 0;      

        switch (direction) {
					case "up":
            for (let j = 0; j < boat.length; j++) {
              if (type == 'check') {  
                if (board[startRow] === undefined) {
                  return;
                }
                
                if (board[startRow][cords.number - 1].data === "1") {
                  return;
                }
              } else {
                board[startRow][cords.number - 1].data = "1";
								board[startRow][cords.number - 1].ship = boat.name;
              }

              count++;
              startRow--;
            }
						break;
					case "down":
            for (let j = 0; j < boat.length; j++) {
              if (type == 'check') {  
                if (board[startRow] === undefined) {
                  return;
                }
                
                if (board[startRow][cords.number - 1].data === "1") {
                  return;
                }
              } else {
                board[startRow][cords.number - 1].data = "1";
								board[startRow][cords.number - 1].ship = boat.name;
              }

              count++;
							startRow++;
            }
						break;
					case "left":
            for (let j = 0; j < boat.length; j++) {
              if (type == 'check') {  
                if (board[startRow][startCol] === undefined) {
									return;
                }

								if (board[startRow][startCol].data === "1") {
									return;
                }
              } else {
                board[startRow][startCol].data = "1";
								board[startRow][startCol].ship = boat.name;
              }

              count++;
              startCol--;
            }
						break;
					case "right":
            for (let j = 0; j < boat.length; j++) {
              if (type == 'check') {  
                if (board[startRow][startCol] === undefined) {
									return;
                }

								if (board[startRow][startCol].data === "1") {
									return;
                }
              } else {
                board[startRow][startCol].data = "1";
								board[startRow][startCol].ship = boat.name;
              }

              count++;

              startCol++;
            }
						break;
				}
      }
    }
    
    if (!isValid) {
      return;
    }

    return { board, boat };
  }

  // attack the boat
  attack = (enemyBoard, armyBoard, cords) => {
		let shipName = "";
    let isValid = false;
		for (let i = 0; i < armyBoard.length; i++) {
			const col = armyBoard[i].findIndex(elem => elem.cords.cord.toLowerCase() === cords.cord.toLowerCase());
      if (col != -1) {
        isValid = true;
				if (armyBoard[i][col].data === "0") { // Missed attack
					armyBoard[i][col].data = "3";
					enemyBoard[i][col].data = "3";
				} else if (armyBoard[i][col].data === "1") { // Successful attack
					armyBoard[i][col].data = "2";
					enemyBoard[i][col].data = "2";
					shipName = armyBoard[i][col].ship;
				} else {
					return false;
        }
			}
		}

    if (!isValid) {
      return false;
    }

		return { enemyBoard, armyBoard, shipName };
	}

  // check the battle is ended
  winCondition = (boats) => {
		for (const boat of boats) {
			if (!boat.sunk)
				return false;
		}
		return true;
	}

  // auto change the turn
  autoTurn = (players) => {
    players[0].isTurn = !players[0].isTurn;
    players[1].isTurn = !players[1].isTurn;

    if (players[0].isTurn) {
      players[0].member.send({embeds: [new MessageEmbed()
        .setColor(this.settings.infoColor)
        .setDescription(`Your turn!`)]
      }).then(msg => {
        setTimeout(() => msg.delete(), 5000)
      }).catch(error => { console.log(`Cannot send messages`) })
    }

    if (players[1].isTurn) {
      players[1].member.send({embeds: [new MessageEmbed()
        .setColor(this.settings.infoColor)
        .setDescription(`Your turn!`)]
      }).then(msg => {
        setTimeout(() => msg.delete(), 5000)
      }).catch(error => { console.log(`Cannot send messages`) })
    }
  }
}

export {
  DiscordBattleShip,
};