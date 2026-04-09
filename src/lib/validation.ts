import isValidDomain from 'is-valid-domain';
import ipaddr from 'ipaddr.js';
import { RECORD_TYPES, DNS_RR_TYPES, type RecordType, type DNSRRType } from '$lib/record-types';

export interface RecordInput {
	name: string;
	type: RecordType;
	value: string;
}

const isDomain = (d: string) => isValidDomain(d, { subdomain: true, allowUnicode: true, topLevel: true });

export function validateRecord(rec: RecordInput): string | null {
	if (!rec.name || !rec.type || rec.value === undefined) {
		return 'missing fields';
	}
	if (!RECORD_TYPES.includes(rec.type)) {
		return 'unsupported record type';
	}
	if (rec.type !== 'PTR' && !isDomain(rec.name)) {
		return 'invalid hostname';
	}
	if (rec.type === 'PTR' && !/^\d+\.\d+\.\d+\.\d+\.in-addr\.arpa$/i.test(rec.name)) {
		return 'invalid PTR name';
	}
	switch (rec.type) {
		case 'A':
			if (rec.value === '') break; // NODATA
			if (!ipaddr.isValid(rec.value) || ipaddr.parse(rec.value).kind() !== 'ipv4') {
				return 'invalid IPv4 address';
			}
			break;
		case 'AAAA':
			if (rec.value === '') break; // NODATA
			if (!ipaddr.isValid(rec.value) || ipaddr.parse(rec.value).kind() !== 'ipv6') {
				return 'invalid IPv6 address';
			}
			break;
		case 'CNAME':
			if (rec.value === '') break; // NODATA
			if (!isDomain(rec.value)) return 'invalid domain';
			break;
		case 'MX': {
			if (rec.value === '') break; // NODATA
			const parts = rec.value.trim().split(/\s+/);
			if (parts.length !== 2) return 'invalid MX value';
			const [priority, exchange] = parts;
			if (!/^\d+$/.test(priority)) return 'invalid MX priority';
			if (!isDomain(exchange)) return 'invalid MX exchange';
			break;
		}
		case 'PTR':
			if (rec.value === '') break; // NODATA
			if (!isDomain(rec.value)) return 'invalid domain';
			break;
		case 'SRV': {
			if (rec.value === '') break; // NODATA
			const parts = rec.value.trim().split(/\s+/);
			if (parts.length !== 4) return 'invalid SRV value';
			const [priority, weight, port, target] = parts;
			if (![priority, weight, port].every((p) => /^\d+$/.test(p))) return 'invalid SRV numbers';
			if (!isDomain(target)) return 'invalid SRV target';
			break;
		}
		case 'TXT':
			if (rec.value === '') break; // NODATA
			break;
		case 'HTTPS':
		case 'SVCB': {
			if (rec.value === '') break; // NODATA
			const parts = rec.value.trim().split(/\s+/);
			if (parts.length < 2) return 'invalid value';
			const priority = parts.shift()!;
			if (!/^\d+$/.test(priority)) return 'invalid priority';
			const target = parts.shift()!;
			if (target !== '.' && !isDomain(target)) return 'invalid target';
			for (const param of parts) {
				if (param.startsWith('alpn=')) {
					if (!/^[A-Za-z0-9]+$/.test(param.slice(5))) return 'invalid alpn';
				} else if (param.startsWith('port=')) {
					if (!/^\d+$/.test(param.slice(5))) return 'invalid port';
				} else if (param.startsWith('ipv4hint=')) {
					const ip = param.slice(9);
					if (!ipaddr.isValid(ip) || ipaddr.parse(ip).kind() !== 'ipv4') return 'invalid ipv4hint';
				} else {
					return 'invalid parameter';
				}
			}
			break;
		}
		case 'REFUSED':
		case 'NXDOMAIN':
			// value must be empty (global) or a valid DNS RR type name (scoped to that query type)
			if (rec.value !== '' && !DNS_RR_TYPES.includes(rec.value as DNSRRType)) {
				return 'scope must be empty or a valid DNS record type';
			}
			break;
	}
	return null;
}
