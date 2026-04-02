import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { signTokenPair, signAccessToken, verifyRefreshToken } from '../../utils/token';
import type { AuthUser, RoleName } from '../../types';
import type { RegisterDto, LoginDto } from './auth.validator';

const BCRYPT_ROUNDS = 12;

const toAuthUser = (user: { id: string; email: string; roleId: string; role: { name: string } }): AuthUser => ({
  id:       user.id,
  email:    user.email,
  roleId:   user.roleId,
  roleName: user.role.name as RoleName,
});

export const register = async (dto: RegisterDto) => {
  const viewerRole = await prisma.role.findUnique({ where: { name: 'viewer' } });
  if (!viewerRole) throw AppError.internal('Default role not found. Run prisma db seed first.');

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: { name: dto.name, email: dto.email, passwordHash, roleId: viewerRole.id },
    select: { id: true, name: true, email: true, status: true, roleId: true, role: { select: { name: true } }, createdAt: true },
  });

  const authUser = toAuthUser(user);
  const tokens   = signTokenPair(authUser);
  return { user: { id: user.id, name: user.name, email: user.email, status: user.status, roleName: authUser.roleName, createdAt: user.createdAt }, ...tokens };
};

export const login = async (dto: LoginDto) => {
  const user = await prisma.user.findUnique({
    where: { email: dto.email },
    select: { id: true, email: true, passwordHash: true, status: true, roleId: true, role: { select: { name: true } } },
  });

  const DUMMY_HASH = '$2a$12$invalidhashusedtopreventiumenumeration00000000000000000';
  const isMatch    = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !isMatch) throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  if (user.status === 'INACTIVE') throw AppError.forbidden('Account is deactivated. Contact an administrator.', 'ACCOUNT_INACTIVE');

  return signTokenPair(toAuthUser(user));
};

export const refresh = async (refreshToken: string) => {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthorized('Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, status: true, roleId: true, role: { select: { name: true } } },
  });

  if (!user) throw AppError.unauthorized('User not found', 'USER_NOT_FOUND');
  if (user.status === 'INACTIVE') throw AppError.forbidden('Account is deactivated', 'ACCOUNT_INACTIVE');

  return { accessToken: signAccessToken(toAuthUser(user)) };
};

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, status: true, roleId: true, role: { select: { name: true } }, createdAt: true },
  });

  if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');

  return { id: user.id, name: user.name, email: user.email, status: user.status, roleId: user.roleId, roleName: user.role.name as RoleName, createdAt: user.createdAt };
};
