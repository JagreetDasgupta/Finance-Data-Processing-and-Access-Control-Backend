import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthUser } from '../types';

export interface AccessTokenPayload {
  sub:      string;
  email:    string;
  roleId:   string;
  roleName: string;
}

export interface TokenPair {
  accessToken:  string;
  refreshToken: string;
}

export const signAccessToken = (user: AuthUser): string =>
  jwt.sign(
    { sub: user.id, email: user.email, roleId: user.roleId, roleName: user.roleName } satisfies AccessTokenPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] },
  );

export const signRefreshToken = (userId: string): string =>
  jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] });

export const signTokenPair = (user: AuthUser): TokenPair => ({
  accessToken:  signAccessToken(user),
  refreshToken: signRefreshToken(user.id),
});

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): { sub: string } =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
