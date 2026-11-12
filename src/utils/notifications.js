import { createNotification, getAgent, getCustomer, getUserByEmail } from '../api/api';

const resolveUserId = async (profile) => {
  if (!profile) return null;
  if (profile.userId != null) return profile.userId;
  if (!profile.email) return null;
  const users = await getUserByEmail(profile.email);
  return users.data[0]?.id ?? null;
};

export const createShipmentNotifications = async (shipment, message, actor) => {
  const userIds = new Set();
  if (actor?.id != null) userIds.add(actor.id);

  if (shipment.customerId != null) {
    const customer = (await getCustomer(shipment.customerId)).data;
    const userId = await resolveUserId(customer);
    if (userId != null) userIds.add(userId);
  }

  if (shipment.agentId != null) {
    const agent = (await getAgent(shipment.agentId)).data;
    const userId = await resolveUserId(agent);
    if (userId != null) userIds.add(userId);
  }

  const createdAt = new Date().toISOString();
  await Promise.all([...userIds].map(userId => createNotification({
    userId,
    message,
    type: 'shipment_update',
    entityType: 'shipment',
    entityId: shipment.id,
    read: false,
    createdAt,
  })));
};
