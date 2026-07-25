import { db, isFullyAuthenticated, auth } from "./firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy } from "firebase/firestore";
import { logFirestoreError, OperationType } from "./firebaseUtils";
import { Notification } from "../types";

export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  if (!userId || userId === 'ghost' || userId.startsWith('local_ghost_') || !isFullyAuthenticated()) {
    callback([]);
    return () => {};
  }
  
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("timestamp", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    callback(notifications);
  }, (error: any) => {
    if (error.code === 'permission-denied' && auth.currentUser?.uid !== userId) {
      console.warn(`MIMI // Ignored permission-denied for notifications/${userId} due to auth state change.`);
      return;
    }
    logFirestoreError(error, OperationType.LIST, 'notifications');
  });
};

export const markNotificationAsRead = async (notificationId: string) => {
  if (!isFullyAuthenticated()) return;
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
};
