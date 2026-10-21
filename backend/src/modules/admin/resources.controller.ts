import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../config/prisma.service';
import { ContestsService } from '../contests/contests.service';
import { AuditionsService } from '../auditions/auditions.service';
import { Field, RESOURCES, Resource } from './resources.config';
import { seedCategoriesIfEmpty } from './category-defaults';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];
const PRIVILEGED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'CONTENT_MODERATOR', 'SUPPORT_ADMIN', 'CONTEST_MANAGER', 'TALENT_MANAGER'];

/** Generic, whitelisted CRUD for every admin tab. See resources.config.ts. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.CONTEST_MANAGER, UserRole.CONTENT_MODERATOR, UserRole.SUPPORT_ADMIN, UserRole.TALENT_MANAGER)
@Controller('admin/resources')
export class ResourcesController {
  constructor(private prisma: PrismaService, private contests: ContestsService, private auditions: AuditionsService) {}

  private res(name: string): Resource {
    const r = RESOURCES[name];
    if (!r) throw new NotFoundException(`Unknown resource "${name}"`);
    return r;
  }
  private db(r: Resource): any { return (this.prisma as any)[r.model]; }
  private isAdmin(user: any) { return ADMIN_ROLES.includes(user?.role); }

  /** Drives the admin UI: columns, form fields, filters and row actions. */
  @Get(':name/meta')
  meta(@Param('name') name: string) {
    const r = this.res(name);
    return { name, title: r.title, description: r.description, columns: r.columns, fields: r.fields, actions: r.actions ?? [], canCreate: !!r.allowCreate, canDelete: !!r.delete, softDelete: !!(r.delete && r.delete !== 'hard'), searchable: r.search.length > 0, optionLabel: r.optionLabel };
  }

  @Get(':name')
  async list(@Param('name') name: string, @Query() q: Record<string, string>) {
    const r = this.res(name);
    if (name === 'categories') await seedCategoriesIfEmpty(this.prisma);
    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 20));
    const where: any = {};
    for (const f of r.fields) {
      const v = q[`f_${f.key}`];
      if (v === undefined || v === '' || !(f.filter || f.type === 'relation')) continue;
      where[f.key] = f.type === 'bool' ? v === 'true' : v;
    }
    if (q.q && r.search.length) where.OR = r.search.map((k) => ({ [k]: { contains: q.q, mode: 'insensitive' } }));
    const [items, total] = await Promise.all([
      this.db(r).findMany({ where, include: r.include, orderBy: r.orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.db(r).count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  @Get(':name/:id')
  async one(@Param('name') name: string, @Param('id') id: string) {
    const r = this.res(name);
    const row = await this.db(r).findUnique({ where: { id }, include: r.include });
    if (!row) throw new NotFoundException('Record not found');
    return row;
  }

  @Post(':name')
  async create(@CurrentUser() user: any, @Param('name') name: string, @Body() body: Record<string, any>) {
    const r = this.res(name);
    if (!r.allowCreate) throw new ForbiddenException(`${r.title} cannot be created from the admin dashboard`);
    const data = this.build(r, body, true);
    this.guardUserRole(r, data, user);
    this.beforeSave(name, data, null);
    try {
      let row: any;
      if (name === 'users') row = await this.prisma.user.create({ data: { ...data, wallet: { create: {} } } as any });
      else if (name === 'subscriptions') row = await this.prisma.subscription.upsert({ where: { userId: data.userId }, create: data as any, update: data as any });
      else if (name === 'talents') row = await this.createTalent(data);
      else row = await this.db(r).create({ data });
      await this.audit(user, 'CREATE', name, null, row);
      return row;
    } catch (e) { throw this.friendly(e, 'create'); }
  }

  @Patch(':name/:id')
  async update(@CurrentUser() user: any, @Param('name') name: string, @Param('id') id: string, @Body() body: Record<string, any>) {
    const r = this.res(name);
    const existing = await this.db(r).findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Record not found');
    const data = this.build(r, body, false);
    if (!Object.keys(data).length) throw new BadRequestException('Nothing to update');
    this.guardUserRole(r, data, user, existing);
    if (name === 'users' && id === user?.id && data.status && data.status !== 'ACTIVE') throw new BadRequestException('You cannot suspend or block your own account');
    this.beforeSave(name, data, existing);
    try {
      let row: any;
      // Status changes that must notify people go through the existing services.
      if (name === 'contests' && data.status && data.status !== existing.status && ['APPROVED', 'REJECTED'].includes(data.status)) {
        const { status, rejectionNote, ...rest } = data;
        if (Object.keys(rest).length) await this.db(r).update({ where: { id }, data: rest });
        row = await this.contests.adminSetStatus(id, status, rejectionNote ?? existing.rejectionNote ?? undefined);
      } else {
        row = await this.db(r).update({ where: { id }, data, include: r.include });
      }
      await this.audit(user, 'UPDATE', name, existing, row);
      return row;
    } catch (e) { throw this.friendly(e, 'update'); }
  }

  @Delete(':name/:id')
  async remove(@CurrentUser() user: any, @Param('name') name: string, @Param('id') id: string) {
    const r = this.res(name);
    if (!r.delete) throw new ForbiddenException(`${r.title} cannot be deleted`);
    if (!this.isAdmin(user)) throw new ForbiddenException('Only an admin can delete records');
    const existing = await this.db(r).findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Record not found');
    if (name === 'users' && id === user?.id) throw new BadRequestException('You cannot delete your own account');
    if (name === 'users' && PRIVILEGED_ROLES.includes(existing.role) && user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Only a super admin can remove staff accounts');
    try {
      if (r.delete !== 'hard') {
        await this.db(r).update({ where: { id }, data: r.delete.soft });
        if (name === 'users') await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
      } else {
        await this.hardDelete(name, id);
      }
      await this.audit(user, 'DELETE', name, existing, null);
      return { deleted: true, soft: r.delete !== 'hard' };
    } catch (e) { throw this.friendly(e, 'delete'); }
  }

  // ---------- helpers ----------

  /** Deletes a record together with the rows that only exist for it. Anything else that points at it blocks the delete. */
  private async hardDelete(name: string, id: string) {
    const p = this.prisma;
    switch (name) {
      case 'contests':
        return p.$transaction([p.contestRound.deleteMany({ where: { contestId: id } }), p.scoringCriterion.deleteMany({ where: { contestId: id } }), p.contestJudge.deleteMany({ where: { contestId: id } }), p.contestAward.deleteMany({ where: { contestId: id } }), p.contest.delete({ where: { id } })]);
      case 'battles':
        return p.$transaction([p.battleVote.deleteMany({ where: { battleId: id } }), p.battle.delete({ where: { id } })]);
      case 'talents':
        return p.$transaction([p.calendarSlot.deleteMany({ where: { talentId: id } }), p.talentProfile.delete({ where: { id } })]);
      case 'registrations':
        return p.$transaction([p.judgeScore.deleteMany({ where: { registrationId: id } }), p.vote.deleteMany({ where: { registrationId: id } }), p.contestRegistration.delete({ where: { id } })]);
      default:
        return this.db(RESOURCES[name]).delete({ where: { id } });
    }
  }

  private async createTalent(data: any) {
    await this.prisma.user.update({ where: { id: data.userId }, data: { role: 'TALENT' } }).catch(() => undefined);
    return this.prisma.talentProfile.create({ data });
  }

  private beforeSave(name: string, data: any, existing: any) {
    if (name === 'categories') {
      if (data.name) data.slug = String(data.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category';
      if (!existing && !data.slug) throw new BadRequestException('Name is required');
    }
    if (name === 'commission-rules' && String(data.scope ?? existing?.scope).toUpperCase() === 'GLOBAL') throw new BadRequestException('Global rates are edited in Config Engine');
    if (name === 'users' && data.mobile !== undefined) data.mobile = String(data.mobile).replace(/\s+/g, '');
    if (name === 'users' && data.email === '') data.email = null;
    if (name === 'contests') {
      const jw = data.judgeWeightPct ?? existing?.judgeWeightPct, vw = data.voteWeightPct ?? existing?.voteWeightPct;
      if (jw != null && vw != null && Math.round(Number(jw) + Number(vw)) !== 100) throw new BadRequestException('Judge weight and public vote weight must add up to 100');
    }
  }

  private guardUserRole(r: Resource, data: any, user: any, existing?: any) {
    if (r.model !== 'user') return;
    if (data.role && PRIVILEGED_ROLES.includes(data.role) && user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Only a super admin can assign staff roles');
    if (existing && PRIVILEGED_ROLES.includes(existing.role) && user.role !== 'SUPER_ADMIN' && existing.id !== user.id) throw new ForbiddenException('Only a super admin can edit staff accounts');
  }

  /** Whitelists and converts incoming values according to the field definitions. */
  private build(r: Resource, body: Record<string, any>, creating: boolean) {
    const data: Record<string, any> = {};
    for (const f of r.fields) {
      if (f.readonly) continue;
      if (f.createOnly && !creating) continue;
      const has = Object.prototype.hasOwnProperty.call(body ?? {}, f.key);
      if (!has) { if (creating && f.default !== undefined) data[f.key] = f.default; continue; }
      const v = this.convert(f, body[f.key]);
      if (v === undefined) continue;
      if (v === null && f.required) throw new BadRequestException(`${f.label} is required`);
      data[f.key] = v;
    }
    if (creating) for (const f of r.fields) if (f.required && !f.readonly && (data[f.key] === undefined || data[f.key] === null || data[f.key] === '')) throw new BadRequestException(`${f.label} is required`);
    return data;
  }

  private convert(f: Field, raw: any): any {
    const empty = raw === '' || raw === null || raw === undefined;
    switch (f.type) {
      case 'bool': return raw === true || raw === 'true' || raw === 1;
      case 'number': {
        if (empty) return null;
        const n = Number(raw);
        if (!Number.isFinite(n)) throw new BadRequestException(`${f.label} must be a number`);
        return f.int ? Math.trunc(n) : n;
      }
      case 'datetime': {
        if (empty) return null;
        const d = new Date(raw);
        if (isNaN(d.getTime())) throw new BadRequestException(`${f.label} is not a valid date`);
        return d;
      }
      case 'tags': {
        if (empty) return [];
        const list = Array.isArray(raw) ? raw : String(raw).split(',');
        return list.map((s: any) => String(s).trim().replace(/^#/, '')).filter(Boolean);
      }
      case 'enum': {
        if (empty) return null;
        if (!f.options?.includes(String(raw))) throw new BadRequestException(`${f.label} must be one of: ${f.options?.join(', ')}`);
        return String(raw);
      }
      default: return empty ? null : String(raw).trim();
    }
  }

  private friendly(e: any, verb: string) {
    if (e?.status && e?.response) return e; // already an HTTP exception
    if (e?.code === 'P2002') return new ConflictException('A record with the same unique value already exists');
    if (e?.code === 'P2003') return new ConflictException(verb === 'delete' ? 'This record is still used by other records (registrations, payments, bookings and so on). Set its status to cancelled, closed or inactive instead of deleting it.' : 'A linked record does not exist. Check the selected user or reel.');
    if (e?.code === 'P2025') return new NotFoundException('Record not found');
    return new BadRequestException(e?.message?.split('\n').pop() || `Could not ${verb}`);
  }

  private async audit(user: any, action: string, module: string, oldValue: any, newValue: any) {
    const clean = (v: any) => (v == null ? undefined : JSON.parse(JSON.stringify(v)));
    await this.prisma.auditLog.create({ data: { adminId: user?.id ?? 'unknown', action, module, oldValue: clean(oldValue), newValue: clean(newValue) } }).catch(() => undefined);
  }
}
