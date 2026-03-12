import {doc, serverTimestamp, updateDoc} from 'firebase/firestore';
import {auth, Rooms} from './firebase';
import styles from './SessionController.module.css';
import {useAuth, useFirestore} from 'solid-firebase';
import Doc from './Doc';
import {createMemo, Show} from 'solid-js';

interface Props {
	roomId: string;
	sessionId: string;
	isRoomOwner: boolean | null;
}

export const SessionController = (props: Props) => {
	const roomRef = doc(Rooms, props.roomId);
	const sessionRef = doc(Rooms, props.roomId, 'sessions', props.sessionId);
	const sessionDoc = useFirestore(sessionRef);

	const authState = useAuth(auth);

	const slashesMemo = createMemo(() => {
		if (!sessionDoc.data) {
			return {};
		}
		return sessionDoc.data.slashes ?? {};
	});

	const handleSlash = async () => {
		if (!authState.data) {
			return;
		}

		await updateDoc(sessionRef, {
			[`slashes.${authState.data.uid}`]: {
				status: 'pushed',
				pushedAt: serverTimestamp(),
			},
		});
	};

	const handleReset = async () => {
		await updateDoc(roomRef, {
			activeSessionId: null,
		});
	};

	return (
		<div class={styles.sessionController}>
			<Doc data={sessionDoc}>
				{(sessionData) => (
					<div>
						<h2>Session ID: {props.sessionId}</h2>
						<p>Slashes: {JSON.stringify(slashesMemo())}</p>
						<div class={styles.controls}>
							<button type="button" onClick={handleSlash}>
								Slash!
							</button>
							<Show when={props.isRoomOwner}>
								<button type="button" onClick={handleReset}>
									Reset
								</button>
							</Show>
						</div>
					</div>
				)}
			</Doc>
		</div>
	);
};
