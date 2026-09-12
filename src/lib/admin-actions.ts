'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdminAction } from '@/lib/admin-auth';
import { clampString, isTicketStatus, LIMITS } from '@/lib/validation';
import { isInExeterBounds } from '@/lib/pin-privacy';

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
}

// ---- Users ----

export async function banUserAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.user.update({ where: { id }, data: { isBanned: true, bannedAt: new Date() } });
  revalidatePath('/admin');
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${id}`);
}

export async function unbanUserAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.user.update({ where: { id }, data: { isBanned: false, bannedAt: null } });
  revalidatePath('/admin');
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${id}`);
}

export async function deleteUserAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.user.delete({ where: { id } });
  revalidatePath('/admin/users');
  redirect('/admin/users');
}

// ---- Posts ----

export async function hidePostAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.post.update({ where: { id }, data: { hiddenAt: new Date() } });
  revalidatePath('/admin');
  revalidatePath('/admin/posts');
  revalidatePath('/admin/reports');
}

export async function unhidePostAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.post.update({ where: { id }, data: { hiddenAt: null } });
  revalidatePath('/admin');
  revalidatePath('/admin/posts');
  revalidatePath('/admin/reports');
}

export async function deletePostAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.post.delete({ where: { id } });
  revalidatePath('/admin');
  revalidatePath('/admin/posts');
  revalidatePath('/admin/reports');
}

// ---- Comments ----

export async function hideCommentAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.comment.update({ where: { id }, data: { hiddenAt: new Date() } });
  revalidatePath('/admin');
  revalidatePath('/admin/comments');
  revalidatePath('/admin/reports');
}

export async function unhideCommentAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.comment.update({ where: { id }, data: { hiddenAt: null } });
  revalidatePath('/admin');
  revalidatePath('/admin/comments');
  revalidatePath('/admin/reports');
}

export async function deleteCommentAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.comment.delete({ where: { id } });
  revalidatePath('/admin');
  revalidatePath('/admin/comments');
  revalidatePath('/admin/reports');
}

// ---- Listings ----

export async function hideListingAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.listing.update({ where: { id }, data: { hiddenAt: new Date() } });
  revalidatePath('/admin');
  revalidatePath('/admin/listings');
}

export async function unhideListingAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.listing.update({ where: { id }, data: { hiddenAt: null } });
  revalidatePath('/admin');
  revalidatePath('/admin/listings');
}

export async function deleteListingAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.listing.delete({ where: { id } });
  revalidatePath('/admin');
  revalidatePath('/admin/listings');
}

export async function toggleListingSoldAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  const isSold = str(formData, 'isSold') === 'true';
  await prisma.listing.update({ where: { id }, data: { isSold: !isSold } });
  revalidatePath('/admin');
  revalidatePath('/admin/listings');
}

// ---- Nightlife tickets ----

export async function deleteTicketAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.nightlifeTicket.delete({ where: { id } });
  revalidatePath('/admin');
  revalidatePath('/admin/nightlife');
}

export async function setTicketStatusAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  const status = str(formData, 'status');
  if (!isTicketStatus(status)) {
    throw new Error('Invalid ticket status');
  }
  await prisma.nightlifeTicket.update({ where: { id }, data: { status } });
  revalidatePath('/admin');
  revalidatePath('/admin/nightlife');
}

// ---- Nightlife pins ----

export async function createPinAction(formData: FormData) {
  const session = await requireAdminAction();
  const name = clampString(str(formData, 'name'), LIMITS.pinName);
  const address = clampString(str(formData, 'address'), LIMITS.pinAddress);
  const mapsQuery = clampString(str(formData, 'mapsQuery') || address, LIMITS.pinMapsQuery);
  const type = str(formData, 'type') === 'house-party' ? 'house-party' : 'nightclub';
  const lat = Number(str(formData, 'lat'));
  const lng = Number(str(formData, 'lng'));
  if (!name || !address || !isInExeterBounds(lat, lng)) {
    throw new Error('Invalid pin');
  }
  await prisma.nightlifePin.create({
    data: {
      name,
      type,
      address,
      mapsQuery,
      lat,
      lng,
      isOpen: str(formData, 'isOpen') === 'true',
      createdById: session.user.id,
    },
  });
  revalidatePath('/admin');
  revalidatePath('/admin/nightlife');
}

export async function deletePinAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  await prisma.nightlifePin.delete({ where: { id } });
  revalidatePath('/admin');
  revalidatePath('/admin/nightlife');
}

export async function togglePinOpenAction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, 'id');
  const isOpen = str(formData, 'isOpen') === 'true';
  await prisma.nightlifePin.update({ where: { id }, data: { isOpen: !isOpen } });
  revalidatePath('/admin');
  revalidatePath('/admin/nightlife');
}

// ---- Reports ----

export async function dismissReportsAction(formData: FormData) {
  await requireAdminAction();
  const targetType = str(formData, 'targetType');
  const targetId = str(formData, 'targetId');
  await prisma.report.deleteMany({ where: { targetType, targetId } });
  revalidatePath('/admin');
  revalidatePath('/admin/reports');
}

export async function restoreAndDismissAction(formData: FormData) {
  await requireAdminAction();
  const targetType = str(formData, 'targetType');
  const targetId = str(formData, 'targetId');
  await prisma.report.deleteMany({ where: { targetType, targetId } });
  if (targetType === 'post') {
    await prisma.post.update({ where: { id: targetId }, data: { hiddenAt: null } });
  } else if (targetType === 'comment') {
    await prisma.comment.update({ where: { id: targetId }, data: { hiddenAt: null } });
  }
  revalidatePath('/admin/reports');
  revalidatePath('/admin/posts');
  revalidatePath('/admin/comments');
}
