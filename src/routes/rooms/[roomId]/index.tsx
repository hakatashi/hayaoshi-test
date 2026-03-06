import type {Component} from 'solid-js';
import {Rooms} from '~/lib/firebase';
import {useFirestore} from 'solid-firebase';
import {doc} from 'firebase/firestore';
import {useParams} from '@solidjs/router';

const Index: Component = () => {
	const params = useParams();
	const room = useFirestore(doc(Rooms, params.roomId));

	return (
		<div>
			<h1>{room.data?.name}</h1>
			<p>Created at: {room.data?.createdAt?.toDate().toLocaleString()}</p>
			<p>Created by: {room.data?.createdBy}</p>
		</div>
	);
};

export default Index;
