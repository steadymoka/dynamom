import { F } from '../../lib'
import { ExpressionBuilder } from '../../lib/expression/expression-builder'


describe('FilterCondition', () => {
  it('F.eq builds correct expression', () => {
    const builder = new ExpressionBuilder()
    const expr = F.eq('email', 'test@test.com').build(builder)

    expect(expr).toBe('#a0 = :v0')
    expect(builder.getNames()).toEqual({ '#a0': 'email' })
    expect(builder.getValues()).toEqual({ ':v0': { S: 'test@test.com' } })
  })

  it('F.and combines conditions', () => {
    const builder = new ExpressionBuilder()
    const expr = F.and(F.eq('a', 1), F.gt('b', 2)).build(builder)

    expect(expr).toBe('(#a0 = :v0 AND #a1 > :v1)')
  })

  it('F.or combines conditions', () => {
    const builder = new ExpressionBuilder()
    const expr = F.or(F.eq('a', 1), F.eq('b', 2)).build(builder)

    expect(expr).toBe('(#a0 = :v0 OR #a1 = :v1)')
  })

  it('F.not negates condition', () => {
    const builder = new ExpressionBuilder()
    const expr = F.not(F.eq('a', 1)).build(builder)

    expect(expr).toBe('NOT (#a0 = :v0)')
  })

  it('F.between builds BETWEEN expression', () => {
    const builder = new ExpressionBuilder()
    const expr = F.between('age', 18, 65).build(builder)

    expect(expr).toBe('#a0 BETWEEN :v0 AND :v1')
  })

  it('F.beginsWith builds begins_with expression', () => {
    const builder = new ExpressionBuilder()
    const expr = F.beginsWith('name', 'Joh').build(builder)

    expect(expr).toBe('begins_with(#a0, :v0)')
  })

  it('F.contains builds contains expression', () => {
    const builder = new ExpressionBuilder()
    const expr = F.contains('tags', 'nodejs').build(builder)

    expect(expr).toBe('contains(#a0, :v0)')
  })

  it('F.exists builds attribute_exists expression', () => {
    const builder = new ExpressionBuilder()
    const expr = F.exists('email').build(builder)

    expect(expr).toBe('attribute_exists(#a0)')
  })

  it('F.notExists builds attribute_not_exists expression', () => {
    const builder = new ExpressionBuilder()
    const expr = F.notExists('email').build(builder)

    expect(expr).toBe('attribute_not_exists(#a0)')
  })
})
