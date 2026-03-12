import {createSignal, type Component, type JSX} from 'solid-js';
import {auth, Rooms} from '~/lib/firebase';
import {useAuth, useFirestore} from 'solid-firebase';
import Collection from '~/lib/Collection';
import {addDoc, orderBy, query, serverTimestamp} from 'firebase/firestore';
import {A} from '@solidjs/router';

import styles from './index.module.css';

const Index: Component = () => {
	const rooms = useFirestore(query(Rooms, orderBy('createdAt', 'asc')));
	const authState = useAuth(auth);
	const [newRoomName, setNewRoomName] = createSignal('');

	const onCreateRoom: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (
		event,
	) => {
		event.preventDefault();
		const form = event.currentTarget;

		if (!(authState.data && form)) {
			return;
		}

		await addDoc(Rooms, {
			name: newRoomName(),
			createdBy: authState.data.uid,
			createdAt: serverTimestamp(),
			activeSessionId: null,
			participants: {},
		});

		setNewRoomName('');
	};

	return (
		<div class={styles.container}>
			<ul class={styles.rooms}>
				<Collection data={rooms}>
					{(roomData) => (
						<li class={styles.room}>
							<A href={`/rooms/${roomData.id}`}>
								<span class={styles.roomName}>{roomData.name}</span>
								<span class={styles.roomParticipants}>
									{Object.keys(roomData.participants || {}).length} participants
								</span>
							</A>
						</li>
					)}
				</Collection>
			</ul>
			<form onSubmit={onCreateRoom}>
				<input
					type="text"
					name="room"
					value={newRoomName()}
					onChange={(event) => setNewRoomName(event.currentTarget?.value)}
				/>
				<button type="submit" disabled={!authState.data}>
					Create Room
				</button>
			</form>
		</div>
	);
};

export default Index;
