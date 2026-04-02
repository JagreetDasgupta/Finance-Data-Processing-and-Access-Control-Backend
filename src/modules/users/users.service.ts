import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import type { RoleName, UserDto, PaginatedResult } from '../../types';
import type { CreateUserDto, UpdateUserDto, ListUsersQuery } from './users.validator';

const BCRYPT_ROUNDS = 12;

const USER_SELECT = {
  id: true, name: true, email: true, status: true,
  roleId: true, role: { select: { name: true } },
  createdAt: true, updatedAt: true,
} as const;

type UserRow = {
  id: string; name: string; email: string; status: 'ACTIVE' | 'INACTIVE';
  roleId: string; role: { name: string }; createdAt: Date; updatedAt: Date;
};

const toUserDto = (user: UserRow): UserDto & { updatedAt: Date } => ({
  id: user.id, name: user.name, email: user.email, status: user.status,
  roleId: user.roleId, roleName: user.role.name as RoleName,
  createdAt: user.createdAt, updatedAt: user.updatedAt,
});

const assertRoleExists = async (roleId: string): Promise<void> => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw AppError.unprocessable(`No role found with id '${roleId}'`, 'INVALID_ROLE_ID');
};

export const createUser = async (dto: CreateUserDto): Promise<UserDto & { updatedAt: Date }> => {
  await assertRoleExists(dto.roleId);
  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { name: dto.name, email: dto.email, passwordHash, roleId: dto.roleId },
    select: USER_SELECT,
  });
  return toUserDto(user);
};

export const listUsers = async (query: ListUsersQuery): Promise<PaginatedResult<UserDto & { updatedAt: Date }>> => {
  const { page, limit, status, roleId } = query;
  const skip  = (page - 1) * limit;
  const where = { ...(status ? { status } : {}), ...(roleId ? { roleId } : {}) };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: USER_SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.user.count({ where }),
  ]);
  return { items: users.map(toUserDto), total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getUserById = async (id: string): Promise<UserDto & { updatedAt: Date }> => {
  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) throw AppError.notFound(`User with id '${id}' not found`, 'USER_NOT_FOUND');
  return toUserDto(user);
};

export const updateUser = async (id: string, dto: UpdateUserDto): Promise<UserDto & { updatedAt: Date }> => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound(`User with id '${id}' not found`, 'USER_NOT_FOUND');
  if (dto.roleId !== undefined) await assertRoleExists(dto.roleId);

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(dto.name   !== undefined ? { name:   dto.name }   : {}),
      ...(dto.roleId !== undefined ? { roleId: dto.roleId } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    },
    select: USER_SELECT,
  });
  return toUserDto(updated);
};

export const deleteUser = async (id: string): Promise<void> => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound(`User with id '${id}' not found`, 'USER_NOT_FOUND');
  await prisma.user.delete({ where: { id } });
};

export const listRoles = async () =>
  prisma.role.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
