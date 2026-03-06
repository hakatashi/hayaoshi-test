import {info as loggerInfo} from 'firebase-functions/logger';
import {initializeApp} from 'firebase-admin/app';
import {type CollectionReference, getFirestore} from 'firebase-admin/firestore';
import type {Room} from '../../src/lib/schema.ts';
import {onSchedule} from 'firebase-functions/scheduler';
import {onCall} from 'firebase-functions/v2/https';

if (process.env.FUNCTIONS_EMULATOR === 'true') {
	process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8180';
}

const app = initializeApp();
const db = getFirestore(app);

const Rooms = db.collection('rooms') as CollectionReference<Room>;

export const getServerTime = onCall((_request) => {
	return {serverTime: Date.now()};
});

export const resetRoomsCronJob = onSchedule('every 24 hours', async (event) => {
	loggerInfo('Resetting rooms');

	const now = new Date(event.scheduleTime);

	await db.runTransaction(async (transaction) => {
		const rooms = await transaction.get(Rooms);
		for (const room of rooms.docs) {
			if (
				room.data().createdAt.toMillis() <
				now.getTime() - 24 * 60 * 60 * 1000
			) {
				loggerInfo(
					`Deleting room (id: ${room.id}, createdAt: ${room.data().createdAt.toDate().toISOString()})`,
				);
				transaction.delete(room.ref);
			}
		}
	});

	loggerInfo('Rooms reset');
});
