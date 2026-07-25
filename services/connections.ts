import { collection, doc, setDoc, deleteDoc, query, where, getDocs, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebaseInit";
import { handleFirestoreError, logFirestoreError, OperationType } from "./firebaseUtils";

export interface Connection {
  id: string;
  followerId: string;
  followingId: string;
  timestamp: number;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
}

export interface Friendship {
  id: string;
  user1: string;
  user2: string;
  timestamp: number;
}

export const followUser = async (followingId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Must be logged in to follow");
  
  const connectionId = `${currentUser.uid}_${followingId}`;
  const connection: Connection = {
    id: connectionId,
    followerId: currentUser.uid,
    followingId,
    timestamp: Date.now()
  };
  
  await setDoc(doc(db, "connections", connectionId), connection);
};

export const unfollowUser = async (followingId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Must be logged in to unfollow");
  
  const connectionId = `${currentUser.uid}_${followingId}`;
  await deleteDoc(doc(db, "connections", connectionId));
};

export const fetchFollowers = async (userId: string) => {
  try {
    const q = query(collection(db, "connections"), where("followingId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Connection);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, "connections");
    return [];
  }
};

export const fetchFollowing = async (userId: string) => {
  try {
    const q = query(collection(db, "connections"), where("followerId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Connection);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, "connections");
    return [];
  }
};

export const subscribeToFollowing = (userId: string, callback: (connections: Connection[]) => void) => {
  const q = query(collection(db, "connections"), where("followerId", "==", userId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => d.data() as Connection));
  }, (error: any) => {
    if (error.code === 'permission-denied' && !auth.currentUser) {
      console.warn(`MIMI // Ignored permission-denied for connections due to auth state change.`);
      return;
    }
    logFirestoreError(error, OperationType.LIST, "connections");
  });
};

// FRIEND REQUESTS

export const sendFriendRequest = async (receiverId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Must be logged in to send friend request");
  
  const requestId = `${currentUser.uid}_${receiverId}`;
  const request: FriendRequest = {
    id: requestId,
    senderId: currentUser.uid,
    receiverId,
    status: 'pending',
    timestamp: Date.now()
  };
  
  try {
    await setDoc(doc(db, "friend_requests", requestId), request);
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, `friend_requests/${requestId}`);
  }
};

export const acceptFriendRequest = async (requestId: string, senderId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Must be logged in to accept friend request");
  
  try {
    // Update request status
    await updateDoc(doc(db, "friend_requests", requestId), { status: 'accepted' });
    
    // Create friendship record
    // Sort IDs to ensure consistent friendship ID regardless of who sent the request
    const sortedIds = [currentUser.uid, senderId].sort();
    const friendshipId = `${sortedIds[0]}_${sortedIds[1]}`;
    
    const friendship: Friendship = {
      id: friendshipId,
      user1: sortedIds[0],
      user2: sortedIds[1],
      timestamp: Date.now()
    };
    
    await setDoc(doc(db, "friendships", friendshipId), friendship);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `friend_requests/${requestId}`);
  }
};

export const rejectFriendRequest = async (requestId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Must be logged in to reject friend request");
  
  try {
    await updateDoc(doc(db, "friend_requests", requestId), { status: 'rejected' });
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, `friend_requests/${requestId}`);
  }
};

export const cancelFriendRequest = async (requestId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Must be logged in to cancel friend request");
  
  try {
    await deleteDoc(doc(db, "friend_requests", requestId));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `friend_requests/${requestId}`);
  }
};

export const removeFriend = async (friendId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Must be logged in to remove friend");
  
  try {
    const sortedIds = [currentUser.uid, friendId].sort();
    const friendshipId = `${sortedIds[0]}_${sortedIds[1]}`;
    
    await deleteDoc(doc(db, "friendships", friendshipId));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `friendships`);
  }
};

export const fetchFriendRequests = async (userId: string, type: 'incoming' | 'outgoing' = 'incoming') => {
  const field = type === 'incoming' ? 'receiverId' : 'senderId';
  try {
    const q = query(collection(db, "friend_requests"), where(field, "==", userId), where("status", "==", "pending"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as FriendRequest);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, "friend_requests");
    return [];
  }
};

export const fetchFriends = async (userId: string) => {
  const q1 = query(collection(db, "friendships"), where("user1", "==", userId));
  const q2 = query(collection(db, "friendships"), where("user2", "==", userId));
  
  try {
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const friends1 = snap1.docs.map(d => ({ ...d.data(), friendId: d.data().user2 }));
    const friends2 = snap2.docs.map(d => ({ ...d.data(), friendId: d.data().user1 }));
    
    return [...friends1, ...friends2] as (Friendship & { friendId: string })[];
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, "friendships");
    return [];
  }
};

export const checkConnectionStatus = async (otherUserId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return { status: 'none', requestId: null };
  
  const sortedIds = [currentUser.uid, otherUserId].sort();
  const friendshipId = `${sortedIds[0]}_${sortedIds[1]}`;
  
  try {
    // Check if they are friends
    const friendshipDoc = await getDoc(doc(db, "friendships", friendshipId));
    if (friendshipDoc.exists()) {
      return { status: 'friends', requestId: null };
    }
  } catch (e) {
    // Permission denied means it doesn't exist or rules are strict
  }
  
  try {
    // Check if I sent a request
    const sentRequestId = `${currentUser.uid}_${otherUserId}`;
    const sentRequestDoc = await getDoc(doc(db, "friend_requests", sentRequestId));
    if (sentRequestDoc.exists() && sentRequestDoc.data().status === 'pending') {
      return { status: 'request_sent', requestId: sentRequestId };
    }
  } catch (e) {
    // Ignore
  }
  
  try {
    // Check if they sent me a request
    const receivedRequestId = `${otherUserId}_${currentUser.uid}`;
    const receivedRequestDoc = await getDoc(doc(db, "friend_requests", receivedRequestId));
    if (receivedRequestDoc.exists() && receivedRequestDoc.data().status === 'pending') {
      return { status: 'request_received', requestId: receivedRequestId };
    }
  } catch (e) {
    // Ignore
  }
  
  return { status: 'none', requestId: null };
};
