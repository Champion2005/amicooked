import { db } from '@/config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

/**
 * Create a new chat for a user
 * @param {string} userId - Firebase Auth UID
 * @param {string} firstMessage - The initial user message
 * @param {Object} context - GitHub/profile context to include
 * @returns {Promise<string>} - The new chat document ID
 */
export async function createChat(userId, firstMessage, context = {}) {
  try {
    const chatsRef = collection(db, 'users', userId, 'chats');
    
    // Generate a short title from the first message
    const title = firstMessage.length > 50 
      ? firstMessage.substring(0, 50) + '...' 
      : firstMessage;

    const chatDoc = await addDoc(chatsRef, {
      title,
      context,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messages: [
        {
          role: 'user',
          content: firstMessage,
          timestamp: new Date().toISOString()
        }
      ]
    });

    return chatDoc.id;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
}

/**
 * Add a message to an existing chat
 * @param {string} userId - Firebase Auth UID
 * @param {string} chatId - The chat document ID
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - The message content
 */
export async function addMessage(userId, chatId, role, content) {
  try {
    const chatRef = doc(db, 'users', userId, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Chat not found');
    }

    const existingMessages = chatDoc.data().messages || [];
    existingMessages.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });

    await updateDoc(chatRef, {
      messages: existingMessages,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

/**
 * Get all chats for a user, ordered by most recent
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<Array>} - Array of chat objects with id
 */
export async function getUserChats(userId) {
  try {
    const chatsRef = collection(db, 'users', userId, 'chats');
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore Timestamps to ISO strings for display
      createdAt: doc.data().createdAt instanceof Timestamp 
        ? doc.data().createdAt.toDate().toISOString() 
        : doc.data().createdAt,
      updatedAt: doc.data().updatedAt instanceof Timestamp 
        ? doc.data().updatedAt.toDate().toISOString() 
        : doc.data().updatedAt
    }));
  } catch (error) {
    console.error('Error getting user chats:', error);
    throw error;
  }
}

/**
 * Get a single chat by ID
 * @param {string} userId - Firebase Auth UID
 * @param {string} chatId - The chat document ID
 * @returns {Promise<Object|null>} - Chat object or null
 */
export async function getChat(userId, chatId) {
  try {
    const chatRef = doc(db, 'users', userId, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (chatDoc.exists()) {
      return { id: chatDoc.id, ...chatDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting chat:', error);
    throw error;
  }
}
