import { toDynamo, fromDynamo, toDynamoMap, fromDynamoMap } from '../../lib/connection/transformer'


describe('toDynamo', () => {
  it('converts string', () => {
    expect(toDynamo('hello')).toEqual({ S: 'hello' })
  })

  it('converts empty string', () => {
    expect(toDynamo('')).toEqual({ S: '' })
  })

  it('converts number', () => {
    expect(toDynamo(123)).toEqual({ N: '123' })
  })

  it('converts zero', () => {
    expect(toDynamo(0)).toEqual({ N: '0' })
  })

  it('converts negative number', () => {
    expect(toDynamo(-42)).toEqual({ N: '-42' })
  })

  it('converts float number', () => {
    expect(toDynamo(3.14)).toEqual({ N: '3.14' })
  })

  it('converts boolean true', () => {
    expect(toDynamo(true)).toEqual({ BOOL: true })
  })

  it('converts boolean false', () => {
    expect(toDynamo(false)).toEqual({ BOOL: false })
  })

  it('converts null', () => {
    expect(toDynamo(null)).toEqual({ NULL: true })
  })

  it('converts undefined', () => {
    expect(toDynamo(undefined)).toEqual({ NULL: true })
  })

  it('converts Buffer', () => {
    const buf = Buffer.from('binary-data')
    expect(toDynamo(buf)).toEqual({ B: buf })
  })

  it('converts array', () => {
    expect(toDynamo([1, 'two', true])).toEqual({
      L: [
        { N: '1' },
        { S: 'two' },
        { BOOL: true },
      ],
    })
  })

  it('converts empty array', () => {
    expect(toDynamo([])).toEqual({ L: [] })
  })

  it('converts nested object', () => {
    expect(toDynamo({ a: 1, b: 'str' })).toEqual({
      M: {
        a: { N: '1' },
        b: { S: 'str' },
      },
    })
  })

  it('converts deeply nested object', () => {
    expect(toDynamo({ outer: { inner: 42 } })).toEqual({
      M: {
        outer: { M: { inner: { N: '42' } } },
      },
    })
  })
})


describe('fromDynamo', () => {
  it('converts { S } to string', () => {
    expect(fromDynamo({ S: 'value' })).toBe('value')
  })

  it('converts empty string', () => {
    expect(fromDynamo({ S: '' })).toBe('')
  })

  it('converts { N } to number', () => {
    expect(fromDynamo({ N: '123' })).toBe(123)
  })

  it('converts { N: "0" } to 0', () => {
    expect(fromDynamo({ N: '0' })).toBe(0)
  })

  it('converts { BOOL: true } to true', () => {
    expect(fromDynamo({ BOOL: true })).toBe(true)
  })

  it('converts { BOOL: false } to false', () => {
    expect(fromDynamo({ BOOL: false })).toBe(false)
  })

  it('converts { NULL: true } to null', () => {
    expect(fromDynamo({ NULL: true })).toBeNull()
  })

  it('converts { B } to Buffer', () => {
    const buf = Buffer.from('data')
    expect(fromDynamo({ B: buf })).toBe(buf)
  })

  it('converts { L } to array', () => {
    expect(fromDynamo({ L: [{ N: '1' }, { S: 'two' }] })).toEqual([1, 'two'])
  })

  it('converts empty { L } to empty array', () => {
    expect(fromDynamo({ L: [] })).toEqual([])
  })

  it('converts { M } to object', () => {
    expect(fromDynamo({ M: { a: { N: '1' }, b: { S: 'str' } } })).toEqual({ a: 1, b: 'str' })
  })

  it('throws TypeError for unknown format', () => {
    expect(() => fromDynamo({} as any)).toThrow(TypeError)
  })
})


describe('toDynamoMap / fromDynamoMap', () => {
  it('converts empty object', () => {
    expect(toDynamoMap({})).toEqual({})
    expect(fromDynamoMap({})).toEqual({})
  })

  it('converts mixed types', () => {
    const input = { name: 'test', age: 30, active: true, data: null }
    const dynamo = toDynamoMap(input)

    expect(dynamo).toEqual({
      name: { S: 'test' },
      age: { N: '30' },
      active: { BOOL: true },
      data: { NULL: true },
    })
  })

  it('roundtrip: toDynamoMap → fromDynamoMap equals original', () => {
    const original = {
      str: 'hello',
      num: 42,
      flag: false,
      nil: null,
      list: [1, 'two'],
      nested: { x: 10 },
    }
    const result = fromDynamoMap(toDynamoMap(original))
    expect(result).toEqual(original)
  })
})
