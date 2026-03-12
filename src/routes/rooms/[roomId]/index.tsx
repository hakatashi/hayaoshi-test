import {
	createEffect,
	For,
	onCleanup,
	Show,
	createSignal,
	type Component,
	createMemo,
} from 'solid-js';
import {
	auth,
	getServerTimeTokyo,
	getServerTimeOsaka,
	getServerTimeEurope,
	getServerTimeUscentral,
	getServerTimeAfrica,
	Rooms,
	db,
} from '~/lib/firebase';
import {useAuth, useFirestore} from 'solid-firebase';
import {
	collection,
	type CollectionReference,
	doc,
	runTransaction,
	serverTimestamp,
	updateDoc,
} from 'firebase/firestore';
import {useParams} from '@solidjs/router';
import Doc from '~/lib/Doc';

import styles from './index.module.css';
import type {RoomSession} from '~/lib/schema';
import {SessionController} from '~/lib/SessionController';

const Index: Component = () => {
	const params = useParams();
	const roomRef = doc(Rooms, params.roomId);
	const room = useFirestore(roomRef);
	const authState = useAuth(auth);

	const updateTimestamp = () => {
		if (!authState.data || !room.data) {
			return;
		}

		console.log('Updating timestamp for user', authState.data.uid);

		updateDoc(roomRef, {
			[`participants.${authState.data.uid}`]: serverTimestamp(),
		});
	};

	const updateTimestampInterval = setInterval(updateTimestamp, 10 * 1000);
	onCleanup(() => {
		clearInterval(updateTimestampInterval);
	});

	createEffect(() => {
		updateTimestamp();
	});

	const clockOffsetHistory: number[] = [];
	const pingHistory: number[] = [];
	const [clockOffsetAvg, setClockOffsetAvg] = createSignal<number | null>(null);
	const [pingAvg, setPingAvg] = createSignal<number | null>(null);
	const [selectedRegion, setSelectedRegion] = createSignal<string | null>(null);

	const callers = [
		{fn: getServerTimeTokyo, region: 'asia-northeast1 (Tokyo)'},
		{fn: getServerTimeOsaka, region: 'asia-northeast2 (Osaka)'},
		{fn: getServerTimeEurope, region: 'europe-west1 (Belgium)'},
		{fn: getServerTimeUscentral, region: 'us-central1 (Iowa)'},
		{fn: getServerTimeAfrica, region: 'africa-south1 (Johannesburg)'},
	];
	const regionSelectionCount: Record<string, number> = {};
	let syncCount = 0;

	const trimmedMean = (history: number[]) => {
		const sorted = [...history].sort((a, b) => a - b);
		const trimmed = sorted.length > 2 ? sorted.slice(1, -1) : sorted;
		return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
	};

	const syncClock = async () => {
		const mostSelectedRegion =
			Object.entries(regionSelectionCount).sort(
				([, countA], [, countB]) => countB - countA,
			)[0]?.[0] ?? null;
		const activeCallers =
			syncCount < 5
				? callers
				: callers.filter((c) => c.region === mostSelectedRegion);

		const t0 = Date.now();
		const {result, region} = await Promise.any(
			activeCallers.map(async ({fn, region}) => ({result: await fn(), region})),
		);
		const t2 = Date.now();

		syncCount++;
		regionSelectionCount[region] = (regionSelectionCount[region] ?? 0) + 1;
		setSelectedRegion(region);
		const serverTime = result.data.serverTime;
		// NTP-style offset: positive means server is ahead of local clock
		clockOffsetHistory.push(serverTime - (t0 + t2) / 2);
		if (clockOffsetHistory.length > 5) {
			clockOffsetHistory.shift();
		}
		// One-way latency estimate
		pingHistory.push((t2 - t0) / 2);
		if (pingHistory.length > 5) {
			pingHistory.shift();
		}
		setClockOffsetAvg(trimmedMean(clockOffsetHistory));
		setPingAvg(trimmedMean(pingHistory));
	};

	syncClock();
	const syncClockInterval = setInterval(syncClock, 10 * 1000);
	onCleanup(() => {
		clearInterval(syncClockInterval);
	});

	const [isOnlineTable, setIsOnlineTable] = createSignal<
		Record<string, boolean>
	>({});

	const onTick = () => {
		if (room.data) {
			const now = Date.now();
			const newIsOnlineTable: Record<string, boolean> = {};
			for (const [uid, timestamp] of Object.entries(
				room.data.participants || {},
			)) {
				if (timestamp) {
					const lastUpdated = timestamp.toMillis();
					newIsOnlineTable[uid] = now - lastUpdated < 30 * 1000;
				} else {
					newIsOnlineTable[uid] = false;
				}
			}
			setIsOnlineTable(newIsOnlineTable);
		}
	};

	const onTickInterval = setInterval(onTick, 500);
	onCleanup(() => {
		clearInterval(onTickInterval);
	});

	const activeSessionId = createMemo(() => {
		if (!room.data) {
			return null;
		}
		return room.data.activeSessionId;
	});

	const isRoomOwner = createMemo(() => {
		if (!authState.data || !room.data) {
			return null;
		}
		return authState.data.uid === room.data.createdBy;
	});

	createEffect(async () => {
		// If the room is loaded and there's no active session, try to create one
		if (room.loading === false && activeSessionId() === null && isRoomOwner()) {
			await runTransaction(db, async (transaction) => {
				// Re-read the room document within the transaction to ensure we have the latest data
				const freshRoomDoc = await transaction.get(roomRef);
				if (freshRoomDoc.data()?.activeSessionId) {
					return;
				}

				const sessionRef = doc(
					collection(roomRef, 'sessions') as CollectionReference<RoomSession>,
				);
				transaction.set(sessionRef, {
					createdAt: serverTimestamp(),
					endedAt: null,
					slashes: {},
				});
				transaction.update(roomRef, {activeSessionId: sessionRef.id});
			});
		}
	});

	return (
		<div>
			<Doc data={room}>
				{(roomData) => (
					<>
						<h1>{roomData.name}</h1>
						<p>Created at: {roomData.createdAt?.toDate()?.toLocaleString()}</p>
						<p>Created by: {roomData.createdBy}</p>
						<p>
							Region:{' '}
							{selectedRegion() === null ? 'Measuring...' : selectedRegion()}
						</p>
						<p>
							Clock offset:{' '}
							{clockOffsetAvg() === null
								? 'Measuring...'
								: `${(clockOffsetAvg() as number) > 0 ? '+' : ''}${(clockOffsetAvg() as number).toFixed(1)} ms`}
						</p>
						<p>
							Ping:{' '}
							{pingAvg() === null
								? 'Measuring...'
								: `${(pingAvg() as number).toFixed(1)} ms`}
						</p>
						<p>Active session ID: {activeSessionId() ?? 'No active session'}</p>
						<ul class={styles.participants}>
							<For each={Object.keys(roomData.participants)}>
								{(uid) => (
									<li
										classList={{
											[styles.participant]: true,
											[styles.online]: isOnlineTable()[uid],
										}}
									>
										<Show when={authState.data?.uid === uid}>
											<div class={styles.youBadge}>You</div>
										</Show>
										<div class={styles.participantUid}>UID: {uid}</div>
									</li>
								)}
							</For>
						</ul>
						<Show when={activeSessionId()}>
							{(sessionId) => (
								<Show when={params.roomId}>
									{(roomId) => (
										<SessionController
											roomId={roomId()}
											sessionId={sessionId()}
											isRoomOwner={isRoomOwner()}
										/>
									)}
								</Show>
							)}
						</Show>
					</>
				)}
			</Doc>
		</div>
	);
};

export default Index;
