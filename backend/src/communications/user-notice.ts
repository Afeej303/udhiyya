import type { Prisma } from '../generated/prisma/client.js';

export async function addUserNotice(
  tx: Prisma.TransactionClient,
  programmeId: string,
  userId: string,
  title: string,
  body: string,
) {
  await tx.userNotification.create({
    data: { programmeId, userId, title, body },
  });
}
