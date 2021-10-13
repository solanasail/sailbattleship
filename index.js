import { Client, Intents } from "discord.js";
import { DiscordBattleShip } from "discord-battleship";


const client = new Client({ intents: [32767, "GUILD_MESSAGE_REACTIONS"] });


const BattleShip = new DiscordBattleShip({
    embedColor: "RED", /* Any Discord.js Color Resolvable will work. */
    prefix: "?", /* This is the prefix that will be used in the users DM's for commands. 
                    You can set this to any string. */
});


client.on('ready', () => {
    
    console.log("Ready");
    
});

client.on("message", async (message) => {
    if (message.content.toLowerCase().includes("?battleship"))
       

        
    
        await BattleShip.createGame(message);
});

client.login("ODcwNzYwMzc4MDc2ODkzMjI0.YQRczA.KRKk9o0JrXxc6zzG08B9H8hMq6o");
