import { describe, expect, it } from 'vitest'
import { ltr } from './isolate'
import { sceneFacts } from './sceneFacts'

describe('the line about the scene', () => {
  it('tells the place, its height and the waters drawn', () => {
    expect(sceneFacts('כרמי צור', 950.6, [])).toBe(`כרמי צור, ${ltr('951')} מ׳ מעל פני הים`)
    expect(sceneFacts('נווה זוהר', -374, ['ים המלח'])).toBe(`נווה זוהר, ${ltr('374')} מ׳ מתחת לפני הים · בתמונה: ים המלח`)
    expect(sceneFacts('חיפה', 63, ['ים'])).toBe(`חיפה, ${ltr('63')} מ׳ מעל פני הים · בתמונה: הים`)
    expect(sceneFacts('טבריה', -0.3, ['כנרת'])).toBe('טבריה, בגובה פני הים · בתמונה: הכנרת')
  })

  it('joins several waters in one list', () => {
    expect(sceneFacts('אילת', 10, ['מפרץ אילת', 'ים', 'כנרת'])).toBe(`אילת, ${ltr('10')} מ׳ מעל פני הים · בתמונה: מפרץ אילת, הים והכנרת`)
  })

  it('leaves out what is not known, and says nothing with nothing to tell', () => {
    expect(sceneFacts('חיפה', undefined, ['ים'])).toBe('חיפה · בתמונה: הים')
    expect(sceneFacts('חיפה', NaN, [])).toBeNull()
  })
})
