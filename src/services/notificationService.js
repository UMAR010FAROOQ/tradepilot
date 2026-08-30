import { collection, doc, onSnapshot, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'

export function subscribeToNotifications(userId, callback, onError) {
  return onSnapshot(query(collection(db, 'notifications'), where('userId', '==', userId), orderBy('createdAt', 'desc')), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}

export function markNotificationRead(notificationId) {
  return updateDoc(doc(db, 'notifications', notificationId), { read: true })
}

export async function markAllNotificationsRead(notifications) {
  const unread = notifications.filter((item) => !item.read)
  if (unread.length === 0) return
  const batch = writeBatch(db)
  unread.forEach((item) => batch.update(doc(db, 'notifications', item.id), { read: true }))
  await batch.commit()
}
