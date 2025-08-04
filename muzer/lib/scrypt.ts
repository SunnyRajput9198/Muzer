    // my-auth-fix-test/lib/scrypt.ts
    console.log("DEBUG: Scrypt utility file is being loaded!"); // Add this for debugging

    import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

    const keyLength = 32;

    export const hash = async (password: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const salt = randomBytes(16).toString('hex');
        scrypt(password, salt, keyLength, (error, derivedKey) => {
          if (error) reject(error);
          resolve(`${salt}.${derivedKey.toString('hex')}`);
        });
      });
    };

    // FIX: Removed the duplicate 'const' keyword here
    export const compare = async (password: string, hash: string): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        const [salt, hashKey] = hash.split('.');
        if (!salt || !hashKey) {
          return resolve(false);
        }
        const hashKeyBuff = Buffer.from(hashKey, 'hex');
        scrypt(password, salt, keyLength, (error, derivedKey) => {
          if (error) return reject(error);
          if (hashKeyBuff.length !== derivedKey.length) {
            return resolve(false);
          }
          resolve(timingSafeEqual(hashKeyBuff, derivedKey));
        });
      });
    };
