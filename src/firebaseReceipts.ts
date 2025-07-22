// src/firebaseReceipts.ts
import { ref, set, get, remove } from 'firebase/database';
import { rtdb } from './firebase';

export const syncReceiptToFirebase = async (receipt: any) => {
  await set(ref(rtdb, `receipts/${receipt.id}`), receipt);
};

export const deleteReceiptFromFirebase = async (receiptId: string) => {
  await remove(ref(rtdb, `receipts/${receiptId}`));
};

export const getAllReceiptsFromFirebase = async () => {
  const snapshot = await get(ref(rtdb, 'receipts'));
  const data = snapshot.val();
  return data ? Object.values(data) : [];
};
