describe('Basic Test Suite', () => {
  test('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
    expect(5 * 3).toBe(15);
    expect(10 / 2).toBe(5);
  });

  test('should handle string operations', () => {
    const str = 'Hello, Flavr!';
    expect(str).toContain('Flavr');
    expect(str.toLowerCase()).toBe('hello, flavr!');
    expect(str.length).toBe(13);
  });

  test('should work with arrays', () => {
    const recipes = ['pasta', 'pizza', 'salad'];
    expect(recipes).toHaveLength(3);
    expect(recipes).toContain('pasta');
    expect(recipes[1]).toBe('pizza');
  });

  test('should handle async operations', async () => {
    const promise = Promise.resolve('Recipe generated!');
    const result = await promise;
    expect(result).toBe('Recipe generated!');
  });
});