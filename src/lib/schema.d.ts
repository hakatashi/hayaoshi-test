import type {DocumentData, FirestoreError, Timestamp} from 'firebase/firestore';

export interface UseFireStoreReturn<T> {
	data: T;
	loading: boolean;
	error: FirestoreError | null;
}

export interface Room extends DocumentData {
	name: string;
	createdAt: Timestamp;
	createdBy: string;

	/** Represents the participants in the room, where the key is the user ID and the value is the timestamp of when they updated their participation.
	 * Using serverTimestamp() will result in null until the document is fetched, so we need to account for that in the type */
	participants: Record<string, Timestamp | null>;
}
