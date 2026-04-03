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
