export const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'HTTPS', 'MX', 'PTR', 'SRV', 'TXT'] as const;

export type RecordType = (typeof RECORD_TYPES)[number];
