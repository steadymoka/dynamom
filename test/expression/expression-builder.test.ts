import { ExpressionBuilder } from '../../lib/expression/expression-builder'


describe('ExpressionBuilder', () => {
  it('generates unique placeholders', () => {
    const builder = new ExpressionBuilder()

    expect(builder.addName('email')).toBe('#a0')
    expect(builder.addName('type')).toBe('#a1')
    expect(builder.addValue('test')).toBe(':v0')
    expect(builder.addValue(42)).toBe(':v1')

    expect(builder.getNames()).toEqual({ '#a0': 'email', '#a1': 'type' })
    expect(builder.getValues()).toEqual({
      ':v0': { S: 'test' },
      ':v1': { N: '42' },
    })
  })
})
