/** Site name rules for <name>.prepress.digitalno.de — shared by the hosting API and Prepress. */

export const NAME = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
export const RESERVED = new Set(
  'www api app apps admin administrator root mail email smtp imap pop ftp sftp ssh cdn static assets media files img images prepress hosting host status docs doc blog help support dashboard account accounts login logout signin signup register auth oauth sso id dev staging stage test demo preview beta alpha internal secure security billing pay payment shop store abuse postmaster hostmaster webmaster noc ns ns1 ns2 dns mx autoconfig autodiscover digitalnode exopanel'.split(' '),
);
export function nameProblem(name: string): string | null {
  if (!NAME.test(name)) return 'Use 3–40 lower-case letters, digits or dashes (not at the start or end).';
  if (name.includes('--')) return 'Double dashes are not allowed.';
  if (RESERVED.has(name)) return 'That name is reserved.';
  return null;
}
