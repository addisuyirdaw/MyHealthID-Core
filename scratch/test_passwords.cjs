const { Client } = require('pg');

const passwords = ['', 'root', 'admin', 'password', '1234', '123456', 'postgres'];
const user = 'postgres';
const host = 'localhost';
const database = 'postgres'; // default db to test connection

async function testPasswords() {
    for (const password of passwords) {
        console.log(`Testing password: "${password}"...`);
        const client = new Client({
            user,
            host,
            database,
            password,
            port: 5432,
        });

        try {
            await client.connect();
            console.log(`SUCCESS! The correct password is: "${password}"`);
            await client.end();
            process.exit(0);
        } catch (err) {
            console.log(`Failed: ${err.message}`);
        }
    }
    console.log('None of the common passwords worked.');
    process.exit(1);
}

testPasswords();
