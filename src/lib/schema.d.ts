import type {DocumentData, FirestoreError, Timestamp} from 'firebase/firestore';

export interface UseFireStoreReturn<T> {
	data: T;
	loading: boolean;
	error: FirestoreError | null;
}

export interface Task extends DocumentData {
	uid: string;
	task: string;
	createdAt: Timestamp;
}

export interface Room extends DocumentData {
	name: string;
	createdAt: Timestamp;
	createdBy: string;
	participants: Record<string, Timestamp>;
}
