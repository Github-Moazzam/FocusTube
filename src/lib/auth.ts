import { jwtVerify, SignJWT } from 'jose';

const getJwtSecretKey = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error('The environment variable AUTH_SECRET is not set.');
  }
  return new TextEncoder().encode(secret);
};

export async function verifyAuth(token: string) {
  try {
    const verified = await jwtVerify(token, getJwtSecretKey());
    return verified.payload as { admin: boolean };
  } catch (err) {
    return null;
  }
}

export async function signAuth() {
  return await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(getJwtSecretKey());
}

