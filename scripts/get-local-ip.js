#!/usr/bin/env node

/**
 * Helper script to find your local IP address for Capacitor development
 * Run: node scripts/get-local-ip.js or npm run local-ip
 */

import os from 'os';

function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push({
                    name: name,
                    address: iface.address,
                    family: iface.family
                });
            }
        }
    }

    return addresses;
}

console.log('\n🔍 Finding your local IP addresses...\n');

const addresses = getLocalIpAddress();

if (addresses.length === 0) {
    console.log('❌ No local IP addresses found!');
    console.log('   Make sure you\'re connected to a network.\n');
    process.exit(1);
}

console.log('📱 Found the following IP addresses:\n');

addresses.forEach((addr, index) => {
    console.log(`${index + 1}. ${addr.name}: ${addr.address}`);
});

console.log('\n📝 Usage Instructions:\n');
console.log('   For Android Physical Device:');
console.log(`   Update capacitor.config.ts with: http://${addresses[0].address}:8080\n`);

console.log('   For Android Emulator:');
console.log('   Use: http://10.0.2.2:8080 (already configured)\n');

console.log('   For iOS Simulator:');
console.log('   Use: http://localhost:8080\n');

console.log('💡 Example configuration in capacitor.config.ts:\n');
console.log(`   const LOCALHOST_URL = 'http://${addresses[0].address}:8080'; // Your IP\n`);

console.log('✅ Next steps:');
console.log('   1. Update LOCALHOST_URL in capacitor.config.ts');
console.log('   2. Set USE_LOCALHOST = true');
console.log('   3. Run: npx cap sync');
console.log('   4. Run: npm run dev');
console.log('   5. Run: npx cap run android (or ios)\n');
