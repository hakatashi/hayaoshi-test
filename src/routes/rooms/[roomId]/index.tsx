import {
	createEffect,
	For,
	onCleanup,
	Show,
	createSignal,
	type Component,
} from 'solid-js';
import {auth, Rooms} from '~/lib/firebase';
import {useAuth, useFirestore} from 'solid-firebase';
import {doc, serverTimestamp, updateDoc} from 'firebase/firestore';
import {useParams} from '@solidjs/router';
import Doc from '~/lib/Doc';

import styles from './index.module.css';

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

	createEffect(() => {
		updateTimestamp();
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

		updateTimestamp();
	};

	const intervalId = setInterval(onTick, 10 * 1000);
	onCleanup(() => {
		clearInterval(intervalId);
	});

	return (
		<div>
			<Doc data={room}>
				{(roomData) => (
					<>
						<h1>{roomData.name}</h1>
						<p>Created at: {roomData.createdAt?.toDate()?.toLocaleString()}</p>
						<p>Created by: {roomData.createdBy}</p>
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
					</>
				)}
			</Doc>
		</div>
	);
};

export default Index;
