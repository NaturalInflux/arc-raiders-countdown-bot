#!/usr/bin/env node

// Simple script to add a social message for the next countdown post
// Usage: node add-message.js "Your message here"

const fs = require('fs');
const path = require('path');

const MESSAGE_FILE = path.join(__dirname, 'next-message.txt');

function addMessage(message) {
    try {
        fs.writeFileSync(MESSAGE_FILE, message);
        console.log('✅ Message added for next countdown post:');
        console.log(`"${message}"`);
        return true;
    } catch (error) {
        console.error('❌ Error saving message:', error.message);
        return false;
    }
}

// Get message from command line arguments
const message = process.argv.slice(2).join(' ');

if (!message) {
    console.log('Usage: node add-message.js "Your message here"');
    console.log('Example: node add-message.js "Just played some Arc Raiders alpha - it\'s looking incredible!"');
    process.exit(1);
}

addMessage(message);
