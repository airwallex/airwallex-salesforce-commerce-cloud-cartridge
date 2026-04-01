/**
 * Type helper to capitalize the first letter of a string literal type
 */
type Capitalize<S extends string> = S extends `${infer First}${infer Rest}` ? `${Uppercase<First>}${Rest}` : S;

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The string with the first letter capitalized
 *
 * @example
 * capitalize('demo') // Returns type: 'Demo'
 * capitalize('demo' | 'prod') // Returns type: 'Demo' | 'Prod'
 */
export const capitalize = <S extends string>(str: S): Capitalize<S> => {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<S>;
};

/**
 * Masks a string with a given mask character
 * @param str - The string to mask
 * @param mask - The mask character to use
 * @returns The masked string
 *
 * @example
 * maskString('1234567890') // Returns '••••••••••'
 */
export const maskString = (str: string, mask = '•'): string => {
  return mask.repeat(str.length);
};
