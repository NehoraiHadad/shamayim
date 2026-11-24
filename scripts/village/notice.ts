import { ODBL } from '../../src/data/village/tile'
import { CREDITS, SOURCE } from './tiles'

/** The notice that goes with the tiles, as ODbL 4.2 and 4.3 ask of a derivative database. */
export const NOTICE_FILE = 'LICENSE.txt'

export const noticeOf = (release: string) => `The files in this folder (*.json), together, are a database of building footprints in villages. It is a Derivative
Database, in the meaning of the Open Database License, of ${SOURCE}, release ${release}, and contains data from:

${Object.entries(CREDITS).map(([name, credit]) => `- ${name}: ${credit}`).join('\n')}

This database is made available under the Open Database License (ODbL) v1.0: ${ODBL.url}
Any rights in its individual contents are licensed under the Database Contents License: https://opendatacommons.org/licenses/dbcl/1-0/

Share-alike: you may copy, distribute, use and adapt this database, as long as you attribute the sources above, keep this
notice, and offer any database you adapt from it, and use publicly, under the same licence (ODbL v1.0, or a later or
compatible one), with no technical measures that restrict it unless you also offer a copy without them.

What was changed: buildings under 30 square metres and those outside villages are left out; each building is reduced to
a point on a 2 m grid, a size class and a direction; buildings are ordered in rows. These files are themselves the
machine-readable copy of the whole derivative database that the licence asks for.
`