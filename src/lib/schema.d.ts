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
	activeSessionId: string | null;

	/** Represents the participants in the room, where the key is the user ID and the value is the timestamp of when they updated their participation.
	 * Using serverTimestamp() will result in null until the document is fetched, so we need to account for that in the type.
	 * The value in the database won't actually be null. */
	participants: Record<string, Timestamp | null>;
}

/** Represents that the client has not yet pushed the slash action to the server. */
export interface PendingSlash {
	status: 'pending';
}

/** Represents that the client has pushed the slash action to the server. */
export interface PushedSlash {
	status: 'pushed';
	pushedAt: Timestamp;
}

/**
 * Represents that the client has accepted the slash action of the opponents.
 * The clients confirmed that they didn't push the slash action until `acceptedUntil`, so the server accepted the slash action.
 */
export interface AcceptedSlash {
	status: 'accepted';
	acceptedUntil: Timestamp;
}

/** Represents a slash action in the game. */
export type Slash = PendingSlash | PushedSlash | AcceptedSlash;

export interface RoomSession extends DocumentData {
	createdAt: Timestamp;
	endedAt: Timestamp | null;
	slashes: Record<string, Slash>;
}
