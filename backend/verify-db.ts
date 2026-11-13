import { db } from './src/db/client.js';

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t: any) => t.name);
console.log('TABLES CREATED:', tables.join(', '));

const vCount = (db.prepare('SELECT count(*) as c FROM villages').get() as any).c;
const tCount = (db.prepare('SELECT count(*) as c FROM transport_options').get() as any).c;
const rCount = (db.prepare('SELECT count(*) as c FROM help_requests').get() as any).c;
const iCount = (db.prepare('SELECT count(*) as c FROM incidents').get() as any).c;

console.log('--- VERIFIED DATABASE STATE ---');
console.log(`Villages:        ${vCount}`);
console.log(`Transport Units: ${tCount}`);
console.log(`Incidents:       ${iCount}`);
console.log(`Help Requests:   ${rCount}`);
