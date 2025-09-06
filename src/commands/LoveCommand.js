/**
 * Love Command Handler
 * Handles the /countdown-love command
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const BaseCommand = require('./BaseCommand');
const Logger = require('../utils/logger');

class LoveCommand extends BaseCommand {
  constructor() {
    super('countdown-love', 'Spread the love <3');
  }

  /**
   * Get slash command builder
   * @returns {SlashCommandBuilder} - Discord slash command builder
   */
  getSlashCommand() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description);
  }

  /**
   * Execute the love command
   * @param {Object} interaction - Discord interaction
   * @param {Object} services - Service instances
   */
  async execute(interaction, services) {
    const embed = new EmbedBuilder()
      .setTitle('🩵 Help cover server costs')
      .setDescription('Working on some cool new features for when the game is out <a:NODDERS:1081963012405071953>')
      .setColor(0x2AA198)
      .addFields(
        {
          name: '₿ Bitcoin (BTC)',
          value: '```\nbc1q3wksadftgyn5f6y36pvprpmd54ny5jj8x8pxeu\n```',
          inline: true
        },
        {
          name: 'Ξ Ethereum (ETH)',
          value: '```\n0x9c0d097ef971674D9133e88Eff5a256187d2C09d\n```',
          inline: true
        },
        {
          name: 'ɱ Monero (XMR)',
          value: '```\n88tVVqExo9EPmRB4CwLV7qFgDHrbfLyXrLFsYcFb6KCS1T8RiimThkBgMQzRewTTAKcfKzMs1rJ3qFC2Mm3HTNVcVi2wSVT\n```',
          inline: true
        }
      )
      .setFooter({ text: 'Much appreciated :)' })
      .setTimestamp();
    
    this.logCommand(interaction, 'Love command viewed');
    
    await interaction.reply({ 
      embeds: [embed], 
      ephemeral: true 
    });
  }
}

module.exports = LoveCommand;
