export const RECORD_TYPES = [
	'A',
	'AAAA',
	'CNAME',
	'HTTPS',
	'SVCB',
	'MX',
	'PTR',
	'SRV',
	'TXT',
	'REFUSED',
	'NXDOMAIN'
] as const;

export type RecordType = (typeof RECORD_TYPES)[number];

/** DNS resource record types — excludes REFUSED/NXDOMAIN which are response codes, not RR types */
export const DNS_RR_TYPES = ['A', 'AAAA', 'CNAME', 'HTTPS', 'SVCB', 'MX', 'PTR', 'SRV', 'TXT'] as const;

export type DNSRRType = (typeof DNS_RR_TYPES)[number];
