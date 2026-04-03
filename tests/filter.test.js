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

test('toFilter REFUSED omits value', () => {
	assert.equal(
		toFilter({ id: 3, listId: 1, name: 'blocked.com', type: 'REFUSED', value: '' }),
		'blocked.com$dnsrewrite=REFUSED'
	);
});

test('toFilter NXDOMAIN uses double semicolon', () => {
	assert.equal(
		toFilter({ id: 4, listId: 1, name: 'blocked.com', type: 'NXDOMAIN', value: '' }),
		'blocked.com$dnsrewrite=NXDOMAIN;;'
	);
});

test('generateFilter groups records and adds exclusion', () => {
	const res = generateFilter(records).split('\n');
	assert.equal(res[0], 'example.com$dnsrewrite=NOERROR;A;1.1.1.1');
	assert.equal(res[1], 'example.com$dnsrewrite=NOERROR;AAAA;::1');
	assert.equal(res[2], '||example.com^$dnstype=~A|~AAAA|~SOA');
});

test('generateFilter REFUSED does not emit dnstype exclusion line', () => {
	const res = generateFilter([
		{ id: 5, listId: 1, name: 'blocked.com', type: 'REFUSED', value: '' }
	]);
	assert.equal(res, 'blocked.com$dnsrewrite=REFUSED');
});

test('generateFilter NXDOMAIN does not emit dnstype exclusion line', () => {
	const res = generateFilter([
		{ id: 6, listId: 1, name: 'blocked.com', type: 'NXDOMAIN', value: '' }
	]);
	assert.equal(res, 'blocked.com$dnsrewrite=NXDOMAIN;;');
});
