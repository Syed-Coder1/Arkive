// src/firebaseClients.ts
import { ref, set, get, remove } from 'firebase/database';
import { rtdb } from './firebase.ts';

// ✅ Sync a single client to Firebase
export const syncClientToFirebase = async (client: any) => {
  console.log('🟡 Trying to sync client to Firebase:', client);

  try {
    const clientRef = ref(rtdb, `clients/${client.id}`);
    await set(clientRef, client);
    console.log('🟢 Client synced to Firebase successfully');
  } catch (err: any) {
    console.error('🔴 Firebase sync error:', err.message || err);
  }
};


// ✅ Delete a client from Firebase
export const deleteClientFromFirebase = async (clientId: string) => {
  try {
    await remove(ref(rtdb, `clients/${clientId}`));
    console.log(`🟠 Client ${clientId} deleted from Firebase`);
  } catch (err) {
    console.error('🔴 Error deleting client from Firebase:', err);
  }
};

// ✅ Get all clients from Firebase
export const getAllClientsFromFirebase = async () => {
  try {
    const snapshot = await get(ref(rtdb, 'clients'));
    const data = snapshot.val();
    console.log('📥 Fetched clients from Firebase:', data);
    return data ? Object.values(data) : [];
  } catch (err) {
    console.error('🔴 Error fetching clients:', err);
    return [];
  }
};
