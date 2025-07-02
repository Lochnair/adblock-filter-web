import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFilter, toFilter } from '../src/lib/server/adblock.ts';

const records = [
	{ id: 1, listId: 1, name: 'example.com', type: 'A', value: '1.1.1.1' },
	{ id: 2, listId: 1, name: 'example.com', type: 'AAAA', value: '::1' }
];

test('toFilter formats correctly', () => {
	assert.equal(toFilter(records[0]), 'example.com$dnsrewrite=NOERROR;A;1.1.1.1');
});

test('generateFilter groups records and adds exclusion', () => {
	const res = generateFilter(records).split('\n');
	assert.equal(res[0], 'example.com$dnsrewrite=NOERROR;A;1.1.1.1');
	assert.equal(res[1], 'example.com$dnsrewrite=NOERROR;AAAA;::1');
	assert.equal(res[2], '||example.com^$dnstype=~A|~AAAA|~SOA');
});
